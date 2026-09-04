import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from documents.models import Document


@pytest.mark.django_db
def test_document_upload_and_list():
    client = APIClient()
    file_content = b"# Document Title\nThis is test content inside uploaded file."
    uploaded = SimpleUploadedFile("test_doc.md", file_content, content_type="text/markdown")

    # Test Upload
    response = client.post(reverse('document-upload'), {
        'file': uploaded,
        'title': 'Test Document'
    }, format='multipart')

    assert response.status_code == 201
    doc_id = response.data['id']
    assert response.data['title'] == 'Test Document'
    assert response.data['status'] in [Document.Status.COMPLETED, Document.Status.PENDING, Document.Status.PROCESSING]

    # Test List
    list_response = client.get(reverse('document-list-create'))
    assert list_response.status_code == 200
    assert len(list_response.data) >= 1

    # Test Retrieve
    detail_response = client.get(reverse('document-detail', kwargs={'pk': doc_id}))
    assert detail_response.status_code == 200
    assert detail_response.data['id'] == doc_id

    # Test Edit Markdown (PATCH)
    patch_response = client.patch(
        reverse('document-detail', kwargs={'pk': doc_id}),
        {'user_edited_markdown': '# Updated Title\nClean edited content.'},
        format='json'
    )
    assert patch_response.status_code == 200
    assert patch_response.data['user_edited_markdown'] == '# Updated Title\nClean edited content.'
    assert patch_response.data['cleaned_tokens'] > 0

    # Test PDF Export
    pdf_response = client.get(reverse('document-export-pdf', kwargs={'pk': doc_id}))
    assert pdf_response.status_code == 200
    assert pdf_response['Content-Type'] == 'application/pdf'
    assert len(pdf_response.content) > 0

    # Test Markdown Export
    md_response = client.get(reverse('document-export-md', kwargs={'pk': doc_id}))
    assert md_response.status_code == 200
    assert 'attachment' in md_response['Content-Disposition']
