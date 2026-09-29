import React, { useState } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';

interface PGNModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPgn: string;
  currentFen: string;
  onLoadPgn: (pgn: string) => void;
  onLoadFen: (fen: string) => void;
}

export const PGNModal: React.FC<PGNModalProps> = ({
  isOpen,
  onClose,
  currentPgn,
  currentFen,
  onLoadPgn,
  onLoadFen,
}) => {
  const [tab, setTab] = useState<'pgn' | 'fen'>('pgn');
  const [inputVal, setInputVal] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!inputVal.trim()) return;
    if (tab === 'pgn') {
      onLoadPgn(inputVal.trim());
    } else {
      onLoadFen(inputVal.trim());
    }
    setInputVal('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">PGN / FEN Data</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 px-6 pt-3 gap-2">
          <button
            onClick={() => setTab('pgn')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              tab === 'pgn'
                ? 'border-blue-600 text-blue-600 dark:border-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            PGN Notation
          </button>
          <button
            onClick={() => setTab('fen')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              tab === 'fen'
                ? 'border-blue-600 text-blue-600 dark:border-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            FEN String
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Paste or Edit {tab.toUpperCase()}
            </label>
            <textarea
              rows={5}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                tab === 'pgn'
                  ? 'Paste PGN text here (e.g. 1. e4 e5 2. Nf3 Nc6...)'
                  : 'Paste FEN string here (e.g. rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1)'
              }
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs p-3 rounded-xl focus:outline-none focus:border-sky-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => handleCopy(tab === 'pgn' ? currentPgn : currentFen)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-blue-600 dark:text-sky-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied current' : `Copy current ${tab.toUpperCase()}`}
            </button>

            <button
              onClick={handleImport}
              disabled={!inputVal.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-blue-500/20"
            >
              Load {tab.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
