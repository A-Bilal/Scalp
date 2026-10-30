export interface BinanceTicker {
  symbol: string;
  canonicalSymbol?: string;
  baseAsset: string;
  name?: string;
  lastPrice: number;
  priceChangePercent: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  isAlpha?: boolean;
  alphaId?: string;
  chainName?: string;
  contractAddress?: string;
  tokenId?: string;
  iconUrl?: string;
}

export interface KlineData {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  change: number;
  changePercent: number;
  rangePercent: number;
  isBullish: boolean;
  rsi?: number;
  ema9?: number;
  ema21?: number;
}

export interface ScalpRecommendation {
  symbol: string;
  baseAsset: string;
  name?: string;
  isAlpha?: boolean;
  chainName?: string;
  iconUrl?: string;
  price: number;
  quoteVolume: number;
  change5m: number;
  range5m: number;
  volRatio: number;
  rsi14: number;
  emaTrend: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  scalpScore: number;
  rating: 'STRONG SCALP' | 'BULLISH MOMENTUM' | 'WATCH';
  signals: string[];
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: string;
}

export interface CoinScanResult {
  symbol: string;
  canonicalSymbol?: string;
  baseAsset: string;
  name?: string;
  lastPrice: number;
  price?: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  changePct: number;
  rangePct: number;
  volRatio: number;
  consecutiveGreen: number;
  isGoingUp: boolean;
  isSpike: boolean;
  openTime: number;
  closeTime: number;
  prevClose?: number;
  isAlpha?: boolean;
  alphaId?: string;
  chainName?: string;
  contractAddress?: string;
  tokenId?: string;
  iconUrl?: string;
  score?: number;
  marketCap?: number;
  priceChange24h?: number;
  isMeme?: boolean;
  isInUptrend?: boolean;
  // Scalp Indicators
  rsi14?: number;
  ema9?: number;
  ema21?: number;
  scalpScore?: number;
  scalpRating?: 'STRONG SCALP' | 'BULLISH MOMENTUM' | 'WATCH';
  scalpSignals?: string[];
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  riskReward?: string;
}

export interface DetailedScalpEvaluation {
  symbol: string;
  canonicalSymbol?: string;
  baseAsset: string;
  name: string;
  isAlpha: boolean;
  chainName?: string;
  contractAddress?: string;
  tokenId?: string;
  isMeme: boolean;
  lastPrice: number;
  quoteVolume24h: number;
  hasSufficientVolume: boolean; // >= $1,000,000
  // Trend
  isGoingUp: boolean;
  isInUptrend: boolean; // Price > EMA9 && EMA9 > EMA21
  trendStatus: 'STRONG UPTREND' | 'MODERATE UPTREND' | 'DOWNTREND' | 'CONSOLIDATING';
  change5m: number;
  range5m: number;
  consecutiveGreen: number;
  // Moving averages
  ema9: number;
  ema21: number;
  emaSignal: string;
  // Indicators
  rsi14: number;
  rsiZone: 'OVERSOLD' | 'HEALTHY MOMENTUM' | 'OVERBOUGHT' | 'BEARISH';
  volRatio: number; // RVOL vs 5m average
  // Verdict
  verdict: 'STRONG SCALP BUY' | 'MODERATE SCALP (PULLBACK RETEST)' | 'NOT RECOMMENDED (DOWNTREND)' | 'AVOID (MEME COIN)' | 'LOW LIQUIDITY (<$1M)';
  verdictType: 'strong' | 'moderate' | 'avoid';
  scalpScore: number; // 0 to 100
  longCompatibility: boolean; // true if suitable for long-only scalpers
  // Trade setup
  suggestedEntry: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: string;
  // Reasons & Analysis
  pros: string[];
  cons: string[];
  summaryNote: string;
  aiExplanation?: string;
}

export interface MonitoringStats {
  totalCoins: number;
  spotCoins: number;
  alphaCoins: number;
  coinsGoingUp5m: number;
  volatilitySpikes5m: number;
  consecutiveGreenCount: number;
  lastScannedAt: number;
}

export type AlertType = '5M_BULLISH' | 'VOLATILITY_SPIKE' | 'VOLUME_SURGE' | 'ALPHA_SURGE';

export interface CoinAlertPreference {
  track5mTrend: boolean;
  trackSpikes: boolean;
}

export interface AlertRule {
  min5mGainPercent: number;       // custom gain threshold for 5m candle
  minSpikeGainPercent: number;     // custom gain threshold for volatility spike
  minSpikeRangePercent: number;    // custom range threshold (high - low) for spike
  minConsecutiveGreen: number;     // consecutive green 5m candles required
  minVolumeMultiplier: number;     // volume surge multiplier vs 5m average
  enableBrowserPush: boolean;
  enableSoundAlert: boolean;
  enableScreenToasts: boolean;    // whether to show floating toast popups on screen
  includeAlphaCoins: boolean;     // whether to alert on Binance Alpha coins
  monitorAllCoins: boolean;       // whether to alert across all available coins
  trackingMode: 'all' | 'specific'; // 'all' Binance pairs vs 'specific' user-selected coins
  trackedCoins: string[];         // list of specific Binance symbols to track
  coinPreferences?: Record<string, CoinAlertPreference>; // per-coin alert options
  requireEmaUptrend?: boolean;    // require EMA9 > EMA21 for 5m upward trends
  soundVolume: number;            // 0.1 to 1.0
  cooldownSeconds: number;        // seconds between duplicate alerts for same coin
  minVolumeQuote: number;         // default e.g. 1_000_000 ($1M)
  filterMinVolume: boolean;       // toggle volume threshold
  excludeMemeCoins: boolean;      // toggle to filter out meme coins (Default: true)
  onlyUptrendCoins: boolean;      // toggle to only include coins going up (Default: true)
}

export interface AlertEvent {
  id: string;
  symbol: string;
  baseAsset: string;
  name?: string;
  timestamp: number;
  type: AlertType;
  title: string;
  message: string;
  price: number;
  changePct: number;
  rangePct: number;
  volRatio: number;
  read: boolean;
  isAlpha?: boolean;
  isMeme?: boolean;
  chainName?: string;
}

export interface SearchResult {
  symbol: string;
  canonicalSymbol?: string;
  displaySymbol: string;
  baseAsset: string;
  name: string;
  isAlpha: boolean;
  chainName?: string;
  contractAddress?: string;
  tokenId?: string;
  alphaId?: string;
  lastPrice: number;
  priceChange24h: number;
  quoteVolume: number;
  iconUrl?: string;
}
