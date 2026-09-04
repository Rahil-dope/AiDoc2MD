import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { HistoryDrawer } from './components/HistoryDrawer';
import { NotificationToast } from './components/NotificationToast';
import { DocumentDetail, DocumentSummary, ToastMessage, ReprocessOptions } from './types';
import { api } from './api/client';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeDocument, setActiveDocument] = useState<DocumentDetail | null>(null);
  const [history, setHistory] = useState<DocumentSummary[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toggle Dark/Light Theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  // Fetch Health & History
  const fetchHistory = useCallback(async () => {
    try {
      const docs = await api.getDocuments();
      setHistory(docs);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.getHealth();
        setBackendHealthy(true);
      } catch {
        setBackendHealthy(false);
      }
    };

    checkHealth();
    fetchHistory();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Polling for active document status if still processing
  useEffect(() => {
    if (!activeDocument || (activeDocument.status !== 'PENDING' && activeDocument.status !== 'PROCESSING')) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updated = await api.getDocument(activeDocument.id);
        setActiveDocument(updated);
        setProcessingStage(updated.processing_stage);

        if (updated.status === 'COMPLETED') {
          addToast('success', 'Document Conversion Complete', `${updated.title} is ready with token metrics.`);
          fetchHistory();
        } else if (updated.status === 'FAILED') {
          addToast('error', 'Processing Failed', updated.error_message || 'Could not parse document.');
          fetchHistory();
        }
      } catch (e) {
        console.error('Error polling document status:', e);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [activeDocument?.id, activeDocument?.status, fetchHistory]);

  // Handle File Upload
  const handleUpload = async (
    file: File,
    options?: { custom_ai_instructions?: string; preferred_provider?: string }
  ) => {
    setIsUploading(true);
    setUploadProgress(10);
    setProcessingStage('Uploading document...');

    try {
      const doc = await api.uploadDocument(file, options, (progress) => {
        setUploadProgress(progress);
        if (progress >= 100) {
          setProcessingStage('Converting document with MarkItDown...');
        }
      });

      setActiveDocument(doc);
      setProcessingStage(doc.processing_stage);
      addToast('info', 'File Uploaded', 'Processing pipeline initiated.');
      fetchHistory();
    } catch (err: any) {
      addToast('error', 'Upload Error', err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Live Markdown Update
  const handleUpdateMarkdown = async (newMarkdown: string) => {
    if (!activeDocument) return;
    try {
      const updated = await api.updateMarkdown(activeDocument.id, newMarkdown);
      setActiveDocument(updated);
      fetchHistory();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
      throw err;
    }
  };

  // Handle Reprocess
  const handleReprocess = async (options: ReprocessOptions) => {
    if (!activeDocument) return;
    try {
      addToast('info', 'Reprocessing', 'Running AI normalization with custom rules...');
      const updated = await api.reprocessDocument(activeDocument.id, options);
      setActiveDocument(updated);
      fetchHistory();
      addToast('success', 'Reprocessed Successfully');
    } catch (err: any) {
      addToast('error', 'Reprocess Error', err.message);
    }
  };

  // Select document from history
  const handleSelectDocument = async (id: string) => {
    try {
      const doc = await api.getDocument(id);
      setActiveDocument(doc);
    } catch (err: any) {
      addToast('error', 'Load Failed', err.message);
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      if (activeDocument?.id === id) {
        setActiveDocument(null);
      }
      fetchHistory();
      addToast('info', 'Document Deleted');
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  // Instant Sample Generator
  const handleLoadSample = async (sampleType: 'report' | 'finance' | 'architecture') => {
    let filename = 'sample_report.md';
    let title = 'AI Research Report';
    let sampleContent = '';

    if (sampleType === 'report') {
      filename = 'ai_agent_research_phase1.md';
      title = 'Autonomous Agent Benchmarks';
      sampleContent = `Page 1 of 8
----------------------------------------
RESEARCH REPORT: BTCOS708 SEMESTER 7
----------------------------------------

CHAPTER ONE: EXECUTIVE OVERVIEW

This paper explores token compression architectures and multi-agent coordination frameworks in enterprise context systems. 

Key finding shows that unoptimized raw OCR text carries ligature artifacts such as ﬁnancial and ﬂow metrics, alongside duplicate page headers.

* Benchmark 1: Standard LLM context window limits
* Benchmark 2: Document parsing noise overhead
* Benchmark 3: GFM table structure efficiency

| Metric Name | Raw Extracted | Normalized Markdown | Efficiency Gain |
| Context Tokens | 14,850 | 9,420 | 36.5% |
| Retrieval Latency | 320ms | 185ms | 42.1% |
| Hallucination Rate | 8.4% | 2.1% | 75.0% |

\`\`\`python
def evaluate_context_density(tokens: int, useful_tokens: int) -> float:
    return (useful_tokens / tokens) * 100.0
\`\`\`

Page 2 of 8
----------------------------------------
CHAPTER TWO: SYSTEM RECOMMENDATIONS

All document pipelines should apply deterministic table alignment and ligature substitution prior to RAG indexing.
`;
    } else if (sampleType === 'finance') {
      filename = 'q3_financial_breakdown.csv';
      title = 'Q3 Corporate Financials';
      sampleContent = `Department,Q1_Budget,Q2_Budget,Q3_Actual,Variance_Pct,Status
Engineering,1250000,1400000,1385000,-1.07%,Optimal
Product Design,450000,480000,495000,+3.12%,Approved
Infrastructure,850000,920000,890000,-3.26%,Optimal
AI Compute & LLM API,600000,950000,910000,-4.21%,High Priority
Security & Compliance,320000,340000,335000,-1.47%,Optimal
`;
    } else {
      filename = 'contextforge_architecture_rfc.docx';
      title = 'ContextForge Architecture RFC';
      sampleContent = `# ContextForge Architecture RFC

## 1. Abstract
ContextForge is an end-to-end document normalization and token accounting platform built for high-throughput LLM pipelines.

## 2. Component Design
- **API Gateway**: Django REST Framework
- **Worker Tier**: Celery Distributed Task Queue
- **Converter**: Microsoft MarkItDown with fallbacks
- **Tokenizer**: Tiktoken byte-pair encoding cl100k

\`\`\`typescript
interface TokenReport {
  raw_tokens: number;
  cleaned_tokens: number;
  savings_pct: number;
}
\`\`\`
`;
    }

    const file = new File([sampleContent], filename, { type: 'text/markdown' });
    await handleUpload(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100 transition-colors">
      
      {/* Header */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewUpload={() => setActiveDocument(null)}
        historyCount={history.length}
        hasActiveDocument={Boolean(activeDocument)}
        backendHealthy={backendHealthy}
      />

      {/* Main App Content View */}
      <main className="flex-1 flex flex-col">
        {activeDocument ? (
          <DocumentWorkspace
            document={activeDocument}
            onUpdateMarkdown={handleUpdateMarkdown}
            onReprocess={handleReprocess}
            onShowToast={addToast}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <FileUploader
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              processingStage={processingStage}
              onLoadSample={handleLoadSample}
            />
          </div>
        )}
      </main>

      {/* Conversion History Slide-Over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        documents={history}
        activeDocumentId={activeDocument?.id || null}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      {/* Toast Notifications */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

      {/* Minimal Footer */}
      <footer className="border-t border-dark-800/60 py-4 px-6 text-center text-xs font-mono text-slate-500">
        ContextForge • AI Document-to-Markdown & Token Efficiency Studio • Django REST + Celery + MarkItDown + Tiktoken + React
      </footer>

    </div>
  );
};
