import React, { useState, useEffect, useRef } from 'react';
import { Edit3, RotateCcw, Copy, Check, Hash, FileCode, AlignLeft } from 'lucide-react';

interface SplitEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onReset: () => void;
  isSaving: boolean;
}

export const SplitEditor: React.FC<SplitEditorProps> = ({
  content,
  onChange,
  onReset,
  isSaving,
}) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = (content || '').split('\n');
  const lineCount = Math.max(1, lines.length);
  const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;
  const charCount = (content || '').length;

  // Synchronize line numbers scroll with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard shortcut helpers (e.g. Tab for 2 spaces)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newText = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newText);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel border border-dark-750/80 bg-dark-900/70 overflow-hidden">
      
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-750/80 bg-dark-950/60">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Markdown Source
          </span>
          {isSaving ? (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse border border-amber-500/20">
              Saving...
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Synced
            </span>
          )}
        </div>

        {/* Editor Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
            title="Reset to AI normalized version"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body: Line Numbers + Textarea */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="w-12 py-4 select-none bg-dark-950/40 text-dark-600 font-mono text-xs text-right pr-3 overflow-hidden border-r border-dark-800/60 leading-[1.625rem]"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="Type or edit Markdown here..."
          className="flex-1 p-4 bg-transparent resize-none font-mono text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-0 leading-[1.625rem] overflow-y-auto placeholder:text-slate-600 selection:bg-brand-500/30"
        />
      </div>

      {/* Editor Footer: Word Count / Token Estimate */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-dark-750/80 bg-dark-950/60 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span>{lines.length} lines</span>
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
        <div className="text-slate-500">
          Tab: 2 spaces
        </div>
      </div>

    </div>
  );
};
