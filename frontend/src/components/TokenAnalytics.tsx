import React from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingDown, DollarSign, Database, Layers, ArrowRight } from 'lucide-react';
import { DocumentDetail } from '../types';
import { formatNumber } from '../utils/formatters';

interface TokenAnalyticsProps {
  document: DocumentDetail;
}

export const TokenAnalytics: React.FC<TokenAnalyticsProps> = ({ document }) => {
  const rawTokens = document.raw_tokens || 0;
  const cleanedTokens = document.cleaned_tokens || 0;
  const savedTokens = Math.max(0, rawTokens - cleanedTokens);
  const reductionPct = document.token_reduction_pct || 0;
  const costSavings = document.metrics_breakdown?.cost_savings;
  const contextUsage = document.metrics_breakdown?.context_usage;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* 1. Token Comparison Card */}
      <div className="glass-panel p-4 rounded-2xl border border-dark-750/80 bg-dark-900/60 relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Token Accounting
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
              tiktoken (cl100k)
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono text-slate-400">Extracted Raw</p>
              <p className="text-lg font-mono font-bold text-slate-300">
                {formatNumber(rawTokens)} <span className="text-xs font-normal text-slate-400">tk</span>
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-[11px] font-mono text-emerald-400">Optimized MD</p>
              <p className="text-lg font-mono font-bold text-emerald-400">
                {formatNumber(cleanedTokens)} <span className="text-xs font-normal text-emerald-500">tk</span>
              </p>
            </div>
          </div>
        </div>

        {/* Visual Token Comparison Bar */}
        <div className="mt-4 pt-3 border-t border-dark-800/80">
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5">
            <span>Compression Ratio</span>
            <span className="text-emerald-400 font-bold">
              {rawTokens > 0 ? `${((cleanedTokens / rawTokens) * 100).toFixed(1)}% of original` : '100%'}
            </span>
          </div>
          <div className="w-full h-2.5 bg-dark-950 rounded-full overflow-hidden flex p-0.5 border border-dark-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, rawTokens > 0 ? (cleanedTokens / rawTokens) * 100 : 100))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* 2. Token Savings & Reduction Card */}
      <div className="glass-panel p-4 rounded-2xl border border-dark-750/80 bg-dark-900/60 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Token Efficiency
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span>-{reductionPct}%</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
            +{formatNumber(savedTokens)}
            <span className="text-xs font-normal text-slate-400 ml-1 font-sans">tokens eliminated</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reduces RAG latency and prevents context window exhaustion.
          </p>
        </div>

        {/* LLM Cost Savings Estimation */}
        <div className="mt-3 pt-2.5 border-t border-dark-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Est. Savings (10k calls):</span>
          </span>
          <span className="font-bold text-amber-400">
            ${costSavings?.gpt4o_savings_10k_calls_usd ? costSavings.gpt4o_savings_10k_calls_usd.toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* 3. Context Window Footprint */}
      <div className="glass-panel p-4 rounded-2xl border border-dark-750/80 bg-dark-900/60 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Context Footprint
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Standard Models</span>
        </div>

        <div className="mt-3 space-y-2">
          {/* GPT-4o 128k */}
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
              <span>GPT-4o (128K)</span>
              <span className="text-cyan-400 font-bold">
                {contextUsage?.window_128k_pct ? `${contextUsage.window_128k_pct}%` : '<0.1%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-dark-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, contextUsage?.window_128k_pct || 1)}%` }}
              />
            </div>
          </div>

          {/* Standard 32k */}
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
              <span>Standard (32K)</span>
              <span className="text-indigo-400 font-bold">
                {contextUsage?.window_32k_pct ? `${contextUsage.window_32k_pct}%` : '<0.1%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-dark-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, contextUsage?.window_32k_pct || 1)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-dark-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>AI Engine:</span>
          <span className="font-mono text-brand-300 font-semibold truncate max-w-[140px]">
            {document.ai_provider_used || 'MarkItDown + Heuristic'}
          </span>
        </div>
      </div>

    </div>
  );
};
