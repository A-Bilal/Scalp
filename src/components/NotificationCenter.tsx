import { useState } from 'react';
import { AlertEvent } from '../types';
import {
  Bell,
  X,
  Zap,
  TrendingUp,
  Volume2,
  Trash2,
  CheckCheck,
  Flame,
  ExternalLink,
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertEvent[];
  onClearAlerts: () => void;
  onSelectCoin: (symbol: string) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  alerts,
  onClearAlerts,
  onSelectCoin,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'spikes' | 'bullish'>('all');

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'spikes') return a.type === 'VOLATILITY_SPIKE';
    if (filter === 'bullish') return a.type === '5M_BULLISH';
    return true;
  });

  const formatTime = (ts: number) => {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in"
      id="notification-center-drawer"
    >
      <div
        className="w-full max-w-md bg-[#111827] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]/90">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Alert Activity Log</h3>
              <p className="text-[11px] text-slate-400">
                {alerts.length} event{alerts.length !== 1 ? 's' : ''} captured this session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {alerts.length > 0 && (
              <button
                onClick={onClearAlerts}
                title="Clear all alerts"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('spikes')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              filter === 'spikes'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <Zap className="w-3 h-3 text-rose-400" />
            Price Spikes ({alerts.filter((a) => a.type === 'VOLATILITY_SPIKE').length})
          </button>
          <button
            onClick={() => setFilter('bullish')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              filter === 'bullish'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            5M Green ({alerts.filter((a) => a.type === '5M_BULLISH').length})
          </button>
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
          {filteredAlerts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Bell className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <p className="text-xs font-medium text-slate-400">No alerts logged yet</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                When a coin surges on a 5-minute candle or experiences high volatility spikes, it will appear here.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isSpike = alert.type === 'VOLATILITY_SPIKE';

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    onSelectCoin(alert.symbol);
                    onClose();
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSpike
                      ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20'
                      : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg text-xs font-bold ${
                          isSpike
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {isSpike ? <Zap className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-xs">{alert.symbol}</span>
                          {alert.isAlpha && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ALPHA {alert.chainName ? `· ${alert.chainName}` : ''}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isSpike
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {isSpike ? 'VOLATILITY SPIKE' : '5M SURGE'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatTime(alert.timestamp)}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono-nums">
                      <span
                        className={`text-xs font-bold block ${
                          (alert.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {(alert.changePct ?? 0) >= 0 ? '+' : ''}
                        {(alert.changePct ?? 0).toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ${(alert.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 pl-8">{alert.message}</p>

                  <div className="mt-2 pl-8 flex items-center gap-3 text-[11px] text-slate-400 font-mono-nums">
                    <span>Range: {alert.rangePct !== undefined ? alert.rangePct.toFixed(2) : '0.00'}%</span>
                    <span>•</span>
                    <span>Vol: {alert.volRatio !== undefined ? alert.volRatio.toFixed(1) : '1.0'}x</span>
                    <span className="ml-auto text-amber-400 font-semibold text-[10px] flex items-center gap-0.5 hover:underline">
                      View 5M Chart &rarr;
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
