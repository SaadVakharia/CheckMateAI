import React from 'react';

interface FormattedMessageProps {
  text: string;
  className?: string;
  strongClassName?: string;
}

/**
 * Parses markdown inline formatting (**bold**, *italic*, `code`) and newlines into styled React elements.
 */
export const FormattedMessage: React.FC<FormattedMessageProps> = ({
  text,
  className = '',
  strongClassName = 'font-bold text-slate-900 dark:text-white',
}) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return <div key={lineIdx} className="h-1" />;

        // Match **bold**, `code`, or *italic*
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

        return (
          <span key={lineIdx} className="block leading-relaxed">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const inner = part.slice(2, -2);
                return (
                  <strong key={partIdx} className={strongClassName}>
                    {inner}
                  </strong>
                );
              }
              if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
                const inner = part.slice(1, -1);
                return (
                  <code
                    key={partIdx}
                    className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded"
                  >
                    {inner}
                  </code>
                );
              }
              if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                const inner = part.slice(1, -1);
                return (
                  <em key={partIdx} className="italic text-slate-700 dark:text-slate-300">
                    {inner}
                  </em>
                );
              }
              return part;
            })}
          </span>
        );
      })}
    </div>
  );
};
