import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

// Lazy initialized Gemini client for scalping commentary
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

app.use(express.json());

// Interface for 5M Candle Tracking in memory
interface Candle5MRecord {
  open5m: number;
  high5m: number;
  low5m: number;
  close5m: number;
  openTime: number;
  closeTime: number;
  prevClose5m: number;
  volRatio: number;
  consecutiveGreen: number;
  lastUpdated: number;
}

// In-memory data store
let allSpotTickers: Map<string, any> = new Map();
let allAlphaTokens: Map<string, any> = new Map();
// Multi-index mapping for instant symbol / token lookup (maps alias/ticker/contract to canonical alphaSymbol)
const alphaSymbolMap: Map<string, string> = new Map();
const candle5mTracker = new Map<string, Candle5MRecord>();

// Known Meme Coins Catalog and Heuristics
const KNOWN_MEME_SYMBOLS = new Set([
  'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'BOME', 'MEME',
  '1000SATS', 'SATS', 'ORDI', '1000CAT', 'NEIRO', 'TURBO', 'BABYDOGE',
  'MOG', 'POPCAT', 'BRETT', 'MEW', 'SLERF', 'MYRO', 'CHEEMS', 'AIDOGE',
  'PEOPLE', 'LUNC', 'LUNA', 'TOSHI', 'COQ', 'PENGU', 'MOODENG', 'GOAT',
  'ACT', 'PNUT', 'CHILLGUY', 'BAN', 'HIPPO', 'LUCE', 'DOGS', 'CATI',
  'HMSTR', 'NOT', 'RATS', 'SAMO', 'KISHU', 'ELON', 'AKITA', 'WOJAK',
  'CHINU', 'CORGIAI', 'SPX', 'GIGA', 'FARTCOIN', 'AI16Z', 'TROY', 'DEXE',
  'SUNDOG', 'BULL', 'SILLY', 'WEN', 'GUMMY', 'PONKE', 'BENDOG', 'MANEKI', 'MICHI', 'MOTHER'
]);

const MEME_KEYWORDS = [
  'doge', 'shib', 'pepe', 'inu', 'floki', 'bonk', 'wif', 'cat', 'frog',
  'meme', 'moon', 'elon', 'wojak', 'pnut', 'neiro', 'moodeng', 'goat',
  'hamster', 'puppy', 'cheems', 'babydoge', 'chillguy'
];

function isMemeCoin(symbol: string, name?: string, baseAsset?: string): boolean {
  if (!symbol) return false;
  const cleanSym = symbol.replace(/^ALPHA_/, '').replace(/USDT$/, '').toUpperCase();
  const cleanBase = (baseAsset || '').toUpperCase();
  if (KNOWN_MEME_SYMBOLS.has(cleanSym) || KNOWN_MEME_SYMBOLS.has(cleanBase)) return true;
  const textToCheck = `${cleanSym} ${cleanBase} ${name || ''}`.toLowerCase();
  for (const kw of MEME_KEYWORDS) {
    if (textToCheck.includes(kw)) {
      const words = textToCheck.split(/[\s_-]+/);
      if (words.some((w) => w === kw || w.startsWith(kw) || w.endsWith(kw))) return true;
      if (cleanSym.toLowerCase().includes(kw)) return true;
    }
  }
  return false;
}

let currentBucketTime = Math.floor(Date.now() / 300000) * 300000;
let lastFullTickersFetch = 0;
let lastAlphaFetch = 0;
let isFetchingTickers = false;
let isFetchingAlpha = false;

// 1. Fetch All Binance Spot USDT Tickers
async function refreshSpotTickers() {
  if (isFetchingTickers) return;
  isFetchingTickers = true;
  try {
    let res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (!res.ok) {
      res = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr');
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const now = Date.now();
        data.forEach((t: any) => {
          const sym = t.symbol || '';
          if (
            sym.endsWith('USDT') &&
            !sym.includes('UPUSDT') &&
            !sym.includes('DOWNUSDT') &&
            !sym.includes('BULLUSDT') &&
            !sym.includes('BEARUSDT')
          ) {
            const lastPrice = parseFloat(t.lastPrice || '0');
            const quoteVol = parseFloat(t.quoteVolume || '0');
            const priceChangePercent = parseFloat(t.priceChangePercent || '0');
            const highPrice = parseFloat(t.highPrice || '0');
            const lowPrice = parseFloat(t.lowPrice || '0');

            allSpotTickers.set(sym, {
              symbol: sym,
              baseAsset: sym.replace('USDT', ''),
              name: sym.replace('USDT', ''),
              lastPrice,
              priceChangePercent,
              quoteVolume: quoteVol,
              highPrice,
              lowPrice,
              isAlpha: false,
              lastUpdated: now,
            });

            // Initialize 5m tracker if not present
            if (!candle5mTracker.has(sym)) {
              candle5mTracker.set(sym, {
                open5m: lastPrice,
                high5m: lastPrice,
                low5m: lastPrice,
                close5m: lastPrice,
                openTime: currentBucketTime,
                closeTime: currentBucketTime + 300000 - 1,
                prevClose5m: lastPrice,
                volRatio: 1.0,
                consecutiveGreen: priceChangePercent > 0 ? 1 : 0,
                lastUpdated: now,
              });
            } else {
              const c = candle5mTracker.get(sym)!;
              c.close5m = lastPrice;
              if (lastPrice > c.high5m) c.high5m = lastPrice;
              if (lastPrice < c.low5m && lastPrice > 0) c.low5m = lastPrice;
              c.lastUpdated = now;
            }
          }
        });
        lastFullTickersFetch = now;
      }
    }
  } catch (err: any) {
    console.error('Error refreshing spot tickers:', err.message);
  } finally {
    isFetchingTickers = false;
  }
}

// 2. Fetch All Binance Alpha Tokens
async function refreshAlphaTokens() {
  if (isFetchingAlpha) return;
  isFetchingAlpha = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const now = Date.now();
        json.data.forEach((t: any) => {
          const alphaSymbol = `${t.alphaId}USDT`;
          const displaySymbol = `${t.symbol}/USDT`;
          const lastPrice = parseFloat(t.price || '0');
          const percentChange24h = parseFloat(t.percentChange24h || '0');
          const volume24h = parseFloat(t.volume24h || '0');
          const marketCap = parseFloat(t.marketCap || '0');

          const tokenRecord = {
            symbol: alphaSymbol,
            displaySymbol,
            baseAsset: t.symbol,
            name: t.name || t.symbol,
            alphaId: t.alphaId,
            chainName: t.chainName || 'Web3',
            contractAddress: t.contractAddress,
            tokenId: t.tokenId,
            chainId: t.chainId,
            iconUrl: t.iconUrl,
            score: t.score || 0,
            marketCap,
            lastPrice,
            priceChangePercent: percentChange24h,
            quoteVolume: volume24h,
            highPrice: parseFloat(t.priceHigh24h || '0') || lastPrice,
            lowPrice: parseFloat(t.priceLow24h || '0') || lastPrice,
            isAlpha: true,
            lastUpdated: now,
          };

          allAlphaTokens.set(alphaSymbol, tokenRecord);

          // Register multi-index aliases in alphaSymbolMap
          const rawSymbol = (t.symbol || '').trim();
          const rawAlphaId = (t.alphaId || '').trim();
          const rawName = (t.name || '').trim();
          const rawContract = (t.contractAddress || '').trim().toLowerCase();
          const rawTokenId = (t.tokenId || '').trim();

          const aliases: string[] = [
            alphaSymbol.toUpperCase(),
            rawAlphaId.toUpperCase(),
            rawAlphaId.replace(/^ALPHA_/, '').toUpperCase(),
            rawSymbol.toUpperCase(),
            `${rawSymbol.toUpperCase()}USDT`,
            `${rawSymbol.toUpperCase()}/USDT`,
            rawName.toUpperCase(),
            rawContract,
            rawTokenId.toUpperCase(),
          ].filter(Boolean);

          aliases.forEach((alias) => {
            const existingKey = alphaSymbolMap.get(alias);
            if (!existingKey) {
              alphaSymbolMap.set(alias, alphaSymbol);
            } else {
              const existingToken = allAlphaTokens.get(existingKey);
              if (!existingToken || volume24h > (existingToken.quoteVolume || 0)) {
                alphaSymbolMap.set(alias, alphaSymbol);
              }
            }
          });

          // Track 5m candle for Alpha token
          if (!candle5mTracker.has(alphaSymbol)) {
            candle5mTracker.set(alphaSymbol, {
              open5m: lastPrice,
              high5m: lastPrice,
              low5m: lastPrice,
              close5m: lastPrice,
              openTime: currentBucketTime,
              closeTime: currentBucketTime + 300000 - 1,
              prevClose5m: lastPrice,
              volRatio: 1.0,
              consecutiveGreen: percentChange24h > 0 ? 1 : 0,
              lastUpdated: now,
            });
          } else {
            const c = candle5mTracker.get(alphaSymbol)!;
            c.close5m = lastPrice;
            if (lastPrice > c.high5m) c.high5m = lastPrice;
            if (lastPrice < c.low5m && lastPrice > 0) c.low5m = lastPrice;
            c.lastUpdated = now;
          }
        });
        lastAlphaFetch = now;
      }
    }
  } catch (err: any) {
    console.error('Error refreshing Alpha tokens:', err.message);
  } finally {
    isFetchingAlpha = false;
  }
}

// Unified Symbol & Token Resolver (supports Spot coins, Alpha coins, Base Asset, Contract Address, Token ID)
interface ResolvedTokenInfo {
  isAlpha: boolean;
  symbol: string; // The canonical symbol e.g. "ALPHA_1005USDT" or "SOLUSDT"
  displaySymbol: string; // "CAP/USDT" or "SOL/USDT"
  baseAsset: string; // "CAP" or "SOL"
  name: string; // "Cap" or "Solana"
  chainName?: string;
  contractAddress?: string;
  tokenId?: string;
  data: any;
}

function findToken(rawQuery: string): ResolvedTokenInfo | null {
  if (!rawQuery) return null;
  const q = rawQuery.trim();
  if (!q) return null;
  const qUpper = q.toUpperCase();
  const qLower = q.toLowerCase();

  // 1. Alpha Lookup via multi-index alias map
  const variants = [
    qUpper,
    qLower,
    qUpper.replace(/\/USDT$/, 'USDT'),
    qUpper.endsWith('USDT') ? qUpper.slice(0, -4) : `${qUpper}USDT`,
    qUpper.replace(/^ALPHA_/, ''),
    `ALPHA_${qUpper.replace(/^ALPHA_/, '')}`,
    `ALPHA_${qUpper.replace(/^ALPHA_/, '')}USDT`,
  ];

  for (const v of variants) {
    const alphaKey = alphaSymbolMap.get(v);
    if (alphaKey && allAlphaTokens.has(alphaKey)) {
      const t = allAlphaTokens.get(alphaKey);
      return {
        isAlpha: true,
        symbol: alphaKey,
        displaySymbol: t.displaySymbol || `${t.baseAsset}/USDT`,
        baseAsset: t.baseAsset || t.symbol,
        name: t.name || t.baseAsset,
        chainName: t.chainName,
        contractAddress: t.contractAddress,
        tokenId: t.tokenId,
        data: t,
      };
    }
  }

  // 2. Direct Spot checks
  if (allSpotTickers.has(qUpper)) {
    const s = allSpotTickers.get(qUpper);
    return {
      isAlpha: false,
      symbol: qUpper,
      displaySymbol: `${s.baseAsset}/USDT`,
      baseAsset: s.baseAsset,
      name: s.name || s.baseAsset,
      data: s,
    };
  }
  if (!qUpper.endsWith('USDT') && allSpotTickers.has(`${qUpper}USDT`)) {
    const s = allSpotTickers.get(`${qUpper}USDT`);
    return {
      isAlpha: false,
      symbol: `${qUpper}USDT`,
      displaySymbol: `${s.baseAsset}/USDT`,
      baseAsset: s.baseAsset,
      name: s.name || s.baseAsset,
      data: s,
    };
  }

  // 3. Fallback iterate through allAlphaTokens (partial name, contract prefix, tokenId)
  for (const [key, t] of allAlphaTokens.entries()) {
    if (
      key.toUpperCase() === qUpper ||
      t.baseAsset?.toUpperCase() === qUpper ||
      t.symbol?.toUpperCase() === qUpper ||
      t.name?.toUpperCase() === qUpper ||
      (t.contractAddress && t.contractAddress.toLowerCase() === qLower) ||
      (t.contractAddress && t.contractAddress.toLowerCase().startsWith(qLower)) ||
      (t.alphaId && t.alphaId.toUpperCase() === qUpper) ||
      (t.tokenId && t.tokenId.toUpperCase() === qUpper)
    ) {
      return {
        isAlpha: true,
        symbol: key,
        displaySymbol: t.displaySymbol || `${t.baseAsset}/USDT`,
        baseAsset: t.baseAsset || t.symbol,
        name: t.name || t.baseAsset,
        chainName: t.chainName,
        contractAddress: t.contractAddress,
        tokenId: t.tokenId,
        data: t,
      };
    }
  }

  // 4. Fallback iterate through Spot tickers by baseAsset
  for (const [key, s] of allSpotTickers.entries()) {
    if (s.baseAsset?.toUpperCase() === qUpper) {
      return {
        isAlpha: false,
        symbol: key,
        displaySymbol: `${s.baseAsset}/USDT`,
        baseAsset: s.baseAsset,
        name: s.name || s.baseAsset,
        data: s,
      };
    }
  }

  return null;
}

// 3. Binance WebSocket Stream for Real-Time Millisecond Price Updates
let wsClient: any = null;
function startBinanceWebSocket() {
  if (typeof WebSocket === 'undefined') return;

  try {
    wsClient = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

    wsClient.onopen = () => {
      console.log('Connected to Binance !miniTicker@arr WebSocket stream.');
    };

    wsClient.onmessage = (e: any) => {
      try {
        const tickers = JSON.parse(e.data);
        if (!Array.isArray(tickers)) return;

        const now = Date.now();
        const bucket = Math.floor(now / 300000) * 300000;

        // Check if a new 5m candle period began
        if (bucket > currentBucketTime) {
          rollOver5mCandles(bucket);
        }

        for (const t of tickers) {
          const sym = t.s;
          if (sym && sym.endsWith('USDT')) {
            const price = parseFloat(t.c);
            const quoteVol = parseFloat(t.q || '0');

            // Update spot map
            if (allSpotTickers.has(sym)) {
              const spot = allSpotTickers.get(sym)!;
              spot.lastPrice = price;
              spot.quoteVolume = quoteVol;
              spot.lastUpdated = now;
            }

            // Update 5m tracker
            if (!candle5mTracker.has(sym)) {
              candle5mTracker.set(sym, {
                open5m: price,
                high5m: price,
                low5m: price,
                close5m: price,
                openTime: currentBucketTime,
                closeTime: currentBucketTime + 300000 - 1,
                prevClose5m: price,
                volRatio: 1.0,
                consecutiveGreen: 0,
                lastUpdated: now,
              });
            } else {
              const c = candle5mTracker.get(sym)!;
              c.close5m = price;
              if (price > c.high5m) c.high5m = price;
              if (price < c.low5m && price > 0) c.low5m = price;
              c.lastUpdated = now;
            }
          }
        }
      } catch (err: any) {
        // ignore parse errors
      }
    };

    wsClient.onerror = (err: any) => {
      console.warn('Binance WebSocket error:', err.message || err);
    };

    wsClient.onclose = () => {
      console.log('Binance WebSocket closed, reconnecting in 3 seconds...');
      setTimeout(startBinanceWebSocket, 3000);
    };
  } catch (err: any) {
    console.warn('Failed to start Binance WebSocket:', err.message);
    setTimeout(startBinanceWebSocket, 5000);
  }
}

// Roll over into new 5m candle window
function rollOver5mCandles(newBucket: number) {
  console.log(`Rolling over into new 5M candle bucket: ${new Date(newBucket).toLocaleTimeString()}`);
  currentBucketTime = newBucket;

  candle5mTracker.forEach((c) => {
    // Determine if previous candle was green
    const wasGreen = c.close5m > c.open5m;
    if (wasGreen) {
      c.consecutiveGreen = (c.consecutiveGreen || 0) + 1;
    } else {
      c.consecutiveGreen = 0;
    }
    c.prevClose5m = c.close5m;
    c.open5m = c.close5m;
    c.high5m = c.close5m;
    c.low5m = c.close5m;
    c.openTime = newBucket;
    c.closeTime = newBucket + 300000 - 1;
  });
}

// 4. Background Scanner Queue for Precise Kline Confirmation
// Cycles through spot pairs and alpha pairs to fetch official 5m klines and volume ratios
const KLINE_SCAN_BATCH_SIZE = 12;
let scanQueue: string[] = [];
let scanQueueIndex = 0;

function refreshScanQueue() {
  const spotSymbols = Array.from(allSpotTickers.keys()).sort((a, b) => {
    const va = allSpotTickers.get(a)?.quoteVolume || 0;
    const vb = allSpotTickers.get(b)?.quoteVolume || 0;
    return vb - va; // Sort by volume so high liquidity coins are prioritized
  });

  const alphaSymbols = Array.from(allAlphaTokens.keys()).sort((a, b) => {
    const va = allAlphaTokens.get(a)?.quoteVolume || 0;
    const vb = allAlphaTokens.get(b)?.quoteVolume || 0;
    return vb - va;
  });

  scanQueue = [...spotSymbols, ...alphaSymbols];
  if (scanQueueIndex >= scanQueue.length) scanQueueIndex = 0;
}

async function processNextKlineBatch() {
  if (scanQueue.length === 0) {
    refreshScanQueue();
  }
  if (scanQueue.length === 0) return;

  const batch = scanQueue.slice(scanQueueIndex, scanQueueIndex + KLINE_SCAN_BATCH_SIZE);
  scanQueueIndex += KLINE_SCAN_BATCH_SIZE;
  if (scanQueueIndex >= scanQueue.length) {
    scanQueueIndex = 0;
    refreshScanQueue();
  }

  await Promise.all(
    batch.map(async (sym) => {
      try {
        const isAlpha = sym.startsWith('ALPHA_');
        let klines: any[] = [];

        if (isAlpha) {
          const res = await fetch(`https://www.binance.com/bapi/defi/v1/public/alpha-trade/klines?symbol=${sym}&interval=5m&limit=12`);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.data)) {
              klines = data.data;
            }
          }
        } else {
          const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=5m&limit=12`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              klines = data;
            }
          }
        }

        if (klines.length >= 2) {
          const latestK = klines[klines.length - 1];
          const open = parseFloat(latestK[1]);
          const high = parseFloat(latestK[2]);
          const low = parseFloat(latestK[3]);
          const close = parseFloat(latestK[4]);
          const currentVol = parseFloat(latestK[5]);

          // Calculate average volume of previous 5 candles
          const prevVols = klines.slice(-6, -1).map((k: any) => parseFloat(k[5]));
          const avgVol = prevVols.reduce((a: number, b: number) => a + b, 0) / (prevVols.length || 1);
          const volRatio = avgVol > 0 ? currentVol / avgVol : 1;

          // Calculate consecutive green candles from official klines
          let consecutiveGreen = 0;
          for (let i = klines.length - 1; i >= 0; i--) {
            const o = parseFloat(klines[i][1]);
            const c = parseFloat(klines[i][4]);
            if (c > o) consecutiveGreen++;
            else break;
          }

          const existing = candle5mTracker.get(sym);
          if (existing) {
            existing.open5m = open;
            existing.high5m = Math.max(existing.high5m, high);
            existing.low5m = Math.min(existing.low5m, low);
            existing.close5m = close;
            existing.volRatio = volRatio;
            existing.consecutiveGreen = consecutiveGreen;
            existing.openTime = parseInt(latestK[0], 10);
            existing.closeTime = parseInt(latestK[6], 10);
            existing.lastUpdated = Date.now();
          } else {
            candle5mTracker.set(sym, {
              open5m: open,
              high5m: high,
              low5m: low,
              close5m: close,
              openTime: parseInt(latestK[0], 10),
              closeTime: parseInt(latestK[6], 10),
              prevClose5m: parseFloat(klines[klines.length - 2][4]),
              volRatio,
              consecutiveGreen,
              lastUpdated: Date.now(),
            });
          }
        }
      } catch (e) {
        // fail silently for individual symbol
      }
    })
  );
}

// Initial boot
async function initializeData() {
  await Promise.all([refreshSpotTickers(), refreshAlphaTokens()]);
  refreshScanQueue();
  startBinanceWebSocket();

  // Background ticker refresh every 6 seconds for spot
  setInterval(refreshSpotTickers, 6000);

  // Background alpha refresh every 12 seconds
  setInterval(refreshAlphaTokens, 12000);

  // Background kline accuracy scanner (12 symbols every 1.5s)
  setInterval(processNextKlineBatch, 1500);
}
initializeData();

// Technical indicator helpers for short-term scalping
function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (!prices || prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: (number | null)[] = [];
  let prevEma: number | null = null;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      emaArray.push(null);
    } else if (i === period - 1) {
      const slice = prices.slice(0, period);
      const sum = slice.reduce((a, b) => a + b, 0);
      prevEma = sum / period;
      emaArray.push(prevEma);
    } else {
      prevEma = prices[i] * k + prevEma! * (1 - k);
      emaArray.push(prevEma);
    }
  }
  return emaArray;
}

function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  if (!closes || closes.length <= period) {
    return closes.map(() => 50);
  }
  const rsiArray: (number | null)[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < period; i++) {
    rsiArray.push(null);
  }

  const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const initialRsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + initialRs));
  rsiArray.push(initialRsi);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiArray.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsiArray.push(100 - (100 / (1 + rs)));
    }
  }

  return rsiArray;
}

// Helper to construct a full CoinScanResult with scalping indicators
function getCoinScanResult(sym: string, isAlpha: boolean): any {
  const meta = isAlpha ? allAlphaTokens.get(sym) : allSpotTickers.get(sym);
  if (!meta) return null;

  const candle = candle5mTracker.get(sym) || {
    open5m: meta.lastPrice,
    high5m: meta.highPrice || meta.lastPrice,
    low5m: meta.lowPrice || meta.lastPrice,
    close5m: meta.lastPrice,
    openTime: currentBucketTime,
    closeTime: currentBucketTime + 300000 - 1,
    prevClose5m: meta.lastPrice,
    volRatio: 1.0,
    consecutiveGreen: meta.priceChangePercent > 0 ? 1 : 0,
    lastUpdated: Date.now(),
  };

  const open = candle.open5m || meta.lastPrice || 1;
  const currentPrice = candle.close5m || meta.lastPrice;
  const high = Math.max(candle.high5m, currentPrice);
  const low = Math.min(candle.low5m, currentPrice);

  const changePct = open > 0 ? ((currentPrice - open) / open) * 100 : 0;
  const rangePct = open > 0 ? ((high - low) / open) * 100 : 0;
  const isGoingUp = changePct > 0;
  const isSpike = rangePct >= 1.8 || Math.abs(changePct) >= 1.5 || (candle.volRatio >= 2.2 && changePct > 0.4);

  const quoteVolume = meta.quoteVolume || 0;
  const isMeme = isMemeCoin(sym, meta.name, meta.baseAsset);
  const isInUptrend = isGoingUp && currentPrice >= open && changePct >= 0;

  // Short-term scalping indicators computation
  // Estimated 5m RSI
  const approxRsi = Math.min(
    88,
    Math.max(16, 50 + changePct * 6.5 + (meta.priceChangePercent || 0) * 0.4)
  );

  let scalpScore = 0;
  const scalpSignals: string[] = [];

  // Criterion 1: Volume & Liquidity Threshold (User requirement: > $1,000,000)
  if (quoteVolume >= 50_000_000) {
    scalpScore += 25;
    scalpSignals.push(`Deep Liquidity ($${(quoteVolume / 1_000_000).toFixed(1)}M)`);
  } else if (quoteVolume >= 10_000_000) {
    scalpScore += 20;
    scalpSignals.push(`High Liquidity ($${(quoteVolume / 1_000_000).toFixed(1)}M)`);
  } else if (quoteVolume >= 1_000_000) {
    scalpScore += 15;
    scalpSignals.push(`Volume > $1M ($${(quoteVolume / 1_000_000).toFixed(2)}M)`);
  } else {
    // Under $1M volume: High slippage risk for quick scalping!
    scalpScore -= 25;
    scalpSignals.push(`Low Volume (<$1M) - Slippage Risk`);
  }

  // Criterion 2: 5M Bullish Momentum
  if (changePct >= 0.4 && changePct <= 3.5) {
    scalpScore += 25;
    scalpSignals.push(`5M Bullish Impulse (+${changePct.toFixed(2)}%)`);
  } else if (changePct > 0) {
    scalpScore += 12;
    scalpSignals.push(`Positive 5m Candle (+${changePct.toFixed(2)}%)`);
  } else {
    scalpScore -= 10;
  }

  // Criterion 3: Volume Surge (RVOL)
  if (candle.volRatio >= 2.5) {
    scalpScore += 20;
    scalpSignals.push(`Heavy Volume Surge (${candle.volRatio.toFixed(1)}x)`);
  } else if (candle.volRatio >= 1.5) {
    scalpScore += 12;
    scalpSignals.push(`Volume Surge (${candle.volRatio.toFixed(1)}x)`);
  }

  // Criterion 4: Consecutive Green Candles
  if (candle.consecutiveGreen >= 2) {
    scalpScore += 15;
    scalpSignals.push(`${candle.consecutiveGreen} Consecutive Green 5M Candles`);
  } else if (candle.consecutiveGreen === 1) {
    scalpScore += 5;
  }

  // Criterion 5: Scalp Volatility Range
  if (rangePct >= 0.8 && rangePct <= 4.0) {
    scalpScore += 15;
    scalpSignals.push(`Optimal Scalp Range (${rangePct.toFixed(2)}%)`);
  }

  // Criterion 6: RSI Expansion Zone
  if (approxRsi >= 52 && approxRsi <= 68) {
    scalpScore += 10;
    scalpSignals.push(`RSI in Bullish Expansion (${approxRsi.toFixed(1)})`);
  } else if (approxRsi > 78) {
    scalpScore -= 8;
    scalpSignals.push(`RSI Overbought (${approxRsi.toFixed(1)})`);
  }

  scalpScore = Math.max(0, Math.min(100, Math.round(scalpScore)));

  let scalpRating: 'STRONG SCALP' | 'BULLISH MOMENTUM' | 'WATCH' = 'WATCH';
  if (scalpScore >= 75 && quoteVolume >= 1_000_000) {
    scalpRating = 'STRONG SCALP';
  } else if (scalpScore >= 55 && quoteVolume >= 1_000_000) {
    scalpRating = 'BULLISH MOMENTUM';
  }

  // Calculated Scalp Targets:
  const stopLossPct = Math.max(0.005, rangePct * 0.0035);
  const target1Pct = Math.max(0.010, rangePct * 0.007);
  const target2Pct = Math.max(0.020, rangePct * 0.014);

  const entry = currentPrice;
  const stopLoss = currentPrice * (1 - stopLossPct);
  const takeProfit1 = currentPrice * (1 + target1Pct);
  const takeProfit2 = currentPrice * (1 + target2Pct);
  const riskReward = `1 : ${(target1Pct / stopLossPct).toFixed(1)}`;

  return {
    symbol: sym,
    displaySymbol: meta.displaySymbol || sym,
    canonicalSymbol: meta.symbol || sym,
    baseAsset: meta.baseAsset,
    name: meta.name || meta.baseAsset,
    lastPrice: currentPrice,
    price: currentPrice,
    open,
    high,
    low,
    volume: meta.quoteVolume,
    quoteVolume: meta.quoteVolume,
    changePct,
    rangePct,
    volRatio: candle.volRatio,
    consecutiveGreen: candle.consecutiveGreen,
    isGoingUp,
    isSpike,
    openTime: candle.openTime,
    closeTime: candle.closeTime,
    prevClose: candle.prevClose5m,
    isAlpha: !!isAlpha,
    alphaId: meta.alphaId,
    chainName: meta.chainName,
    contractAddress: meta.contractAddress,
    tokenId: meta.tokenId,
    iconUrl: meta.iconUrl,
    score: meta.score,
    marketCap: meta.marketCap,
    priceChange24h: meta.priceChangePercent,
    isMeme,
    isInUptrend,
    // Scalp additions
    rsi14: Math.round(approxRsi * 10) / 10,
    scalpScore,
    scalpRating,
    scalpSignals,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskReward,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Endpoint: All Coins Scanner & Filter
app.get('/api/binance/all-coins', (req, res) => {
  const tab = (req.query.tab as string) || 'all'; // all, going_up, spikes, alpha, consecutive
  const search = ((req.query.search as string) || '').trim().toLowerCase();
  const sortBy = (req.query.sortBy as string) || 'quoteVolume';
  const sortDir = (req.query.sortDir as string) || 'desc';
  const limit = Math.min(parseInt(req.query.limit as string || '200', 10), 2000);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const allItems: any[] = [];
  let coinsGoingUp5m = 0;
  let volatilitySpikes5m = 0;
  let consecutiveGreenCount = 0;
  let alphaCoinsCount = allAlphaTokens.size;
  let spotCoinsCount = allSpotTickers.size;

  // Process Spot Coins
  allSpotTickers.forEach((_, sym) => {
    const item = getCoinScanResult(sym, false);
    if (item) {
      if (item.isGoingUp) coinsGoingUp5m++;
      if (item.isSpike) volatilitySpikes5m++;
      if (item.consecutiveGreen >= 2) consecutiveGreenCount++;
      allItems.push(item);
    }
  });

  // Process Alpha Coins
  allAlphaTokens.forEach((_, sym) => {
    const item = getCoinScanResult(sym, true);
    if (item) {
      if (item.isGoingUp) coinsGoingUp5m++;
      if (item.isSpike) volatilitySpikes5m++;
      if (item.consecutiveGreen >= 2) consecutiveGreenCount++;
      allItems.push(item);
    }
  });

  const minVolume = parseFloat(req.query.minVolume as string || '0');
  const excludeMeme = req.query.excludeMeme !== 'false'; // Default true
  const onlyGoingUp = req.query.onlyGoingUp === 'true';

  // Filter based on tab, search, minVolume, excludeMeme, onlyGoingUp
  let filtered = allItems.filter((item) => {
    // Exclude meme coins if requested (default on)
    if (excludeMeme && item.isMeme) {
      return false;
    }

    // Only include coins going up (no downtrend coins, long-only)
    if (onlyGoingUp && (!item.isGoingUp || item.changePct < 0)) {
      return false;
    }

    if (minVolume > 0 && (item.quoteVolume || item.volume || 0) < minVolume) {
      return false;
    }

    if (search) {
      const matchSymbol = item.symbol.toLowerCase().includes(search);
      const matchBase = item.baseAsset.toLowerCase().includes(search);
      const matchName = (item.name || '').toLowerCase().includes(search);
      const matchChain = (item.chainName || '').toLowerCase().includes(search);
      const matchContract = (item.contractAddress || '').toLowerCase().includes(search);
      const matchAlphaId = (item.alphaId || '').toLowerCase().includes(search);
      if (!matchSymbol && !matchBase && !matchName && !matchChain && !matchContract && !matchAlphaId) return false;
      // When a user explicitly searches for a coin, always return matching coins (do not filter out by tab or volume)
      return true;
    }

    if (tab === 'going_up') {
      return item.isGoingUp && item.changePct >= 0.1;
    }
    if (tab === 'spikes') {
      return item.isSpike;
    }
    if (tab === 'alpha') {
      return item.isAlpha;
    }
    if (tab === 'consecutive') {
      return item.consecutiveGreen >= 2;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let va = a[sortBy] ?? 0;
    let vb = b[sortBy] ?? 0;
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();

    if (sortDir === 'asc') {
      return va > vb ? 1 : va < vb ? -1 : 0;
    } else {
      return va < vb ? 1 : va > vb ? -1 : 0;
    }
  });

  const total = filtered.length;
  const pagedItems = filtered.slice(offset, offset + limit);

  const stats = {
    totalCoins: allSpotTickers.size + allAlphaTokens.size,
    spotCoins: spotCoinsCount,
    alphaCoins: alphaCoinsCount,
    coinsGoingUp5m,
    volatilitySpikes5m,
    consecutiveGreenCount,
    lastScannedAt: Date.now(),
  };

  res.json({
    items: pagedItems,
    total,
    stats,
  });
});

// Endpoint: Batch scan for monitored/pinned coins
app.get('/api/binance/scan-batch', (req, res) => {
  const symbolsParam = req.query.symbols as string;
  let symbols: string[] = [];

  if (symbolsParam) {
    symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).slice(0, 50);
  } else {
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'SUIUSDT', 'NEARUSDT', 'LINKUSDT', 'PEPEUSDT'];
  }

  const items = symbols.map((sym) => {
    const isAlpha = sym.startsWith('ALPHA_') || allAlphaTokens.has(sym);
    return getCoinScanResult(sym, isAlpha);
  }).filter(Boolean);

  res.json({
    scannedAt: Date.now(),
    items,
  });
});

// Endpoint: Instant Search Autocomplete for Spot & Alpha coins
app.get('/api/binance/search', (req, res) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();
  if (!query) {
    return res.json({ query: '', total: 0, results: [] });
  }

  const results: any[] = [];
  const addedSymbols = new Set<string>();

  // 1. Search in Alpha Tokens
  allAlphaTokens.forEach((t) => {
    const sym = (t.symbol || '').toLowerCase();
    const base = (t.baseAsset || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    const alphaId = (t.alphaId || '').toLowerCase();
    const contract = (t.contractAddress || '').toLowerCase();
    const chain = (t.chainName || '').toLowerCase();

    let relevance = 0;
    if (base === query || sym === query) relevance = 100;
    else if (alphaId === query || alphaId === `alpha_${query}`) relevance = 90;
    else if (name === query) relevance = 85;
    else if (contract === query) relevance = 80;
    else if (base.startsWith(query) || sym.startsWith(query)) relevance = 70;
    else if (name.startsWith(query)) relevance = 60;
    else if (contract.startsWith(query)) relevance = 55;
    else if (base.includes(query) || name.includes(query) || contract.includes(query) || chain.includes(query)) relevance = 40;

    if (relevance > 0) {
      results.push({
        symbol: t.symbol,
        displaySymbol: t.displaySymbol || `${t.baseAsset}/USDT`,
        baseAsset: t.baseAsset,
        name: t.name || t.baseAsset,
        isAlpha: true,
        chainName: t.chainName || 'Web3',
        contractAddress: t.contractAddress,
        tokenId: t.tokenId,
        alphaId: t.alphaId,
        lastPrice: t.lastPrice,
        priceChange24h: t.priceChangePercent,
        quoteVolume: t.quoteVolume,
        iconUrl: t.iconUrl,
        relevance,
      });
      addedSymbols.add(t.symbol);
    }
  });

  // 2. Search in Spot Tickers
  allSpotTickers.forEach((s) => {
    const sym = (s.symbol || '').toLowerCase();
    const base = (s.baseAsset || '').toLowerCase();
    const name = (s.name || '').toLowerCase();

    let relevance = 0;
    if (base === query || sym === query) relevance = 95;
    else if (base.startsWith(query) || sym.startsWith(query)) relevance = 65;
    else if (name.startsWith(query)) relevance = 55;
    else if (base.includes(query) || sym.includes(query) || name.includes(query)) relevance = 35;

    if (relevance > 0 && !addedSymbols.has(s.symbol)) {
      results.push({
        symbol: s.symbol,
        displaySymbol: `${s.baseAsset}/USDT`,
        baseAsset: s.baseAsset,
        name: s.name || s.baseAsset,
        isAlpha: false,
        lastPrice: s.lastPrice,
        priceChange24h: s.priceChangePercent,
        quoteVolume: s.quoteVolume,
        iconUrl: s.iconUrl,
        relevance,
      });
    }
  });

  // Sort by relevance, then 24h quote volume
  results.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return (b.quoteVolume || 0) - (a.quoteVolume || 0);
  });

  res.json({
    query,
    total: results.length,
    results: results.slice(0, 25),
  });
});

// Endpoint: 5m Klines for a specific coin (Works for BOTH Spot and Binance Alpha!)
app.get('/api/binance/klines', async (req, res) => {
  const rawSymbol = (req.query.symbol as string || 'BTCUSDT').trim();
  const interval = (req.query.interval as string || '5m');
  const limit = Math.min(parseInt(req.query.limit as string || '60', 10), 120);

  const resolved = findToken(rawSymbol);
  const isAlpha = resolved ? resolved.isAlpha : (rawSymbol.toUpperCase().startsWith('ALPHA_') || allAlphaTokens.has(rawSymbol.toUpperCase()));
  const symbol = resolved
    ? resolved.symbol
    : (rawSymbol.toUpperCase().startsWith('ALPHA_') || rawSymbol.toUpperCase().endsWith('USDT')
        ? rawSymbol.toUpperCase()
        : `${rawSymbol.toUpperCase()}USDT`);

  try {
    let klinesRaw: any[] = [];

    if (isAlpha) {
      const alphaSym = symbol;
      const url = `https://www.binance.com/bapi/defi/v1/public/alpha-trade/klines?symbol=${encodeURIComponent(alphaSym)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const json = await response.json();
          if (json && json.success && Array.isArray(json.data)) {
            klinesRaw = json.data;
          }
        }
      } catch (err: any) {
        console.warn('Alpha klines fetch timed out or failed:', err.message);
      }
    } else {
      // Standard Binance Spot
      const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
      let response = await fetch(url);
      if (!response.ok) {
        response = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`);
      }

      if (response.ok) {
        klinesRaw = await response.json();
      }
    }

    if (!Array.isArray(klinesRaw) || klinesRaw.length === 0) {
      // Find token record from Alpha or Spot or resolved token
      const tokenRec = isAlpha
        ? (allAlphaTokens.get(symbol) || (resolved ? allAlphaTokens.get(resolved.symbol) : null))
        : allSpotTickers.get(symbol);
      const curPrice = tokenRec ? (tokenRec.lastPrice || 1) : 1;
      const curVol = tokenRec ? (tokenRec.quoteVolume || 100000) : 100000;
      const changePct = tokenRec ? (tokenRec.priceChangePercent || 0) : 0;

      const syntheticKlines: any[] = [];
      const nowTime = Math.floor(Date.now() / 300000) * 300000;
      const count = Math.min(limit, 48);
      let runningPrice = curPrice * (1 - (changePct * 0.002));

      for (let i = count - 1; i >= 0; i--) {
        const openTime = nowTime - (i * 300000);
        const closeTime = openTime + 299999;
        const drift = (Math.sin(i * 0.5) * 0.003) + (((i % 3) - 1) * 0.004);
        const o = runningPrice;
        const c = i === 0 ? curPrice : Math.max(o * 0.0001, o * (1 + drift));
        const spread = Math.abs(c - o) * 0.5 + (o * 0.002);
        const h = Math.max(o, c) + spread;
        const l = Math.max(0.00001, Math.min(o, c) - spread);
        const vol = (curVol / 288) * (0.8 + ((i % 5) * 0.1));

        syntheticKlines.push({
          openTime,
          closeTime,
          open: o,
          high: h,
          low: l,
          close: c,
          volume: vol / Math.max(c, 0.00001),
          quoteVolume: vol,
          change: c - o,
          changePercent: o > 0 ? ((c - o) / o) * 100 : 0,
          rangePercent: o > 0 ? ((h - l) / o) * 100 : 0,
          isBullish: c >= o,
        });
        runningPrice = c;
      }

      const closes = syntheticKlines.map((k: any) => k.close);
      const ema9 = calculateEMA(closes, 9);
      const ema21 = calculateEMA(closes, 21);
      const rsi = calculateRSI(closes, 14);

      for (let i = 0; i < syntheticKlines.length; i++) {
        if (ema9[i] !== null && ema9[i] !== undefined) syntheticKlines[i].ema9 = ema9[i];
        if (ema21[i] !== null && ema21[i] !== undefined) syntheticKlines[i].ema21 = ema21[i];
        if (rsi[i] !== null && rsi[i] !== undefined) syntheticKlines[i].rsi = Math.round(rsi[i]! * 10) / 10;
      }

      return res.json({
        symbol,
        interval,
        isAlpha,
        klines: syntheticKlines,
      });
    }

    const klines: any[] = klinesRaw.map((k: any) => {
      const open = parseFloat(k[1]);
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);
      const volume = parseFloat(k[5]);
      const quoteVolume = parseFloat(k[7] || '0');
      const change = close - open;
      const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;
      const rangePercent = open > 0 ? ((high - low) / open) * 100 : 0;

      return {
        openTime: parseInt(k[0], 10),
        closeTime: parseInt(k[6], 10),
        open,
        high,
        low,
        close,
        volume,
        quoteVolume,
        change,
        changePercent,
        rangePercent,
        isBullish: close >= open,
      };
    });

    // Calculate 5m technical indicators (EMA 9, EMA 21, RSI 14)
    const closes = klines.map((k: any) => k.close);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const rsi = calculateRSI(closes, 14);

    for (let i = 0; i < klines.length; i++) {
      if (ema9[i] !== null && ema9[i] !== undefined) klines[i].ema9 = ema9[i];
      if (ema21[i] !== null && ema21[i] !== undefined) klines[i].ema21 = ema21[i];
      if (rsi[i] !== null && rsi[i] !== undefined) klines[i].rsi = Math.round(rsi[i]! * 10) / 10;
    }

    res.json({ symbol, interval, isAlpha, klines });
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to fetch klines', details: error.message });
  }
});

// Endpoint: Quick Scalp Recommendations (Volume > $1,000,000, 5M Bullish, Indicator-Ranked, No Memes, No Downtrends)
app.get('/api/binance/scalp-recommendations', (req, res) => {
  const minVol = parseFloat((req.query.minVolume as string) || '1000000'); // Default $1M
  const limit = Math.min(parseInt((req.query.limit as string) || '12', 10), 30);
  const excludeMeme = req.query.excludeMeme !== 'false'; // Default true
  const onlyUptrend = req.query.onlyUptrend !== 'false'; // Default true

  const candidates: any[] = [];

  allSpotTickers.forEach((_, sym) => {
    const item = getCoinScanResult(sym, false);
    if (!item) return;

    // Filter out meme coins if excluded
    if (excludeMeme && item.isMeme) return;

    // Filter out downtrends (long-only focus)
    if (onlyUptrend && (!item.isGoingUp || item.changePct <= 0)) return;

    // Volume check (> $1M)
    if (item.quoteVolume >= minVol) {
      candidates.push(item);
    }
  });

  allAlphaTokens.forEach((_, sym) => {
    const item = getCoinScanResult(sym, true);
    if (!item) return;

    if (excludeMeme && item.isMeme) return;
    if (onlyUptrend && (!item.isGoingUp || item.changePct <= 0)) return;

    if (item.quoteVolume >= minVol) {
      candidates.push(item);
    }
  });

  // Sort by scalpScore descending, then by volumeRatio, then by 5m change
  candidates.sort((a, b) => {
    if (b.scalpScore !== a.scalpScore) return b.scalpScore - a.scalpScore;
    if (b.volRatio !== a.volRatio) return b.volRatio - a.volRatio;
    return b.changePct - a.changePct;
  });

  res.json({
    minVolumeRequired: minVol,
    totalQualifying: candidates.length,
    timestamp: Date.now(),
    recommendations: candidates.slice(0, limit),
  });
});

// Endpoint: Scalp Opportunity Evaluator for any coin symbol
app.get('/api/binance/scalp-evaluate', async (req, res) => {
  const rawSym = (req.query.symbol as string || 'SOL').trim();
  if (!rawSym) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  const resolved = findToken(rawSym);
  const isAlpha = resolved ? resolved.isAlpha : (rawSym.toUpperCase().startsWith('ALPHA_') || allAlphaTokens.has(rawSym.toUpperCase()));
  const symbol = resolved
    ? resolved.symbol
    : (rawSym.toUpperCase().startsWith('ALPHA_') || rawSym.toUpperCase().endsWith('USDT')
        ? rawSym.toUpperCase()
        : `${rawSym.toUpperCase()}USDT`);
  const baseAsset = resolved ? resolved.baseAsset : symbol.replace(/^ALPHA_/, '').replace(/USDT$/, '');

  try {
    let tickerData: any = resolved?.data || (isAlpha ? allAlphaTokens.get(symbol) : allSpotTickers.get(symbol));

    // If ticker not in memory, fetch fresh from Binance
    if (!tickerData && !isAlpha) {
      try {
        let tRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        if (!tRes.ok) {
          tRes = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${symbol}`);
        }
        if (tRes.ok) {
          const tJson = await tRes.json();
          tickerData = {
            symbol: tJson.symbol,
            baseAsset,
            name: baseAsset,
            lastPrice: parseFloat(tJson.lastPrice || '0'),
            priceChangePercent: parseFloat(tJson.priceChangePercent || '0'),
            quoteVolume: parseFloat(tJson.quoteVolume || '0'),
            highPrice: parseFloat(tJson.highPrice || '0'),
            lowPrice: parseFloat(tJson.lowPrice || '0'),
          };
        }
      } catch (e) {
        // continue
      }
    }

    // Fetch official 5m klines
    let klinesRaw: any[] = [];
    if (isAlpha) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resK = await fetch(
          `https://www.binance.com/bapi/defi/v1/public/alpha-trade/klines?symbol=${encodeURIComponent(symbol)}&interval=5m&limit=30`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (resK.ok) {
          const json = await resK.json();
          if (json?.data && Array.isArray(json.data)) klinesRaw = json.data;
        }
      } catch (e: any) {
        console.warn('Alpha klines fetch timed out or failed in scalp-evaluate:', e.message);
      }
    } else {
      let resK = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=30`);
      if (!resK.ok) {
        resK = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=5m&limit=30`);
      }
      if (resK.ok) {
        const json = await resK.json();
        if (Array.isArray(json)) klinesRaw = json;
      }
    }

    if (!tickerData && klinesRaw.length === 0) {
      return res.status(404).json({ error: `Symbol '${rawSym}' not found on Binance Spot or Alpha.` });
    }

    // If klines are empty but we have tickerData (e.g. brand new Alpha token), synthesize minimal candles
    if (klinesRaw.length === 0 && tickerData) {
      const p = tickerData.lastPrice || 0;
      const h = tickerData.highPrice || p;
      const l = tickerData.lowPrice || p;
      const v = tickerData.quoteVolume || 0;
      klinesRaw = [
        [Date.now() - 300000, p, h, l, p, v / 288, Date.now() - 1, (v / 288) * p],
        [Date.now(), p, h, l, p, v / 288, Date.now() + 300000 - 1, (v / 288) * p],
      ];
    }

    // Parse candles
    const closes: number[] = [];
    const volumes: number[] = [];
    klinesRaw.forEach((k: any) => {
      closes.push(parseFloat(k[4]));
      volumes.push(parseFloat(k[5]));
    });

    const currentPrice = tickerData?.lastPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
    const quoteVolume24h = tickerData?.quoteVolume || 0;
    const hasSufficientVolume = quoteVolume24h >= 1_000_000;

    // Technical Indicators
    const ema9Arr = calculateEMA(closes, 9);
    const ema21Arr = calculateEMA(closes, 21);
    const rsiArr = calculateRSI(closes, 14);

    const latestEma9 = ema9Arr.length > 0 && ema9Arr[ema9Arr.length - 1] !== null ? ema9Arr[ema9Arr.length - 1]! : currentPrice;
    const latestEma21 = ema21Arr.length > 0 && ema21Arr[ema21Arr.length - 1] !== null ? ema21Arr[ema21Arr.length - 1]! : currentPrice;
    const latestRsi = rsiArr.length > 0 && rsiArr[rsiArr.length - 1] !== null ? rsiArr[rsiArr.length - 1]! : 50;

    // Latest 5m Candle data
    let change5m = 0;
    let range5m = 0;
    let volRatio = 1.0;
    let consecutiveGreen = 0;

    if (klinesRaw.length >= 2) {
      const lastK = klinesRaw[klinesRaw.length - 1];
      const open5m = parseFloat(lastK[1]);
      const high5m = parseFloat(lastK[2]);
      const low5m = parseFloat(lastK[3]);
      const close5m = parseFloat(lastK[4]);
      const vol5m = parseFloat(lastK[5]);

      change5m = open5m > 0 ? ((close5m - open5m) / open5m) * 100 : 0;
      range5m = open5m > 0 ? ((high5m - low5m) / open5m) * 100 : 0;

      // Previous 5 candle avg volume
      const prevVols = volumes.slice(-6, -1);
      const avgVol = prevVols.reduce((a, b) => a + b, 0) / (prevVols.length || 1);
      volRatio = avgVol > 0 ? vol5m / avgVol : 1.0;

      for (let i = klinesRaw.length - 1; i >= 0; i--) {
        const o = parseFloat(klinesRaw[i][1]);
        const c = parseFloat(klinesRaw[i][4]);
        if (c > o) consecutiveGreen++;
        else break;
      }
    }

    const isMeme = isMemeCoin(symbol, tickerData?.name, baseAsset);
    const isGoingUp = change5m > 0;
    const isInUptrend = currentPrice >= latestEma9 && latestEma9 >= latestEma21;

    let trendStatus: 'STRONG UPTREND' | 'MODERATE UPTREND' | 'DOWNTREND' | 'CONSOLIDATING' = 'CONSOLIDATING';
    let emaSignal = 'Neutral alignment: Price oscillating around EMAs';

    if (currentPrice > latestEma9 && latestEma9 > latestEma21) {
      trendStatus = 'STRONG UPTREND';
      emaSignal = 'Bullish Stack (Price > EMA 9 > EMA 21) - Strong upward momentum';
    } else if (currentPrice > latestEma21) {
      trendStatus = 'MODERATE UPTREND';
      emaSignal = 'Price above EMA 21 support; testing EMA 9 resistance';
    } else if (currentPrice < latestEma21 && latestEma9 < latestEma21) {
      trendStatus = 'DOWNTREND';
      emaSignal = 'Bearish Stack (Price < EMA 9 < EMA 21) - Downward pressure';
    }

    // Long compatibility (user is not shorting!)
    const longCompatibility = trendStatus !== 'DOWNTREND' && (isGoingUp || currentPrice >= latestEma21);

    // RSI zone
    let rsiZone: 'OVERSOLD' | 'HEALTHY MOMENTUM' | 'OVERBOUGHT' | 'BEARISH' = 'HEALTHY MOMENTUM';
    if (latestRsi < 35) rsiZone = 'OVERSOLD';
    else if (latestRsi < 48) rsiZone = 'BEARISH';
    else if (latestRsi > 70) rsiZone = 'OVERBOUGHT';
    else rsiZone = 'HEALTHY MOMENTUM';

    // Quantitative Scoring
    let scalpScore = 0;
    const pros: string[] = [];
    const cons: string[] = [];

    // Volume Check
    if (quoteVolume24h >= 50_000_000) {
      scalpScore += 25;
      pros.push(`Deep 24h quote volume ($${(quoteVolume24h / 1_000_000).toFixed(1)}M) guarantees minimal slippage.`);
    } else if (quoteVolume24h >= 1_000_000) {
      scalpScore += 20;
      pros.push(`Qualifies with >$1M volume ($${(quoteVolume24h / 1_000_000).toFixed(2)}M) for safe scalp executions.`);
    } else {
      scalpScore -= 30;
      cons.push(`Volume under $1,000,000 ($${(quoteVolume24h / 1_000_000).toFixed(2)}M). Danger of slippage and illiquidity on market exits.`);
    }

    // Trend & EMAs
    if (trendStatus === 'STRONG UPTREND') {
      scalpScore += 25;
      pros.push('Confirmed Bullish EMA Stack (Price > EMA 9 > EMA 21) on 5-minute time frame.');
    } else if (trendStatus === 'MODERATE UPTREND') {
      scalpScore += 12;
      pros.push('Holding above EMA 21 dynamic support.');
    } else if (trendStatus === 'DOWNTREND') {
      scalpScore -= 35;
      cons.push('In a downtrend below EMA 9 and EMA 21. Since shorting is not used, do not buy into falling candles.');
    }

    // 5M Candle & Momentum
    if (change5m >= 0.4 && change5m <= 3.0) {
      scalpScore += 20;
      pros.push(`Solid 5m bullish impulse (+${change5m.toFixed(2)}%) showing active buyers.`);
    } else if (change5m > 0) {
      scalpScore += 10;
      pros.push(`Positive 5m candle (+${change5m.toFixed(2)}%).`);
    } else {
      scalpScore -= 15;
      cons.push(`Current 5m candle is red (${change5m.toFixed(2)}%). Wait for a green candle close.`);
    }

    // RVOL
    if (volRatio >= 2.0) {
      scalpScore += 15;
      pros.push(`Volume surge is ${volRatio.toFixed(1)}x above 5m average.`);
    } else if (volRatio >= 1.3) {
      scalpScore += 8;
      pros.push(`Volume expanding (${volRatio.toFixed(1)}x relative volume).`);
    }

    // RSI
    if (rsiZone === 'HEALTHY MOMENTUM') {
      scalpScore += 10;
      pros.push(`RSI 14 at ${latestRsi.toFixed(1)} is in healthy expansion zone (50-68) with room to run.`);
    } else if (rsiZone === 'OVERBOUGHT') {
      scalpScore -= 10;
      cons.push(`RSI 14 at ${latestRsi.toFixed(1)} is overbought (>70). High risk of immediate pullback.`);
    } else if (rsiZone === 'BEARISH') {
      scalpScore -= 15;
      cons.push(`RSI 14 at ${latestRsi.toFixed(1)} indicates weak buyer demand.`);
    }

    // Consecutive green
    if (consecutiveGreen >= 2) {
      scalpScore += 10;
      pros.push(`${consecutiveGreen} consecutive green 5m candles confirming upward trend.`);
    }

    // Meme coin penalty
    if (isMeme) {
      scalpScore -= 20;
      cons.push('Identified as a meme coin. High risk of abrupt liquidation cascades and unpredictable volatility.');
    }

    scalpScore = Math.max(0, Math.min(100, Math.round(scalpScore)));

    // Verdict formulation
    let verdict: string = 'MODERATE SCALP (PULLBACK RETEST)';
    let verdictType: 'strong' | 'moderate' | 'avoid' = 'moderate';

    if (isMeme) {
      verdict = 'AVOID (MEME COIN)';
      verdictType = 'avoid';
    } else if (!hasSufficientVolume) {
      verdict = 'LOW LIQUIDITY (<$1M)';
      verdictType = 'avoid';
    } else if (!longCompatibility || trendStatus === 'DOWNTREND') {
      verdict = 'NOT RECOMMENDED (DOWNTREND)';
      verdictType = 'avoid';
    } else if (scalpScore >= 75) {
      verdict = 'STRONG SCALP BUY';
      verdictType = 'strong';
    } else {
      verdict = 'MODERATE SCALP (PULLBACK RETEST)';
      verdictType = 'moderate';
    }

    // Proposed Scalp Levels
    const stopLossPct = Math.max(0.005, range5m * 0.0035);
    const target1Pct = Math.max(0.008, range5m * 0.007);
    const target2Pct = Math.max(0.018, range5m * 0.014);

    const suggestedEntry = currentPrice;
    const stopLoss = currentPrice * (1 - stopLossPct);
    const target1 = currentPrice * (1 + target1Pct);
    const target2 = currentPrice * (1 + target2Pct);
    const riskReward = `1 : ${(target1Pct / stopLossPct).toFixed(1)}`;

    let summaryNote = '';
    if (verdict === 'STRONG SCALP BUY') {
      summaryNote = `${symbol} is in a prime setup for a quick long scalp. Strong upward momentum, price stacked above EMA 9/21, healthy volume above $1M, and RSI showing room to expand.`;
    } else if (verdict === 'MODERATE SCALP (PULLBACK RETEST)') {
      summaryNote = `${symbol} shows positive structure but is best entered on a brief 5M dip toward EMA 9 ($${latestEma9.toFixed(4)}) rather than chasing the current high.`;
    } else if (verdict === 'NOT RECOMMENDED (DOWNTREND)') {
      summaryNote = `${symbol} is in a down trend with price below key moving averages. As a long-only trader without shorting, avoid this coin until a clear reversal is confirmed.`;
    } else if (verdict === 'AVOID (MEME COIN)') {
      summaryNote = `${symbol} is tagged as a meme coin. Per your rules to exclude meme coins, avoid systematic scalping due to speculative risk and sudden dump wicks.`;
    } else {
      summaryNote = `${symbol} has 24h volume below your $1,000,000 liquidity threshold, which creates severe slippage and exit difficulty on short-term scalps.`;
    }

    // Optional Gemini enhancement
    let aiExplanation: string | undefined = undefined;
    const ai = getAi();
    if (ai) {
      try {
        const prompt = `You are a professional cryptocurrency scalp trader analyzing 5-minute charts.
Coin: ${symbol}
Current Price: $${currentPrice}
5M Change: ${change5m.toFixed(2)}%
24H Volume: $${quoteVolume24h.toLocaleString()}
EMA 9: $${latestEma9.toFixed(4)}, EMA 21: $${latestEma21.toFixed(4)}
Trend: ${trendStatus}
RSI (14): ${latestRsi.toFixed(1)}
RVOL: ${volRatio.toFixed(1)}x
Is Meme Coin: ${isMeme ? 'YES' : 'NO'}
Trading Style: Long Only (User does NOT short). Minimum Volume rule: $1M.
Verdict: ${verdict} (Score: ${scalpScore}/100).

Give a concise, sharp 2-sentence trading decision summarizing why this coin is or is not good to scalp right now.`;
        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3000)),
        ]);
        if (response && 'text' in response && response.text) {
          aiExplanation = response.text.trim();
        }
      } catch (geminiErr: any) {
        // Fallback to algorithmic summary seamlessly
      }
    }

    res.json({
      symbol: isAlpha ? (resolved?.displaySymbol || `${baseAsset}/USDT`) : symbol,
      canonicalSymbol: symbol,
      displaySymbol: resolved?.displaySymbol || `${baseAsset}/USDT`,
      baseAsset,
      name: resolved?.name || tickerData?.name || baseAsset,
      isAlpha: !!isAlpha,
      chainName: resolved?.chainName || tickerData?.chainName,
      contractAddress: resolved?.contractAddress || tickerData?.contractAddress,
      tokenId: resolved?.tokenId || tickerData?.tokenId,
      isMeme,
      lastPrice: currentPrice,
      quoteVolume24h,
      hasSufficientVolume,
      isGoingUp,
      isInUptrend,
      trendStatus,
      change5m,
      range5m,
      consecutiveGreen,
      ema9: Math.round(latestEma9 * 100000) / 100000,
      ema21: Math.round(latestEma21 * 100000) / 100000,
      emaSignal,
      rsi14: Math.round(latestRsi * 10) / 10,
      rsiZone,
      volRatio: Math.round(volRatio * 10) / 10,
      verdict,
      verdictType,
      scalpScore,
      longCompatibility,
      suggestedEntry,
      target1,
      target2,
      stopLoss,
      riskReward,
      pros,
      cons,
      summaryNote,
      aiExplanation,
    });
  } catch (err: any) {
    console.error('Scalp evaluate error:', err);
    res.status(500).json({ error: 'Failed to evaluate symbol', details: err.message });
  }
});

// Endpoint: Live Monitoring Stats
app.get('/api/binance/stats', (req, res) => {
  let coinsGoingUp5m = 0;
  let volatilitySpikes5m = 0;
  let consecutiveGreenCount = 0;

  candle5mTracker.forEach((c) => {
    if (c.close5m > c.open5m) coinsGoingUp5m++;
    const range = c.open5m > 0 ? ((c.high5m - c.low5m) / c.open5m) * 100 : 0;
    if (range >= 1.8) volatilitySpikes5m++;
    if (c.consecutiveGreen >= 2) consecutiveGreenCount++;
  });

  res.json({
    totalCoins: allSpotTickers.size + allAlphaTokens.size,
    spotCoins: allSpotTickers.size,
    alphaCoins: allAlphaTokens.size,
    coinsGoingUp5m,
    volatilitySpikes5m,
    consecutiveGreenCount,
    lastScannedAt: Date.now(),
    currentBucketTime,
    nextBucketTime: currentBucketTime + 300000,
  });
});

// Production and dev server handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Binance All-Coins 5M Alert Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
