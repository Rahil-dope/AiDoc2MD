import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Eye, Copy, Check, Terminal } from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel border border-dark-750/80 bg-dark-900/70 overflow-hidden">
      
      {/* Preview Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-750/80 bg-dark-950/60">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Rendered Live Preview
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          GFM Compliant
        </span>
      </div>

      {/* Rendered Markdown Content Body */}
      <div className="flex-1 p-6 overflow-y-auto prose-forge">
        {content && content.trim() ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // Custom code block renderer with copy button
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');

                if (!inline && match) {
                  const lang = match[1];
                  const codeIdx = Math.random();
                  return (
                    <div className="relative group my-4 rounded-xl overflow-hidden border border-dark-800 bg-dark-950">
                      <div className="flex items-center justify-between px-3.5 py-1.5 bg-dark-900 border-b border-dark-800 text-[11px] font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-brand-400" />
                          <span>{lang}</span>
                        </div>
                        <button
                          onClick={() => handleCopyCode(codeString, codeIdx)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-dark-800 transition-colors"
                        >
                          {copiedCodeIdx === codeIdx ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedCodeIdx === codeIdx ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200">
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
            <Eye className="w-8 h-8 stroke-1 mb-2 text-slate-600" />
            <p className="text-sm font-medium">No Markdown content to preview</p>
            <p className="text-xs text-slate-600 mt-1">Start typing in the editor or upload a document.</p>
          </div>
        )}
      </div>

    </div>
  );
};
