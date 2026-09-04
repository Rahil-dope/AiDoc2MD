import React, { useState } from 'react';
import { diffLines, diffWords, Change } from 'diff';
import { GitCompare, Plus, Minus, Check, Layers } from 'lucide-react';

interface DiffViewerProps {
  originalText: string;
  cleanedText: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ originalText, cleanedText }) => {
  const [diffMode, setDiffMode] = useState<'lines' | 'words'>('lines');
  const [viewType, setViewType] = useState<'unified' | 'split'>('unified');

  const rawBefore = originalText || '';
  const rawAfter = cleanedText || '';

  const changes: Change[] = diffMode === 'lines'
    ? diffLines(rawBefore, rawAfter)
    : diffWords(rawBefore, rawAfter);

  const additions = changes.filter((c) => c.added).reduce((acc, c) => acc + (c.count || 1), 0);
  const deletions = changes.filter((c) => c.removed).reduce((acc, c) => acc + (c.count || 1), 0);

  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel border border-dark-750/80 bg-dark-900/70 overflow-hidden">
      
      {/* Diff Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-dark-750/80 bg-dark-950/60 gap-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Raw Extraction vs AI-Cleaned Diff
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Additions / Deletions count */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +{additions}
            </span>
            <span className="flex items-center text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              -{deletions}
            </span>
          </div>

          {/* Granularity mode */}
          <div className="flex items-center rounded-lg bg-dark-800 p-0.5 border border-dark-700">
            <button
              onClick={() => setDiffMode('lines')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                diffMode === 'lines' ? 'bg-dark-950 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lines
            </button>
            <button
              onClick={() => setDiffMode('words')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                diffMode === 'words' ? 'bg-dark-950 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Words
            </button>
          </div>
        </div>
      </div>

      {/* Diff Body */}
      <div className="flex-1 p-6 overflow-y-auto font-mono text-xs leading-relaxed">
        <div className="rounded-xl overflow-hidden border border-dark-800 bg-dark-950/60 divide-y divide-dark-850">
          {changes.map((part, index) => {
            if (part.added) {
              return (
                <div key={index} className="bg-emerald-950/20 text-emerald-300 px-4 py-1.5 flex items-start gap-2 border-l-4 border-emerald-500">
                  <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap flex-1">{part.value}</span>
                </div>
              );
            }
            if (part.removed) {
              return (
                <div key={index} className="bg-rose-950/20 text-rose-300 line-through opacity-80 px-4 py-1.5 flex items-start gap-2 border-l-4 border-rose-500">
                  <Minus className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap flex-1">{part.value}</span>
                </div>
              );
            }
            return (
              <div key={index} className="text-slate-400 px-4 py-1.5 pl-8 whitespace-pre-wrap hover:bg-dark-900/40">
                {part.value}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
