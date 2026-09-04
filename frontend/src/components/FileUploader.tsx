import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

interface FileUploaderProps {
  onUpload: (file: File, options?: { custom_ai_instructions?: string; preferred_provider?: string }) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  processingStage?: string;
  onLoadSample: (sampleType: 'report' | 'finance' | 'architecture') => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUpload,
  isUploading,
  uploadProgress,
  processingStage,
  onLoadSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [
    { ext: 'PDF', name: 'Reports & Research', icon: <FileText className="w-3.5 h-3.5 text-red-400" /> },
    { ext: 'DOCX', name: 'Word Documents', icon: <FileText className="w-3.5 h-3.5 text-blue-400" /> },
    { ext: 'XLSX', name: 'Sheets & Tables', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> },
    { ext: 'PPTX', name: 'Presentations', icon: <FileText className="w-3.5 h-3.5 text-orange-400" /> },
    { ext: 'CSV', name: 'Tabular Data', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" /> },
    { ext: 'IMG', name: 'Scans & Images', icon: <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onUpload(file, { custom_ai_instructions: customInstructions });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onUpload(file, { custom_ai_instructions: customInstructions });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <div className="text-center mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-mono font-medium shadow-glow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
          <span>Next-Gen Document Normalization & Token Reduction</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400">
          Transform Raw Documents into <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400">
            LLM-Ready Context
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Upload complex multi-page PDFs, Excel workbooks, Word docs, or CSVs. Convert with Microsoft MarkItDown, eliminate OCR noise, and measure token savings with tiktoken.
        </p>
      </div>

      {/* Main Drag-and-Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative group rounded-3xl p-8 sm:p-12 transition-all duration-300 cursor-pointer overflow-hidden border text-center ${
          isDragOver
            ? 'bg-brand-500/15 border-brand-400 shadow-glow-md scale-[1.01]'
            : 'bg-dark-900/60 hover:bg-dark-900/90 border-dark-750 hover:border-brand-500/50 shadow-2xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.txt,.md,.png,.jpg,.jpeg,.webp"
          className="hidden"
          disabled={isUploading}
        />

        {/* Ambient background blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-500/20 transition-all duration-500" />

        {isUploading ? (
          /* Upload / Processing State */
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/40 animate-spin" />
              <Zap className="w-7 h-7 text-brand-400 absolute" />
            </div>

            <div className="space-y-1.5 max-w-md w-full">
              <h3 className="font-bold text-base text-slate-100 font-mono">
                {processingStage || 'Processing document...'}
              </h3>
              <p className="text-xs text-slate-400">
                Running MarkItDown extraction, AI normalization, and token analytics.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs bg-dark-950 rounded-full h-2 overflow-hidden border border-dark-800 p-0.5 mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(15, uploadProgress)}%` }}
                className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        ) : (
          /* Idle Drag-Drop State */
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-dark-850 border border-dark-700 flex items-center justify-center text-brand-400 group-hover:scale-110 group-hover:border-brand-500/50 group-hover:shadow-glow-sm transition-all duration-300 shadow-inner">
              <UploadCloud className="w-8 h-8 stroke-[1.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-100">
                Drop your document here, or <span className="text-brand-400 underline decoration-brand-500/50 underline-offset-4">browse</span>
              </h3>
              <p className="text-xs text-slate-400">
                Supports PDF, DOCX, XLSX, PPTX, CSV, TXT & Images (up to 50MB)
              </p>
            </div>

            {/* Format Badges */}
            <div className="flex flex-wrap justify-center gap-2 pt-3 max-w-lg">
              {supportedFormats.map((fmt) => (
                <div
                  key={fmt.ext}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-950/80 border border-dark-800 text-slate-300 text-xs font-mono"
                >
                  {fmt.icon}
                  <span className="font-bold">{fmt.ext}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instant Demo Samples */}
      <div className="mt-8 pt-6 border-t border-dark-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Or test with a sample file:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onLoadSample('report')}
            className="p-3.5 rounded-2xl glass-panel bg-dark-900/60 hover:bg-dark-850 border border-dark-800 hover:border-brand-500/40 text-left transition-all hover:scale-[1.01] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 group-hover:text-brand-300 transition-colors">
                📄 AI Research Report
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates multi-page PDF with OCR headers, noisy footnotes, and code.
            </p>
          </button>

          <button
            onClick={() => onLoadSample('finance')}
            className="p-3.5 rounded-2xl glass-panel bg-dark-900/60 hover:bg-dark-850 border border-dark-800 hover:border-emerald-500/40 text-left transition-all hover:scale-[1.01] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                📊 Financial Q3 Sheet
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Messy CSV & spreadsheet rows normalized into pristine GFM tables.
            </p>
          </button>

          <button
            onClick={() => onLoadSample('architecture')}
            className="p-3.5 rounded-2xl glass-panel bg-dark-900/60 hover:bg-dark-850 border border-dark-800 hover:border-indigo-500/40 text-left transition-all hover:scale-[1.01] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                🏗️ System Design DOCX
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Doc with hierarchical headings, bullet points, and code blocks.
            </p>
          </button>
        </div>
      </div>

    </div>
  );
};
