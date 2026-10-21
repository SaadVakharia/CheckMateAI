import React, { useState } from 'react';
import {
  X,
  Globe,
  Sparkles,
  FileText,
  Search,
  RotateCw,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import {
  fetchChessComProfile,
  fetchChessComGames,
  fetchLichessProfile,
  fetchLichessGames,
  PRELOADED_GAMES,
} from '../../services/chessPlatforms';
import type { PlatformProfile } from '../../services/chessPlatforms';
import type { PlatformGameItem } from '../../types/chess';

interface WelcomeLaunchpadProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (pgn: string, title?: string) => void;
  hasActiveGame: boolean;
}

export const WelcomeLaunchpad: React.FC<WelcomeLaunchpadProps> = ({
  isOpen,
  onClose,
  onSelectGame,
  hasActiveGame,
}) => {
  const [tab, setTab] = useState<'sample' | 'sync' | 'pgn'>('sample');

  // Online Sync State
  const [syncPlatform, setSyncPlatform] = useState<'chesscom' | 'lichess'>('chesscom');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [games, setGames] = useState<PlatformGameItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Paste PGN State
  const [pastedPgn, setPastedPgn] = useState('');

  if (!isOpen) return null;

  const handleFetchProfile = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setProfile(null);
    setGames([]);

    try {
      if (syncPlatform === 'chesscom') {
        const [prof, userGames] = await Promise.all([
          fetchChessComProfile(username),
          fetchChessComGames(username),
        ]);
        if (!prof) {
          setErrorMsg('Chess.com player not found. Please verify the username.');
        } else {
          setProfile(prof);
          setGames(userGames);
        }
      } else {
        const [prof, userGames] = await Promise.all([
          fetchLichessProfile(username),
          fetchLichessGames(username),
        ]);
        if (!prof) {
          setErrorMsg('Lichess player not found. Please verify the username.');
        } else {
          setProfile(prof);
          setGames(userGames);
        }
      }
    } catch {
      setErrorMsg('Network error fetching profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickSample = (game: (typeof PRELOADED_GAMES)[0]) => {
    onSelectGame(game.pgn, game.title);
    onClose();
  };

  const handlePickOnlineGame = (game: PlatformGameItem) => {
    onSelectGame(game.pgn, `${game.white.username} vs ${game.black.username}`);
    onClose();
  };

  const handleLoadPastedPgn = () => {
    if (!pastedPgn.trim()) return;
    onSelectGame(pastedPgn.trim(), 'Custom PGN Match');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header Hero */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-slate-100/70 dark:from-blue-900/30 dark:via-slate-900/20 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col items-center text-center transition-colors">
          {hasActiveGame && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
              title="Close Launchpad"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="mb-2">
            <Logo />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Choose Your Chess Match
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mt-1">
            Analyze your games, understand your mistakes with Grandmaster Alex, and retrain your blunders in interactive workouts.
          </p>

          {/* Navigation Flow Preview */}
          <div className="hidden sm:flex items-center gap-2 mt-4 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span className="text-sky-500 font-bold">Select Match</span>
            <span>➔</span>
            <span>Game Review</span>
            <span>➔</span>
            <span>Analysis Board</span>
            <span>➔</span>
            <span>Mistake Puzzles</span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-5 text-xs font-bold">
            <button
              onClick={() => setTab('sample')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                tab === 'sample'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Matches</span>
            </button>

            <button
              onClick={() => setTab('sync')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                tab === 'sync'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Sync Online Games</span>
            </button>

            <button
              onClick={() => setTab('pgn')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                tab === 'pgn'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste PGN</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {/* TAB 1: SAMPLE MATCHES */}
          {tab === 'sample' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Recommended Curated Matches (Instant Start)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRELOADED_GAMES.map((g, idx) => (
                  <div
                    key={g.id}
                    onClick={() => handlePickSample(g)}
                    className="group relative p-5 bg-slate-50 dark:bg-[#132038] hover:bg-sky-50/50 dark:hover:bg-[#182a4d] border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-sm hover:shadow-lg hover:shadow-sky-500/10 active:scale-[0.99]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-sky-400 border border-blue-200 dark:border-blue-900/60">
                          {idx === 0 ? 'RECOMMENDED' : idx === 1 ? 'IMMORTAL' : 'CLASSIC'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                          {g.result}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                        {g.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {g.subtitle}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-600 dark:text-sky-400">
                      <span>Start Full Review</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ONLINE SYNC */}
          {tab === 'sync' && (
            <div className="space-y-6">
              {/* Platform Switcher & Username Input */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSyncPlatform('chesscom');
                      setProfile(null);
                      setGames([]);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                      syncPlatform === 'chesscom'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>Chess.com</span>
                  </button>

                  <button
                    onClick={() => {
                      setSyncPlatform('lichess');
                      setProfile(null);
                      setGames([]);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                      syncPlatform === 'lichess'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>Lichess.org</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchProfile()}
                      placeholder={
                        syncPlatform === 'chesscom'
                          ? 'Enter Chess.com username (e.g. GothamChess, MagnusCarlsen)'
                          : 'Enter Lichess username (e.g. DrNykterstein)'
                      }
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <button
                    onClick={handleFetchProfile}
                    disabled={loading || !username.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Fetch Games</span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Player Profile Header */}
              {profile && (
                <div className="p-4 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.username}
                        className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                        {profile.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {profile.title && (
                          <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-black rounded">
                            {profile.title}
                          </span>
                        )}
                        <span>{profile.username}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Rapid: {profile.ratingRapid || 'Unrated'} • Blitz: {profile.ratingBlitz || 'Unrated'}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </span>
                </div>
              )}

              {/* Games List */}
              {games.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Recent Matches (Click to Analyze)
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {games.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => handlePickOnlineGame(g)}
                        className="p-3 bg-slate-50 dark:bg-slate-950/70 hover:bg-sky-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 rounded-xl transition cursor-pointer flex items-center justify-between"
                      >
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {g.white.username} ({g.white.rating || '?'}) vs {g.black.username} ({g.black.rating || '?'})
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {g.timeControl} • {new Date(g.endTime * 1000).toLocaleDateString()} • {g.eco || 'Opening'}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {g.white.result === 'win' ? '1-0' : g.black.result === 'win' ? '0-1' : '½-½'}
                          </span>
                          <span className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition">
                            Analyze
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE PGN */}
          {tab === 'pgn' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Paste Portable Game Notation (PGN)
              </div>

              <textarea
                value={pastedPgn}
                onChange={(e) => setPastedPgn(e.target.value)}
                placeholder="Paste chess PGN here (e.g. 1. e4 e5 2. Nf3 Nc6 3. Bc4 ...)"
                rows={7}
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition resize-none"
              />

              <button
                onClick={handleLoadPastedPgn}
                disabled={!pastedPgn.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <span>Analyze This Game</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#070c18] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>CheckMate AI • Powered by Stockfish 19 & Google Gemini</span>
          {hasActiveGame && (
            <button
              onClick={onClose}
              className="text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
            >
              Back to Active Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
