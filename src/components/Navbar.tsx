import { useState, useEffect } from 'react';
import { MonitoringStats } from '../types';
import {
  Bell,
  Sliders,
  Volume2,
  VolumeX,
  Clock,
  Search,
  Eye,
  EyeOff,
  Flame,
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  unreadAlertCount: number;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  isScreenToastsEnabled: boolean;
  onToggleScreenToasts: () => void;
  pushPermission: NotificationPermission | 'unsupported';
  onRequestPush: () => void;
  isScanning: boolean;
  stats?: MonitoringStats;
  onOpenCategoryCoins?: (category: 'all' | 'going_up' | 'spikes' | 'alpha') => void;
  onOpenSearch?: () => void;
}

export default function Navbar({
  onOpenSettings,
  onOpenNotifications,
  unreadAlertCount,
  isAudioEnabled,
  onToggleAudio,
  isScreenToastsEnabled,
  onToggleScreenToasts,
  onOpenSearch,
}: NavbarProps) {
  // Live countdown to next 5m candle close (e.g. at :00, :05, :10...)
  const [secondsUntilClose, setSecondsUntilClose] = useState<number>(300);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentSeconds = now.getMinutes() * 60 + now.getSeconds();
      const nextCandleSeconds = (Math.floor(currentSeconds / 300) + 1) * 300;
      setSecondsUntilClose(Math.max(0, nextCandleSeconds - currentSeconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCandleCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 w-full z-30 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-2.5" id="app-navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-4 h-4 fill-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black text-white tracking-tight uppercase">
              Binance Scalper
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              5M Momentum Engine
            </span>
          </div>
        </div>

        {/* Global Quick Search Button (Center Bar) */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 max-w-md mx-2 px-3 py-1.5 rounded-lg border bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all text-xs font-medium flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-amber-400/90 group-hover:scale-105 transition-transform" />
              <span>Search 1,379 Spot &amp; Alpha coins...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-500">
              /
            </kbd>
          </button>
        )}

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Next 5M Close Timer */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            <span>5M:</span>
            <span className="text-amber-400 font-bold font-mono-nums">{formatCandleCountdown(secondsUntilClose)}</span>
          </div>

          {/* Audio Quick Toggle */}
          <button
            type="button"
            onClick={onToggleAudio}
            title={isAudioEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
            className={`p-2 rounded-lg border transition-all text-xs cursor-pointer ${
              isAudioEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Screen Popups Quick Toggle */}
          <button
            type="button"
            onClick={onToggleScreenToasts}
            title={isScreenToastsEnabled ? 'Banners are ON' : 'Banners are OFF'}
            className={`p-2 rounded-lg border transition-all text-xs cursor-pointer ${
              isScreenToastsEnabled
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
          >
            {isScreenToastsEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Activity Log Button with unread count */}
          <button
            type="button"
            onClick={onOpenNotifications}
            title="Alert History"
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configure Alert Rules"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
