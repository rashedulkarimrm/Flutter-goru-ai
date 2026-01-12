
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple parser for demonstration. In a production app, use 'react-markdown' or similar.
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
          const lang = match ? match[1] : 'text';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{lang || 'code'}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-sm code-font leading-relaxed text-blue-100">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Handle bold text and line breaks roughly
        const formattedText = part.split('\n').map((line, i) => {
          const boldLine = line.split(/(\*\*.*?\*\*)/g).map((segment, j) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
              return <strong key={j} className="text-blue-400">{segment.slice(2, -2)}</strong>;
            }
            return segment;
          });
          return <p key={i} className="mb-2 last:mb-0">{boldLine}</p>;
        });

        return <div key={index} className="prose prose-invert max-w-none text-slate-300 leading-relaxed">{formattedText}</div>;
      })}
    </div>
  );
};
