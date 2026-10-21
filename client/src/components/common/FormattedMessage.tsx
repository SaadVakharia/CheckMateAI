import React from 'react';
import { MoveNotationTooltip, ChessGlossaryHint } from './MoveNotationTooltip';

interface FormattedMessageProps {
  text: string;
  className?: string;
  strongClassName?: string;
  enableMoveTooltips?: boolean;
  onHoverMove?: (isHovered: boolean, from?: string, to?: string) => void;
}

type GlossaryTerm = 'blunder' | 'refutation' | 'centipawns' | 'acpl' | 'fork' | 'pin';

// Recognized glossary terms for beginner tooltips
const GLOSSARY_TERMS: Record<string, GlossaryTerm> = {
  blunder: 'blunder',
  blunders: 'blunder',
  refutation: 'refutation',
  refutations: 'refutation',
  fork: 'fork',
  forks: 'fork',
  pin: 'pin',
  pinned: 'pin',
};

/**
 * Checks if a token matches standard chess move algebraic notation.
 */
function isPotentialChessMove(token: string): boolean {
  const clean = token.replace(/[.,!?;:()]/g, '');
  if (!clean || clean.length < 2 || clean.length > 7) return false;
  // Exclude common English false positives like "At", "Be", "In", "On", "No"
  if (/^(at|be|in|on|no|to|do|so|he|me|we|or|an|as|if|by)$/i.test(clean)) return false;
  // Must match standard chess move pattern
  return /^(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[\+#]?)$/.test(clean);
}

/**
 * Helper to render text with automatic chess move and glossary tooltips.
 */
function renderTextWithTooltips(
  content: string,
  keyPrefix: string,
  onHoverMove?: (isHovered: boolean, from?: string, to?: string) => void
): React.ReactNode[] {
  // Split on whitespace while preserving words
  const words = content.split(/(\s+)/);

  return words.map((word, wIdx) => {
    // Preserve whitespace
    if (/^\s+$/.test(word)) {
      return word;
    }

    // Strip punctuation to inspect core word
    const match = word.match(/^([("']*)(.*?)([.,!?:;)"]*)$/);
    if (!match) return word;

    const [, leadingPunct, core, trailingPunct] = match;

    // 1. Check if word is a chess move (e.g., h3, g4, Na4, Bxf3, O-O)
    if (isPotentialChessMove(core)) {
      return (
        <React.Fragment key={`${keyPrefix}-m-${wIdx}`}>
          {leadingPunct}
          <MoveNotationTooltip
            san={core}
            variant="normal"
            className="inline-block"
            onHoverChange={onHoverMove}
          />
          {trailingPunct}
        </React.Fragment>
      );
    }

    // 2. Check if word is a glossary term (e.g., blunder, refutation, fork, pin)
    const lowerCore = core.toLowerCase();
    if (GLOSSARY_TERMS[lowerCore]) {
      return (
        <React.Fragment key={`${keyPrefix}-g-${wIdx}`}>
          {leadingPunct}
          <ChessGlossaryHint term={GLOSSARY_TERMS[lowerCore]}>
            {core}
          </ChessGlossaryHint>
          {trailingPunct}
        </React.Fragment>
      );
    }

    return word;
  });
}

/**
 * Parses markdown inline formatting (**bold**, *italic*, `code`) and newlines,
 * while automatically enhancing chess move notations and tactical terms with interactive tooltips!
 */
export const FormattedMessage: React.FC<FormattedMessageProps> = ({
  text,
  className = '',
  strongClassName = 'font-bold text-slate-900 dark:text-white',
  enableMoveTooltips = true,
  onHoverMove,
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
              const partKey = `${lineIdx}-${partIdx}`;

              // **bold**
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const inner = part.slice(2, -2);
                return (
                  <strong key={partKey} className={strongClassName}>
                    {enableMoveTooltips
                      ? renderTextWithTooltips(inner, `${partKey}-b`, onHoverMove)
                      : inner}
                  </strong>
                );
              }

              // `code`
              if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
                const inner = part.slice(1, -1);
                if (enableMoveTooltips && isPotentialChessMove(inner)) {
                  return (
                    <MoveNotationTooltip
                      key={partKey}
                      san={inner}
                      variant="normal"
                      onHoverChange={onHoverMove}
                    />
                  );
                }
                return (
                  <code
                    key={partKey}
                    className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded"
                  >
                    {inner}
                  </code>
                );
              }

              // *italic*
              if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                const inner = part.slice(1, -1);
                return (
                  <em key={partKey} className="italic text-slate-700 dark:text-slate-300">
                    {enableMoveTooltips
                      ? renderTextWithTooltips(inner, `${partKey}-i`, onHoverMove)
                      : inner}
                  </em>
                );
              }

              // Standard plain text
              return enableMoveTooltips ? (
                <React.Fragment key={partKey}>
                  {renderTextWithTooltips(part, `${partKey}-p`, onHoverMove)}
                </React.Fragment>
              ) : (
                part
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

