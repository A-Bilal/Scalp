import React, { useState, FormEvent, useMemo } from 'react';
import { CoinScanResult } from '../types';
import { isMemeCoin } from '../utils/memeCoins';
import { getCoinDisplayInfo } from '../utils/coinFormatting';
import InlineCoinChart from './InlineCoinChart';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Search,
  Plus,
  Trash2,
  Flame,
  Check,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Target,
  ShieldAlert,
  SlidersHorizontal,
  DollarSign,
  Activity,
  Ban,
} from 'lucide-react';

interface LiveScannerTableProps {
  items: CoinScanResult[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  spikeGainThreshold: number;
  spikeRangeThreshold: number;
  gainThreshold: number;
  minVolumeFilter?: number;
  onChangeMinVolumeFilter?: (minVol: number) => void;
  activeFilterTab?: 'scalp' | 'going_up' | 'spikes' | 'alpha' | 'all';
  onFilterTabChange?: (tab: 'scalp' | 'going_up' | 'spikes' | 'alpha' | 'all') => void;
  onOpenInTerminal?: (symbol: string) => void;
  onOpenPopoutChart?: (symbol: string) => void;
}

export default function LiveScannerTable({
  items,
  selectedSymbol,
  onSelectSymbol,
  onAddSymbol,
  onRemoveSymbol,
  spikeGainThreshold,
  spikeRangeThreshold,
  gainThreshold,
  minVolumeFilter = 1_000_000,
  onChangeMinVolumeFilter,
  activeFilterTab,
  onFilterTabChange,
  onOpenInTerminal,
  onOpenPopoutChart,
}: LiveScannerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilterTab, setLocalFilterTab] = useState<'scalp' | 'going_up' | 'spikes' | 'alpha' | 'all'>('scalp');
  const filterTab = activeFilterTab ?? localFilterTab;
  const setFilterTab = (tab: 'scalp' | 'going_up' | 'spikes' | 'alpha' | 'all') => {
    setLocalFilterTab(tab);
    if (onFilterTabChange) onFilterTabChange(tab);
  };
  const [sortBy, setSortBy] = useState<'scalpScore' | 'changePct' | 'quoteVolume' | 'rangePct'>('scalpScore');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [customSymbolInput, setCustomSymbolInput] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [localMinVolume, setLocalMinVolume] = useState<number>(minVolumeFilter);
  const [excludeMemeCoins, setExcludeMemeCoins] = useState(true);
  const [onlyGoingUpCoins, setOnlyGoingUpCoins] = useState(true);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const handleToggleRow = (sym: string) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
    onSelectSymbol(sym);
  };

  const PAGE_SIZE = 40;

  const currentMinVolume = onChangeMinVolumeFilter ? minVolumeFilter : localMinVolume;
  const setMinVol = (val: number) => {
    setLocalMinVolume(val);
    if (onChangeMinVolumeFilter) onChangeMinVolumeFilter(val);
    setCurrentPage(1);
  };

  // Tab counts
  const scalpCount = useMemo(
    () =>
      items.filter(
        (i) =>
          (!excludeMemeCoins || (!i.isMeme && !isMemeCoin(i.symbol, i.name, i.baseAsset))) &&
          (!onlyGoingUpCoins || (i.isGoingUp && i.changePct > 0)) &&
          (i.quoteVolume >= 1_000_000 || i.volume >= 1_000_000) &&
          (i.isGoingUp || (i.scalpScore && i.scalpScore >= 65))
      ).length,
    [items, excludeMemeCoins, onlyGoingUpCoins]
  );
  const goingUpCount = useMemo(
    () =>
      items.filter(
        (i) =>
          (!excludeMemeCoins || (!i.isMeme && !isMemeCoin(i.symbol, i.name, i.baseAsset))) &&
          i.isGoingUp &&
          i.changePct >= gainThreshold
      ).length,
    [items, gainThreshold, excludeMemeCoins]
  );
  const spikeCount = useMemo(
    () =>
      items.filter(
        (i) =>
          (!excludeMemeCoins || (!i.isMeme && !isMemeCoin(i.symbol, i.name, i.baseAsset))) &&
          (!onlyGoingUpCoins || (i.isGoingUp && i.changePct >= 0)) &&
          (i.rangePct >= spikeRangeThreshold || i.changePct >= spikeGainThreshold || i.isSpike)
      ).length,
    [items, spikeRangeThreshold, spikeGainThreshold, excludeMemeCoins, onlyGoingUpCoins]
  );
  const alphaCount = useMemo(
    () =>
      items.filter(
        (i) =>
          (!excludeMemeCoins || (!i.isMeme && !isMemeCoin(i.symbol, i.name, i.baseAsset))) &&
          (!onlyGoingUpCoins || (i.isGoingUp && i.changePct >= 0)) &&
          i.isAlpha
      ).length,
    [items, excludeMemeCoins, onlyGoingUpCoins]
  );

  // Filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let list = items.filter((item) => {
      // If user typed a search query, show all matching coins
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = item.symbol.toLowerCase().includes(q);
        const matchesBase = item.baseAsset.toLowerCase().includes(q);
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesChain = (item.chainName || '').toLowerCase().includes(q);
        const matchesContract = (item.contractAddress || '').toLowerCase().includes(q);
        const matchesAlphaId = (item.alphaId || '').toLowerCase().includes(q);
        const matchesCanonical = (item.canonicalSymbol || '').toLowerCase().includes(q);

        if (!matchesSymbol && !matchesBase && !matchesName && !matchesChain && !matchesContract && !matchesAlphaId && !matchesCanonical) {
          return false;
        }
        return true;
      }

      // Meme Coins Filter (User request: Don't include coins listed as meme coins)
      if (excludeMemeCoins && (item.isMeme || isMemeCoin(item.symbol, item.name, item.baseAsset))) {
        return false;
      }

      // Uptrend Coins Filter (User request: Only include data for coins going up. Don't show coins in a down trend as won't be shorting)
      if (onlyGoingUpCoins && (!item.isGoingUp || item.changePct < 0)) {
        return false;
      }

      // Volume Filter
      const itemVol = item.quoteVolume || item.volume || 0;
      if (currentMinVolume > 0 && itemVol < currentMinVolume) {
        return false;
      }

      if (filterTab === 'scalp') {
        return (
          itemVol >= 1_000_000 &&
          (item.isGoingUp || (item.scalpScore && item.scalpScore >= 60) || item.changePct >= 0)
        );
      }
      if (filterTab === 'going_up') {
        return item.isGoingUp && item.changePct >= gainThreshold;
      }
      if (filterTab === 'spikes') {
        return (
          item.rangePct >= spikeRangeThreshold ||
          item.changePct >= spikeGainThreshold ||
          item.isSpike
        );
      }
      if (filterTab === 'alpha') {
        return item.isAlpha;
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      let va = a[sortBy] ?? 0;
      let vb = b[sortBy] ?? 0;
      if (typeof va === 'string') va = (va as string).toLowerCase();
      if (typeof vb === 'string') vb = (vb as string).toLowerCase();

      if (sortDir === 'asc') {
        return va > vb ? 1 : va < vb ? -1 : 0;
      } else {
        return va < vb ? 1 : va > vb ? -1 : 0;
      }
    });

    return list;
  }, [
    items,
    searchQuery,
    filterTab,
    sortBy,
    sortDir,
    currentMinVolume,
    gainThreshold,
    spikeRangeThreshold,
    spikeGainThreshold,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedItems.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedItems, currentPage]);

  const handleAddCustomSymbol = (e: FormEvent) => {
    e.preventDefault();
    const clean = customSymbolInput.trim().toUpperCase();
    if (!clean) return;
    const finalSym = clean.endsWith('USDT') ? clean : `${clean}USDT`;
    onAddSymbol(finalSym);
    setCustomSymbolInput('');
    setShowAddMenu(false);
  };

  const toggleSort = (col: 'scalpScore' | 'changePct' | 'quoteVolume' | 'rangePct') => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const formatPrice = (val: number) => {
    if (val === 0) return '0.00';
    if (val < 0.0001) return val.toFixed(8);
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val < 100) return val.toFixed(3);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol: number) => {
    if (!vol) return '$0';
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="scanner-table-component">
      {/* Top Filter & Action Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#0f172a]/80">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setFilterTab('scalp');
              setSortBy('scalpScore');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterTab === 'scalp'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/30'
                : 'text-amber-300/80 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            🔥 Quick Scalp ({scalpCount})
          </button>

          <button
            onClick={() => {
              setFilterTab('going_up');
              setSortBy('changePct');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              filterTab === 'going_up'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            5M Going Up ({goingUpCount})
          </button>

          <button
            onClick={() => {
              setFilterTab('spikes');
              setSortBy('rangePct');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              filterTab === 'spikes'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            ⚡ Volatility Spikes ({spikeCount})
          </button>

          <button
            onClick={() => {
              setFilterTab('alpha');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              filterTab === 'alpha'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Alpha Tokens ({alphaCount})
          </button>

          <button
            onClick={() => {
              setFilterTab('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterTab === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Coins ({items.length})
          </button>
        </div>

        {/* Volume & Search Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Volume Filter Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1">
            <span className="text-[11px] font-semibold text-slate-400 px-1.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              Vol:
            </span>
            <button
              onClick={() => setMinVol(1_000_000)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                currentMinVolume === 1_000_000
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              &gt; $1M
            </button>
            <button
              onClick={() => setMinVol(5_000_000)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                currentMinVolume === 5_000_000
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              &gt; $5M
            </button>
            <button
              onClick={() => setMinVol(0)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                currentMinVolume === 0
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              All
            </button>
          </div>

          {/* Filters: No Memes & Uptrend Only */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setExcludeMemeCoins(!excludeMemeCoins);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                excludeMemeCoins
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 line-through'
              }`}
              title="Exclude coins identified as meme tokens"
            >
              <Ban className="w-3 h-3" />
              No Memes
            </button>

            <button
              onClick={() => {
                setOnlyGoingUpCoins(!onlyGoingUpCoins);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                onlyGoingUpCoins
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/50'
              }`}
              title="Only show coins in an uptrend (user won't be shorting)"
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Uptrends Only
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search coin..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>

          {/* Pin Coin */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Pin Coin
            </button>

            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl z-30">
                <form onSubmit={handleAddCustomSymbol} className="space-y-2">
                  <span className="text-xs font-semibold text-slate-200 block">Pin Binance Coin to Chart</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. BTC, ETH, SUI"
                      value={customSymbolInput}
                      onChange={(e) => setCustomSymbolInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase font-mono-nums focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0f172a]/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Cryptocurrency / Pair</th>
              <th className="py-3 px-4">Price</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('changePct')}
              >
                <div className="flex items-center gap-1">
                  <span>5M Candle Trend</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('scalpScore')}
              >
                <div className="flex items-center gap-1">
                  <span>Scalp Score / RSI</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('quoteVolume')}
              >
                <div className="flex items-center gap-1">
                  <span>24H Volume (&gt; $1M)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Scalp Targets (TP1 / SL)</th>
              <th className="py-3 px-4 text-right">View / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 space-y-2">
                  <p>No coins found matching current filter criteria.</p>
                  {currentMinVolume > 0 && (
                    <button
                      onClick={() => setMinVol(0)}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Disable volume filter to see all coins
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedItems.map((coin) => {
                const isSelected = coin.symbol === selectedSymbol;
                const isSurging = coin.isGoingUp && coin.changePct >= gainThreshold;
                const isSpikeAlert =
                  coin.rangePct >= spikeRangeThreshold ||
                  coin.changePct >= spikeGainThreshold ||
                  coin.isSpike;
                const score = coin.scalpScore || 70;
                const hasHighVolume = (coin.quoteVolume || coin.volume || 0) >= 1_000_000;

                const isExpanded = expandedSymbol === coin.symbol;

                return (
                  <React.Fragment key={coin.symbol}>
                    <tr
                      onClick={() => handleToggleRow(coin.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded
                          ? 'bg-amber-500/15 border-l-4 border-l-amber-500'
                          : isSelected
                          ? 'bg-amber-500/10 border-l-4 border-l-amber-500/70'
                          : isSpikeAlert
                          ? 'bg-rose-500/5 hover:bg-slate-800/60'
                          : isSurging
                          ? 'bg-emerald-500/5 hover:bg-slate-800/60'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Coin / Pair */}
                      <td className="py-3 px-4 font-medium">
                      {(() => {
                        const display = getCoinDisplayInfo(coin);
                        return (
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                coin.isAlpha
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {display.avatarText}
                            </div>

                            <div className="min-w-0">
                              {/* Name Prominently ABOVE Numbers */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white tracking-wide truncate max-w-[140px] sm:max-w-none" title={display.primaryTitle}>
                                  {display.primaryTitle}
                                </span>

                                {coin.isAlpha ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 shrink-0">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    ALPHA {coin.chainName ? `· ${coin.chainName}` : ''}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">{display.secondaryTicker}</span>
                                )}
                              </div>

                              {/* Number / Ticker info BELOW */}
                              <div className="text-[10px] text-slate-400 truncate max-w-[160px] flex items-center gap-1">
                                <span className="font-mono-nums text-slate-300">{display.secondaryTicker}</span>
                                {display.subLabel && display.subLabel !== display.secondaryTicker && (
                                  <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-slate-400 truncate">{display.subLabel}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Latest Price */}
                    <td className="py-3 px-4 font-mono-nums font-semibold text-slate-200">
                      ${formatPrice(coin.lastPrice)}
                    </td>

                    {/* 5M Candle Change */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono-nums font-bold text-xs flex items-center gap-1 ${
                            coin.changePct >= 0
                              ? isSurging
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm animate-pulse'
                                : 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {coin.changePct >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {coin.changePct >= 0 ? '+' : ''}
                          {coin.changePct.toFixed(2)}%
                        </span>

                        {coin.consecutiveGreen >= 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            {coin.consecutiveGreen}G
                          </span>
                        )}

                        {isSpikeAlert && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-0.5 animate-bounce">
                            <Zap className="w-2.5 h-2.5" /> SPIKE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Scalp Score & RSI */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold font-mono-nums text-xs ${
                            score >= 80
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : score >= 65
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {score}/100
                        </span>
                        <div className="text-[10px] font-mono-nums">
                          <span className="text-slate-400">RSI: </span>
                          <span
                            className={`font-bold ${
                              (coin.rsi14 || 55) >= 70
                                ? 'text-rose-400'
                                : (coin.rsi14 || 55) >= 50
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {coin.rsi14 ? coin.rsi14.toFixed(1) : '55.0'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Volume & Liquidity Requirement */}
                    <td className="py-3 px-4 font-mono-nums">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-200 font-bold">
                            {formatVolume(coin.quoteVolume)}
                          </span>
                          {hasHighVolume ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              &gt;$1M
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                              Low Vol
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {coin.volRatio ? `${coin.volRatio.toFixed(1)}x vol surge` : 'normal vol'}
                        </div>
                      </div>
                    </td>

                    {/* Scalp Targets */}
                    <td className="py-3 px-4 font-mono-nums text-[11px]">
                      <div className="space-y-0.5">
                        <div className="text-emerald-400 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">TP1:</span>
                          <span className="font-bold">${formatPrice(coin.takeProfit1 || coin.lastPrice * 1.012)}</span>
                        </div>
                        <div className="text-rose-400 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">SL:</span>
                          <span>${formatPrice(coin.stopLoss || coin.lastPrice * 0.994)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleRow(coin.symbol)}
                          title={isExpanded ? 'Hide 5M Candlestick Chart' : 'View 5M Candlestick Chart beneath row'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isExpanded
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                          }`}
                        >
                          <span>{isExpanded ? 'Hide Chart' : 'View Chart'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline 5M Candlestick Chart Rendered Directly Beneath This Table Row */}
                  {isExpanded && (
                    <tr key={`${coin.symbol}-chart`} className="bg-[#0b101b] border-y border-amber-500/30">
                      <td colSpan={7} className="p-3 sm:p-4">
                        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3 shadow-inner">
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
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#0f172a] flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing {paginatedItems.length} of {filteredAndSortedItems.length} coins
          {currentMinVolume > 0 && ` with volume > $${(currentMinVolume / 1_000_000).toFixed(0)}M`}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono-nums">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
