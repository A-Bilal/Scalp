import React, { useState } from 'react';
import { CoinScanResult } from '../types';
import { Flame, ArrowRight, Copy, Check, ExternalLink } from 'lucide-react';

interface QuickScalpStripProps {
  scalps: CoinScanResult[];
  selectedSymbol: string;
  onSelectCoin: (symbol: string) => void;
  onOpenSearch: () => void;
  onViewAllScalps: () => void;
}

export default function QuickScalpStrip({
  scalps,
  selectedSymbol,
  onSelectCoin,
  onOpenSearch,
  onViewAllScalps,
}: QuickScalpStripProps) {
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null || isNaN(p) || p <= 0) return '0.00';
    if (p >= 100) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.01) return p.toFixed(5);
    if (p >= 0.0001) return p.toFixed(6);
    return p.toPrecision(4);
  };

  const handleCopySetup = (coin: CoinScanResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const tp1 = coin.takeProfit1 || coin.lastPrice * 1.012;
    const sl = coin.stopLoss || coin.lastPrice * 0.994;
    const text = `🎯 ${coin.symbol} Scalp Plan:
• Entry: $${formatPrice(coin.lastPrice || coin.price)}
• Take Profit: $${formatPrice(tp1)} (+1.2%)
• Stop Loss: $${formatPrice(sl)} (-0.6%)`;

    navigator.clipboard.writeText(text);
    setCopiedSymbol(coin.symbol);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  if (!scalps || scalps.length === 0) return null;

  return (
    <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2.5">
      {/* Strip Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Trending Scalp Setups
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            &bull; Ready-to-trade 5M setups with Take Profit &amp; Stop Loss
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Find any coin &rarr;
          </button>
          <span className="text-slate-700">&bull;</span>
          <button
            type="button"
            onClick={onViewAllScalps}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Scalp Cards in simple clean row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {scalps.slice(0, 4).map((coin, index) => {
          const isSelected = selectedSymbol === coin.symbol;
          const tp1 = coin.takeProfit1 || (coin.lastPrice || coin.price || 0) * 1.012;
          const sl = coin.stopLoss || (coin.lastPrice || coin.price || 0) * 0.994;

          return (
            <div
              key={coin.symbol}
              onClick={() => onSelectCoin(coin.symbol)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                isSelected
                  ? 'bg-[#152033] border-amber-500 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              {/* Coin name & live price */}
              <div className="flex items-start justify-between gap-1.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-white group-hover:text-amber-300 transition-colors">
                      {coin.baseAsset}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">#{index + 1}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">
                    ${formatPrice(coin.lastPrice || coin.price)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400 block">
                    +{(coin.changePct ?? 0).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">5M Gain</span>
                </div>
              </div>

              {/* Targets: Plain English TP & SL */}
              <div className="grid grid-cols-2 gap-1.5 bg-[#0e1422] p-2 rounded border border-slate-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Take Profit (+1.2%)</span>
                  <span className="text-emerald-400 font-bold font-mono-nums block">
                    ${formatPrice(tp1)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Stop Loss (-0.6%)</span>
                  <span className="text-rose-400 font-bold font-mono-nums block">
                    ${formatPrice(sl)}
                  </span>
                </div>
              </div>

              {/* 1-Click Load & Action */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onSelectCoin(coin.symbol)}
                  className={`flex-1 py-1 px-2.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200'
                  }`}
                >
                  <span>{isSelected ? 'Loaded' : 'View Chart'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleCopySetup(coin, e)}
                  className="p-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
                  title="Copy Trade Plan"
                >
                  {copiedSymbol === coin.symbol ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <a
                  href={`https://www.binance.com/en/trade/${coin.baseAsset}_USDT?type=spot`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
                  title="Trade on Binance"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
