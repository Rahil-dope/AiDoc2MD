import React from 'react';
import { Layers, Plus, History, Sun, Moon, Github, Linkedin, Mail, Code } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onOpenHistory: () => void;
  onNewUpload: () => void;
  historyCount: number;
  hasActiveDocument: boolean;
  backendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  onOpenHistory,
  onNewUpload,
  historyCount,
  hasActiveDocument,
  backendHealthy,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-800/80 bg-dark-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3.5 cursor-pointer select-none" onClick={onNewUpload}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 via-indigo-600 to-purple-800 shadow-glow-sm text-white">
            <Layers className="w-5 h-5 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-forge-emerald ring-2 ring-dark-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-brand-300">
                AiDoc<span className="text-brand-400">2MD</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-semibold">
                v1.0 MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              AI Document-to-Markdown & Token Efficiency Studio
            </p>
          </div>
        </div>

        {/* Developer Badge & Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Developer Credit Chip */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900/90 border border-brand-500/30 text-xs font-mono text-slate-300 shadow-glow-sm">
            <Code className="w-3.5 h-3.5 text-brand-400" />
            <span>Dev: <strong className="text-white font-semibold">Shaikh Rahil Hussain</strong></span>
            <div className="flex items-center gap-1.5 ml-1 border-l border-dark-750 pl-2">
              <a
                href="https://github.com/Rahil-dope"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
                title="GitHub: Rahil-dope"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.linkedin.com/in/shaikh-rahil-hussain-a54348291"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-blue-400 transition-colors"
                title="LinkedIn Profile"
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
              <a
                href="mailto:rahilhussain431601@gmail.com"
                className="text-slate-400 hover:text-brand-400 transition-colors"
                title="Email Developer"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Engine Health Status */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-dark-900 border border-dark-750 text-slate-400">
            <div className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{backendHealthy ? 'Engine Active' : 'Connecting...'}</span>
          </div>

          {/* New Document Button */}
          {hasActiveDocument && (
            <button
              onClick={onNewUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>New File</span>
            </button>
          )}

          {/* History Drawer Trigger */}
          <button
            onClick={onOpenHistory}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 hover:text-white text-xs border border-dark-750 transition-colors"
            title="Conversion History"
          >
            <History className="w-4 h-4 text-brand-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {historyCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-750 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

      </div>
    </header>
  );
};
