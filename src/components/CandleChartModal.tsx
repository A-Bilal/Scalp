import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import CandleChart5M from './CandleChart5M';
import { KlineData } from '../types';

interface CandleChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  klines: KlineData[];
  isLoading: boolean;
  onRefresh: () => void;
  spikeThreshold: number;
  isAlpha?: boolean;
  chainName?: string;
  coinName?: string;
  customEntry?: number;
  customTarget1?: number;
  customTarget2?: number;
  customStopLoss?: number;
  onOpenSearch?: () => void;
}

export default function CandleChartModal({
  isOpen,
  onClose,
  symbol,
  klines,
  isLoading,
  onRefresh,
  spikeThreshold,
  isAlpha,
  chainName,
  coinName,
  customEntry,
  customTarget1,
  customTarget2,
  customStopLoss,
  onOpenSearch,
}: CandleChartModalProps) {
  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[92vh] max-h-[880px] bg-[#0c101c] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Control Bar */}
        <div className="px-4 py-2.5 bg-[#090d16] border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Pop-Out Chart Window
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">&bull; 5M Zoomable Candlestick Terminal</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-mono mr-2">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">ESC</kbd>
              <span>to close</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
              title="Close Pop-Out (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart Viewport Body */}
        <div className="flex-1 overflow-hidden p-1">
          <CandleChart5M
            symbol={symbol}
            klines={klines}
            isLoading={isLoading}
            onRefresh={onRefresh}
            spikeThreshold={spikeThreshold}
            isAlpha={isAlpha}
            chainName={chainName}
            coinName={coinName}
            customEntry={customEntry}
            customTarget1={customTarget1}
            customTarget2={customTarget2}
            customStopLoss={customStopLoss}
            onOpenSearch={onOpenSearch}
            onOpenPopout={onClose}
            isPopoutModal={true}
          />
        </div>
      </div>
    </div>
  );
}
