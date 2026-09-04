import { DocumentDetail, DocumentSummary, ReprocessOptions } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getHealth(): Promise<{ status: string; features: Record<string, boolean> }> {
    const res = await fetch(`${this.baseUrl}/health/`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  }

  async getDocuments(): Promise<DocumentSummary[]> {
    const res = await fetch(`${this.baseUrl}/documents/`);
    if (!res.ok) throw new Error('Failed to fetch conversion history');
    return res.json();
  }

  async getDocument(id: string): Promise<DocumentDetail> {
    const res = await fetch(`${this.baseUrl}/documents/${id}/`);
    if (!res.ok) throw new Error(`Failed to fetch document ${id}`);
    return res.json();
  }

  async uploadDocument(
    file: File,
    options?: {
      title?: string;
      custom_ai_instructions?: string;
      preferred_provider?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<DocumentDetail> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.title) formData.append('title', options.title);
    if (options?.custom_ai_instructions) formData.append('custom_ai_instructions', options.custom_ai_instructions);
    if (options?.preferred_provider) formData.append('preferred_provider', options.preferred_provider);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/documents/upload/`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response from server'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || err.error || err.file?.[0] || 'Upload failed'));
          } catch {
            reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };

      xhr.send(formData);
    });
  }

  async updateMarkdown(id: string, user_edited_markdown: string): Promise<DocumentDetail> {
    const res = await fetch(`${this.baseUrl}/documents/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_edited_markdown }),
    });
    if (!res.ok) throw new Error('Failed to update document markdown');
    return res.json();
  }

  async reprocessDocument(id: string, options: ReprocessOptions): Promise<DocumentDetail> {
    const res = await fetch(`${this.baseUrl}/documents/${id}/reprocess/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error('Failed to reprocess document');
    return res.json();
  }

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/documents/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete document');
  }

  getExportPdfUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/export/pdf/`;
  }

  getExportMarkdownUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/export/md/`;
  }
}

export const api = new ApiClient(API_BASE_URL);
