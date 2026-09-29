import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  Zap,
  Volume2,
  VolumeX,
  Trash2,
} from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from '../../analyzer/evaluator';
import { askCoachChat, explainMoveWithCoach, fetchCoachStatus, type CoachExplanation } from '../../services/coachApi';

interface CoachChatDrawerProps {
  currentAnalysis?: MoveAnalysis;
  playerSide: 'w' | 'b';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
  source?: 'gemini' | 'heuristic';
  isAlert?: boolean;
}

export const CoachChatDrawer: React.FC<CoachChatDrawerProps> = ({ currentAnalysis, playerSide }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'coach',
      text: 'Hello! I am Grandmaster Alex, your Live AI Chess Coach. Step through the game, make moves on the board, or ask me anything about plans, tactics, or mistakes.',
      time: 'Ready',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [coachStatus, setCoachStatus] = useState<{ status: string; hasApiKey: boolean; coachPersona: string }>({
    status: 'online',
    hasApiKey: false,
    coachPersona: 'Grandmaster Alex',
  });
  const [autoExplanation, setAutoExplanation] = useState<CoachExplanation | null>(null);
  const [showMoveCommentary, setShowMoveCommentary] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevPlyRef = useRef<number | null>(null);

  // Check coach backend status on mount
  useEffect(() => {
    fetchCoachStatus().then((st) => setCoachStatus(st));
  }, []);

  // Compute dynamic suggested questions based on the active move's classification and notation
  const dynamicSuggestedQuestions = useMemo(() => {
    if (!currentAnalysis) {
      return ['What is the best opening move?', 'What is my main strategic plan?', 'Is my king safe?'];
    }

    const { san, classification } = currentAnalysis;

    switch (classification) {
      case 'blunder':
      case 'missed_win':
        return [
          `Why was ${san} a blunder?`,
          'What did I overlook here?',
          'What was the best move instead?',
        ];
      case 'mistake':
      case 'inaccuracy':
        return [
          `Why was ${san} a mistake?`,
          'What is my opponent planning next?',
          'What was the best move instead?',
        ];
      case 'brilliant':
      case 'great':
        return [
          `Why is ${san} brilliant?`,
          'What is the tactical idea here?',
          'What is the winning continuation?',
        ];
      case 'book':
        return [
          `Why was ${san} played?`,
          'What is the main opening plan?',
          'What pawn breaks should I prepare?',
        ];
      default:
        return [
          'What is the best plan now?',
          'Is my king safe?',
          'What is the top engine move?',
        ];
    }
  }, [currentAnalysis?.ply, currentAnalysis?.san, currentAnalysis?.classification]);

  // Voice speech helper
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Fetch coach explanation when user steps into a new move
  useEffect(() => {
    if (!currentAnalysis) {
      setAutoExplanation(null);
      return;
    }

    let isSubscribed = true;
    explainMoveWithCoach(currentAnalysis).then((exp) => {
      if (isSubscribed) {
        setAutoExplanation(exp);
      }
    });

    // Proactive live coach alert when landing on a Blunder or Brilliant move
    if (prevPlyRef.current !== currentAnalysis.ply) {
      prevPlyRef.current = currentAnalysis.ply;

      if (currentAnalysis.classification === 'blunder' || currentAnalysis.classification === 'missed_win') {
        const alertMsg: ChatMessage = {
          id: `alert-${Date.now()}`,
          sender: 'coach',
          text: `⚠️ Move ${Math.ceil(currentAnalysis.ply / 2)} (${currentAnalysis.san}) is a critical blunder! Ask me what was overlooked or test your tactical defense.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAlert: true,
        };
        setMessages((prev) => [...prev.slice(-12), alertMsg]);
        speakText(`Watch out! Move ${currentAnalysis.san} was a blunder.`);
      } else if (currentAnalysis.classification === 'brilliant') {
        const brilliantMsg: ChatMessage = {
          id: `brilliant-${Date.now()}`,
          sender: 'coach',
          text: `💎 Brilliant find on move ${Math.ceil(currentAnalysis.ply / 2)}! ${currentAnalysis.san} sacrifices material to launch a decisive attack.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAlert: true,
        };
        setMessages((prev) => [...prev.slice(-12), brilliantMsg]);
        speakText(`Brilliant move! ${currentAnalysis.san} is a tactical masterstroke.`);
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, [currentAnalysis?.ply, currentAnalysis?.san, currentAnalysis?.classification]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

      const fen = currentAnalysis ? currentAnalysis.fenAfter : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const response = await askCoachChat(fen, userText, playerSide, currentAnalysis, chatHistory);

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'coach',
          text: response.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: response.source,
        },
      ]);

      speakText(response.answer);
    } catch {
      const fallbackText = currentAnalysis?.bestMove
        ? `In this position, coordinate your minor pieces towards the center. The top engine recommendation is ${currentAnalysis.bestMove}.`
        : `Focus on active piece harmony, controlling key outpost squares, and asking what your opponent is threatening.`;

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'coach',
          text: fallbackText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'heuristic',
        },
      ]);

      speakText(fallbackText);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'coach',
        text: 'Chat history cleared. What position or tactic would you like to explore next?',
        time: 'Just now',
      },
    ]);
  };

  const meta = currentAnalysis ? CLASSIFICATION_CONFIG[currentAnalysis.classification] : null;

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 font-bold text-xs">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
              <span>{coachStatus.coachPersona}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            </h3>
            <p className="text-[9.5px] text-slate-500 dark:text-slate-400">
              {coachStatus.hasApiKey ? 'Powered by Gemini AI' : 'Live Pedagogy'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Voice Coach Toggle */}
          {'speechSynthesis' in window && (
            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (!next) window.speechSynthesis.cancel();
              }}
              title={voiceEnabled ? 'Mute Live Voice Coach' : 'Enable Live Voice Coach'}
              className={`px-2 py-0.5 rounded text-[10px] border transition cursor-pointer flex items-center gap-1 font-semibold ${
                voiceEnabled
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>
          )}

          {/* Clear Chat */}
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Active Move Tactical Context Pill */}
      {currentAnalysis && meta && (
        <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30 shrink-0 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 min-w-0 truncate">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white shrink-0">
                Move {Math.ceil(currentAnalysis.ply / 2)}: {currentAnalysis.san}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}
              >
                {meta.label} {meta.badge}
              </span>
              {currentAnalysis.bestMove && currentAnalysis.classification !== 'best' && currentAnalysis.classification !== 'brilliant' && (
                <span className="text-[10px] text-slate-500 hidden sm:inline-flex items-center gap-1 shrink-0 font-mono">
                  Best: <strong className="text-sky-500">{currentAnalysis.bestMove}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-mono font-bold ${
                  currentAnalysis.deltaWinPercent < 0
                    ? 'text-rose-500'
                    : currentAnalysis.deltaWinPercent > 0
                    ? 'text-sky-500'
                    : 'text-slate-400'
                }`}
              >
                Δ {currentAnalysis.deltaWinPercent > 0 ? `+${currentAnalysis.deltaWinPercent}` : currentAnalysis.deltaWinPercent}%
              </span>
              {autoExplanation && (
                <button
                  onClick={() => setShowMoveCommentary(!showMoveCommentary)}
                  className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20"
                >
                  {showMoveCommentary ? 'Collapse' : 'Explain'}
                </button>
              )}
            </div>
          </div>

          {/* AI Coach Tactical Commentary (compact with scroll limit) */}
          {autoExplanation && showMoveCommentary && (
            <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs leading-relaxed max-h-24 overflow-y-auto space-y-1">
              <p className="font-medium text-[11px]">{autoExplanation.commentary}</p>
              {autoExplanation.keyTacticalIdea && (
                <div className="flex items-start gap-1 text-[10px] font-medium text-sky-700 dark:text-sky-400 pt-0.5">
                  <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{autoExplanation.keyTacticalIdea}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat Messages Log (fills available height cleanly) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 select-text">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-2xs shadow-blue-500/20'
                  : msg.isAlert
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-bl-none shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-bl-none shadow-2xs'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 px-1 font-medium">{msg.time}</span>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs py-1">
            <Zap className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 animate-bounce" />
            <span className="text-[11px]">GM Alex is formulating tactical analysis...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Contextual Suggested Question Chips (Permanently visible) */}
      <div className="px-2.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] shrink-0">
        {dynamicSuggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer font-medium flex items-center gap-1 shadow-2xs shrink-0 active:scale-95"
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
            handleSend(input);
          }}
          className="flex items-center space-x-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask GM Alex about this move or position..."
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 transition placeholder-slate-400 dark:placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg transition cursor-pointer shadow-xs shadow-blue-500/20 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
