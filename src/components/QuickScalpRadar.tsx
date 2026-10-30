import React, { useState } from 'react';
import { CoinScanResult } from '../types';
import { getCoinDisplayInfo } from '../utils/coinFormatting';
import {
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import InlineCoinChart from './InlineCoinChart';

interface QuickScalpRadarProps {
  recommendations: CoinScanResult[];
  isLoading: boolean;
  selectedSymbol: string;
  onSelectCoin: (symbol: string) => void;
  minVolumeFilter: number;
  onChangeMinVolumeFilter: (minVol: number) => void;
  onOpenPopoutChart?: (symbol: string) => void;
  onOpenInTerminal?: (symbol: string) => void;
}

export default function QuickScalpRadar({
  recommendations,
  isLoading,
  selectedSymbol,
  onSelectCoin,
  minVolumeFilter,
  onChangeMinVolumeFilter,
  onOpenPopoutChart,
  onOpenInTerminal,
}: QuickScalpRadarProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'spot' | 'alpha'>('all');
  const [onlyAPlus, setOnlyAPlus] = useState<boolean>(false);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  // Expanded coin symbol to show chart directly beneath it
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const filteredRecs = recommendations.filter((coin) => {
    if (activeTab === 'spot' && coin.isAlpha) return false;
    if (activeTab === 'alpha' && !coin.isAlpha) return false;
    if (onlyAPlus) {
      const score = coin.scalpScore || 0;
      if (score < 70 || coin.changePct < 0.4 || (coin.volRatio || 1) < 1.3) return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchSym = coin.symbol.toLowerCase().includes(q);
      const matchBase = coin.baseAsset.toLowerCase().includes(q);
      const matchName = coin.name?.toLowerCase().includes(q);
      if (!matchSym && !matchBase && !matchName) return false;
    }
    return true;
  });

  const handleCopySetup = (coin: CoinScanResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const tp1 = coin.takeProfit1 || coin.lastPrice * 1.012;
    const tp2 = coin.takeProfit2 || coin.lastPrice * 1.024;
    const sl = coin.stopLoss || coin.lastPrice * 0.994;
    const text = `🎯 ${coin.symbol} Scalp Setup:
• Entry: $${formatPrice(coin.lastPrice)}
• TP 1: $${formatPrice(tp1)} (+1.2%)
• TP 2: $${formatPrice(tp2)} (+2.4%)
• Stop Loss: $${formatPrice(sl)} (-0.6%)
• R:R: ${coin.riskReward || '1:2.0'}`;

    navigator.clipboard.writeText(text);
    setCopiedSymbol(coin.symbol);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  const formatPrice = (price: number) => {
    if (!price) return '0.00';
    if (price < 0.0001) return price.toFixed(8);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(3);
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol: number) => {
    if (!vol) return '$0';
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const handleToggleCardChart = (sym: string) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
    onSelectCoin(sym);
  };

  return (
    <div className="space-y-4" id="quick-scalp-radar">
      {/* Page Title & Controls Strip */}
      <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h1 className="text-lg font-black text-white tracking-tight">Hot Scalps Radar</h1>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredRecs.length} Opportunities)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click any coin box to expand the 5-minute chart directly beneath it.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter scalps..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 w-36 sm:w-44"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyAPlus(!onlyAPlus)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              onlyAPlus
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>A+ Only</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-500 px-1 text-[11px]">Min Vol:</span>
            <button
              type="button"
              onClick={() => onChangeMinVolumeFilter(1_000_000)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                minVolumeFilter === 1_000_000 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              $1M
            </button>
            <button
              type="button"
              onClick={() => onChangeMinVolumeFilter(5_000_000)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                minVolumeFilter === 5_000_000 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              $5M
            </button>
            <button
              type="button"
              onClick={() => onChangeMinVolumeFilter(20_000_000)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                minVolumeFilter === 20_000_000 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              $20M
            </button>
          </div>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Setups ({recommendations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('spot')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'spot'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Binance Spot Only
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alpha')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'alpha'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Binance Alpha Only
        </button>
      </div>

      {/* Content List of Scalp Cards */}
      {isLoading && filteredRecs.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#0d131f] border border-slate-800 rounded-xl">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Scanning 1,379 instruments for 5M breakout scalps...</p>
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="py-14 text-center space-y-2 bg-[#0d131f] border border-dashed border-slate-800 rounded-xl p-6">
          <p className="text-sm font-semibold text-slate-300">No coins currently matching filter criteria.</p>
          <p className="text-xs text-slate-500">Try lowering minimum volume or resetting the search filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecs.map((coin, index) => {
            const isExpanded = expandedSymbol === coin.symbol;
            const score = coin.scalpScore || 75;
            const display = getCoinDisplayInfo(coin);
            const tp1 = coin.takeProfit1 || coin.lastPrice * 1.012;
            const tp2 = coin.takeProfit2 || coin.lastPrice * 1.024;
            const sl = coin.stopLoss || coin.lastPrice * 0.994;

            return (
              <div
                key={coin.symbol}
                onClick={() => handleToggleCardChart(coin.symbol)}
                className={`rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                  isExpanded
                    ? 'bg-[#0f172a] border-amber-500 shadow-xl'
                    : 'bg-[#0d131f] hover:bg-[#111827] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row: Token Info & Scalp Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-base tracking-tight truncate">
                          {display.primaryTitle}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {display.secondaryTicker}
                        </span>
                        {coin.isAlpha ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ALPHA {coin.chainName ? `· ${coin.chainName}` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            SPOT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        24h Vol: <strong className="text-slate-300 font-mono">{formatVolume(coin.quoteVolume || coin.volume)}</strong>
                        <span className="mx-1.5 text-slate-600">&bull;</span>
                        Vol Surge: <strong className="text-amber-400 font-mono">{coin.volRatio ? coin.volRatio.toFixed(1) : '1.5'}x</strong>
                      </div>
                    </div>
                  </div>

                  {/* Price, 5M Gain, Score & Expand Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-white font-mono block">
                        ${formatPrice(coin.lastPrice || coin.price)}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-400 block">
                        +{(coin.changePct ?? 0).toFixed(2)}% (5M)
                      </span>
                    </div>

                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-500 block uppercase">Scalp Score</span>
                      <span className="text-sm font-black font-mono text-amber-400">
                        {score}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleCopySetup(coin, e)}
                        className="p-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copy setup"
                      >
                        {copiedSymbol === coin.symbol ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="text-[11px] hidden md:inline">Plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleCardChart(coin.symbol)}
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
                </div>

                {/* Target Levels Summary Strip */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>Entry: <strong className="text-slate-200">${formatPrice(coin.lastPrice)}</strong></span>
                    <span className="text-emerald-400">TP1 (+1.2%): <strong>${formatPrice(tp1)}</strong></span>
                    <span className="text-emerald-300">TP2 (+2.4%): <strong>${formatPrice(tp2)}</strong></span>
                    <span className="text-rose-400">Stop (-0.6%): <strong>${formatPrice(sl)}</strong></span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Risk/Reward: <strong className="text-emerald-400">{coin.riskReward || '1:2.0'}</strong>
                  </div>
                </div>

                {/* Inline Chart Rendered Directly Beneath This Coin Card */}
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
