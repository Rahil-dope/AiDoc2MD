import uuid
import os
from django.db import models


def document_upload_path(instance, filename):
    return f'uploads/{instance.id}/{filename}'


class Document(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=document_upload_path)
    file_type = models.CharField(max_length=50, blank=True)
    file_size_bytes = models.BigIntegerField(default=0)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    processing_stage = models.CharField(max_length=100, default='Queued')
    error_message = models.TextField(blank=True, null=True)

    # Markdown & Content Representations
    raw_extracted_text = models.TextField(blank=True, null=True)
    raw_markdown = models.TextField(blank=True, null=True)
    cleaned_markdown = models.TextField(blank=True, null=True)
    user_edited_markdown = models.TextField(blank=True, null=True)

    # Token & Quality Metrics
    raw_tokens = models.IntegerField(default=0)
    markdown_tokens = models.IntegerField(default=0)
    cleaned_tokens = models.IntegerField(default=0)
    token_reduction_pct = models.FloatField(default=0.0)
    ai_readiness_score = models.FloatField(default=0.0)
    metrics_breakdown = models.JSONField(default=dict, blank=True)

    # AI Metadata
    ai_provider_used = models.CharField(max_length=50, blank=True, null=True)
    custom_ai_instructions = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.file_type}) - {self.status}"

    @property
    def current_markdown(self):
        """Returns the user edited markdown if available, else cleaned markdown, else raw markdown."""
        if self.user_edited_markdown is not None and self.user_edited_markdown != '':
            return self.user_edited_markdown
        if self.cleaned_markdown:
            return self.cleaned_markdown
        return self.raw_markdown or ''

    def save(self, *args, **kwargs):
        if not self.title and self.original_filename:
            self.title = os.path.splitext(self.original_filename)[0]
        if not self.file_type and self.original_filename:
            ext = os.path.splitext(self.original_filename)[1].lower().lstrip('.')
            self.file_type = ext or 'unknown'
        if self.file and hasattr(self.file, 'size') and not self.file_size_bytes:
            self.file_size_bytes = self.file.size
        super().save(*args, **kwargs)
