import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Bot,
  Send,
  Target,
  BrainCircuit,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { sounds } from '../../utils/sound';
import { useTheme } from '../../context/ThemeContext';
import { MoveNotationTooltip, ChessGlossaryHint } from '../common/MoveNotationTooltip';
import { FormattedMessage } from '../common/FormattedMessage';
import {
  fetchPuzzleHints,
  askCoachChat,
  type PuzzleHintsData,
  type PuzzleContextParam,
} from '../../services/coachApi';

interface MistakePuzzlePlayerProps {
  blunders: MoveAnalysis[];
}

interface PuzzleChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
  source?: 'gemini' | 'heuristic';
}

const FALLBACK_BLUNDER: MoveAnalysis = {
  ply: 24,
  san: 'Qe7',
  from: 'd8',
  to: 'e7',
  fenBefore: 'r1bqk2r/pppp1ppp/2n5/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
  fenAfter: 'r1bqk2r/pppp1ppp/2n5/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 5',
  evalBefore: 50,
  evalAfter: -320,
  winPercentBefore: 52,
  winPercentAfter: 18,
  deltaWinPercent: -34,
  classification: 'blunder',
  bestMove: 'Nxe5',
  bestMoveUci: 'f3e5',
  tacticalMotifs: ['fork', 'hanging_piece'],
  playerIntent: 'Attempting to develop Queen and protect e5 pawn.',
};

/**
 * Robustly checks if a played move matches the engine's target best move.
 * Handles SAN strings ('Nxe5'), UCI strings ('f3e5'), and square coordinate parity.
 */
function isBestMove(
  gameBefore: Chess,
  userMove: { from: string; to: string; san: string; promotion?: string },
  bestMoveSan?: string,
  bestMoveUci?: string
): boolean {
  if (!bestMoveSan && !bestMoveUci) return true;

  // 1. Direct SAN match
  if (bestMoveSan && userMove.san.trim() === bestMoveSan.trim()) {
    return true;
  }

  // 2. Direct UCI match
  const playedUci = `${userMove.from}${userMove.to}${userMove.promotion || ''}`.toLowerCase();
  if (bestMoveUci && bestMoveUci.toLowerCase().startsWith(playedUci.slice(0, 4))) {
    return true;
  }

  // 3. If bestMoveSan is formatted in UCI (e.g. 'e2e4')
  if (bestMoveSan && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(bestMoveSan.trim())) {
    if (bestMoveSan.trim().toLowerCase().startsWith(playedUci.slice(0, 4))) {
      return true;
    }
  }

  // 4. Try making bestMoveSan on a clone of the initial board to get exact source/target squares
  if (bestMoveSan) {
    try {
      const sim = new Chess(gameBefore.fen());
      const simMove = sim.move(bestMoveSan.trim());
      if (simMove && simMove.from === userMove.from && simMove.to === userMove.to) {
        return true;
      }
    } catch {
      // Ignore notation parse errors on simulator
    }
  }

  return false;
}

export const MistakePuzzlePlayer: React.FC<MistakePuzzlePlayerProps> = ({ blunders }) => {
  const { isDark } = useTheme();
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [solved, setSolved] = useState(false);
  const [solvedPuzzles, setSolvedPuzzles] = useState<Set<number>>(new Set());
  const [errorStatus, setErrorStatus] = useState<{ type: 'blunder' | 'suboptimal'; message: string } | null>(null);
  const [hoveredMove, setHoveredMove] = useState<{ from?: string; to?: string } | null>(null);
  const [lastAttemptSan, setLastAttemptSan] = useState<string | null>(null);

  // Tab view: 'workout' or 'coach'
  const [activeTab, setActiveTab] = useState<'workout' | 'coach'>('workout');

  // AI-generated 3 hints by GM Alex
  const [aiHints, setAiHints] = useState<PuzzleHintsData | null>(null);
  const [isLoadingAiHints, setIsLoadingAiHints] = useState(false);

  // Interactive GM Alex Chat State
  const [chatMessages, setChatMessages] = useState<PuzzleChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeBlunders = useMemo(() => {
    return blunders.length > 0 ? blunders : [FALLBACK_BLUNDER];
  }, [blunders]);

  const currentBlunder: MoveAnalysis = activeBlunders[puzzleIndex] || FALLBACK_BLUNDER;

  const [puzzleGame, setPuzzleGame] = useState(() => new Chess(currentBlunder.fenBefore));

  // Board orientation follows the active turn of the puzzle position
  const boardOrientation: 'white' | 'black' = puzzleGame.turn() === 'w' ? 'white' : 'black';

  // Keep a stable ref to solvedPuzzles to prevent initPuzzle from re-creating on every solve
  const solvedPuzzlesRef = useRef(solvedPuzzles);
  solvedPuzzlesRef.current = solvedPuzzles;

  // Initialize/Reset puzzle state and fetch AI progressive hints
  const initPuzzle = useCallback(
    (index: number) => {
      const targetBlunder = activeBlunders[index] || FALLBACK_BLUNDER;
      setPuzzleIndex(index);
      setPuzzleGame(new Chess(targetBlunder.fenBefore));
      setSolved(solvedPuzzlesRef.current.has(index));
      setErrorStatus(null);
      setHintLevel(0);
      setLastAttemptSan(null);

      // Reset GM Alex chat for this puzzle
      setChatMessages([
        {
          id: `welcome-${index}`,
          sender: 'coach',
          text: `Hello! I'm Grandmaster Alex. You're analyzing move ${targetBlunder.ply} where **${targetBlunder.san}** was played. Need a tactical nudge, want to know why a move fails, or need help spotting the refutation? Ask me anything!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'heuristic',
        },
      ]);

      // Fetch AI progressive hints from GM Alex via Gemini
      setIsLoadingAiHints(true);
      fetchPuzzleHints({
        fen: targetBlunder.fenBefore,
        playerSide: targetBlunder.fenBefore.split(' ')[1] === 'w' ? 'w' : 'b',
        blunderSan: targetBlunder.san,
        blunderFrom: targetBlunder.from,
        blunderTo: targetBlunder.to,
        bestMove: targetBlunder.bestMove,
        bestMoveUci: targetBlunder.bestMoveUci,
        tacticalMotifs: targetBlunder.tacticalMotifs,
        playerIntent: targetBlunder.playerIntent,
      })
        .then((hints) => {
          setAiHints(hints);
          setIsLoadingAiHints(false);
        })
        .catch(() => {
          setIsLoadingAiHints(false);
        });
    },
    [activeBlunders]
  );

  // Sync board and state ONLY when the blunder set changes (identified by length & keys)
  const prevBlundersKeyRef = useRef<string>('');
  useEffect(() => {
    const key = activeBlunders.map((b) => `${b.ply}-${b.san}`).join('|');
    if (prevBlundersKeyRef.current !== key) {
      prevBlundersKeyRef.current = key;
      setPuzzleIndex(0);
      setSolved(false);
      setSolvedPuzzles(new Set());
      initPuzzle(0);
    }
  }, [activeBlunders, initPuzzle]);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    if (activeTab === 'coach') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, isThinking]);

  const handleResetPuzzle = () => {
    setPuzzleGame(new Chess(currentBlunder.fenBefore));
    setSolved(false);
    setErrorStatus(null);
    setHintLevel(0);
    setLastAttemptSan(null);
  };

  const handleNextPuzzle = () => {
    if (activeBlunders.length > 0) {
      const nextIdx = (puzzleIndex + 1) % activeBlunders.length;
      initPuzzle(nextIdx);
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (solved) return false;

    try {
      const clone = new Chess(puzzleGame.fen());
      const move = clone.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) {
        return false;
      }

      setLastAttemptSan(move.san);

      // 1. Check if user played the exact game blunder
      const isBlunderPlayed =
        move.san === currentBlunder.san ||
        `${sourceSquare}${targetSquare}` === `${currentBlunder.from}${currentBlunder.to}`;

      if (isBlunderPlayed) {
        sounds.playBlunder();
        setErrorStatus({
          type: 'blunder',
          message: `That was the match blunder (${move.san})! Look for the tactical refutation that turns this game around.`,
        });
        return false;
      }

      // 2. Validate against engine best move
      const isCorrect = isBestMove(puzzleGame, move, currentBlunder.bestMove, currentBlunder.bestMoveUci);

      if (!isCorrect) {
        sounds.playMove();
        setErrorStatus({
          type: 'suboptimal',
          message: `${move.san} is legal, but not the engine's best continuation. Try again or ask GM Alex!`,
        });
        return false;
      }

      // 3. User played the correct best move!
      setPuzzleGame(clone);
      sounds.playBrilliant();
      setSolved(true);
      setSolvedPuzzles((prev) => new Set(prev).add(puzzleIndex));
      setErrorStatus(null);

      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.65 },
      });

      // Add coach congratulations message in chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `solved-${Date.now()}`,
          sender: 'coach',
          text: `🎉 Outstanding! You found the winning refutation: **${move.san}**! Notice how ruthlessly it exploits the lack of coordination from opponent's blunder (${currentBlunder.san}).`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'heuristic',
        },
      ]);

      return true;
    } catch {
      return false;
    }
  };

  // Build puzzle context payload for GM Alex AI
  const getPuzzleContext = (): PuzzleContextParam => ({
    isPuzzleWorkout: true,
    blunderSan: currentBlunder.san,
    blunderFrom: currentBlunder.from,
    blunderTo: currentBlunder.to,
    bestMove: currentBlunder.bestMove,
    tacticalMotifs: currentBlunder.tacticalMotifs,
    hintLevel,
    hintsGiven: [
      hintLevel >= 1 ? aiHints?.hint1 : null,
      hintLevel >= 2 ? aiHints?.hint2 : null,
      hintLevel >= 3 ? aiHints?.hint3 : null,
    ].filter(Boolean) as string[],
    lastUserAttempt: lastAttemptSan || undefined,
    solved,
  });

  // Handle user asking GM Alex a question
  const handleAskCoach = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isThinking) return;

    const userMsg: PuzzleChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsThinking(true);
    setActiveTab('coach');

    try {
      const historyPayload = chatMessages.slice(-4).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

      const res = await askCoachChat(
        currentBlunder.fenBefore,
        q,
        boardOrientation === 'white' ? 'w' : 'b',
        currentBlunder,
        historyPayload,
        getPuzzleContext()
      );

      const coachMsg: PuzzleChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: res.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
      };

      setChatMessages((prev) => [...prev, coachMsg]);

      // Voice TTS if enabled
      if (voiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(res.answer);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `coach-err-${Date.now()}`,
          sender: 'coach',
          text: `In this position, look closely at ${boardOrientation === 'white' ? 'Black' : 'White'}'s undefended pieces and calculate direct checks or double attacks!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'heuristic',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Dynamic square highlights and arrows for beginner hover hints
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  const customArrows: { startSquare: string; endSquare: string; color: string }[] = [];

  if (hoveredMove?.from && hoveredMove?.to) {
    customSquareStyles[hoveredMove.from] = {
      backgroundColor: 'rgba(239, 68, 68, 0.4)',
      boxShadow: 'inset 0 0 0 2px rgba(239, 68, 68, 0.85)',
      borderRadius: '4px',
    };
    customSquareStyles[hoveredMove.to] = {
      backgroundColor: 'rgba(239, 68, 68, 0.55)',
      boxShadow: 'inset 0 0 0 3px #ef4444',
      borderRadius: '4px',
    };
    customArrows.push({
      startSquare: hoveredMove.from,
      endSquare: hoveredMove.to,
      color: isDark ? 'rgba(248, 113, 113, 0.95)' : 'rgba(220, 38, 38, 0.95)',
    });
  }

  // Dynamic quick prompt questions for GM Alex chat
  const quickQuestions = useMemo(() => {
    if (solved) {
      return [
        'Why was that the only winning move?',
        'How can I spot this pattern in future games?',
      ];
    }
    if (lastAttemptSan) {
      return [
        `Why is ${lastAttemptSan} not the best move?`,
        'Give me another hint for the refutation',
        'What is opponent threatening?',
      ];
    }
    return [
      'Give me a subtle hint',
      'Why was opponent\'s move a blunder?',
      'Which piece should I be looking at?',
    ];
  }, [solved, lastAttemptSan]);

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch overflow-hidden select-none w-full">
      {/* Left Column: Match & Puzzle Context Bar + Interactive Board (6 Cols) */}
      <div className="lg:col-span-6 h-full flex flex-col min-h-0 gap-1.5">
        {/* Puzzle Status Bar (matches Analysis Game Title bar) */}
        <div className="flex items-center justify-between px-3 py-1 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xs transition-colors shrink-0">
          <div className="flex items-center space-x-2 text-xs min-w-0">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Retrain Mistake:</span>
            <span className="font-bold text-slate-900 dark:text-white tracking-wide truncate">
              Move {Math.ceil(currentBlunder.ply / 2)} ({boardOrientation === 'white' ? 'White' : 'Black'} to refute)
            </span>
            {solved && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                SOLVED
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0 flex items-center gap-2">
            <span>Puzzle {puzzleIndex + 1} of {activeBlunders.length}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{solvedPuzzles.size} Solved</span>
          </div>
        </div>

        {/* Board Viewport (Centered, auto-fit like InteractiveBoard) */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-0.5 overflow-hidden">
          <div className="relative aspect-square h-full max-h-[min(560px,calc(100vh-210px))] rounded-xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-colors">
            <Chessboard
              options={{
                position: puzzleGame.fen(),
                boardOrientation,
                arrows: customArrows,
                squareStyles: customSquareStyles,
                darkSquareStyle: { backgroundColor: isDark ? '#1e324d' : '#3e628d' },
                lightSquareStyle: { backgroundColor: isDark ? '#d8e4f2' : '#e8f1fa' },
                animationDurationInMs: 200,
                allowDragging: !solved,
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (!sourceSquare || !targetSquare) return false;
                  return handlePieceDrop(sourceSquare, targetSquare);
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Master Unified Workout & Coach Panel (6 Cols, matches Analysis Panel) */}
      <div className="lg:col-span-6 h-full flex flex-col min-h-0 bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden select-none">
        {/* Integrated Panel Header: Title + Telemetry + Reset */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <ShieldAlert className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Mistake Trainer</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  P{puzzleIndex + 1}/{activeBlunders.length}
                </span>
                {solved && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                    Solved
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={handleResetPuzzle}
                title="Reset Position"
                className="px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Segmented Tabs (Matches Analysis Board tab bar) */}
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('workout')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'workout'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Puzzle Workout</span>
              </button>

              <button
                onClick={() => setActiveTab('coach')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'coach'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask GM Alex</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Body Content (Takes 100% of remaining height, cleanly scrollable) */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          {/* TAB 1: PUZZLE WORKOUT */}
          {activeTab === 'workout' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5">
              {/* Zero Blunders Note (if playing fallback) */}
              {blunders.length === 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">No blunders found in current game:</span> Practicing demo mistake below. Load or sync another match to practice your own mistakes!
                </div>
              )}

              {/* Prompt banner with Beginner Hover Hints */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">The match situation:</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-normal">
                  In this position,{' '}
                  <MoveNotationTooltip
                    san={currentBlunder.san}
                    from={currentBlunder.from}
                    to={currentBlunder.to}
                    variant="blunder"
                    onHoverChange={(isHovered, from, to) => {
                      setHoveredMove(isHovered ? { from, to } : null);
                    }}
                  />{' '}
                  was played (
                  <ChessGlossaryHint term="blunder" className="font-bold text-red-600 dark:text-red-400">
                    a blunder
                  </ChessGlossaryHint>
                  ).
                </div>
                <div className="text-xs text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Playing as {boardOrientation === 'white' ? 'White' : 'Black'}: Find the winning{' '}
                    <ChessGlossaryHint term="refutation" className="text-sky-600 dark:text-sky-400">
                      refutation
                    </ChessGlossaryHint>{' '}
                    on the board!
                  </span>
                </div>

                {/* Beginner Hover Tip */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    Hover over <strong className="text-red-500 font-mono">{currentBlunder.san}</strong> for a plain-English translation and arrow highlight on the board!
                  </span>
                </div>
              </div>

              {/* Feedback states */}
              {errorStatus && (
                <div
                  className={`p-3 border text-xs rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all animate-in fade-in duration-200 ${
                    errorStatus.type === 'blunder'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorStatus.message}</span>
                  </div>
                  {lastAttemptSan && (
                    <button
                      onClick={() => handleAskCoach(`Why is ${lastAttemptSan} not the best move?`)}
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer self-end sm:self-auto"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask Alex why ➔</span>
                    </button>
                  )}
                </div>
              )}

              {solved && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Solved! Brilliant find!</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    You successfully found the engine's top tactical refutation: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{currentBlunder.bestMove || 'Top move'}</strong>.
                  </p>
                  {currentBlunder.playerIntent && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Note: {currentBlunder.playerIntent}
                    </p>
                  )}
                </div>
              )}

              {/* Progressive AI Hints Powered by GM Alex */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      Hints ({hintLevel}/3)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" />
                      AI by GM Alex
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('coach')}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask Alex</span>
                    </button>

                    {hintLevel < 3 && !solved && (
                      <button
                        onClick={() => setHintLevel((h) => Math.min(3, h + 1))}
                        className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer shadow-xs"
                      >
                        + Reveal Hint {hintLevel + 1}
                      </button>
                    )}
                  </div>
                </div>

                {isLoadingAiHints && !aiHints && (
                  <div className="text-xs text-sky-500 dark:text-sky-400 p-2 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-lg flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <span>Grandmaster Alex is generating position-tailored hints...</span>
                  </div>
                )}

                {hintLevel >= 1 && (
                  <div className="text-xs p-3 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 animate-in fade-in duration-150 space-y-1">
                    <span className="text-amber-600 dark:text-amber-400 font-bold block">Hint 1 (Directional): </span>
                    <FormattedMessage
                      text={
                        aiHints?.hint1 ||
                        `Examine the square ${currentBlunder.san} moved to. Notice how it left an exposed line or unprotected piece. Look for active pieces that can deliver a forcing strike.`
                      }
                      strongClassName="font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {hintLevel >= 2 && (
                  <div className="text-xs p-3 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 animate-in fade-in duration-150 space-y-1">
                    <span className="text-amber-600 dark:text-amber-400 font-bold block">Hint 2 (Tactical Theme): </span>
                    <FormattedMessage
                      text={
                        aiHints?.hint2 ||
                        (currentBlunder.tacticalMotifs && currentBlunder.tacticalMotifs.length > 0
                          ? `Tactical Theme: ${currentBlunder.tacticalMotifs.map((m) => m.replace(/_/g, ' ')).join(', ')}. Look for an unparryable forcing check, capture, or dual threat.`
                          : 'Exploit the misplaced piece and seize tactical initiative.')
                      }
                      strongClassName="font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {hintLevel >= 3 && (
                  <div className="text-xs p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 rounded-xl text-sky-800 dark:text-sky-300 animate-in fade-in duration-150 space-y-1.5">
                    <div>
                      <span className="text-sky-700 dark:text-sky-400 font-bold block mb-1">Hint 3 (Refutation Solution): </span>
                      <FormattedMessage
                        text={aiHints?.hint3 || `The engine refutation is ${currentBlunder.bestMove || 'the best move'}.`}
                        strongClassName="font-bold text-sky-700 dark:text-sky-300 font-mono"
                      />
                    </div>
                    {currentBlunder.bestMove && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Winning Move:</span>
                        <MoveNotationTooltip
                          san={currentBlunder.bestMove}
                          from={currentBlunder.bestMoveUci ? currentBlunder.bestMoveUci.slice(0, 2) : undefined}
                          to={currentBlunder.bestMoveUci ? currentBlunder.bestMoveUci.slice(2, 4) : undefined}
                          variant="best"
                          onHoverChange={(isHovered, from, to) => {
                            setHoveredMove(isHovered ? { from, to } : null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE GM ALEX INTERACTIVE CHAT (Fills 100% of height like Analysis CoachChatDrawer) */}
          {activeTab === 'coach' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-150">
              {/* Voice toggle bar */}
              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500">
                    <BrainCircuit className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">GM Alex Workout Assistant</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    title={voiceEnabled ? 'Mute Coach Voice' : 'Enable Coach Voice'}
                    className={`px-2 py-0.5 rounded text-[10px] border transition cursor-pointer flex items-center gap-1 font-semibold ${
                      voiceEnabled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Log (Clean internal scroll, fills available vertical space) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 select-text">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none shadow-2xs shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      {msg.sender === 'coach' && (
                        <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-0.5 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          <span>GM Alex</span>
                          {msg.source === 'gemini' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              AI
                            </span>
                          )}
                        </div>
                      )}
                      <FormattedMessage
                        text={msg.text}
                        strongClassName={
                          msg.sender === 'user'
                            ? 'font-bold text-white underline decoration-sky-300'
                            : 'font-bold text-sky-600 dark:text-sky-400 font-mono'
                        }
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 px-1 font-medium">{msg.time}</span>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs py-1">
                    <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px]">GM Alex is analyzing the puzzle position...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Dynamic Contextual Question Chips */}
              <div className="px-2.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] shrink-0">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskCoach(q)}
                    disabled={isThinking}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer font-medium flex items-center gap-1 shadow-2xs shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-sky-500" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>

              {/* Input Form (Permanently Anchored & Fully Visible) */}
              <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskCoach(inputQuestion);
                  }}
                  className="flex items-center space-x-1.5"
                >
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Ask Alex: 'Why is my move wrong?', 'Give me a hint'..."
                    disabled={isThinking}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 transition placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuestion.trim() || isThinking}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg transition cursor-pointer shadow-xs shadow-blue-500/20 active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Progression Footer to Next Blunder (Matches Analysis Tab footer) */}
          {activeBlunders.length > 1 && (
            <div className="p-2.5 bg-slate-50 dark:bg-[#070c18] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0 rounded-b-2xl">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                {solved ? 'Tactical workout complete!' : 'Stuck on this refutation?'}
              </span>
              <button
                onClick={handleNextPuzzle}
                className={`px-3.5 py-1.5 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs shadow-xs ${
                  solved
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
              >
                <span>{solved ? 'Next Puzzle Workout' : 'Skip to Next Puzzle'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
