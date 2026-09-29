import React, { useState } from 'react';
import {
  X,
  Search,
  RotateCw,
  Trophy,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchChessComProfile,
  fetchChessComGames,
  fetchLichessProfile,
  fetchLichessGames,
  PRELOADED_GAMES,
} from '../../services/chessPlatforms';
import type { PlatformProfile } from '../../services/chessPlatforms';
import type { PlatformGameItem } from '../../types/chess';

interface PlatformSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (pgn: string, title?: string) => void;
}

export const PlatformSyncModal: React.FC<PlatformSyncModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  const [activeTab, setActiveTab] = useState<'chesscom' | 'lichess' | 'classics'>('chesscom');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [games, setGames] = useState<PlatformGameItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFetch = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setProfile(null);
    setGames([]);

    try {
      if (activeTab === 'chesscom') {
        const [prof, userGames] = await Promise.all([
          fetchChessComProfile(username),
          fetchChessComGames(username),
        ]);
        if (!prof) {
          setErrorMsg('Chess.com player not found. Verify the username.');
        } else {
          setProfile(prof);
          setGames(userGames);
        }
      } else if (activeTab === 'lichess') {
        const [prof, userGames] = await Promise.all([
          fetchLichessProfile(username),
          fetchLichessGames(username),
        ]);
        if (!prof) {
          setErrorMsg('Lichess player not found. Verify the username.');
        } else {
          setProfile(prof);
          setGames(userGames);
        }
      }
    } catch {
      setErrorMsg('Failed to sync. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Import & Sync Match</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">1-click direct sync from Chess.com, Lichess or GM classics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('chesscom');
              setErrorMsg('');
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'chesscom'
                ? 'border-blue-600 text-blue-600 dark:border-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" /> Chess.com Sync
          </button>

          <button
            onClick={() => {
              setActiveTab('lichess');
              setErrorMsg('');
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'lichess'
                ? 'border-blue-600 text-blue-600 dark:border-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Lichess Sync
          </button>

          <button
            onClick={() => {
              setActiveTab('classics');
              setErrorMsg('');
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'classics'
                ? 'border-blue-600 text-blue-600 dark:border-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Master & Blunder Classics
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab !== 'classics' ? (
            <>
              {/* Username Input bar */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                    placeholder={`Enter ${activeTab === 'chesscom' ? 'Chess.com' : 'Lichess'} username (e.g. hikaru, magnuscarlsen)...`}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-sky-500 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <button
                  onClick={handleFetch}
                  disabled={loading || !username.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Fetch Games'}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Profile Card */}
              {profile && (
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center space-x-3">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.username}
                        className="w-12 h-12 rounded-full border border-sky-500/40 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-lg">
                        {profile.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        {profile.title && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold px-1.5 py-0.5 rounded">
                            {profile.title}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{profile.username}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{profile.platform}</p>
                    </div>
                  </div>

                  {/* Ratings */}
                  <div className="flex items-center space-x-4 text-xs">
                    {profile.ratingRapid && (
                      <div className="text-center">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Rapid</div>
                        <div className="font-bold text-sky-600 dark:text-sky-400">{profile.ratingRapid}</div>
                      </div>
                    )}
                    {profile.ratingBlitz && (
                      <div className="text-center">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Blitz</div>
                        <div className="font-bold text-amber-600 dark:text-amber-400">{profile.ratingBlitz}</div>
                      </div>
                    )}
                    {profile.ratingBullet && (
                      <div className="text-center">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Bullet</div>
                        <div className="font-bold text-sky-600 dark:text-sky-400">{profile.ratingBullet}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Games List */}
              {games.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Recent Matches ({games.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {games.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 rounded-xl transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {g.white.username} ({g.white.rating})
                            </span>
                            <span className="text-slate-400 font-bold">vs</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {g.black.username} ({g.black.rating})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="capitalize px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                              {g.timeClass} ({g.timeControl})
                            </span>
                            <span>{new Date(g.endTime).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectGame(g.pgn, `${g.white.username} vs ${g.black.username}`);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Analyze
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Preloaded Classics */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Instantly load and inspect famous matches with master annotations and tactical blunders:
              </p>
              <div className="grid grid-cols-1 gap-3">
                {PRELOADED_GAMES.map((game) => (
                  <div
                    key={game.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{game.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{game.subtitle}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">{game.white.username} ({game.white.rating})</span>
                        <span>vs</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{game.black.username} ({game.black.rating})</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold ml-2">
                          {game.result}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectGame(game.pgn, game.title);
                        onClose();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/20 transition cursor-pointer"
                    >
                      Load Match
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
