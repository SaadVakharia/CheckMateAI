/**
 * GM Alex Natural Voice & Speech Synthesis Engine
 *
 * Provides:
 * 1. Automatic natural/neural voice selection (prioritizing Edge Natural/Neural, Google UK/US, and Apple Enhanced).
 * 2. Chess SAN notation preprocessor (translates 'Qxe2', 'Nf3+', 'O-O', 'Bxb5#' into smooth, human English).
 * 3. Human cadence & speech control across Review and GM Coach tabs.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];
let voiceInitialized = false;

function refreshVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    cachedVoices = list;
    voiceInitialized = true;
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

const FEMALE_VOICE_NAMES = [
  'female', 'woman', 'girl',
  'jenny', 'aria', 'zira', 'samantha', 'victoria', 'ava', 'karen',
  'hazel', 'susan', 'catherine', 'sonia', 'serena', 'fiona', 'moira',
  'veena', 'tessa', 'heera', 'linda', 'elena', 'stephanie', 'ana',
  'natasha', 'michelle', 'olivia', 'emma', 'steffi', 'libby', 'maisie',
  'clara', 'amy', 'zoe', 'mia', 'chloe', 'ayanda', 'stephanie'
];

const MALE_VOICE_NAMES = [
  'male', 'man', 'boy',
  'guy', 'christopher', 'ryan', 'eric', 'david', 'mark', 'george',
  'daniel', 'oliver', 'arthur', 'alex', 'brian', 'james', 'richard',
  'steffan', 'thomas', 'william', 'michael', 'matthew', 'sam', 'tom',
  'lee', 'russell', 'gavin', 'sean', 'mitchell'
];

function isFemaleVoice(name: string): boolean {
  const lower = name.toLowerCase();
  // "Google US English" is standard female in Chrome
  if (lower === 'google us english' || lower === 'google us english (en-us)') return true;
  return FEMALE_VOICE_NAMES.some((n) => lower.includes(n));
}

function isMaleVoice(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('google uk english male')) return true;
  return MALE_VOICE_NAMES.some((n) => lower.includes(n));
}

/**
 * Score and pick the most natural human English MALE voice available in the browser.
 */
export function getBestVoice(): SpeechSynthesisVoice | null {
  if (!voiceInitialized || cachedVoices.length === 0) {
    refreshVoices();
  }
  if (cachedVoices.length === 0) return null;

  const englishVoices = cachedVoices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (englishVoices.length === 0) return cachedVoices[0] || null;

  // Prefer verified male English voices first
  const verifiedMaleVoices = englishVoices.filter((v) => isMaleVoice(v.name) && !isFemaleVoice(v.name));
  const candidatePool = verifiedMaleVoices.length > 0
    ? verifiedMaleVoices
    : englishVoices.filter((v) => !isFemaleVoice(v.name));

  const voicesToScore = candidatePool.length > 0 ? candidatePool : englishVoices;

  let bestVoice: SpeechSynthesisVoice | null = null;
  let highestScore = -99999;

  for (const voice of voicesToScore) {
    const name = voice.name.toLowerCase();
    let score = 50;

    // Hard disqualification penalty for female voices
    if (isFemaleVoice(name)) {
      score -= 50000;
    }

    // Heavy boost for confirmed male voices
    if (isMaleVoice(name)) {
      score += 500;
    }

    // Microsoft Natural Male voices in Edge (e.g. Guy, Christopher, Ryan, Eric)
    if (name.includes('natural') || name.includes('online (natural)')) {
      score += 300;
    }
    if (name.includes('neural')) {
      score += 250;
    }

    // Chrome Top Natural Male Voice
    if (name.includes('google uk english male')) {
      score += 350;
    }

    // Apple Enhanced / Siri Male
    if (name.includes('enhanced') || name.includes('premium')) {
      score += 150;
    }

    // Specific top-tier articulate male personas
    if (name.includes('guy') || name.includes('christopher') || name.includes('ryan') || name.includes('eric')) {
      score += 150;
    }

    // Standard Windows Desktop Male (David, Mark, George) as safe male fallbacks
    if (name.includes('david') || name.includes('mark') || name.includes('george')) {
      score += 100;
    }

    if (score > highestScore) {
      highestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice || candidatePool[0] || englishVoices[0] || null;
}

/**
 * Preprocesses chess notation & commentary into fluid, natural spoken English.
 * E.g. "Qxe2 missed a winning move" -> "Queen takes e2, missed a winning move."
 */
export function cleanChessTextForSpeech(raw: string): string {
  if (!raw) return '';

  let text = raw;

  // 1. Remove markdown symbols
  text = text.replace(/[*_#`~>]/g, ' ');

  // 2. Remove emojis and symbols
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  text = text.replace(/[⚠️★✔✕✓?!]/g, '');

  // 3. Translate Castling
  text = text.replace(/\bO-O-O\b/g, 'queenside castle');
  text = text.replace(/\bO-O\b/g, 'kingside castle');

  // 4. Translate Check and Checkmate suffixes on moves
  text = text.replace(/([a-hKQRBN][a-h1-8x]+)#/g, '$1, checkmate');
  text = text.replace(/([a-hKQRBN][a-h1-8x]+)\+/g, '$1, check');

  // 5. Translate Captures with pieces: e.g. "Qxe2" -> "Queen takes e2"
  text = text.replace(/\bQx([a-h][1-8])/g, 'Queen takes $1');
  text = text.replace(/\bKx([a-h][1-8])/g, 'King takes $1');
  text = text.replace(/\bBx([a-h][1-8])/g, 'Bishop takes $1');
  text = text.replace(/\bNx([a-h][1-8])/g, 'Knight takes $1');
  text = text.replace(/\bRx([a-h][1-8])/g, 'Rook takes $1');
  // Pawn captures: e.g. "exd5" -> "e takes d5"
  text = text.replace(/\b([a-h])x([a-h][1-8])/g, '$1 takes $2');

  // 6. Translate Piece Moves: e.g. "Nf3" -> "Knight f3", "Bc4" -> "Bishop c4"
  text = text.replace(/\bQ([a-h][1-8])\b/g, 'Queen $1');
  text = text.replace(/\bK([a-h][1-8])\b/g, 'King $1');
  text = text.replace(/\bB([a-h][1-8])\b/g, 'Bishop $1');
  text = text.replace(/\bN([a-h][1-8])\b/g, 'Knight $1');
  text = text.replace(/\bR([a-h][1-8])\b/g, 'Rook $1');

  // 7. Tactical & Evaluation terms
  text = text.replace(/\bcp\b/g, 'centipawns');
  text = text.replace(/\b\+M(\d+)\b/g, 'forced mate in $1');
  text = text.replace(/\b-M(\d+)\b/g, 'black has mate in $1');
  text = text.replace(/\bΔ\s*([+-]?\d+(?:\.\d+)?%?)/g, 'swing of $1');
  text = text.replace(/Best move:\s*/gi, 'Best move was ');

  // 8. Clean up punctuation and spacing for human speech pauses
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\s([.,!?;:])/g, '$1');
  text = text.trim();

  // Ensure it ends with a period for a complete sentence cadence
  if (text && !/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Speak text with GM Alex's natural voice configuration.
 */
export function speakCoachText(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const spokenText = cleanChessTextForSpeech(text);
    if (!spokenText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Natural human conversational cadence (warm, masculine grandmaster pitch)
    utterance.rate = 0.97;
    utterance.pitch = 0.92;
    utterance.volume = 1.0;

    if (callbacks?.onStart) utterance.onstart = callbacks.onStart;
    if (callbacks?.onEnd) utterance.onend = callbacks.onEnd;
    if (callbacks?.onError) utterance.onerror = callbacks.onError;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error', err);
  }
}

/**
 * Stop any current speech playback.
 */
export function stopCoachSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Check if voice is currently speaking.
 */
export function isCoachSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}
