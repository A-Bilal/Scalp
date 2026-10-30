import React, { useState } from 'react';
import { AlertRule, AlertEvent, MonitoringStats } from '../types';
import { playBullishChime, playSpikeChime } from '../utils/audioAlerts';
import {
  Sliders,
  Bell,
  Volume2,
  VolumeX,
  ShieldCheck,
  TrendingUp,
  Zap,
  Trash2,
  Send,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  Radio,
  ExternalLink,
  Play,
} from 'lucide-react';

interface AlertsControlViewProps {
  rules: AlertRule;
  onUpdateRules: (newRules: AlertRule) => void;
  alerts: AlertEvent[];
  onClearAlerts: () => void;
  onSelectCoin: (symbol: string) => void;
  pushPermission: NotificationPermission | 'unsupported';
  onRequestPush: () => void;
  stats?: MonitoringStats;
}

export default function AlertsControlView({
  rules,
  onUpdateRules,
  alerts,
  onClearAlerts,
  onSelectCoin,
  pushPermission,
  onRequestPush,
  stats,
}: AlertsControlViewProps) {
  const [localRules, setLocalRules] = useState<AlertRule>(rules);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onUpdateRules(localRules);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Engine Status */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">Alert Engine &amp; Settings Hub</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure real-time 5-minute candle breakout triggers, sound chimes, and notification alerts.
            </p>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-medium">Engine Active:</span>
            <strong className="text-amber-400 font-mono-nums">{stats.totalCoins.toLocaleString()} Coins</strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alert Trigger Parameters */}
        <div className="lg:col-span-7 space-y-5">
          {/* Triggers Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Breakout &amp; Spike Thresholds
            </h2>

            {/* Min 5M Gain */}
            <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">5M Candle Minimum Gain</span>
                <span className="font-black text-emerald-400 font-mono-nums text-sm">
                  +{localRules.min5mGainPercent}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={localRules.min5mGainPercent}
                onChange={(e) =>
                  setLocalRules({ ...localRules, min5mGainPercent: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Triggers when a 5-minute candle closes or surges by at least this percentage.
              </p>
            </div>

            {/* Min Spike Range */}
            <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">Volatility Spike Range (High - Low)</span>
                <span className="font-black text-rose-400 font-mono-nums text-sm">
                  {localRules.minSpikeRangePercent}%
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={localRules.minSpikeRangePercent}
                onChange={(e) =>
                  setLocalRules({ ...localRules, minSpikeRangePercent: parseFloat(e.target.value) })
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Triggers when high volatility expands the candle spread beyond this threshold.
              </p>
            </div>

            {/* Monitoring Scope */}
            <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              <span className="font-bold text-xs text-slate-200 block">Monitoring Scope</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLocalRules({ ...localRules, trackingMode: 'all', monitorAllCoins: true })}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    localRules.trackingMode === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  All Spot + Alpha
                </button>
                <button
                  type="button"
                  onClick={() => setLocalRules({ ...localRules, trackingMode: 'specific', monitorAllCoins: false })}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    localRules.trackingMode === 'specific'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Tracked Coins Only
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Meme Coin Exclusion */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localRules.excludeMemeCoins ?? true}
                  onChange={(e) =>
                    setLocalRules({ ...localRules, excludeMemeCoins: e.target.checked })
                  }
                  className="rounded accent-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Filter Meme Coins</span>
                  <span className="text-[10px] text-slate-400">Skip low-utility meme tokens</span>
                </div>
              </label>

              {/* Uptrend Only */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localRules.onlyUptrendCoins ?? true}
                  onChange={(e) =>
                    setLocalRules({ ...localRules, onlyUptrendCoins: e.target.checked })
                  }
                  className="rounded accent-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Only Uptrend Coins</span>
                  <span className="text-[10px] text-slate-400">Price &gt; EMA21 baseline</span>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-950" />
                  <span>Rules Saved Successfully!</span>
                </>
              ) : (
                <span>Save Alert Rules</span>
              )}
            </button>
          </div>

          {/* Sound & Notifications Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              Sound Chimes &amp; Test Lab
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bullish Test */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">Bullish Chime</span>
                  <span className="text-[10px] text-slate-400">Ascending double ping</span>
                </div>
                <button
                  type="button"
                  onClick={() => playBullishChime()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Test</span>
                </button>
              </div>

              {/* Spike Test */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-400 block">Spike Chime</span>
                  <span className="text-[10px] text-slate-400">Crisp high-alert ping</span>
                </div>
                <button
                  type="button"
                  onClick={() => playSpikeChime()}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Test</span>
                </button>
              </div>
            </div>

            {/* Push Status */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Push Notifications</span>
                <span className="text-[10px] text-slate-400">
                  Status: {pushPermission === 'granted' ? 'Enabled' : 'Not Granted'}
                </span>
              </div>
              <button
                type="button"
                onClick={onRequestPush}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold hover:bg-blue-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{pushPermission === 'granted' ? 'Active' : 'Enable'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Alert Activity Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[480px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Live Alert History
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300">
                  {alerts.length}
                </span>
              </div>

              {alerts.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAlerts}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* List */}
            {alerts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Bell className="w-10 h-10 text-slate-700 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-400">No alerts triggered yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Alerts will populate here automatically as 5M breakouts and volatility spikes occur.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                {alerts.map((alert) => {
                  const isSpike = alert.type === 'VOLATILITY_SPIKE';
                  const dateStr = new Date(alert.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={alert.id}
                      onClick={() => onSelectCoin(alert.symbol)}
                      className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSpike
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {isSpike ? <Zap className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs text-white group-hover:text-amber-300 transition-colors">
                              {alert.symbol}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                isSpike
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isSpike ? 'Spike' : '5M Surge'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono-nums truncate mt-0.5">
                            ${(alert.price ?? 0).toFixed(4)} &bull; {(alert.changePct ?? 0) >= 0 ? '+' : ''}
                            {(alert.changePct ?? 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono block">{dateStr}</span>
                        <span className="text-[11px] font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Trade &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
