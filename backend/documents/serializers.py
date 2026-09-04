import os
from rest_framework import serializers
from .models import Document


class DocumentListSerializer(serializers.ModelSerializer):
    saved_tokens = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'original_filename',
            'file_type',
            'file_size_bytes',
            'status',
            'processing_stage',
            'raw_tokens',
            'cleaned_tokens',
            'saved_tokens',
            'token_reduction_pct',
            'ai_readiness_score',
            'ai_provider_used',
            'created_at',
            'updated_at'
        ]

    def get_saved_tokens(self, obj):
        return max(0, obj.raw_tokens - obj.cleaned_tokens)


class DocumentDetailSerializer(serializers.ModelSerializer):
    current_markdown = serializers.CharField(read_only=True)
    saved_tokens = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'original_filename',
            'file_url',
            'file_type',
            'file_size_bytes',
            'status',
            'processing_stage',
            'error_message',
            'raw_extracted_text',
            'raw_markdown',
            'cleaned_markdown',
            'user_edited_markdown',
            'current_markdown',
            'raw_tokens',
            'markdown_tokens',
            'cleaned_tokens',
            'saved_tokens',
            'token_reduction_pct',
            'ai_readiness_score',
            'metrics_breakdown',
            'ai_provider_used',
            'custom_ai_instructions',
            'created_at',
            'updated_at'
        ]

    def get_saved_tokens(self, obj):
        return max(0, obj.raw_tokens - obj.cleaned_tokens)

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    custom_ai_instructions = serializers.CharField(required=False, allow_blank=True)
    preferred_provider = serializers.CharField(max_length=50, required=False, allow_blank=True)

    DISALLOWED_IMAGE_EXTENSIONS = {
        'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'svg', 'ico', 'heic', 'raw', 'avif'
    }

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower().lstrip('.')
        if ext in self.DISALLOWED_IMAGE_EXTENSIONS:
            raise serializers.ValidationError(
                "Image files are not supported. AiDoc2MD is dedicated to document conversion (PDF, DOCX, XLSX, PPTX, CSV, RTF, EPUB, ODF, TXT)."
            )
        return value


class DocumentUpdateMarkdownSerializer(serializers.Serializer):
    user_edited_markdown = serializers.CharField(required=True, allow_blank=True)


class ReprocessSerializer(serializers.Serializer):
    custom_ai_instructions = serializers.CharField(required=False, allow_blank=True)
    preferred_provider = serializers.CharField(max_length=50, required=False, allow_blank=True)
