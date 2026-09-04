from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'file_type',
        'status',
        'raw_tokens',
        'cleaned_tokens',
        'token_reduction_pct',
        'ai_readiness_score',
        'ai_provider_used',
        'created_at'
    )
    list_filter = ('status', 'file_type', 'ai_provider_used', 'created_at')
    search_fields = ('title', 'original_filename', 'raw_extracted_text', 'cleaned_markdown')
    readonly_fields = ('id', 'created_at', 'updated_at')
