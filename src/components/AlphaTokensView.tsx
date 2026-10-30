import React, { useState, useMemo, useEffect } from 'react';
import { CoinScanResult } from '../types';
import { getCoinDisplayInfo } from '../utils/coinFormatting';
import { Store, Search, ChevronDown, ChevronUp, TrendingUp, Maximize2 } from 'lucide-react';
import InlineCoinChart from './InlineCoinChart';

interface AlphaTokensViewProps {
  coins: CoinScanResult[];
  onSelectCoin?: (symbol: string) => void;
  gainThreshold?: number;
  onOpenPopoutChart?: (symbol: string) => void;
  onOpenInTerminal?: (symbol: string) => void;
}

export default function AlphaTokensView({
  coins,
  onSelectCoin,
  gainThreshold = 0.5,
  onOpenPopoutChart,
  onOpenInTerminal,
}: AlphaTokensViewProps) {
  const [search, setSearch] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [onlyGainers, setOnlyGainers] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'gain' | 'volume' | 'price'>('gain');
  const [directAlphaCoins, setDirectAlphaCoins] = useState<CoinScanResult[]>([]);
  // Track which coin card is expanded to show chart beneath it
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Filter only Alpha coins from incoming props
  const propAlphaCoins = useMemo(() => {
    return coins.filter((c) => c.isAlpha || c.symbol.startsWith('ALPHA_') || !!c.alphaId);
  }, [coins]);

  // Fallback direct loader if props are empty yet
  useEffect(() => {
    if (propAlphaCoins.length === 0) {
      fetch('/api/binance/all-coins?tab=alpha&limit=1000&excludeMeme=false&onlyGoingUp=false')
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.items)) {
            setDirectAlphaCoins(data.items);
          }
        })
        .catch((err) => console.warn('Alpha direct fetch warning:', err));
    }
  }, [propAlphaCoins.length]);

  const allAlphaList = propAlphaCoins.length > 0 ? propAlphaCoins : directAlphaCoins;

  const getCoinPrice = (c: CoinScanResult): number => {
    return c.lastPrice ?? c.price ?? 0;
  };

  const chains = useMemo(() => {
    const set = new Set<string>();
    allAlphaList.forEach((c) => {
      if (c.chainName) set.add(c.chainName);
    });
    return Array.from(set);
  }, [allAlphaList]);

  const filteredCoins = useMemo(() => {
    return allAlphaList
      .filter((c) => {
        if (selectedChain !== 'all' && c.chainName?.toLowerCase() !== selectedChain.toLowerCase()) {
          return false;
        }
        if (onlyGainers && (c.changePct ?? 0) <= 0) {
          return false;
        }
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchSym = c.symbol.toLowerCase().includes(q);
          const matchName = c.name?.toLowerCase().includes(q);
          const matchChain = c.chainName?.toLowerCase().includes(q);
          const matchContract = c.contractAddress?.toLowerCase().includes(q);
          const matchAlphaId = c.alphaId?.toLowerCase().includes(q);
          if (!matchSym && !matchName && !matchChain && !matchContract && !matchAlphaId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'gain') return (b.changePct ?? 0) - (a.changePct ?? 0);
        if (sortBy === 'volume') return (b.quoteVolume || b.volume || 0) - (a.quoteVolume || a.volume || 0);
        return getCoinPrice(b) - getCoinPrice(a);
      });
  }, [allAlphaList, selectedChain, onlyGainers, search, sortBy]);

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null || isNaN(p) || p <= 0) return '0.00';
    if (p >= 100) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.01) return p.toFixed(5);
    if (p >= 0.0001) return p.toFixed(6);
    return p.toPrecision(4);
  };

  const formatVol = (v?: number) => {
    if (v === undefined || v === null || isNaN(v) || v <= 0) return '$0';
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  const handleToggleCardChart = (sym: string) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
    if (onSelectCoin) onSelectCoin(sym);
  };

  return (
    <div className="space-y-4">
      {/* Clean Header Bar */}
      <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-black text-white tracking-tight">Binance Alpha Web3 Tokens</h1>
            <span className="text-xs text-slate-400 font-mono">
              ({allAlphaList.length} Tokens Tracked)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click any token box to view the 5-minute chart directly beneath it.
          </p>
        </div>

        <div className="text-xs text-amber-400 font-mono font-semibold">
          {filteredCoins.filter((c) => (c.changePct ?? 0) >= gainThreshold).length} Surging (&ge;+{gainThreshold}%)
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token name, ticker, or contract address..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setOnlyGainers(!onlyGainers)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                onlyGainers
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>5M Gainers Only</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-500 px-1 font-medium">Sort:</span>
              <button
                type="button"
                onClick={() => setSortBy('gain')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  sortBy === 'gain' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gain
              </button>
              <button
                type="button"
                onClick={() => setSortBy('volume')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  sortBy === 'volume' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Vol
              </button>
              <button
                type="button"
                onClick={() => setSortBy('price')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  sortBy === 'price' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Price
              </button>
            </div>
          </div>
        </div>

        {chains.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Chain:
            </span>
            <button
              type="button"
              onClick={() => setSelectedChain('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedChain === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All ({allAlphaList.length})
            </button>
            {chains.map((chain) => {
              const chainCount = allAlphaList.filter((c) => c.chainName?.toLowerCase() === chain.toLowerCase()).length;
              const isSelected = selectedChain.toLowerCase() === chain.toLowerCase();
              return (
                <button
                  key={chain}
                  type="button"
                  onClick={() => setSelectedChain(chain)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {chain} ({chainCount})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tokens List / Grid */}
      {filteredCoins.length === 0 ? (
        <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <Store className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Alpha Tokens Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search
              ? `No tokens matching "${search}". Try adjusting your search.`
              : 'Waiting for Alpha tokens to sync...'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCoins.map((coin) => {
            const display = getCoinDisplayInfo(coin);
            const isBullish = (coin.changePct ?? 0) > 0;
            const coinPrice = getCoinPrice(coin);
            const isExpanded = expandedSymbol === coin.symbol;

            return (
              <div
                key={coin.symbol}
                onClick={() => handleToggleCardChart(coin.symbol)}
                className={`bg-[#0d131f] border rounded-xl p-3.5 sm:p-4 transition-all cursor-pointer ${
                  isExpanded
                    ? 'border-amber-500 shadow-xl bg-[#0f172a]'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-[#111827]'
                }`}
              >
                {/* Top Row: Token info & Price */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                      {display.avatarText}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
                          {display.primaryTitle}
                        </h3>
                        <span className="text-xs font-mono text-slate-400">
                          {display.secondaryTicker}
                        </span>
                        {coin.chainName && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/80">
                            {coin.chainName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        24h Vol: <strong className="text-slate-300 font-mono">{formatVol(coin.quoteVolume || coin.volume || 0)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-slate-100 font-mono block">
                        ${formatPrice(coinPrice)}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono block ${
                          isBullish ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isBullish ? '+' : ''}
                        {(coin.changePct ?? 0).toFixed(2)}% (5M)
                      </span>
                    </div>

                    {/* Expand/Collapse Chart Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCardChart(coin.symbol);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isExpanded
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                      }`}
                    >
                      <span>{isExpanded ? 'Hide Chart' : 'View Chart'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Inline Chart Rendered Directly Beneath This Coin Box */}
                {isExpanded && (
                  <InlineCoinChart
                    symbol={coin.symbol}
                    isAlpha={coin.isAlpha}
                    chainName={coin.chainName}
                    coinName={coin.name}
                    onOpenPopout={() => {
                      if (onOpenPopoutChart) onOpenPopoutChart(coin.symbol);
                    }}
                    onOpenInTerminal={onOpenInTerminal ? () => onOpenInTerminal(coin.symbol) : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
