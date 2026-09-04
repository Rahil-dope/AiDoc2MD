import os
import logging
from celery import shared_task
from django.utils import timezone
from .models import Document
from .services.converter import DocumentConverter
from .services.ai_cleaner import AICleaner
from .services.tokenizer import TokenizerAnalyzer

logger = logging.getLogger(__name__)


def process_document_pipeline(
    document_id: str,
    custom_instructions: str = None,
    preferred_provider: str = None
):
    """
    Main processing pipeline:
    1. Update status -> PROCESSING
    2. DocumentConverter -> MarkItDown / Fallback to extract Markdown & Raw text
    3. AICleaner -> Normalize structure, fix tables, clean OCR noise
    4. TokenizerAnalyzer -> Calculate tiktoken counts, savings %, and AI Readiness Score
    5. Save results to Database -> Status COMPLETED
    """
    try:
        doc = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found for processing.")
        return

    try:
        doc.status = Document.Status.PROCESSING
        doc.processing_stage = "Converting document with MarkItDown..."
        doc.error_message = None
        doc.save(update_fields=['status', 'processing_stage', 'error_message', 'updated_at'])

        file_path = doc.file.path
        converter = DocumentConverter()
        conversion_result = converter.convert(file_path, doc.file_type)

        if conversion_result.error:
            doc.status = Document.Status.FAILED
            doc.processing_stage = "Conversion Failed"
            doc.error_message = conversion_result.error
            doc.save()
            return

        doc.raw_extracted_text = conversion_result.raw_extracted_text
        doc.raw_markdown = conversion_result.raw_markdown
        doc.processing_stage = "Running AI Normalization & Structure Cleanup..."
        doc.save(update_fields=['raw_extracted_text', 'raw_markdown', 'processing_stage', 'updated_at'])

        # 2. AI Normalization
        ai_cleaner = AICleaner()
        instructions = custom_instructions or doc.custom_ai_instructions
        clean_result = ai_cleaner.clean(
            raw_markdown=doc.raw_markdown,
            custom_instructions=instructions,
            preferred_provider=preferred_provider
        )

        doc.cleaned_markdown = clean_result.cleaned_markdown
        doc.ai_provider_used = clean_result.provider_used
        doc.processing_stage = "Computing Tiktoken Analytics & AI Readiness Score..."
        doc.save(update_fields=['cleaned_markdown', 'ai_provider_used', 'processing_stage', 'updated_at'])

        # 3. Tokenizer & AI Readiness Analysis
        tokenizer = TokenizerAnalyzer()
        metrics = tokenizer.analyze(
            raw_text=doc.raw_extracted_text,
            raw_markdown=doc.raw_markdown,
            cleaned_markdown=doc.cleaned_markdown
        )

        doc.raw_tokens = metrics.raw_tokens
        doc.markdown_tokens = metrics.markdown_tokens
        doc.cleaned_tokens = metrics.cleaned_tokens
        doc.token_reduction_pct = metrics.token_reduction_pct
        doc.ai_readiness_score = metrics.readiness_score
        doc.metrics_breakdown = metrics.metrics_breakdown

        doc.status = Document.Status.COMPLETED
        doc.processing_stage = "Completed"
        doc.save()
        logger.info(f"Successfully processed Document {document_id}: {doc.title}")

    except Exception as e:
        logger.exception(f"Fatal error processing Document {document_id}: {e}")
        doc.status = Document.Status.FAILED
        doc.processing_stage = "Fatal Error"
        doc.error_message = str(e)
        doc.save()


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def process_document_task(self, document_id: str, custom_instructions: str = None, preferred_provider: str = None):
    """Celery background task wrapper."""
    try:
        process_document_pipeline(document_id, custom_instructions, preferred_provider)
    except Exception as exc:
        logger.error(f"Task failed for doc {document_id}: {exc}")
        raise self.retry(exc=exc)
