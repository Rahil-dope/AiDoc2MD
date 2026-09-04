import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronDown, ChevronUp, Sparkles, CheckCircle, AlertCircle, Cpu } from 'lucide-react';
import { MetricsBreakdown } from '../types';
import { getScoreColor } from '../utils/formatters';

interface ReadinessScoreBadgeProps {
  score: number;
  breakdown?: MetricsBreakdown;
  compact?: boolean;
}

export const ReadinessScoreBadge: React.FC<ReadinessScoreBadgeProps> = ({
  score,
  breakdown,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const colors = getScoreColor(score);

  // SVG Circle parameters
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const tier = breakdown?.tier || (score >= 90 ? 'Production Ready' : score >= 75 ? 'Optimal Context' : score >= 60 ? 'Acceptable' : 'Needs Normalization');

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${colors.bg} border ${colors.border}`}>
        <span className="text-xs font-mono font-bold text-slate-300">AI Readiness:</span>
        <span className={`text-sm font-black font-mono ${colors.text}`}>{score.toFixed(0)}/100</span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-dark-900/60 text-slate-300">
          {tier}
        </span>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-dark-750/80 bg-dark-900/60 relative overflow-hidden">
      {/* Background glow ambient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Radial Progress Ring & Main Score */}
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-dark-800"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Progress ring */}
              <motion.circle
                cx="48"
                cy="48"
                r={radius}
                className={colors.ring}
                strokeWidth="6"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-2xl font-black font-mono tracking-tight ${colors.text}`}>
                {score.toFixed(0)}
              </span>
              <span className="text-[9px] uppercase font-mono font-semibold text-slate-400">/ 100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${colors.text}`} />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                AI Readiness Score
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                {tier}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Synthesized rating based on markdown structure, syntax cleanliness, and token density.
            </p>
          </div>
        </div>

        {/* 4 Pillars Summary Bars */}
        {breakdown && (
          <div className="w-full sm:w-auto flex-1 max-w-md grid grid-cols-2 gap-3">
            {/* Structure */}
            <div className="bg-dark-950/60 p-2.5 rounded-xl border border-dark-800/80">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Structure</span>
                <span className="font-bold text-slate-200">{breakdown.structure_score?.toFixed(1) || '0'}/30</span>
              </div>
              <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${((breakdown.structure_score || 0) / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Cleanliness */}
            <div className="bg-dark-950/60 p-2.5 rounded-xl border border-dark-800/80">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Cleanliness</span>
                <span className="font-bold text-slate-200">{breakdown.cleanliness_score?.toFixed(1) || '0'}/30</span>
              </div>
              <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${((breakdown.cleanliness_score || 0) / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Token Density */}
            <div className="bg-dark-950/60 p-2.5 rounded-xl border border-dark-800/80">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Token Density</span>
                <span className="font-bold text-slate-200">{breakdown.token_density_score?.toFixed(1) || '0'}/25</span>
              </div>
              <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-700"
                  style={{ width: `${((breakdown.token_density_score || 0) / 25) * 100}%` }}
                />
              </div>
            </div>

            {/* Semantic Clarity */}
            <div className="bg-dark-950/60 p-2.5 rounded-xl border border-dark-800/80">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Clarity</span>
                <span className="font-bold text-slate-200">{breakdown.semantic_clarity_score?.toFixed(1) || '0'}/15</span>
              </div>
              <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${((breakdown.semantic_clarity_score || 0) / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Expandable Insights Drawer */}
      {breakdown?.insights && breakdown.insights.length > 0 && (
        <div className="mt-4 pt-3 border-t border-dark-800/80">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>AI Evaluation Insights ({breakdown.insights.length})</span>
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2.5 space-y-1.5 text-xs text-slate-300 font-sans"
              >
                {breakdown.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-dark-950/40 px-3 py-1.5 rounded-lg border border-dark-800/40">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
};
