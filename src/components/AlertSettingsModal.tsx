import { useState, useMemo, useEffect, useRef } from 'react';
import { AlertRule, CoinScanResult, CoinAlertPreference } from '../types';
import { playBullishChime, playSpikeChime } from '../utils/audioAlerts';
import {
  requestNotificationPermission,
  sendPushNotification,
  getNotificationPermission,
} from '../utils/pushNotifications';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Zap,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Filter,
  Eye,
} from 'lucide-react';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AlertRule;
  onSaveRules: (newRules: AlertRule) => void;
  availableCoins?: CoinScanResult[];
  onSelectCoinForChart?: (symbol: string) => void;
}

type TabType = 'coins' | 'spikes' | 'trend5m' | 'notifications';

const TOP_10_GIANTS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'SUIUSDT',
  'NEARUSDT',
  'LINKUSDT',
];

export default function AlertSettingsModal({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  availableCoins = [],
  onSelectCoinForChart,
}: AlertSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('coins');
  const [localRules, setLocalRules] = useState<AlertRule>(() => ({
    ...rules,
    trackingMode: rules.trackingMode || (rules.monitorAllCoins ? 'all' : 'specific'),
    trackedCoins: rules.trackedCoins && rules.trackedCoins.length > 0 ? rules.trackedCoins : TOP_10_GIANTS,
    coinPreferences: rules.coinPreferences || {},
  }));

  const [permissionStatus, setPermissionStatus] = useState(getNotificationPermission());
  const [testSent, setTestSent] = useState(false);

  // Search input for adding Binance coins
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<CoinScanResult[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset local state when opened with updated rules
  useEffect(() => {
    if (isOpen) {
      setLocalRules({
        ...rules,
        trackingMode: rules.trackingMode || (rules.monitorAllCoins ? 'all' : 'specific'),
        trackedCoins: rules.trackedCoins && rules.trackedCoins.length > 0 ? rules.trackedCoins : TOP_10_GIANTS,
        coinPreferences: rules.coinPreferences || {},
      });
      setPermissionStatus(getNotificationPermission());
    }
  }, [isOpen, rules]);

  // Fast coin map for price and details lookup
  const coinMap = useMemo(() => {
    const map = new Map<string, CoinScanResult>();
    availableCoins.forEach((c) => {
      map.set(c.symbol, c);
    });
    return map;
  }, [availableCoins]);

  // Handle local / API coin search
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      setIsSearchingApi(false);
      return;
    }

    // 1. Instant match against loaded availableCoins
    const localMatches = availableCoins.filter((c) => {
      const matchSymbol = c.symbol.toLowerCase().includes(query);
      const matchBase = c.baseAsset.toLowerCase().includes(query);
      const matchName = (c.name || '').toLowerCase().includes(query);
      return matchSymbol || matchBase || matchName;
    });

    if (localMatches.length > 0) {
      setSearchResults(localMatches.slice(0, 15));
      return;
    }

    // 2. Query server search API if no local matches
    setIsSearchingApi(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/binance/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results)) {
            const mapped: CoinScanResult[] = data.results.map((r: any) => ({
              symbol: r.symbol,
              canonicalSymbol: r.symbol,
              baseAsset: r.baseAsset,
              name: r.name,
              lastPrice: r.lastPrice || 0,
              open: r.lastPrice || 0,
              high: r.lastPrice || 0,
              low: r.lastPrice || 0,
              volume: r.quoteVolume || 0,
              quoteVolume: r.quoteVolume || 0,
              changePct: r.priceChange24h || 0,
              rangePct: 0,
              volRatio: 1,
              consecutiveGreen: 0,
              isGoingUp: (r.priceChange24h || 0) > 0,
              isSpike: false,
              openTime: Date.now() - 300000,
              closeTime: Date.now(),
              isAlpha: r.isAlpha,
              chainName: r.chainName,
            }));
            setSearchResults(mapped.slice(0, 15));
          }
        }
      } catch (err) {
        console.warn('Search API error:', err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, availableCoins]);

  if (!isOpen) return null;

  // --- Handlers for Coin Selection ---
  const handleAddCoin = (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return;

    if (!localRules.trackedCoins.includes(sym)) {
      setLocalRules((prev) => ({
        ...prev,
        trackedCoins: [...prev.trackedCoins, sym],
        coinPreferences: {
          ...prev.coinPreferences,
          [sym]: prev.coinPreferences?.[sym] || { track5mTrend: true, trackSpikes: true },
        },
      }));
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleRemoveCoin = (symbol: string) => {
    setLocalRules((prev) => ({
      ...prev,
      trackedCoins: prev.trackedCoins.filter((s) => s !== symbol),
    }));
  };

  const handleToggleCoinPref = (symbol: string, field: 'track5mTrend' | 'trackSpikes') => {
    setLocalRules((prev) => {
      const currentPref: CoinAlertPreference = prev.coinPreferences?.[symbol] || {
        track5mTrend: true,
        trackSpikes: true,
      };

      const updatedPref: CoinAlertPreference = {
        ...currentPref,
        [field]: !currentPref[field],
      };

      return {
        ...prev,
        coinPreferences: {
          ...prev.coinPreferences,
          [symbol]: updatedPref,
        },
      };
    });
  };

  const handleAddTopGiants = () => {
    setLocalRules((prev) => {
      const set = new Set([...prev.trackedCoins, ...TOP_10_GIANTS]);
      const newTracked = Array.from(set);
      const newPrefs = { ...prev.coinPreferences };
      newTracked.forEach((sym) => {
        if (!newPrefs[sym]) {
          newPrefs[sym] = { track5mTrend: true, trackSpikes: true };
        }
      });
      return {
        ...prev,
        trackedCoins: newTracked,
        coinPreferences: newPrefs,
      };
    });
  };

  const handleAddRisingCoins = () => {
    const risingSymbols = availableCoins
      .filter((c) => c.isGoingUp && c.changePct >= (localRules.min5mGainPercent || 0.5))
      .slice(0, 15)
      .map((c) => c.symbol);

    if (risingSymbols.length === 0) return;

    setLocalRules((prev) => {
      const set = new Set([...prev.trackedCoins, ...risingSymbols]);
      const newTracked = Array.from(set);
      const newPrefs = { ...prev.coinPreferences };
      newTracked.forEach((sym) => {
        if (!newPrefs[sym]) {
          newPrefs[sym] = { track5mTrend: true, trackSpikes: true };
        }
      });
      return {
        ...prev,
        trackedCoins: newTracked,
        coinPreferences: newPrefs,
      };
    });
  };

  const handleAddTopSpikeCoins = () => {
    const spikeSymbols = [...availableCoins]
      .sort((a, b) => (b.rangePct || 0) - (a.rangePct || 0))
      .slice(0, 10)
      .map((c) => c.symbol);

    setLocalRules((prev) => {
      const set = new Set([...prev.trackedCoins, ...spikeSymbols]);
      const newTracked = Array.from(set);
      const newPrefs = { ...prev.coinPreferences };
      newTracked.forEach((sym) => {
        if (!newPrefs[sym]) {
          newPrefs[sym] = { track5mTrend: true, trackSpikes: true };
        }
      });
      return {
        ...prev,
        trackedCoins: newTracked,
        coinPreferences: newPrefs,
      };
    });
  };

  const handleClearAllCoins = () => {
    setLocalRules((prev) => ({
      ...prev,
      trackedCoins: [],
    }));
  };

  const handleRestoreDefaultCoins = () => {
    setLocalRules((prev) => ({
      ...prev,
      trackedCoins: TOP_10_GIANTS,
      coinPreferences: TOP_10_GIANTS.reduce((acc, sym) => {
        acc[sym] = { track5mTrend: true, trackSpikes: true };
        return acc;
      }, {} as Record<string, CoinAlertPreference>),
    }));
  };

  // --- Browser Push & Chime ---
  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionStatus(res);
    if (res === 'granted') {
      setLocalRules((prev) => ({ ...prev, enableBrowserPush: true }));
    }
  };

  const handleSendTestPush = () => {
    sendPushNotification('🚀 Binance Volatility Spike Alert (Test)', {
      body: 'BTCUSDT surged +2.45% on the 5m candle! Volatility range: 3.10%.',
      tag: 'test-alert',
    });
    if (localRules.enableSoundAlert) {
      playSpikeChime(localRules.soundVolume);
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSave = () => {
    const finalRules: AlertRule = {
      ...localRules,
      monitorAllCoins: localRules.trackingMode === 'all',
      // Clean up fallback defaults if needed
      min5mGainPercent: Math.max(0.05, Number(localRules.min5mGainPercent) || 0.8),
      minSpikeGainPercent: Math.max(0.1, Number(localRules.minSpikeGainPercent) || 2.0),
      minSpikeRangePercent: Math.max(0.1, Number(localRules.minSpikeRangePercent) || 2.5),
      minConsecutiveGreen: Math.max(1, Number(localRules.minConsecutiveGreen) || 2),
      minVolumeMultiplier: Math.max(1.0, Number(localRules.minVolumeMultiplier) || 1.8),
    };
    onSaveRules(finalRules);
    onClose();
  };

  // Tracked count metrics
  const trackedCount = localRules.trackedCoins.length;
  const trendTrackedCount = localRules.trackedCoins.filter(
    (sym) => (localRules.coinPreferences?.[sym]?.track5mTrend ?? true)
  ).length;
  const spikeTrackedCount = localRules.trackedCoins.filter(
    (sym) => (localRules.coinPreferences?.[sym]?.trackSpikes ?? true)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      id="alert-settings-modal"
    >
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#111827]/95 backdrop-blur z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Custom Alert Settings &amp; Rules</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hidden sm:inline-block">
                  Binance 5M Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Track specific coins for 5m upward trends &amp; customize spike thresholds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-800 px-4 pt-2 bg-[#0c1017] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('coins')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'coins'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tracked Coins</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                localRules.trackingMode === 'all'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {localRules.trackingMode === 'all' ? 'All Coins' : `${trackedCount} Selected`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spikes')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'spikes'
                ? 'border-rose-400 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Volatility Spikes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-500/20 text-rose-300">
              +{localRules.minSpikeGainPercent}% / &ge;{localRules.minSpikeRangePercent}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trend5m')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'trend5m'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>5M Upward Trends</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-300">
              +{localRules.min5mGainPercent}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'notifications'
                ? 'border-blue-400 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Push &amp; Audio</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* ========================================================= */}
          {/* TAB 1: TRACKED COINS SELECTION                            */}
          {/* ========================================================= */}
          {activeTab === 'coins' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Tracking Mode Toggle */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      Alert Tracking Scope
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose whether alerts trigger across all Binance coins or only your chosen coins
                    </p>
                  </div>

                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          trackingMode: 'all',
                          monitorAllCoins: true,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        localRules.trackingMode === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All Binance Coins (740+)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          trackingMode: 'specific',
                          monitorAllCoins: false,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        localRules.trackingMode === 'specific'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Specific Selected Coins
                    </button>
                  </div>
                </div>

                {localRules.trackingMode === 'specific' ? (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Alerts will <strong>only trigger for your selected coins below</strong>. You can customize whether each coin tracks 5m upward candle trends, volatility spikes, or both!
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
                    <span>
                      Global Mode Active: All 740+ spot pairs and 670+ Alpha tokens are monitored. Your tracked coins list below serves as your priority watchlist.
                    </span>
                  </div>
                )}
              </div>

              {/* Coin Search Autocomplete & Quick Presets */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    Select &amp; Add Binance Coins
                  </label>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      {trackedCount} Selected ({trendTrackedCount} for 5m Trends, {spikeTrackedCount} for Spikes)
                    </span>
                  </div>
                </div>

                {/* Search Bar Input */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder="Search by coin name or symbol (e.g. BTC, SOL, SUI, DOGE, PEPE, ALPHA_...)"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchOpen(false);
                        }}
                        className="absolute right-3 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSearchOpen && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#161f30] border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
                      {isSearchingApi ? (
                        <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          Searching Binance catalog...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((coin) => {
                          const isAlreadyAdded = localRules.trackedCoins.includes(coin.symbol);
                          return (
                            <div
                              key={coin.symbol}
                              className="p-2.5 hover:bg-slate-800/80 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                                  {coin.baseAsset?.slice(0, 3)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-white truncate">
                                      {coin.symbol}
                                    </span>
                                    {coin.isAlpha ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        ALPHA {coin.chainName || 'WEB3'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                        SPOT
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {coin.name || coin.baseAsset} &bull; ${coin.lastPrice?.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <div>
                                {isAlreadyAdded ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCoin(coin.symbol)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all"
                                  >
                                    <Check className="w-3 h-3" /> Tracked
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddCoin(coin.symbol)}
                                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No Binance coin found matching &quot;{searchQuery}&quot;.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1 font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={handleAddTopGiants}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-amber-400" /> Top 10 Giants (BTC, ETH...)
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRisingCoins}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                  >
                    <TrendingUp className="w-3 h-3" /> + Hot 5M Gainers (Green)
                  </button>
                  <button
                    type="button"
                    onClick={handleAddTopSpikeCoins}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                  >
                    <Zap className="w-3 h-3" /> + Top Volatile Scalpers
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultCoins}
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-[11px] flex items-center gap-1 transition-colors ml-auto"
                    title="Reset to default 10 major coins"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  {localRules.trackedCoins.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllCoins}
                      className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[11px] flex items-center gap-1 transition-colors"
                      title="Clear all tracked coins"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Coins List with Per-Coin Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Tracked Coin ({trackedCount})</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> 5M Upward Trend
                    </span>
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Volatility Spike
                    </span>
                  </div>
                </div>

                {localRules.trackedCoins.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-400 space-y-2">
                    <p className="text-xs">No specific coins selected yet.</p>
                    <button
                      type="button"
                      onClick={handleAddTopGiants}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Top 10 Major Coins
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {localRules.trackedCoins.map((symbol) => {
                      const coinData = coinMap.get(symbol);
                      const prefs = localRules.coinPreferences?.[symbol] || {
                        track5mTrend: true,
                        trackSpikes: true,
                      };
                      const isUp = coinData ? coinData.changePct >= 0 : true;

                      return (
                        <div
                          key={symbol}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-2.5 transition-all"
                        >
                          {/* Coin Info */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-amber-400 shrink-0">
                              {symbol.replace('USDT', '').replace('ALPHA_', '').slice(0, 3)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white truncate">{symbol}</span>
                                {coinData?.isAlpha ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    ALPHA
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                    SPOT
                                  </span>
                                )}
                              </div>
                              {coinData && (
                                <div className="flex items-center gap-2 text-[11px] font-mono-nums">
                                  <span className="text-slate-300">
                                    ${coinData.lastPrice?.toLocaleString(undefined, {
                                      maximumFractionDigits: 6,
                                    })}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      isUp ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {isUp ? '+' : ''}
                                    {(coinData.changePct ?? 0).toFixed(2)}% (5m)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Track toggles for this coin */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle 5M Upward Trend */}
                            <button
                              type="button"
                              onClick={() => handleToggleCoinPref(symbol, 'track5mTrend')}
                              title={
                                prefs.track5mTrend
                                  ? 'Tracking 5M candle upward trend (click to mute)'
                                  : '5M upward trend alerts muted for this coin'
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border ${
                                prefs.track5mTrend
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-800/80 text-slate-500 border-slate-700/60 hover:text-slate-400'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3" />
                              <span className="hidden sm:inline">5M Trend</span>
                            </button>

                            {/* Toggle Volatility Spike */}
                            <button
                              type="button"
                              onClick={() => handleToggleCoinPref(symbol, 'trackSpikes')}
                              title={
                                prefs.trackSpikes
                                  ? 'Tracking volatility price spikes (click to mute)'
                                  : 'Volatility spike alerts muted for this coin'
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border ${
                                prefs.trackSpikes
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : 'bg-slate-800/80 text-slate-500 border-slate-700/60 hover:text-slate-400'
                              }`}
                            >
                              <Zap className="w-3 h-3" />
                              <span className="hidden sm:inline">Spikes</span>
                            </button>

                            {/* Remove Coin */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCoin(symbol)}
                              title="Remove from tracked coins"
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: VOLATILITY SPIKE THRESHOLDS                        */}
          {/* ========================================================= */}
          {activeTab === 'spikes' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="text-white font-semibold">
                    Customize Volatility Spike Notifications
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Define the exact price expansion, 5-minute candle range, and volume multipliers that
                    trigger push notifications and audio alerts. You can type any custom percentage below.
                  </p>
                </div>
              </div>

              {/* Spike 5m Gain % and 5m Range % with direct custom numeric inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Spike 5m Gain % Threshold */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      Spike 5M Gain % Threshold
                    </label>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      +{localRules.minSpikeGainPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Minimum price surge required on current 5m candle
                  </p>

                  {/* Direct custom number input with step buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          minSpikeGainPercent: Math.max(
                            0.1,
                            parseFloat((prev.minSpikeGainPercent - 0.1).toFixed(2))
                          ),
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      -0.1%
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50.0"
                        value={localRules.minSpikeGainPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setLocalRules((prev) => ({ ...prev, minSpikeGainPercent: val }));
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          minSpikeGainPercent: parseFloat((prev.minSpikeGainPercent + 0.1).toFixed(2)),
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      +0.1%
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1.0, 1.5, 2.0, 2.5, 3.5, 5.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setLocalRules((prev) => ({ ...prev, minSpikeGainPercent: val }))
                        }
                        className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                          localRules.minSpikeGainPercent === val
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        +{val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. 5M Candle Range % (High - Low) */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-rose-400" />
                      5M Candle Range (High - Low) %
                    </label>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      &ge;{localRules.minSpikeRangePercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Total high-to-low spread of the 5m candle for volatility detection
                  </p>

                  {/* Direct custom number input with step buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          minSpikeRangePercent: Math.max(
                            0.2,
                            parseFloat((prev.minSpikeRangePercent - 0.1).toFixed(2))
                          ),
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      -0.1%
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.2"
                        max="50.0"
                        value={localRules.minSpikeRangePercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setLocalRules((prev) => ({ ...prev, minSpikeRangePercent: val }));
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          minSpikeRangePercent: parseFloat((prev.minSpikeRangePercent + 0.1).toFixed(2)),
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      +0.1%
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1.5, 2.0, 2.5, 3.0, 4.0, 5.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setLocalRules((prev) => ({ ...prev, minSpikeRangePercent: val }))
                        }
                        className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                          localRules.minSpikeRangePercent === val
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        &ge;{val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Volume Multiplier & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Volume Surge Multiplier */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">
                      Volume Surge Multiplier
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {localRules.minVolumeMultiplier}x vs 5m Avg
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Candle volume must be at least this multiple of recent 5m average volume
                  </p>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={localRules.minVolumeMultiplier}
                    onChange={(e) =>
                      setLocalRules((prev) => ({
                        ...prev,
                        minVolumeMultiplier: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    {[1.2, 1.5, 1.8, 2.0, 3.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setLocalRules((prev) => ({ ...prev, minVolumeMultiplier: val }))
                        }
                        className={`flex-1 py-1 rounded text-[11px] font-mono font-bold ${
                          localRules.minVolumeMultiplier === val
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {val}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cooldown per Coin */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    Duplicate Alert Cooldown per Coin
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Suppresses repetitive notifications for the same coin within this window
                  </p>
                  <select
                    value={localRules.cooldownSeconds}
                    onChange={(e) =>
                      setLocalRules((prev) => ({
                        ...prev,
                        cooldownSeconds: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg py-2 px-3 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="30">30 seconds (Aggressive)</option>
                    <option value="60">60 seconds (1 minute)</option>
                    <option value="120">120 seconds (2 minutes - Recommended)</option>
                    <option value="300">300 seconds (5 minutes / 1 full candle)</option>
                    <option value="600">600 seconds (10 minutes)</option>
                  </select>
                </div>
              </div>

              {/* Extra Filters for Scalp Safety */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3.5">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  Scalp Safety &amp; Liquidity Filters
                </h5>

                {/* Exclude Meme Coins */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Exclude Meme Coins
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Suppress alerts for meme tokens (DOGE, SHIB, PEPE, WIF, BONK, etc.)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalRules((prev) => ({
                        ...prev,
                        excludeMemeCoins: prev.excludeMemeCoins !== undefined ? !prev.excludeMemeCoins : false,
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      localRules.excludeMemeCoins !== false ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        localRules.excludeMemeCoins !== false ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Only Uptrend Coins */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Only Uptrend Coins (Long-Only)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Only alert on coins going up. Suppress negative candles since shorting is not used
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalRules((prev) => ({
                        ...prev,
                        onlyUptrendCoins: prev.onlyUptrendCoins !== undefined ? !prev.onlyUptrendCoins : false,
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      localRules.onlyUptrendCoins !== false ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        localRules.onlyUptrendCoins !== false ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Minimum 24h Volume Liquidity Filter */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Minimum 24h Volume Liquidity Threshold
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Filter out low-volume pairs to protect against slippage during execution
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          filterMinVolume: !prev.filterMinVolume,
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                        localRules.filterMinVolume ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          localRules.filterMinVolume ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {localRules.filterMinVolume && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {[500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000].map((vol) => (
                        <button
                          key={vol}
                          type="button"
                          onClick={() =>
                            setLocalRules((prev) => ({ ...prev, minVolumeQuote: vol }))
                          }
                          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                            localRules.minVolumeQuote === vol
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          &gt;${vol >= 1_000_000 ? `${(vol / 1_000_000).toFixed(0)}M` : `${vol / 1000}K`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 5M UPWARD TREND RULES                              */}
          {/* ========================================================= */}
          {activeTab === 'trend5m' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="text-white font-semibold">
                    Customize 5-Minute Candle Upward Trend Criteria
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Set the minimum percentage gain and number of consecutive green candles required
                    to signal a reliable upward trend for scalping.
                  </p>
                </div>
              </div>

              {/* Min 5M Gain % and Consecutive Green */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Min 5M Gain % */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">
                      Min 5M Candle Gain %
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{localRules.min5mGainPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Minimum percentage change required on current 5m candle
                  </p>

                  {/* Number input with fine-tune steppers */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          min5mGainPercent: Math.max(
                            0.05,
                            parseFloat((prev.min5mGainPercent - 0.05).toFixed(2))
                          ),
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      -0.05%
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="20.0"
                        value={localRules.min5mGainPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setLocalRules((prev) => ({ ...prev, min5mGainPercent: val }));
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalRules((prev) => ({
                          ...prev,
                          min5mGainPercent: parseFloat((prev.min5mGainPercent + 0.05).toFixed(2)),
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      +0.05%
                    </button>
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[0.3, 0.5, 0.8, 1.0, 1.5, 2.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setLocalRules((prev) => ({ ...prev, min5mGainPercent: val }))
                        }
                        className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                          localRules.min5mGainPercent === val
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        +{val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consecutive Green 5m Candles */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">
                      Consecutive Green 5M Candles
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {localRules.minConsecutiveGreen} Candle{localRules.minConsecutiveGreen > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Number of consecutive bullish closes required to confirm trend momentum
                  </p>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[1, 2, 3, 4].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setLocalRules((prev) => ({ ...prev, minConsecutiveGreen: val }))
                        }
                        className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                          localRules.minConsecutiveGreen === val
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {val} {val === 1 ? 'Candle' : 'Candles'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* EMA Trend Confirmation Rule */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Require Confirmed EMA Uptrend (EMA9 &gt; EMA21)
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Only alert when current price is above 9-period EMA and 9-EMA is above 21-EMA (avoids bear market traps)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalRules((prev) => ({
                        ...prev,
                        requireEmaUptrend: !prev.requireEmaUptrend,
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      localRules.requireEmaUptrend ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        localRules.requireEmaUptrend ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: PUSH NOTIFICATIONS, AUDIO & TOASTS                 */}
          {/* ========================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Desktop Push */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Browser Desktop Push</span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      permissionStatus === 'granted'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : permissionStatus === 'denied'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {permissionStatus === 'granted' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Enabled
                      </>
                    ) : permissionStatus === 'denied' ? (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Blocked in Browser
                      </>
                    ) : (
                      'Permission Needed'
                    )}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Receive OS-level notifications when volatility spikes or 5m upward trends trigger, even
                  when working in another browser tab.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {permissionStatus !== 'granted' ? (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Grant Push Permission
                    </button>
                  ) : (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localRules.enableBrowserPush}
                        onChange={(e) =>
                          setLocalRules((prev) => ({ ...prev, enableBrowserPush: e.target.checked }))
                        }
                        className="w-4 h-4 text-amber-500 rounded bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                      />
                      <span>Enable active desktop notifications</span>
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {testSent ? 'Sent!' : 'Send Test Notification'}
                  </button>
                </div>
              </div>

              {/* Floating Screen Popups */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-rose-400" />
                      Floating Screen Popups (Toasts)
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Display a non-invasive bottom pill when an alert triggers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalRules((prev) => ({
                        ...prev,
                        enableScreenToasts: !(prev.enableScreenToasts ?? true),
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      (localRules.enableScreenToasts ?? true) ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        (localRules.enableScreenToasts ?? true) ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Audio Chimes */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Synthesized Audio Chimes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalRules((prev) => ({
                        ...prev,
                        enableSoundAlert: !prev.enableSoundAlert,
                      }))
                    }
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                      localRules.enableSoundAlert
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {localRules.enableSoundAlert ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    {localRules.enableSoundAlert ? 'Sound Enabled' : 'Muted'}
                  </button>
                </div>

                {localRules.enableSoundAlert && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Chime Volume</span>
                      <span className="font-mono font-bold text-slate-200">
                        {Math.round(localRules.soundVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={localRules.soundVolume}
                      onChange={(e) =>
                        setLocalRules((prev) => ({
                          ...prev,
                          soundVolume: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded cursor-pointer"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => playBullishChime(localRules.soundVolume)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/20"
                      >
                        <Play className="w-3 h-3" /> Test 5M Trend Chime
                      </button>
                      <button
                        type="button"
                        onClick={() => playSpikeChime(localRules.soundVolume)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-rose-500/20"
                      >
                        <Play className="w-3 h-3" /> Test Spike Chime
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Include Binance Alpha Tokens */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>Include Binance Alpha Web3 Tokens</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      670+ Tokens
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Include DEX tokens listed on Binance Alpha Web3 catalog in alerts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLocalRules((prev) => ({
                      ...prev,
                      includeAlphaCoins: !(prev.includeAlphaCoins ?? true),
                    }))
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                    (localRules.includeAlphaCoins ?? true) ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      (localRules.includeAlphaCoins ?? true) ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#0c1017] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            {localRules.trackingMode === 'specific' ? (
              <span>
                Tracking <strong>{trackedCount} specific coins</strong> ({trendTrackedCount} for 5m trends, {spikeTrackedCount} for spikes)
              </span>
            ) : (
              <span>
                Tracking <strong>all Binance spot pairs + Alpha tokens</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Alert Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
