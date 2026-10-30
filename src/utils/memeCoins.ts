/**
 * Known Meme Coins and Heuristics Detection
 * Binance Spot & Binance Alpha Meme Coin catalog
 */

export const KNOWN_MEME_SYMBOLS = new Set([
  'DOGE',
  'SHIB',
  'PEPE',
  'FLOKI',
  'BONK',
  'WIF',
  'BOME',
  'MEME',
  '1000SATS',
  'SATS',
  'ORDI',
  '1000CAT',
  'NEIRO',
  'TURBO',
  'BABYDOGE',
  'MOG',
  'POPCAT',
  'BRETT',
  'MEW',
  'SLERF',
  'MYRO',
  'CHEEMS',
  'AIDOGE',
  'PEOPLE',
  'LUNC',
  'LUNA',
  'TOSHI',
  'COQ',
  'PENGU',
  'MOODENG',
  'GOAT',
  'ACT',
  'PNUT',
  'CHILLGUY',
  'BAN',
  'HIPPO',
  'LUCE',
  'DOGS',
  'CATI',
  'HMSTR',
  'NOT',
  'RATS',
  'SAMO',
  'KISHU',
  'ELON',
  'AKITA',
  'WOJAK',
  'CHINU',
  'CORGIAI',
  'SPX',
  'GIGA',
  'FARTCOIN',
  'AI16Z',
  'TROY',
  'DEXE',
  'SUNDOG',
  'BULL',
  'SILLY',
  'WEN',
  'GUMMY',
  'PONKE',
  'BENDOG',
  'MANEKI',
  'MICHI',
  'MOTHER',
]);

const MEME_KEYWORDS = [
  'doge',
  'shib',
  'pepe',
  'inu',
  'floki',
  'bonk',
  'wif',
  'cat',
  'frog',
  'meme',
  'moon',
  'elon',
  'wojak',
  'pnut',
  'neiro',
  'moodeng',
  'goat',
  'hamster',
  'puppy',
  'cheems',
  'babydoge',
  'chillguy',
];

/**
 * Returns true if the coin matches known meme coin symbols or name patterns
 */
export function isMemeCoin(symbol: string, name?: string, baseAsset?: string): boolean {
  if (!symbol) return false;

  const cleanSym = symbol.replace(/^ALPHA_/, '').replace(/USDT$/, '').toUpperCase();
  const cleanBase = (baseAsset || '').toUpperCase();

  // 1. Direct symbol check
  if (KNOWN_MEME_SYMBOLS.has(cleanSym) || KNOWN_MEME_SYMBOLS.has(cleanBase)) {
    return true;
  }

  // 2. Keyword heuristic check in symbol or name
  const textToCheck = `${cleanSym} ${cleanBase} ${name || ''}`.toLowerCase();
  for (const kw of MEME_KEYWORDS) {
    // Check whole word or token substring
    if (textToCheck.includes(kw)) {
      // Avoid false positives like "INDICATOR", "CATALYSIS", etc.
      const words = textToCheck.split(/[\s_-]+/);
      if (words.some((w) => w === kw || w.startsWith(kw) || w.endsWith(kw))) {
        return true;
      }
      if (cleanSym.toLowerCase().includes(kw)) {
        return true;
      }
    }
  }

  return false;
}
