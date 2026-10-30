/**
 * Helper to resolve consistent, crystal-clear coin display titles, tickers, and avatars.
 * Ensures Alpha token names (e.g. "quq", "KiiChain", "Pump.fun") appear prominently ABOVE
 * numeric IDs/tickers (e.g. "124", "1088", "276") to eliminate trader confusion.
 */

export interface CoinDisplayInfo {
  /** The main prominent title to show at the top in large/bold font */
  primaryTitle: string;
  /** Secondary ticker or ID badge to show next to or below the title */
  secondaryTicker: string;
  /** Clean base symbol without ALPHA_ or USDT */
  rawSymbol: string;
  /** Clean 3-character text for the avatar/icon box */
  avatarText: string;
  /** Clean sub-label for metadata row */
  subLabel: string;
  /** Whether the coin is an Alpha token or has a numeric identifier */
  isAlphaOrNumeric: boolean;
}

export function getCoinDisplayInfo(coin: {
  symbol?: string;
  name?: string;
  baseAsset?: string;
  alphaId?: string;
  isAlpha?: boolean;
  chainName?: string;
  canonicalSymbol?: string;
}): CoinDisplayInfo {
  const sym = coin.symbol || coin.canonicalSymbol || '';
  const rawSym = sym.replace(/^ALPHA_/, '').replace(/USDT$/, '') || (coin.baseAsset || 'COIN');
  const baseAssetClean = (coin.baseAsset || '').replace(/^ALPHA_/, '').replace(/USDT$/, '');
  const alphaIdClean = (coin.alphaId || '').replace(/^ALPHA_/, '');
  const isNumeric = /^\d+$/.test(rawSym) || /^\d+$/.test(baseAssetClean) || /^\d+$/.test(alphaIdClean);
  const isAlpha = !!coin.isAlpha || isNumeric || sym.startsWith('ALPHA_') || !!coin.alphaId;

  // Find human-readable coin name (avoid using bare numbers like "1048" as the primary name if a name exists)
  const candidateName = (coin.name || '').trim();
  const candidateBase = baseAssetClean && !/^\d+$/.test(baseAssetClean) ? baseAssetClean : '';
  const hasDistinctName = Boolean(candidateName && candidateName !== rawSym && !/^\d+$/.test(candidateName));

  const cleanName = hasDistinctName
    ? candidateName
    : candidateName && !/^\d+$/.test(candidateName)
    ? candidateName
    : candidateBase;

  if (isAlpha) {
    // For Alpha tokens: Name MUST come ABOVE the numbers to remove confusion
    const numericId = alphaIdClean || (isNumeric ? rawSym : '');
    const primaryTitle = cleanName || (numericId ? `Alpha #${numericId}` : rawSym);
    const secondaryTicker = numericId ? `#${numericId} /USDT` : `${rawSym}/USDT`;

    // Extract letters for avatar: prefer clean name letters (e.g. "Virtuals" -> "VIR", "Pump.fun" -> "PUM")
    const cleanLetters = (cleanName.replace(/[^a-zA-Z0-9]/g, '') || rawSym).slice(0, 3).toUpperCase();
    const avatarText = cleanLetters || (numericId ? `#${numericId.slice(0, 2)}` : rawSym.slice(0, 3));

    const subLabel = numericId ? `ID: #${numericId}` : `Ticker: ${rawSym}`;

    return {
      primaryTitle,
      secondaryTicker,
      rawSymbol: rawSym,
      avatarText,
      subLabel,
      isAlphaOrNumeric: true,
    };
  }

  // Regular Spot market coins (e.g. SOL, ETH, BTC)
  const primaryTitle = coin.baseAsset || rawSym;
  const secondaryTicker = '/USDT';
  const avatarText = primaryTitle.slice(0, 3).toUpperCase();
  const subLabel = cleanName || `Binance ${primaryTitle}`;

  return {
    primaryTitle,
    secondaryTicker,
    rawSymbol: rawSym,
    avatarText,
    subLabel,
    isAlphaOrNumeric: false,
  };
}
