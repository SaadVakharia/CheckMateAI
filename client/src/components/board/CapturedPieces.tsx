import React from 'react';
import type { PieceSymbol } from 'chess.js';


interface CapturedPiecesProps {
  captured: PieceSymbol[];
  advantage: number; // positive if this side has material advantage
  color: 'w' | 'b';
}

const PIECE_SYMBOLS: Record<PieceSymbol, { w: string; b: string; val: number }> = {
  p: { w: '♙', b: '♟', val: 1 },
  n: { w: '♘', b: '♞', val: 3 },
  b: { w: '♗', b: '♝', val: 3 },
  r: { w: '♖', b: '♜', val: 5 },
  q: { w: '♕', b: '♛', val: 9 },
  k: { w: '♔', b: '♚', val: 0 },
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ captured, advantage, color }) => {
  // Sort captured pieces by value (Pawns first, then Knights, Bishops, Rooks, Queen)
  const sorted = [...captured].sort((a, b) => PIECE_SYMBOLS[a].val - PIECE_SYMBOLS[b].val);

  return (
    <div className="flex items-center gap-1.5 min-h-[26px] text-sm select-none">
      <div className="flex items-center space-x-[-4px]">
        {sorted.map((p, idx) => (
          <span
            key={idx}
            className={`text-lg leading-none ${color === 'w' ? 'text-slate-200 drop-shadow-sm' : 'text-slate-400'}`}
          >
            {PIECE_SYMBOLS[p][color === 'w' ? 'w' : 'b']}
          </span>
        ))}
      </div>
      {advantage > 0 && (
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          +{advantage}
        </span>
      )}
    </div>
  );
};
