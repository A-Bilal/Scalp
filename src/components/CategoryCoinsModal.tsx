import React, { useState, useMemo } from 'react';
import { CoinScanResult } from '../types';
import { isMemeCoin } from '../utils/memeCoins';
import { getCoinDisplayInfo } from '../utils/coinFormatting';
import InlineCoinChart from './InlineCoinChart';
import {
  TrendingUp,
  Zap,
  Sparkles,
  Activity,
  Flame,
  Search,
  X,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  BarChart2,
  DollarSign,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type CoinCategoryKey = 'going_up' | 'spikes' | 'alpha' | 'all' | 'scalp';

interface CategoryCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: CoinCategoryKey;
  coins: CoinScanResult[];
  gainThreshold?: number;
  spikeRangeThreshold?: number;
  spikeGainThreshold?: number;
  onSelectCoinForChart: (symbol: string) => void;
  onSelectCoinForEvaluator: (symbol: string) => void;
  onJumpToTable: (category: CoinCategoryKey) => void;
}

export default function CategoryCoinsModal({
  isOpen,
  onClose,
  initialCategory = 'going_up',
  coins,
  gainThreshold = 0.5,
  spikeRangeThreshold = 2.0,
  spikeGainThreshold = 1.5,
  onSelectCoinForChart,
  onSelectCoinForEvaluator,
  onJumpToTable,
}: CategoryCoinsModalProps) {
  const [activeCategory, setActiveCategory] = useState<CoinCategoryKey>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeMeme, setExcludeMeme] = useState(true);
  const [onlyOver1MVol, setOnlyOver1MVol] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const handleToggleCoin = (sym: string) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
  };

  // Sync category when initialCategory changes and modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      setSearchQuery('');
    }
  }, [isOpen, initialCategory]);

  // Filter coins for each category
  const categorizedCoins = useMemo(() => {
    const filterBase = (c: CoinScanResult) => {
      if (excludeMeme && (c.isMeme || isMemeCoin(c.symbol, c.name, c.baseAsset))) {
        return false;
      }
      if (onlyOver1MVol) {
        const vol = c.quoteVolume || c.volume || 0;
        if (vol < 1_000_000) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const sym = (c.symbol || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        const base = (c.baseAsset || '').toLowerCase();
        const chain = (c.chainName || '').toLowerCase();
        const contract = (c.contractAddress || '').toLowerCase();
        const alphaId = (c.alphaId || '').toLowerCase();
        const canonical = (c.canonicalSymbol || '').toLowerCase();
        if (!sym.includes(q) && !name.includes(q) && !base.includes(q) && !chain.includes(q) && !contract.includes(q) && !alphaId.includes(q) && !canonical.includes(q)) {
          return false;
        }
      }
      return true;
    };

    switch (activeCategory) {
      case 'going_up':
        return coins
          .filter((c) => c.isGoingUp && c.changePct >= gainThreshold && filterBase(c))
          .sort((a, b) => b.changePct - a.changePct);

      case 'spikes':
        return coins
          .filter(
            (c) =>
              (c.rangePct >= spikeRangeThreshold ||
                c.changePct >= spikeGainThreshold ||
                c.isSpike) &&
              filterBase(c)
          )
          .sort((a, b) => b.rangePct - a.rangePct);

      case 'alpha':
        return coins
          .filter((c) => c.isAlpha && filterBase(c))
          .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));

      case 'scalp':
        return coins
          .filter((c) => (c.quoteVolume || 0) >= 1_000_000 && filterBase(c))
          .sort((a, b) => (b.scalpScore || 0) - (a.scalpScore || 0));

      case 'all':
      default:
        return coins
          .filter(filterBase)
          .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));
    }
  }, [coins, activeCategory, gainThreshold, spikeRangeThreshold, spikeGainThreshold, excludeMeme, onlyOver1MVol, searchQuery]);

  if (!isOpen) return null;

  // Counts for tabs
  const countGoingUp = coins.filter((c) => c.isGoingUp && c.changePct >= gainThreshold && (!excludeMeme || (!c.isMeme && !isMemeCoin(c.symbol, c.name, c.baseAsset)))).length;
  const countSpikes = coins.filter((c) => (c.rangePct >= spikeRangeThreshold || c.changePct >= spikeGainThreshold || c.isSpike) && (!excludeMeme || (!c.isMeme && !isMemeCoin(c.symbol, c.name, c.baseAsset)))).length;
  const countAlpha = coins.filter((c) => c.isAlpha && (!excludeMeme || (!c.isMeme && !isMemeCoin(c.symbol, c.name, c.baseAsset)))).length;
  const countScalp = coins.filter((c) => (c.quoteVolume || 0) >= 1_000_000 && (!excludeMeme || (!c.isMeme && !isMemeCoin(c.symbol, c.name, c.baseAsset)))).length;
  const countAll = coins.filter((c) => !excludeMeme || (!c.isMeme && !isMemeCoin(c.symbol, c.name, c.baseAsset))).length;

  const formatPrice = (val?: number) => {
    if (!val || val <= 0 || isNaN(val)) return '0.00';
    if (val < 0.0001) return val.toFixed(8);
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val < 100) return val.toFixed(3);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVol = (vol: number) => {
    if (!vol) return '$0';
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const categoryMeta: Record<CoinCategoryKey, { title: string; desc: string; icon: any; color: string; badgeBg: string }> = {
    going_up: {
      title: '5M Candle Going Up Coins',
      desc: `Real-time coins gaining ≥+${gainThreshold}% on the active 5-minute candle.`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    spikes: {
      title: 'High Volatility Spike Coins',
      desc: `Coins experiencing rapid candle expansion (≥${spikeRangeThreshold}% high-low range or volume burst).`,
      icon: Zap,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    },
    alpha: {
      title: 'Binance Alpha Tokens',
      desc: 'Early-stage Web3 and on-chain decentralized tokens monitored via Binance Alpha feeds.',
      icon: Sparkles,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    all: {
      title: 'All Monitored Binance Coins',
      desc: 'Full catalog of all active Binance Spot pairs and Alpha tokens with live 5m metrics.',
      icon: Activity,
      color: 'text-blue-400',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    scalp: {
      title: 'Quick Scalp Opportunities',
      desc: 'High-liquidity coins (>$1M 24h volume) ranked by short-term momentum and indicators.',
      icon: Flame,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
  };

  const currentMeta = categoryMeta[activeCategory];
  const CurrentIcon = currentMeta.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      id="category-coins-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0e1422] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        id="category-coins-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#111827]/95 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl border ${currentMeta.badgeBg} shrink-0`}>
              <CurrentIcon className={`w-6 h-6 ${currentMeta.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {currentMeta.title}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold border ${currentMeta.badgeBg}`}>
                  {categorizedCoins.length} {categorizedCoins.length === 1 ? 'Coin' : 'Coins'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{currentMeta.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onJumpToTable(activeCategory);
                onClose();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Open full table view below"
            >
              <span>Full Table View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-800/80 bg-[#0c101b] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategory('going_up')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'going_up'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            5M Going Up ({countGoingUp})
          </button>

          <button
            onClick={() => setActiveCategory('spikes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'spikes'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            Volatility Spikes ({countSpikes})
          </button>

          <button
            onClick={() => setActiveCategory('alpha')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'alpha'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Alpha Tokens ({countAlpha})
          </button>

          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'all'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            All Monitored ({countAll})
          </button>

          <button
            onClick={() => setActiveCategory('scalp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeCategory === 'scalp'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-amber-300/80 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Quick Scalp ({countScalp})
          </button>
        </div>

        {/* Toolbar: Search & Filter Toggles */}
        <div className="p-3 sm:px-4 border-b border-slate-800/60 bg-[#111827]/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeCategory === 'alpha' ? 'Alpha tokens' : 'coins'} (e.g. SOL, SUI, NEAR)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Exclude Meme Coins Pill */}
            <button
              onClick={() => setExcludeMeme(!excludeMeme)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                excludeMeme
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 line-through'
              }`}
              title="Filter out meme coins"
            >
              <Ban className="w-3 h-3" />
              <span>No Memes</span>
              {excludeMeme && <Check className="w-3 h-3 text-amber-400" />}
            </button>

            {/* Min $1M Volume Pill */}
            <button
              onClick={() => setOnlyOver1MVol(!onlyOver1MVol)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                onlyOver1MVol
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              title="Only show coins with >$1M 24h Volume"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>&gt;$1M Vol</span>
            </button>
          </div>
        </div>

        {/* Coins List Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 max-h-[58vh] divide-y divide-slate-800/40">
          {categorizedCoins.length === 0 ? (
            <div className="py-12 text-center">
              <CurrentIcon className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-300">No coins found in this view</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No coins match "${searchQuery}". Try clearing search or disabling meme/volume filters.`
                  : `Waiting for live 5-minute ticks matching the ${currentMeta.title} criteria.`}
              </p>
              {(searchQuery || !excludeMeme || onlyOver1MVol) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setExcludeMeme(false);
                    setOnlyOver1MVol(false);
                  }}
                  className="mt-3 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            categorizedCoins.map((coin) => {
              const display = getCoinDisplayInfo(coin);
              const isPositive = coin.changePct > 0;
              const isVolOver1M = (coin.quoteVolume || coin.volume || 0) >= 1_000_000;
              const currentCoinPrice = coin.lastPrice || (coin as any).price || 0;

              const isExpanded = expandedSymbol === coin.symbol;

              return (
                <div
                  key={coin.symbol}
                  onClick={() => handleToggleCoin(coin.symbol)}
                  className={`pt-2.5 pb-2.5 px-3 rounded-xl border transition-all cursor-pointer ${
                    isExpanded
                      ? 'bg-[#0f172a] border-amber-500 shadow-xl'
                      : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Coin identity & badges (NAME ABOVE NUMBERS) */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          coin.isAlpha
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {display.avatarText}
                      </div>
                      <div className="min-w-0">
                        {/* Name Prominently Above */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-sm text-white tracking-tight">
                            {display.primaryTitle}
                          </span>
                          <span className="text-xs text-slate-400 font-mono-nums">
                            {display.secondaryTicker}
                          </span>

                          {coin.isAlpha ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Alpha {coin.chainName ? `(${coin.chainName})` : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Spot
                            </span>
                          )}

                          {coin.isMeme && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-900/30 text-amber-400 border border-amber-700/40">
                              Meme
                            </span>
                          )}

                          {coin.isSpike && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" />
                              Spike
                            </span>
                          )}
                        </div>

                        {/* Sub-label Below: Token ID/Ticker, Volume & Scalp Score */}
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="font-mono-nums text-slate-300">{display.subLabel}</span>
                          <span className="mx-1.5 text-slate-600">•</span>
                          <span>Vol: <strong className="text-slate-300 font-medium">{formatVol(coin.quoteVolume || coin.volume || 0)}</strong></span>
                          {coin.scalpScore !== undefined && (
                            <>
                              <span className="mx-1.5 text-slate-600">•</span>
                              <span>Score: <strong className="text-amber-400">{coin.scalpScore}/100</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle / Right: Price, 5M metrics, and Quick Action buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono-nums text-white">
                          ${formatPrice(currentCoinPrice)}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-[11px] font-mono-nums mt-0.5">
                          <span
                            className={`font-bold flex items-center gap-0.5 ${
                              isPositive ? 'text-emerald-400' : (coin.changePct ?? 0) < 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {(coin.changePct ?? 0).toFixed(2)}%
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            R: {(coin.rangePct ?? 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleCoin(coin.symbol)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isExpanded
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                          }`}
                        >
                          <span>{isExpanded ? 'Hide Chart' : 'View Chart'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Chart Rendered Directly Beneath This Coin Box */}
                  {isExpanded && (
                    <InlineCoinChart
                      symbol={coin.symbol}
                      isAlpha={coin.isAlpha}
                      chainName={coin.chainName}
                      coinName={coin.name}
                      onOpenInTerminal={() => {
                        onSelectCoinForChart(coin.symbol);
                        onClose();
                        const chartElem = document.getElementById('chart-section');
                        if (chartElem) chartElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-4 border-t border-slate-800 bg-[#111827]/95 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Real-time Binance 5M feed auto-refreshing</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onJumpToTable(activeCategory);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md"
            >
              <span>Jump to Full Scanner Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
