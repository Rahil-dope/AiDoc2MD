import os
import logging
from django.http import HttpResponse, Http404
from django.conf import settings
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Document
from .serializers import (
    DocumentListSerializer,
    DocumentDetailSerializer,
    DocumentUploadSerializer,
    DocumentUpdateMarkdownSerializer,
    ReprocessSerializer
)
from .tasks import process_document_task, process_document_pipeline
from .services.tokenizer import TokenizerAnalyzer
from .services.exporter import DocumentExporter

logger = logging.getLogger(__name__)


class DocumentListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        documents = Document.objects.all().order_by('-created_at')
        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = serializer.validated_data['file']
        title = serializer.validated_data.get('title')
        custom_instructions = serializer.validated_data.get('custom_ai_instructions', '')
        preferred_provider = serializer.validated_data.get('preferred_provider', '')

        if not title:
            title = os.path.splitext(uploaded_file.name)[0]

        ext = os.path.splitext(uploaded_file.name)[1].lower().lstrip('.')

        # Create Document in DB
        doc = Document.objects.create(
            title=title,
            original_filename=uploaded_file.name,
            file=uploaded_file,
            file_type=ext or 'unknown',
            file_size_bytes=uploaded_file.size,
            status=Document.Status.PENDING,
            processing_stage="Queued for conversion...",
            custom_ai_instructions=custom_instructions
        )

        # Dispatch async task or sync fallback
        use_celery = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) is False
        dispatched_async = False

        if use_celery:
            try:
                process_document_task.delay(
                    document_id=str(doc.id),
                    custom_instructions=custom_instructions,
                    preferred_provider=preferred_provider
                )
                dispatched_async = True
            except Exception as e:
                logger.warning(f"Could not dispatch Celery task ({e}). Executing synchronously.")
                dispatched_async = False

        if not dispatched_async:
            # Synchronous processing fallback
            process_document_pipeline(
                document_id=str(doc.id),
                custom_instructions=custom_instructions,
                preferred_provider=preferred_provider
            )
            doc.refresh_from_db()

        detail_serializer = DocumentDetailSerializer(doc, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    def get_object(self, pk):
        try:
            return Document.objects.get(pk=pk)
        except (Document.DoesNotExist, ValueError):
            raise Http404

    def get(self, request, pk):
        doc = self.get_object(pk)
        serializer = DocumentDetailSerializer(doc, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        """Update user edited markdown and recalculate real-time metrics."""
        doc = self.get_object(pk)
        serializer = DocumentUpdateMarkdownSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        edited_md = serializer.validated_data['user_edited_markdown']
        doc.user_edited_markdown = edited_md

        # Recalculate metrics in real-time
        tokenizer = TokenizerAnalyzer()
        metrics = tokenizer.analyze(
            raw_text=doc.raw_extracted_text or doc.raw_markdown or edited_md,
            raw_markdown=doc.raw_markdown or edited_md,
            cleaned_markdown=edited_md
        )

        doc.cleaned_tokens = metrics.cleaned_tokens
        doc.token_reduction_pct = metrics.token_reduction_pct
        doc.ai_readiness_score = metrics.readiness_score
        doc.metrics_breakdown = metrics.metrics_breakdown
        doc.save()

        detail_serializer = DocumentDetailSerializer(doc, context={'request': request})
        return Response(detail_serializer.data)

    def delete(self, request, pk):
        doc = self.get_object(pk)
        if doc.file:
            try:
                if os.path.exists(doc.file.path):
                    os.remove(doc.file.path)
            except Exception as e:
                logger.warning(f"Error removing file from disk: {e}")
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentReprocessView(APIView):
    def post(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except (Document.DoesNotExist, ValueError):
            raise Http404

        serializer = ReprocessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        instructions = serializer.validated_data.get('custom_ai_instructions', doc.custom_ai_instructions)
        provider = serializer.validated_data.get('preferred_provider', '')

        doc.custom_ai_instructions = instructions
        doc.status = Document.Status.PROCESSING
        doc.processing_stage = "Reprocessing with updated parameters..."
        doc.save()

        use_celery = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) is False
        dispatched_async = False

        if use_celery:
            try:
                process_document_task.delay(
                    document_id=str(doc.id),
                    custom_instructions=instructions,
                    preferred_provider=provider
                )
                dispatched_async = True
            except Exception as e:
                logger.warning(f"Reprocess Celery dispatch failed: {e}. Running sync.")

        if not dispatched_async:
            process_document_pipeline(
                document_id=str(doc.id),
                custom_instructions=instructions,
                preferred_provider=provider
            )
            doc.refresh_from_db()

        detail_serializer = DocumentDetailSerializer(doc, context={'request': request})
        return Response(detail_serializer.data)


class DocumentExportPdfView(APIView):
    def get(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except (Document.DoesNotExist, ValueError):
            raise Http404

        md_content = doc.current_markdown
        if not md_content:
            return Response({"error": "No Markdown content available to export."}, status=status.HTTP_400_BAD_REQUEST)

        pdf_bytes = DocumentExporter.markdown_to_pdf_bytes(md_content, title=doc.title)
        filename = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', doc.title)}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class DocumentExportMarkdownView(APIView):
    def get(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except (Document.DoesNotExist, ValueError):
            raise Http404

        md_content = doc.current_markdown
        filename = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', doc.title)}.md"

        response = HttpResponse(md_content, content_type='text/markdown; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
