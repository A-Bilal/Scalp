import { AlertEvent } from '../types';
import { Zap, TrendingUp, X, BellOff, ArrowRight } from 'lucide-react';

interface ToastContainerProps {
  toasts: AlertEvent[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onSelectCoin: (symbol: string) => void;
  onMuteScreenToasts?: () => void;
}

export default function ToastContainer({
  toasts,
  onDismiss,
  onDismissAll,
  onSelectCoin,
  onMuteScreenToasts,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  // Show only the latest SINGLE toast to prevent screen takeover
  const latestToast = toasts[0];
  const pendingCount = toasts.length - 1;
  const isSpike = latestToast.type === 'VOLATILITY_SPIKE';

  return (
    <div
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:top-3 z-50 max-w-md w-auto pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4"
      id="toast-notifications-stack"
    >
      <div
        onClick={() => {
          onSelectCoin(latestToast.symbol);
          onDismiss(latestToast.id);
        }}
        className={`pointer-events-auto rounded-lg px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] border backdrop-blur-xl cursor-pointer transition-all hover:scale-[1.005] flex items-center justify-between gap-3 ${
          isSpike
            ? 'bg-[#120d18]/95 border-rose-500/40 text-white'
            : 'bg-[#0a141a]/95 border-emerald-500/40 text-white'
        }`}
      >
        {/* Left: Icon & Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
              isSpike ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isSpike ? <Zap className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-white tracking-wide">{latestToast.symbol}</span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                  isSpike ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isSpike ? 'Spike' : '5M Surge'}
              </span>
              <span
                className={`text-xs font-mono font-bold font-mono-nums ${
                  latestToast.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {latestToast.changePct >= 0 ? '+' : ''}
                {latestToast.changePct.toFixed(2)}%
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[210px] sm:max-w-[260px] mt-0.5">
              {latestToast.rangePct ? `Spread: ${latestToast.rangePct.toFixed(1)}%` : ''}
              {latestToast.volRatio ? ` · ${latestToast.volRatio.toFixed(1)}x Vol` : ''}
              {pendingCount > 0 && (
                <span className="text-amber-400 font-semibold ml-1.5">
                  (+{pendingCount} more)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              onSelectCoin(latestToast.symbol);
              onDismiss(latestToast.id);
            }}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-700/80 cursor-pointer"
            title="Inspect 5M Candlestick"
          >
            <span>Trade</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {onMuteScreenToasts && (
            <button
              type="button"
              onClick={onMuteScreenToasts}
              className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mute Screen Popups (Keep in Activity Log only)"
            >
              <BellOff className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onDismissAll}
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
