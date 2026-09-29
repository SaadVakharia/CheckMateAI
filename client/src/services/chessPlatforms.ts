import type { PlatformGameItem } from '../types/chess';


export interface PlatformProfile {
  username: string;
  avatar?: string;
  title?: string;
  ratingRapid?: number;
  ratingBlitz?: number;
  ratingBullet?: number;
  platform: 'chess.com' | 'lichess';
}

export const PRELOADED_GAMES = [
  {
    id: 'club-blunder-1',
    title: 'Club Player Match (Tactical Blunders)',
    subtitle: '1450 vs 1420 Rapid — Double Blunder & Back-Rank Tactics',
    event: 'CheckMate AI Showcase',
    white: { username: 'Alex_Tactics', rating: 1450 },
    black: { username: 'KnightRider99', rating: 1420 },
    result: '1-0',
    pgn: `[Event "Rated Rapid Game"]
[Site "Online"]
[Date "2024.03.15"]
[White "Alex_Tactics"]
[Black "KnightRider99"]
[Result "1-0"]
[WhiteElo "1450"]
[BlackElo "1420"]
[TimeControl "600+0"]
[ECO "C50"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Nc3 d6 6. Bg5 h6 7. Bh4 g5 8. Bg3 Bg4 9. h3 Bh5 10. Nd5 Nd4 11. c3 Nxf3+ 12. gxf3 c6 13. Ne3 Qb6 14. Qe2 O-O-O 15. b4 Bxe3 16. fxe3 d5 17. exd5 cxd5 18. Bb3 e4 19. dxe4 dxe4 20. Qc4+ Qc6 21. Qxc6+ bxc6 22. Be5 Bxf3 23. Bxf6 Bxh1 24. Bxh8 Rxh8 25. Kf2 Bf3 26. Bxf7 Rf8 27. Be6+ Kc7 28. Kg3 h5 29. Rf1 h4+ 30. Kh2 Rd8 31. Rf2 Rd1 32. Rg2 Bxg2 33. Kxg2 Rd2+ 34. Kg1 Re2 35. c4 Rxe3 36. Kf2 Ra3 37. c5 Kd8 38. Ke2 Ke7 39. Bb3 Kf6 40. Ke3 Ke5 1-0`
  },
  {
    id: 'kasparov-immortal',
    title: "Kasparov's Immortal (1999)",
    subtitle: 'Garry Kasparov vs Veselin Topalov — Rook Sacrifice Masterpiece',
    event: 'Wijk aan Zee',
    white: { username: 'Kasparov, Garry', rating: 2812 },
    black: { username: 'Topalov, Veselin', rating: 2700 },
    result: '1-0',
    pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`
  },
  {
    id: 'opera-game',
    title: 'The Opera Game (1858)',
    subtitle: 'Paul Morphy vs Duke of Brunswick & Count Isouard',
    event: 'Paris Opera House',
    white: { username: 'Paul Morphy', rating: 2600 },
    black: { username: 'Duke & Count', rating: 1900 },
    result: '1-0',
    pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`
  }
];

export async function fetchChessComProfile(username: string): Promise<PlatformProfile | null> {
  try {
    const cleanUser = username.trim().toLowerCase();
    const [userRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${cleanUser}`),
      fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`)
    ]);

    if (!userRes.ok) return null;
    const userData = await userRes.json();
    const statsData = statsRes.ok ? await statsRes.json() : {};

    return {
      username: userData.username || cleanUser,
      avatar: userData.avatar,
      title: userData.title,
      ratingRapid: statsData.chess_rapid?.last?.rating,
      ratingBlitz: statsData.chess_blitz?.last?.rating,
      ratingBullet: statsData.chess_bullet?.last?.rating,
      platform: 'chess.com',
    };
  } catch (err) {
    console.error('Failed to fetch Chess.com profile', err);
    return null;
  }
}

export async function fetchChessComGames(username: string): Promise<PlatformGameItem[]> {
  try {
    const cleanUser = username.trim().toLowerCase();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const res = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/${year}/${month}`);
    if (!res.ok) {
      // Try previous month if current month has no games
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/${prevYear}/${prevMonth}`);
      if (!prevRes.ok) return [];
      const prevData = await prevRes.json();
      return formatChessComGames(prevData.games || [], cleanUser);
    }

    const data = await res.json();
    return formatChessComGames(data.games || [], cleanUser);
  } catch (err) {
    console.error('Failed to fetch Chess.com games', err);
    return [];
  }
}

function formatChessComGames(games: any[], _user?: string): PlatformGameItem[] {

  return games
    .filter((g) => g.pgn)
    .slice(-15)
    .reverse()
    .map((g, idx) => ({
      id: `chesscom-${idx}-${g.end_time || Date.now()}`,
      url: g.url || '',
      pgn: g.pgn,
      timeControl: g.time_control || 'Rapid',
      timeClass: g.time_class || 'rapid',
      white: {
        username: g.white?.username || 'White',
        rating: g.white?.rating || 1500,
        result: g.white?.result || '',
      },
      black: {
        username: g.black?.username || 'Black',
        rating: g.black?.rating || 1500,
        result: g.black?.result || '',
      },
      endTime: g.end_time ? g.end_time * 1000 : Date.now(),
      eco: g.eco,
    }));
}

export async function fetchLichessProfile(username: string): Promise<PlatformProfile | null> {
  try {
    const cleanUser = username.trim().toLowerCase();
    const res = await fetch(`https://lichess.org/api/user/${cleanUser}`);
    if (!res.ok) return null;
    const data = await res.json();

    return {
      username: data.username,
      title: data.title,
      ratingRapid: data.perfs?.rapid?.rating,
      ratingBlitz: data.perfs?.blitz?.rating,
      ratingBullet: data.perfs?.bullet?.rating,
      platform: 'lichess',
    };
  } catch (err) {
    console.error('Failed to fetch Lichess profile', err);
    return null;
  }
}

export async function fetchLichessGames(username: string): Promise<PlatformGameItem[]> {
  try {
    const cleanUser = username.trim().toLowerCase();
    const res = await fetch(`https://lichess.org/api/games/user/${cleanUser}?max=15&pgnInJson=true`, {
      headers: { Accept: 'application/x-ndjson' },
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const games: PlatformGameItem[] = [];

    for (const line of lines) {
      try {
        const g = JSON.parse(line);
        games.push({
          id: g.id || `lichess-${Math.random()}`,
          url: `https://lichess.org/${g.id}`,
          pgn: g.pgn || '',
          timeControl: g.speed || 'rapid',
          timeClass: (g.speed as any) || 'rapid',
          white: {
            username: g.players?.white?.user?.name || 'White',
            rating: g.players?.white?.rating || 1500,
            result: g.winner === 'white' ? 'win' : g.winner === 'black' ? 'loss' : 'draw',
          },
          black: {
            username: g.players?.black?.user?.name || 'Black',
            rating: g.players?.black?.rating || 1500,
            result: g.winner === 'black' ? 'win' : g.winner === 'white' ? 'loss' : 'draw',
          },
          endTime: g.createdAt || Date.now(),
        });
      } catch {
        // Skip malformed line
      }
    }

    return games;
  } catch (err) {
    console.error('Failed to fetch Lichess games', err);
    return [];
  }
}
