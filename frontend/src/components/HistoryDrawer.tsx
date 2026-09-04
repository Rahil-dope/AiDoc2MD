import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, FileText, ArrowUpRight, Zap, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { DocumentSummary } from '../types';
import { formatDate, formatBytes, formatNumber, getFileTypeInfo, getScoreColor } from '../utils/formatters';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentSummary[];
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (id: string) => Promise<void>;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocumentId,
  onSelectDocument,
  onDeleteDocument,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.original_filename.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      filterType === 'all' || doc.file_type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document from history?')) return;
    setDeletingId(id);
    try {
      await onDeleteDocument(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-dark-950/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md h-full glass-panel bg-dark-950/95 border-l border-dark-800 shadow-2xl flex flex-col"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-100">Conversion History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {documents.length} document{documents.length === 1 ? '' : 's'} recorded
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b border-dark-800/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversions..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-dark-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
            {['all', 'pdf', 'docx', 'xlsx', 'pptx', 'csv', 'txt'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg uppercase transition-colors shrink-0 ${
                  filterType === type
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 font-bold'
                    : 'bg-dark-900 text-slate-400 hover:text-slate-200 border border-dark-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => {
              const fileType = getFileTypeInfo(doc.file_type);
              const scoreColors = getScoreColor(doc.ai_readiness_score || 0);
              const isActive = activeDocumentId === doc.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDocument(doc.id);
                    onClose();
                  }}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-brand-500/10 border-brand-500/40 shadow-glow-sm'
                      : 'bg-dark-900/60 hover:bg-dark-900 border-dark-800/80 hover:border-dark-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${fileType.bg} ${fileType.color}`}>
                        {fileType.label}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                        {doc.title}
                      </h4>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      disabled={deletingId === doc.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metrics snapshot */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Zap className="w-3 h-3" />
                        -{doc.token_reduction_pct || 0}%
                      </span>
                      <span>{formatNumber(doc.cleaned_tokens || 0)} tk</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded font-bold ${scoreColors.bg} ${scoreColors.text}`}>
                        {(doc.ai_readiness_score || 0).toFixed(0)}/100
                      </span>
                    </div>
                  </div>

                  {/* Date & file size */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{formatDate(doc.created_at)}</span>
                    <span>{formatBytes(doc.file_size_bytes)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              <FileText className="w-8 h-8 mx-auto stroke-1 mb-2 text-slate-600" />
              <p>No conversion history found</p>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};
