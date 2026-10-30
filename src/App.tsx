/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import CandleChart5M from './components/CandleChart5M';
import LiveScannerTable from './components/LiveScannerTable';
import QuickScalpRadar from './components/QuickScalpRadar';
import AlertSettingsModal from './components/AlertSettingsModal';
import NotificationCenter from './components/NotificationCenter';
import ToastContainer from './components/ToastContainer';
import CategoryCoinsModal, { CoinCategoryKey } from './components/CategoryCoinsModal';
import ScalpCoPilotCard from './components/ScalpCoPilotCard';
import MobileBottomNav, { MobileTab } from './components/MobileBottomNav';
import TopNavTabs from './components/TopNavTabs';
import AlphaTokensView from './components/AlphaTokensView';
import AlertsControlView from './components/AlertsControlView';
import CommandSearchModal from './components/CommandSearchModal';
import QuickScalpStrip from './components/QuickScalpStrip';
import CandleChartModal from './components/CandleChartModal';
import { CoinScanResult, KlineData, AlertRule, AlertEvent, MonitoringStats, AlertType, DetailedScalpEvaluation } from './types';
import { playBullishChime, playSpikeChime } from './utils/audioAlerts';
import { isMemeCoin } from './utils/memeCoins';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendPushNotification,
} from './utils/pushNotifications';
import {
  TrendingUp,
  Zap,
  Activity,
  Bell,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Sliders,
  Flame,
  Layers,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const DEFAULT_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'SUIUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'NEARUSDT',
  'LINKUSDT',
];

const DEFAULT_RULES: AlertRule = {
  min5mGainPercent: 0.8,
  minSpikeGainPercent: 2.0,
  minSpikeRangePercent: 2.5,
  minConsecutiveGreen: 2,
  minVolumeMultiplier: 1.8,
  enableBrowserPush: true,
  enableSoundAlert: true,
  enableScreenToasts: true,
  soundVolume: 0.7,
  cooldownSeconds: 120,
  includeAlphaCoins: true,
  monitorAllCoins: true,
  trackingMode: 'all',
  trackedCoins: DEFAULT_SYMBOLS,
  coinPreferences: DEFAULT_SYMBOLS.reduce((acc, sym) => {
    acc[sym] = { track5mTrend: true, trackSpikes: true };
    return acc;
  }, {} as Record<string, { track5mTrend: boolean; trackSpikes: boolean }>),
  requireEmaUptrend: false,
  filterMinVolume: true,
  minVolumeQuote: 1_000_000,
  excludeMemeCoins: true,
  onlyUptrendCoins: true,
};

export default function App() {
  const [monitoredSymbols, setMonitoredSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('binance_monitored_symbols');
    return saved ? JSON.parse(saved) : DEFAULT_SYMBOLS;
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [scanResults, setScanResults] = useState<CoinScanResult[]>([]);
  const [scalpRecommendations, setScalpRecommendations] = useState<CoinScanResult[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [minVolumeFilter, setMinVolumeFilter] = useState<number>(1_000_000);
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats | undefined>(undefined);
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [isLoadingKlines, setIsLoadingKlines] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detailedEvaluation, setDetailedEvaluation] = useState<DetailedScalpEvaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('terminal');

  // Alert & Push Rules
  const [rules, setRules] = useState<AlertRule>(() => {
    const saved = localStorage.getItem('binance_alert_rules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_RULES,
          ...parsed,
          trackingMode: parsed.trackingMode || (parsed.monitorAllCoins ? 'all' : 'specific'),
          trackedCoins:
            parsed.trackedCoins && parsed.trackedCoins.length > 0
              ? parsed.trackedCoins
              : DEFAULT_SYMBOLS,
          coinPreferences: parsed.coinPreferences || DEFAULT_RULES.coinPreferences,
          enableScreenToasts:
            parsed.enableScreenToasts !== undefined ? parsed.enableScreenToasts : true,
        };
      } catch (e) {
        return DEFAULT_RULES;
      }
    }
    return DEFAULT_RULES;
  });

  // Alert Events History & Active Toasts
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>([]);
  const [activeToasts, setActiveToasts] = useState<AlertEvent[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());

  // Category Coins Viewer Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [activeCategoryModal, setActiveCategoryModal] = useState<CoinCategoryKey>('going_up');
  const [tableFilterTab, setTableFilterTab] = useState<'scalp' | 'going_up' | 'spikes' | 'alpha' | 'all'>('scalp');
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState<boolean>(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);

  // Global keyboard shortcut '/' or 'Cmd+K' to open search instantly from anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is already typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        setIsCommandSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCategoryCoins = useCallback((category: CoinCategoryKey) => {
    setActiveCategoryModal(category);
    setIsCategoryModalOpen(true);
  }, []);

  const handleJumpToTable = useCallback((category: CoinCategoryKey) => {
    setTableFilterTab(category);
    setActiveMobileTab('scanner');
    setIsCategoryModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Cooldown tracker: map of symbol_alertType -> lastTriggerTimestamp
  const lastAlertTimes = useRef<Record<string, number>>({});

  // Persist monitored symbols & rules
  useEffect(() => {
    localStorage.setItem('binance_monitored_symbols', JSON.stringify(monitoredSymbols));
  }, [monitoredSymbols]);

  useEffect(() => {
    localStorage.setItem('binance_alert_rules', JSON.stringify(rules));
  }, [rules]);

  // Handle saving customized alert rules & syncing tracked coins
  const handleSaveRules = (newRules: AlertRule) => {
    setRules(newRules);
    if (newRules.trackedCoins && newRules.trackedCoins.length > 0) {
      setMonitoredSymbols((prev) => {
        const set = new Set([...prev, ...newRules.trackedCoins]);
        return Array.from(set);
      });
    }
  };

  // Request browser notification permission
  const handleRequestPush = async () => {
    const perm = await requestNotificationPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      setRules((prev) => ({ ...prev, enableBrowserPush: true }));
      sendPushNotification('🔔 Binance 5M Push Alerts Active', {
        body: 'You will receive real-time push notifications for high volatility price spikes & 5m candle surges!',
      });
    }
  };

  // Sound toggle
  const handleToggleAudio = () => {
    setRules((prev) => {
      const updated = { ...prev, enableSoundAlert: !prev.enableSoundAlert };
      if (updated.enableSoundAlert) {
        playBullishChime(updated.soundVolume);
      }
      return updated;
    });
  };

  // Screen Toasts toggle
  const handleToggleScreenToasts = () => {
    setRules((prev) => {
      const updated = { ...prev, enableScreenToasts: !(prev.enableScreenToasts ?? true) };
      if (!updated.enableScreenToasts) {
        setActiveToasts([]);
      }
      return updated;
    });
  };

  // Trigger an alert event with audio, push notification, and non-invasive toast
  const triggerAlert = useCallback(
    (event: Omit<AlertEvent, 'id' | 'timestamp' | 'read'>) => {
      const now = Date.now();
      const cooldownKey = `${event.symbol}_${event.type}`;
      const lastTrigger = lastAlertTimes.current[cooldownKey] || 0;

      if (now - lastTrigger < rules.cooldownSeconds * 1000) {
        return; // Still in cooldown
      }

      lastAlertTimes.current[cooldownKey] = now;

      const newEvent: AlertEvent = {
        ...event,
        id: `${event.symbol}-${event.type}-${now}`,
        timestamp: now,
        read: false,
      };

      // Add to alert activity log (always preserved for user to inspect)
      setAlertHistory((prev) => [newEvent, ...prev.slice(0, 99)]);

      // Display floating screen toast ONLY if enabled, showing 1 single compact pill
      if (rules.enableScreenToasts) {
        setActiveToasts([newEvent]);

        // Auto dismiss toast after 4.5 seconds
        setTimeout(() => {
          setActiveToasts((prev) => prev.filter((t) => t.id !== newEvent.id));
        }, 4500);
      }

      // Play synthesized audio alert
      if (rules.enableSoundAlert) {
        if (event.type === 'VOLATILITY_SPIKE') {
          playSpikeChime(rules.soundVolume);
        } else {
          playBullishChime(rules.soundVolume);
        }
      }

      // Dispatch Web Browser Push Notification
      if (rules.enableBrowserPush) {
        const isSpike = event.type === 'VOLATILITY_SPIKE';
        const title = isSpike
          ? `⚡ Binance Price Spike: ${event.symbol} (${event.isAlpha ? 'Alpha' : 'Spot'})`
          : `🚀 5M Candle Going Up: ${event.symbol} (${event.isAlpha ? 'Alpha' : 'Spot'})`;

        sendPushNotification(title, {
          body: `${event.message} | Price: $${(event.price ?? 0).toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })} (${(event.changePct ?? 0) >= 0 ? '+' : ''}${(event.changePct ?? 0).toFixed(2)}%)`,
          tag: `${event.symbol}-${event.type}`,
        });
      }
    },
    [rules]
  );

  // Stats fetcher
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/binance/stats');
      if (res.ok) {
        const data = await res.json();
        setMonitoringStats(data);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // Polling Scanner Engine for All Coins & Alpha Tokens
  const scanCoins = useCallback(async () => {
    setIsScanning(true);

    try {
      // Fetch entire catalog (all spot + Alpha tokens) without restrictive server-side dropping so searching works across all coins
      const res = await fetch('/api/binance/all-coins?limit=1500&excludeMeme=false&onlyGoingUp=false');
      if (!res.ok) throw new Error(`Scanner error: ${res.statusText}`);
      const data = await res.json();

      if (data && Array.isArray(data.items)) {
        setScanResults(data.items);

        const now = Date.now();
        const newEvents: AlertEvent[] = [];

        // Check each coin against alert rules
        data.items.forEach((coin: CoinScanResult) => {
          // If user turned off Alpha coins, skip Alpha
          if (!rules.includeAlphaCoins && coin.isAlpha) return;

          // Check tracking scope: all Binance coins vs specific selected coins
          const isSpecificMode = rules.trackingMode === 'specific' || !rules.monitorAllCoins;
          const trackedList =
            rules.trackedCoins && rules.trackedCoins.length > 0
              ? rules.trackedCoins
              : monitoredSymbols;
          if (isSpecificMode && !trackedList.includes(coin.symbol)) return;

          // Exclude meme coins if rule is active (user requested: no meme coins)
          if (rules.excludeMemeCoins !== false && (coin.isMeme || isMemeCoin(coin.symbol, coin.name, coin.baseAsset))) return;

          // Exclude downtrend coins (user requested: only coins going up, no shorting)
          if (rules.onlyUptrendCoins !== false && (!coin.isGoingUp || coin.changePct <= 0)) return;

          // If volume filter is active, skip coins below the volume threshold
          const coinVol = coin.quoteVolume || coin.volume || 0;
          if (rules.filterMinVolume && coinVol < (rules.minVolumeQuote || 1_000_000)) return;

          // Per-coin alert preference (user customized per coin)
          const coinPref = rules.coinPreferences?.[coin.symbol] || {
            track5mTrend: true,
            trackSpikes: true,
          };

          // Volatility spike check with user's customized thresholds
          const isVolatilitySpike =
            coinPref.trackSpikes &&
            (coin.rangePct >= rules.minSpikeRangePercent ||
              coin.changePct >= rules.minSpikeGainPercent ||
              (coin.volRatio >= rules.minVolumeMultiplier && coin.changePct >= 1.0));

          // 5m upward candle trend check with user's customized thresholds
          const meetsEma = !rules.requireEmaUptrend || coin.isInUptrend;
          const is5mGoingUp =
            coinPref.track5mTrend &&
            coin.isGoingUp &&
            coin.changePct >= rules.min5mGainPercent &&
            coin.consecutiveGreen >= rules.minConsecutiveGreen &&
            meetsEma;

          if (!isVolatilitySpike && !is5mGoingUp) return;

          const alertType: AlertType = isVolatilitySpike ? 'VOLATILITY_SPIKE' : '5M_BULLISH';
          const cooldownKey = `${coin.symbol}_${alertType}`;
          const lastTrigger = lastAlertTimes.current[cooldownKey] || 0;

          if (now - lastTrigger < rules.cooldownSeconds * 1000) {
            return; // Still in cooldown
          }

          lastAlertTimes.current[cooldownKey] = now;

          const eventItem: AlertEvent = {
            id: `${coin.symbol}-${alertType}-${now}`,
            symbol: coin.symbol,
            baseAsset: coin.baseAsset,
            type: alertType,
            title: isVolatilitySpike
              ? `High Volatility Spike on ${coin.symbol}`
              : `5M Candle Bullish Surge: ${coin.symbol}`,
            message: isVolatilitySpike
              ? `${coin.baseAsset} 5m range reached ${(coin.rangePct ?? 0).toFixed(2)}% with ${
                  coin.volRatio ? coin.volRatio.toFixed(1) : '1.0'
                }x volume surge.`
              : `${coin.baseAsset} broke upward (+${(coin.changePct ?? 0).toFixed(
                  2
                )}% on 5m) across ${coin.consecutiveGreen || 1} green candles.`,
            price: coin.lastPrice,
            changePct: coin.changePct,
            rangePct: coin.rangePct,
            volRatio: coin.volRatio,
            isAlpha: coin.isAlpha,
            chainName: coin.chainName,
            timestamp: now,
            read: false,
          };

          newEvents.push(eventItem);
        });

        // Batch handle all events cleanly without taking over the screen
        if (newEvents.length > 0) {
          // 1. Add all new events to alert history log (for Activity Log bell)
          setAlertHistory((prev) => [...newEvents, ...prev].slice(0, 100));

          // 2. Play audio alert ONCE per scan cycle
          if (rules.enableSoundAlert) {
            const hasSpike = newEvents.some((e) => e.type === 'VOLATILITY_SPIKE');
            if (hasSpike) {
              playSpikeChime(rules.soundVolume);
            } else {
              playBullishChime(rules.soundVolume);
            }
          }

          // 3. Dispatch Web Browser Push Notification for the top event
          if (rules.enableBrowserPush) {
            const topEvent = newEvents[0];
            const isSpike = topEvent.type === 'VOLATILITY_SPIKE';
            const title = isSpike
              ? `⚡ Binance Price Spike: ${topEvent.symbol}`
              : `🚀 5M Candle Surge: ${topEvent.symbol}`;

            sendPushNotification(title, {
              body: `${topEvent.message} | Price: $${topEvent.price.toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}${newEvents.length > 1 ? ` (+${newEvents.length - 1} more in log)` : ''}`,
              tag: `${topEvent.symbol}-${topEvent.type}`,
            });
          }

          // 4. Non-invasive screen toast (show AT MOST ONE single pill)
          if (rules.enableScreenToasts) {
            // Pick the event with highest volatility range or highest gain
            const sorted = [...newEvents].sort(
              (a, b) =>
                Math.max(b.rangePct, Math.abs(b.changePct)) -
                Math.max(a.rangePct, Math.abs(a.changePct))
            );
            const topCandidate = sorted[0];

            setActiveToasts([topCandidate]);

            // Auto dismiss after 4.5 seconds
            setTimeout(() => {
              setActiveToasts((prev) => prev.filter((t) => t.id !== topCandidate.id));
            }, 4500);
          }
        }
      }
    } catch (err) {
      console.warn('Scanner polling warning:', err);
    } finally {
      setIsScanning(false);
    }
  }, [monitoredSymbols, rules]);

  // Fetch Klines for Selected Coin (Spot or Alpha)
  const fetchKlines = useCallback(
    async (sym: string) => {
      setIsLoadingKlines(true);
      try {
        const res = await fetch(`/api/binance/klines?symbol=${encodeURIComponent(sym)}&interval=5m&limit=48`);
        if (!res.ok) throw new Error(`Kline error: ${res.statusText}`);
        const data = await res.json();
        if (data && Array.isArray(data.klines)) {
          setKlines(data.klines);
        }
      } catch (err) {
        console.warn('Kline fetch error:', err);
      } finally {
        setIsLoadingKlines(false);
      }
    },
    []
  );

  // Fetch detailed scalp evaluation for selected coin
  const fetchEvaluation = useCallback(async (sym: string) => {
    if (!sym) return;
    setIsLoadingEvaluation(true);
    try {
      const res = await fetch(`/api/binance/scalp-evaluate?symbol=${encodeURIComponent(sym)}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedEvaluation(data);
      }
    } catch (err) {
      console.warn('Evaluation fetch error:', err);
    } finally {
      setIsLoadingEvaluation(false);
    }
  }, []);

  // Fetch Scalp Recommendations
  const fetchScalpRecommendations = useCallback(async () => {
    try {
      setIsLoadingRecs(true);
      const excludeMemeParam = rules.excludeMemeCoins !== false ? 'true' : 'false';
      const onlyUpParam = rules.onlyUptrendCoins !== false ? 'true' : 'false';
      const res = await fetch(`/api/binance/scalp-recommendations?minVolume=${minVolumeFilter}&excludeMeme=${excludeMemeParam}&onlyUptrend=${onlyUpParam}&limit=12`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.recommendations)) {
        setScalpRecommendations(data.recommendations);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingRecs(false);
    }
  }, [minVolumeFilter, rules.excludeMemeCoins, rules.onlyUptrendCoins]);

  // Initial scan & periodic interval
  useEffect(() => {
    scanCoins();
    fetchStats();
    fetchScalpRecommendations();

    const scanInterval = setInterval(scanCoins, 3000); // Live price scan every 3s
    const statsInterval = setInterval(fetchStats, 5000); // System stats every 5s
    const scalpInterval = setInterval(fetchScalpRecommendations, 4000); // Top scalp ranking refresh

    return () => {
      clearInterval(scanInterval);
      clearInterval(statsInterval);
      clearInterval(scalpInterval);
    };
  }, [scanCoins, fetchStats, fetchScalpRecommendations]);

  // Fetch klines & detailed evaluation whenever selectedSymbol changes
  useEffect(() => {
    // Immediately clear stale evaluation from previous coin to prevent line misplacement
    setDetailedEvaluation(null);
    fetchKlines(selectedSymbol);
    fetchEvaluation(selectedSymbol);
    const klineInterval = setInterval(() => {
      fetchKlines(selectedSymbol);
      fetchEvaluation(selectedSymbol);
    }, 4500);
    return () => clearInterval(klineInterval);
  }, [selectedSymbol, fetchKlines, fetchEvaluation]);

  // Add / Remove symbols
  const handleAddSymbol = (sym: string) => {
    if (!monitoredSymbols.includes(sym)) {
      setMonitoredSymbols((prev) => [...prev, sym]);
    }
    setSelectedSymbol(sym);
  };

  const handleRemoveSymbol = (sym: string) => {
    setMonitoredSymbols((prev) => prev.filter((s) => s !== sym));
    if (selectedSymbol === sym && monitoredSymbols.length > 1) {
      const next = monitoredSymbols.find((s) => s !== sym);
      if (next) setSelectedSymbol(next);
    }
  };

  // Metrics summary
  const selectedCoinObj = scanResults.find((c) => c.symbol === selectedSymbol);
  const coinsGoingUp = scanResults.filter((c) => c.isGoingUp && c.changePct >= rules.min5mGainPercent);
  const volatilitySpikes = scanResults.filter(
    (c) =>
      c.rangePct >= rules.minSpikeRangePercent ||
      c.changePct >= rules.minSpikeGainPercent ||
      c.isSpike
  );
  const alphaCoinsCount = scanResults.filter((c) => c.isAlpha).length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Toast Notifications (Non-invasive single compact pill at bottom) */}
      {rules.enableScreenToasts && (
        <ToastContainer
          toasts={activeToasts}
          onDismiss={(id) => setActiveToasts((prev) => prev.filter((t) => t.id !== id))}
          onDismissAll={() => setActiveToasts([])}
          onSelectCoin={(sym) => {
            setSelectedSymbol(sym);
            setActiveMobileTab('terminal');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onMuteScreenToasts={() => {
            setRules((prev) => ({ ...prev, enableScreenToasts: false }));
            setActiveToasts([]);
          }}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenSettings={() => setActiveMobileTab('more')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadAlertCount={alertHistory.filter((a) => !a.read).length}
        isAudioEnabled={rules.enableSoundAlert}
        onToggleAudio={handleToggleAudio}
        isScreenToastsEnabled={rules.enableScreenToasts ?? true}
        onToggleScreenToasts={handleToggleScreenToasts}
        pushPermission={pushPermission}
        onRequestPush={handleRequestPush}
        isScanning={isScanning}
        stats={monitoringStats}
        onOpenCategoryCoins={(cat) => {
          if (cat === 'alpha') {
            setActiveMobileTab('alpha');
          } else {
            handleOpenCategoryCoins(cat);
          }
        }}
        onOpenSearch={() => setIsCommandSearchOpen(true)}
      />

      {/* Persistent Multi-Tab Navigation Bar (Desktop & Tablet) */}
      <TopNavTabs
        activeTab={activeMobileTab}
        onSelectTab={setActiveMobileTab}
        scalpCount={scalpRecommendations.length}
        alphaCount={alphaCoinsCount}
        bullishCount={coinsGoingUp.length}
        unreadAlertCount={alertHistory.filter((a) => !a.read).length}
      />

      {/* Main Dedicated Screen (Each Tab Opens Separately) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {/* ================= TAB 1: TERMINAL & CHART ================= */}
        {activeMobileTab === 'terminal' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Simple Market Summary Strip */}
            <section
              className="bg-[#0e1422] border border-slate-800 rounded-xl p-3 sm:p-4"
              id="market-pulse-bar"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Metric 1 */}
                <div
                  onClick={() => setActiveMobileTab('scanner')}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors group"
                >
                  <span className="text-xs text-slate-400 block font-medium">
                    Total Monitored
                  </span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {monitoringStats ? monitoringStats.totalCoins.toLocaleString() : '1,379'}
                  </div>
                  <span className="text-[11px] text-amber-400 group-hover:underline">
                    Browse Screener &rarr;
                  </span>
                </div>

                {/* Metric 2: 5M Momentum */}
                <div
                  onClick={() => {
                    setTableFilterTab('going_up');
                    setActiveMobileTab('scanner');
                  }}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors group"
                >
                  <span className="text-xs text-slate-400 block font-medium">
                    5M Bullish Gainers
                  </span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {coinsGoingUp.length} Coins
                  </div>
                  <span className="text-[11px] text-emerald-400 group-hover:underline">
                    View Gainers &rarr;
                  </span>
                </div>

                {/* Metric 3: Hot Scalps */}
                <div
                  onClick={() => setActiveMobileTab('scalps')}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors group"
                >
                  <span className="text-xs text-slate-400 block font-medium">
                    Hot Scalp Setups
                  </span>
                  <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                    {scalpRecommendations.length} Setups
                  </div>
                  <span className="text-[11px] text-amber-400 group-hover:underline">
                    Open Scalps &rarr;
                  </span>
                </div>

                {/* Metric 4: Web3 Tokens */}
                <div
                  onClick={() => setActiveMobileTab('alpha')}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors group"
                >
                  <span className="text-xs text-slate-400 block font-medium">
                    Alpha Web3 Tokens
                  </span>
                  <div className="text-lg font-black text-slate-100 font-mono mt-0.5">
                    {alphaCoinsCount || 681}
                  </div>
                  <span className="text-[11px] text-slate-400 group-hover:text-white">
                    Explore Alpha &rarr;
                  </span>
                </div>
              </div>
            </section>

            {/* Quick Scalp Radar Strip (Instant high-conviction 5M setups with TP/SL) */}
            <QuickScalpStrip
              scalps={scalpRecommendations}
              selectedSymbol={selectedSymbol}
              onSelectCoin={(sym) => {
                setSelectedSymbol(sym);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenSearch={() => setIsCommandSearchOpen(true)}
              onViewAllScalps={() => setActiveMobileTab('scalps')}
            />

            {/* Scalper Terminal Cockpit: Dual-Column Side-by-Side (5M Chart + Scalp Co-Pilot Desk) */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5" id="chart-section">
              {/* Left/Main Column: 5M Candlestick Chart with TP/SL Targets Overlays */}
              <div className="xl:col-span-7 2xl:col-span-8 flex flex-col">
                <CandleChart5M
                  symbol={selectedSymbol}
                  klines={klines}
                  isLoading={isLoadingKlines}
                  onRefresh={() => fetchKlines(selectedSymbol)}
                  spikeThreshold={rules.minSpikeRangePercent}
                  isAlpha={selectedCoinObj?.isAlpha}
                  chainName={selectedCoinObj?.chainName}
                  coinName={selectedCoinObj?.name}
                  customEntry={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.suggestedEntry : undefined}
                  customTarget1={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.target1 : undefined}
                  customTarget2={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.target2 : undefined}
                  customStopLoss={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.stopLoss : undefined}
                  onOpenSearch={() => setIsCommandSearchOpen(true)}
                  onOpenPopout={() => setIsChartModalOpen(true)}
                />
              </div>

              {/* Right Column: Pre-Trade Scalp Co-Pilot Execution Desk */}
              <div className="xl:col-span-5 2xl:col-span-4 flex flex-col">
                <ScalpCoPilotCard
                  symbol={selectedSymbol}
                  onSelectSymbol={(sym) => {
                    setSelectedSymbol(sym);
                  }}
                  evaluation={detailedEvaluation}
                  isLoading={isLoadingEvaluation}
                  onRefresh={() => fetchEvaluation(selectedSymbol)}
                  onToggleTrackedCoin={(sym) => {
                    if (monitoredSymbols.includes(sym)) {
                      handleRemoveSymbol(sym);
                    } else {
                      handleAddSymbol(sym);
                    }
                  }}
                  isCoinTracked={monitoredSymbols.includes(selectedSymbol)}
                />
              </div>
            </section>

            {/* Quick Switcher Strip to Other Tabs */}
            <div className="bg-[#111827]/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Looking for new setups? Switch to Hot Scalps or check the Live Scanner.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMobileTab('scalps')}
                  className="px-3 py-1.5 rounded-lg font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Hot Scalps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMobileTab('scanner')}
                  className="px-3 py-1.5 rounded-lg font-bold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: HOT SCALPS ================= */}
        {activeMobileTab === 'scalps' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <QuickScalpRadar
              recommendations={scalpRecommendations}
              isLoading={isLoadingRecs}
              selectedSymbol={selectedSymbol}
              onSelectCoin={(sym) => {
                setSelectedSymbol(sym);
              }}
              minVolumeFilter={minVolumeFilter}
              onChangeMinVolumeFilter={(vol) => {
                setMinVolumeFilter(vol);
              }}
              onOpenPopoutChart={(sym) => {
                setSelectedSymbol(sym);
                setIsChartModalOpen(true);
              }}
              onOpenInTerminal={(sym) => {
                setSelectedSymbol(sym);
                setActiveMobileTab('terminal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ================= TAB 3: ALPHA TOKENS ================= */}
        {activeMobileTab === 'alpha' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <AlphaTokensView
              coins={scanResults}
              onSelectCoin={(sym) => {
                setSelectedSymbol(sym);
              }}
              gainThreshold={rules.min5mGainPercent}
              onOpenPopoutChart={(sym) => {
                setSelectedSymbol(sym);
                setIsChartModalOpen(true);
              }}
              onOpenInTerminal={(sym) => {
                setSelectedSymbol(sym);
                setActiveMobileTab('terminal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ================= TAB 4: LIVE SCANNER ================= */}
        {activeMobileTab === 'scanner' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-wider">
                    Binance All-Coins 5M Trend Scanner &amp; Screener
                  </h2>
                  <p className="text-xs text-slate-400">
                    Full catalog of Binance spot pairs &amp; Alpha Web3 tokens with real-time 5-minute indicators. Click any coin or "View Chart" to expand its 5M chart beneath it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live Feed Active</span>
              </div>
            </div>

            <LiveScannerTable
              items={scanResults}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={(sym) => {
                setSelectedSymbol(sym);
              }}
              onOpenInTerminal={(sym) => {
                setSelectedSymbol(sym);
                setActiveMobileTab('terminal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenPopoutChart={(sym) => {
                setSelectedSymbol(sym);
                setIsChartModalOpen(true);
              }}
              onAddSymbol={handleAddSymbol}
              onRemoveSymbol={handleRemoveSymbol}
              spikeGainThreshold={rules.minSpikeGainPercent}
              spikeRangeThreshold={rules.minSpikeRangePercent}
              gainThreshold={rules.min5mGainPercent}
              minVolumeFilter={minVolumeFilter}
              onChangeMinVolumeFilter={setMinVolumeFilter}
              activeFilterTab={tableFilterTab}
              onFilterTabChange={setTableFilterTab}
            />
          </div>
        )}

        {/* ================= TAB 5: ALERTS & CONTROL HUB ================= */}
        {activeMobileTab === 'more' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <AlertsControlView
              rules={rules}
              onUpdateRules={(newRules) => {
                setRules(newRules);
                localStorage.setItem('binance_alert_rules', JSON.stringify(newRules));
              }}
              alerts={alertHistory}
              onClearAlerts={() => setAlertHistory([])}
              onSelectCoin={(sym) => {
                setSelectedSymbol(sym);
                setActiveMobileTab('terminal');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              pushPermission={pushPermission}
              onRequestPush={handleRequestPush}
              stats={monitoringStats}
            />
          </div>
        )}
      </main>

      {/* Alert Settings Modal */}
      <AlertSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rules={rules}
        onSaveRules={handleSaveRules}
        availableCoins={scanResults}
        onSelectCoinForChart={(sym) => {
          setSelectedSymbol(sym);
          setActiveMobileTab('terminal');
          setIsSettingsOpen(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />

      {/* Notification Activity Drawer */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          // Mark all as read when opening/closing
          setAlertHistory((prev) => prev.map((a) => ({ ...a, read: true })));
        }}
        alerts={alertHistory}
        onClearAlerts={() => setAlertHistory([])}
        onSelectCoin={(sym) => {
          setSelectedSymbol(sym);
          setActiveMobileTab('terminal');
          setIsNotificationsOpen(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />

      {/* Quick Category Coins Viewer Modal */}
      {isCategoryModalOpen && (
        <CategoryCoinsModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          initialCategory={activeCategoryModal}
          coins={scanResults}
          gainThreshold={rules.min5mGainPercent}
          spikeRangeThreshold={rules.minSpikeRangePercent}
          spikeGainThreshold={rules.minSpikeGainPercent}
          onSelectCoinForChart={(sym) => {
            setSelectedSymbol(sym);
            setActiveMobileTab('terminal');
            setIsCategoryModalOpen(false);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onSelectCoinForEvaluator={(sym) => {
            setSelectedSymbol(sym);
            setActiveMobileTab('terminal');
            setIsCategoryModalOpen(false);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onJumpToTable={handleJumpToTable}
        />
      )}

      {/* Global Command & Quick Scalp Search Modal */}
      <CommandSearchModal
        isOpen={isCommandSearchOpen}
        onClose={() => setIsCommandSearchOpen(false)}
        onSelectCoin={(sym) => {
          setSelectedSymbol(sym);
          setActiveMobileTab('terminal');
          setIsCommandSearchOpen(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        hotScalps={scalpRecommendations}
        alphaTokens={scanResults.filter((c) => c.isAlpha)}
        bullishCoins={coinsGoingUp}
      />

      {/* Pop-Out Zoomable Chart Modal */}
      <CandleChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        symbol={selectedSymbol}
        klines={klines}
        isLoading={isLoadingKlines}
        onRefresh={() => fetchKlines(selectedSymbol)}
        spikeThreshold={rules.minSpikeRangePercent}
        isAlpha={selectedCoinObj?.isAlpha}
        chainName={selectedCoinObj?.chainName}
        coinName={selectedCoinObj?.name}
        customEntry={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.suggestedEntry : undefined}
        customTarget1={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.target1 : undefined}
        customTarget2={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.target2 : undefined}
        customStopLoss={detailedEvaluation?.symbol === selectedSymbol ? detailedEvaluation?.stopLoss : undefined}
        onOpenSearch={() => setIsCommandSearchOpen(true)}
      />

      {/* 5-Tab Mobile Bottom Navigation Bar (Matches mobile terminal layout) */}
      <MobileBottomNav
        activeTab={activeMobileTab}
        onSelectTab={setActiveMobileTab}
        onOpenCategoryCoins={handleOpenCategoryCoins}
        onOpenSettings={() => setActiveMobileTab('more')}
        scalpCount={scalpRecommendations.length}
        alphaCount={alphaCoinsCount}
        bullishCount={coinsGoingUp.length}
      />
    </div>
  );
}
