import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Zap, Sparkles, ArrowRight, ExternalLink, Flame, ShieldAlert, Target } from 'lucide-react';
import { CoinScanResult } from '../types';
import { getCoinDisplayInfo } from '../utils/coinFormatting';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
  hotScalps: CoinScanResult[];
  alphaTokens: CoinScanResult[];
  bullishCoins: CoinScanResult[];
}

export default function CommandSearchModal({
  isOpen,
  onClose,
  onSelectCoin,
  hotScalps,
  alphaTokens,
  bullishCoins,
}: CommandSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'scalps' | 'alpha' | 'bullish'>('all');
  const [serverResults, setServerResults] = useState<any[]>([]);
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<any>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setServerResults([]);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Server debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setServerResults([]);
      setIsLoadingServer(false);
      return;
    }

    setIsLoadingServer(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/binance/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results)) {
            setServerResults(data.results);
          }
        }
      } catch (e) {
        console.warn('Search query error:', e);
      } finally {
        setIsLoadingServer(false);
      }
    }, 120);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  if (!isOpen) return null;

  // Format price helper
  const formatPrice = (p?: number) => {
    if (p === undefined || p === null || isNaN(p) || p <= 0) return '0.00';
    if (p >= 100) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.01) return p.toFixed(5);
    if (p >= 0.0001) return p.toFixed(6);
    if (p >= 0.000001) return p.toFixed(8);
    return p.toPrecision(4);
  };

  const handlePick = (symbol: string) => {
    onSelectCoin(symbol);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0c101c] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center gap-3 bg-[#0f1422]">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type token name, ticker (SOL, DOGE, VIC...), or Alpha ID..."
            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 text-sm sm:text-base font-medium focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Filter Quick Pills */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#090d16] border-b border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Results
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('scalps')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'scalps'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Hot Scalps ({hotScalps.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('alpha')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'alpha'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Alpha Web3</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('bullish')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'bullish'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>5M Bullish ({bullishCoins.length})</span>
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 sm:p-3 space-y-1">
          {/* Query Mode: Server Results */}
          {query.trim().length > 0 ? (
            isLoadingServer ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Searching 1,379+ Spot &amp; Alpha coins...
              </div>
            ) : serverResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tokens matching &ldquo;{query}&rdquo;. Check spelling or try ticker symbol.
              </div>
            ) : (
              serverResults.map((item) => {
                const targetSym = item.canonicalSymbol || item.symbol || item.baseAsset;
                const isAlpha = !!item.isAlpha || targetSym.startsWith('ALPHA_');
                return (
                  <div
                    key={item.symbol}
                    onClick={() => handlePick(targetSym)}
                    className="p-2.5 sm:p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                        {item.baseAsset?.slice(0, 3) || 'COIN'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                            {item.name || item.baseAsset}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {item.baseAsset}
                          </span>
                          {isAlpha ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ALPHA {item.chainName ? `· ${item.chainName}` : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              SPOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.contractAddress ? `Contract: ${item.contractAddress.slice(0, 10)}...` : 'Binance Spot Pair'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono-nums">
                        <span className="text-sm font-bold text-white block">
                          ${formatPrice(item.lastPrice || item.price)}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            (item.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {(item.changePct ?? 0) >= 0 ? '+' : ''}
                          {(item.changePct ?? 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-md bg-slate-900 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center text-slate-400 transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* Instant Curated Sections when not typing */
            <div className="space-y-4">
              {/* Section 1: Top Hot Scalps */}
              {(activeFilter === 'all' || activeFilter === 'scalps') && hotScalps.length > 0 && (
                <div>
                  <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Flame className="w-3.5 h-3.5" /> Top Hot Scalps (Instant Setup)
                    </span>
                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                      Ranked by Scalp Score
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {hotScalps.slice(0, 4).map((coin, idx) => (
                      <div
                        key={coin.symbol}
                        onClick={() => handlePick(coin.symbol)}
                        className="p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between gap-3 group border border-transparent hover:border-amber-500/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 text-center text-xs font-bold font-mono text-slate-500 group-hover:text-amber-400">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white group-hover:text-amber-300">
                                {coin.name || coin.baseAsset}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {coin.baseAsset}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Scalp Score: {coin.scalpScore || 80}/100
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                              <span className="text-emerald-400">TP1: +1.2%</span>
                              <span>&bull;</span>
                              <span className="text-emerald-300">TP2: +2.4%</span>
                              <span>&bull;</span>
                              <span className="text-rose-400">SL: -0.6%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-mono-nums">
                            <span className="text-sm font-bold text-white block">
                              ${formatPrice(coin.lastPrice || coin.price)}
                            </span>
                            <span className="text-xs font-semibold text-emerald-400">
                              +{(coin.changePct ?? 0).toFixed(2)}%
                            </span>
                          </div>
                          <div className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1 group-hover:bg-amber-400">
                            <span>Scalp</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Top 5M Bullish Gainers */}
              {(activeFilter === 'all' || activeFilter === 'bullish') && bullishCoins.length > 0 && (
                <div>
                  <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" /> 5M Candle Bullish Gainers
                    </span>
                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                      Real-time Momentum
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {bullishCoins.slice(0, 4).map((coin) => (
                      <div
                        key={coin.symbol}
                        onClick={() => handlePick(coin.symbol)}
                        className="p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                            {coin.baseAsset?.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white group-hover:text-emerald-300">
                                {coin.name || coin.baseAsset}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {coin.baseAsset}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {coin.volRatio ? `${coin.volRatio.toFixed(1)}x Vol Surge` : 'Volume Normal'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-mono-nums">
                            <span className="text-sm font-bold text-white block">
                              ${formatPrice(coin.lastPrice || coin.price)}
                            </span>
                            <span className="text-xs font-bold text-emerald-400">
                              +{(coin.changePct ?? 0).toFixed(2)}%
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-[#090d16] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Click any coin to instantly load 5M Chart &amp; Scalp Targets</span>
          <span className="hidden sm:inline">Press &lsquo;/&rsquo; anytime to search</span>
        </div>
      </div>
    </div>
  );
}
