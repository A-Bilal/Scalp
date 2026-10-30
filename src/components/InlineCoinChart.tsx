import React, { useState, useEffect } from 'react';
import CandleChart5M from './CandleChart5M';
import { KlineData } from '../types';
import { RefreshCw, ExternalLink, ArrowRight, AlertTriangle } from 'lucide-react';

interface InlineCoinChartProps {
  symbol: string;
  isAlpha?: boolean;
  chainName?: string;
  coinName?: string;
  spikeThreshold?: number;
  onOpenPopout?: () => void;
  onOpenInTerminal?: () => void;
}

export default function InlineCoinChart({
  symbol,
  isAlpha,
  chainName,
  coinName,
  spikeThreshold = 2.5,
  onOpenPopout,
  onOpenInTerminal,
}: InlineCoinChartProps) {
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchKlines = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch(`/api/binance/klines?symbol=${encodeURIComponent(symbol)}&interval=5m&limit=60`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.klines)) {
          setKlines(data.klines);
        } else {
          setKlines([]);
        }
      } else {
        setHasError(true);
      }
    } catch (e) {
      console.warn('Inline chart fetch error:', e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKlines();
  }, [symbol]);

  return (
    <div
      className="mt-3 pt-3 border-t border-slate-800/90 animate-in fade-in slide-in-from-top-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Inline Sub-header Toolbar */}
      <div className="flex items-center justify-between pb-2 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-amber-400">5-Minute Scalp Candlestick Chart</span>
          <span className="text-slate-500 font-mono hidden sm:inline">• {symbol}</span>
        </div>

        {onOpenInTerminal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInTerminal();
            }}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-amber-500/10"
            title="Open full dual-column scalp cockpit desk"
          >
            <span>Full Cockpit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasError ? (
        <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Unable to load 5M candles for {symbol}</p>
          <button
            type="button"
            onClick={fetchKlines}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <CandleChart5M
          symbol={symbol}
          klines={klines}
          isLoading={isLoading}
          onRefresh={fetchKlines}
          spikeThreshold={spikeThreshold}
          isAlpha={isAlpha}
          chainName={chainName}
          coinName={coinName}
          onOpenPopout={onOpenPopout}
        />
      )}
    </div>
  );
}
