import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  FileDown,
  Columns2,
  Edit3,
  Eye,
  GitCompare,
  RotateCcw,
  Check,
  FileText,
  Clock,
  Zap,
  Share2
} from 'lucide-react';
import { DocumentDetail, ViewMode, ReprocessOptions } from '../types';
import { TokenAnalytics } from './TokenAnalytics';
import { ReadinessScoreBadge } from './ReadinessScoreBadge';
import { SplitEditor } from './SplitEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { DiffViewer } from './DiffViewer';
import { ReprocessModal } from './ReprocessModal';
import { formatBytes, formatDate, getFileTypeInfo } from '../utils/formatters';
import { api } from '../api/client';

interface DocumentWorkspaceProps {
  document: DocumentDetail;
  onUpdateMarkdown: (newMarkdown: string) => Promise<void>;
  onReprocess: (options: ReprocessOptions) => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  document,
  onUpdateMarkdown,
  onReprocess,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [currentMarkdown, setCurrentMarkdown] = useState<string>(document.current_markdown || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isReprocessOpen, setIsReprocessOpen] = useState<boolean>(false);
  const [copiedMd, setCopiedMd] = useState<boolean>(false);

  // Sync markdown if active document changes
  useEffect(() => {
    setCurrentMarkdown(document.current_markdown || '');
  }, [document.id, document.current_markdown]);

  // Debounced auto-save markdown changes
  useEffect(() => {
    if (currentMarkdown === document.current_markdown) return;

    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        await onUpdateMarkdown(currentMarkdown);
      } catch (err: any) {
        onShowToast('error', 'Failed to save edits', err.message);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [currentMarkdown]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(currentMarkdown);
    setCopiedMd(true);
    onShowToast('success', 'Markdown copied to clipboard');
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('success', 'Downloaded .md file');
  };

  const handleExportPdf = () => {
    if (document.id.startsWith('local-')) {
      // Standalone mode PDF print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${document.title} - AiDoc2MD PDF Export</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                h2 { color: #334155; margin-top: 24px; }
                pre { background: #f1f5f9; padding: 16px; border-radius: 8px; font-family: monospace; overflow-x: auto; }
                code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
                blockquote { border-left: 4px solid #8b5cf6; padding-left: 16px; color: #64748b; margin: 16px 0; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                th { background: #f8fafc; }
              </style>
            </head>
            <body>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">AiDoc2MD Document Export • ${document.title}</div>
              <pre style="white-space: pre-wrap; font-family: inherit;">${currentMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
      onShowToast('info', 'Opening PDF print preview...');
      return;
    }

    const pdfUrl = api.getExportPdfUrl(document.id);
    const link = window.document.createElement('a');
    link.href = pdfUrl;
    link.download = `${document.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    link.target = '_blank';
    link.click();
    onShowToast('info', 'Generating formatted PDF...');
  };

  const handleResetToCleaned = () => {
    if (document.cleaned_markdown) {
      setCurrentMarkdown(document.cleaned_markdown);
      onShowToast('info', 'Reset to AI cleaned markdown');
    }
  };

  const fileType = getFileTypeInfo(document.file_type);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Document Title & Toolbar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 glass-panel p-5 rounded-3xl border border-dark-750/80 bg-dark-900/60">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${fileType.bg} ${fileType.color}`}>
              {fileType.label}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 truncate">
              {document.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
            <span>{document.original_filename}</span>
            <span>•</span>
            <span>{formatBytes(document.file_size_bytes)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {formatDate(document.created_at)}
            </span>
          </div>
        </div>

        {/* Global Action Hub */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Reprocess Button */}
          <button
            onClick={() => setIsReprocessOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Reprocess</span>
          </button>

          {/* Copy Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-medium border border-dark-700 transition-colors"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMd ? 'Copied' : 'Copy MD'}</span>
          </button>

          {/* Download .MD */}
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-medium border border-dark-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.MD</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-medium border border-dark-700 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-red-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* 2. AI Readiness Score Gauge */}
      <ReadinessScoreBadge
        score={document.ai_readiness_score || 0}
        breakdown={document.metrics_breakdown}
      />

      {/* 3. Token Analytics Cards */}
      <TokenAnalytics document={document} />

      {/* 4. View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-dark-900/90 border border-dark-800">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-brand-600 text-white font-semibold shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split Editor & Preview</span>
            <span className="sm:hidden">Split</span>
          </button>

          <button
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'editor'
                ? 'bg-brand-600 text-white font-semibold shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>

          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'preview'
                ? 'bg-brand-600 text-white font-semibold shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setViewMode('diff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'diff'
                ? 'bg-brand-600 text-white font-semibold shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Diff Mode</span>
          </button>
        </div>
      </div>

      {/* 5. Main Split Screen Workspace Area */}
      <div className="h-[680px] w-full">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <SplitEditor
              content={currentMarkdown}
              onChange={setCurrentMarkdown}
              onReset={handleResetToCleaned}
              isSaving={isSaving}
            />
            <MarkdownPreview content={currentMarkdown} />
          </div>
        )}

        {viewMode === 'editor' && (
          <div className="h-full">
            <SplitEditor
              content={currentMarkdown}
              onChange={setCurrentMarkdown}
              onReset={handleResetToCleaned}
              isSaving={isSaving}
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="h-full">
            <MarkdownPreview content={currentMarkdown} />
          </div>
        )}

        {viewMode === 'diff' && (
          <div className="h-full">
            <DiffViewer
              originalText={document.raw_extracted_text || document.raw_markdown || ''}
              cleanedText={currentMarkdown}
            />
          </div>
        )}
      </div>

      {/* AI Reprocess Modal */}
      <ReprocessModal
        isOpen={isReprocessOpen}
        onClose={() => setIsReprocessOpen(false)}
        onReprocess={onReprocess}
        currentInstructions={document.custom_ai_instructions}
        currentProvider={document.ai_provider_used}
      />

    </div>
  );
};
