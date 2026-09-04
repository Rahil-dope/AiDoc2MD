import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Wand2, Check, Cpu } from 'lucide-react';
import { ReprocessOptions } from '../types';

interface ReprocessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprocess: (options: ReprocessOptions) => Promise<void>;
  currentInstructions?: string | null;
  currentProvider?: string | null;
}

export const ReprocessModal: React.FC<ReprocessModalProps> = ({
  isOpen,
  onClose,
  onReprocess,
  currentInstructions = '',
  currentProvider = 'auto',
}) => {
  const [instructions, setInstructions] = useState(currentInstructions || '');
  const [provider, setProvider] = useState<'auto' | 'openai' | 'gemini' | 'heuristic'>(
    (currentProvider as any) || 'auto'
  );
  const [loading, setLoading] = useState(false);

  const presets = [
    "Reconstruct all data tables and align markdown columns perfectly.",
    "Remove all repeated page numbers, headers, footers, and copyright notices.",
    "Convert dense text sections into structured bullet points and subheadings.",
    "Preserve code snippets and wrap with proper markdown syntax highlighting."
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onReprocess({
        custom_ai_instructions: instructions,
        preferred_provider: provider,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl glass-panel bg-dark-900 rounded-2xl border border-dark-750 shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-750/80 bg-dark-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">AI Reprocessing Studio</h3>
              <p className="text-xs text-slate-400">Customize normalization rules and AI model pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Normalization Engine
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'auto', name: 'Auto (Best)' },
                { id: 'openai', name: 'OpenAI GPT-4o' },
                { id: 'gemini', name: 'Google Gemini' },
                { id: 'heuristic', name: 'Deterministic' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setProvider(item.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    provider === item.id
                      ? 'bg-brand-500/20 text-brand-200 border-brand-500/50 shadow-glow-sm'
                      : 'bg-dark-950/40 text-slate-400 border-dark-800 hover:border-dark-700 hover:text-slate-200'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Instructions */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Custom AI Cleaning Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="e.g., Focus on extracting numerical financial data into clean tables, remove introductory disclaimers..."
              className="w-full px-4 py-3 rounded-xl bg-dark-950/80 border border-dark-800 focus:border-brand-500 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          {/* Presets */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-1.5">Quick Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setInstructions(preset)}
                  className="text-[11px] text-slate-400 hover:text-brand-300 bg-dark-950/40 hover:bg-dark-800/80 px-2.5 py-1 rounded-lg border border-dark-800/60 transition-colors text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-dark-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow-sm transition-all disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Normalizing...' : 'Run Normalization'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
