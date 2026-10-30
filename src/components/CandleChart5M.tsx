import { useState, useMemo, useRef, useEffect, WheelEvent } from 'react';
import { KlineData } from '../types';
import { getCoinDisplayInfo } from '../utils/coinFormatting';
import {
  TrendingUp,
  Clock,
  RefreshCw,
  Target,
  ExternalLink,
  Search,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface CandleChart5MProps {
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
  onOpenPopout?: () => void;
  isPopoutModal?: boolean;
}

export default function CandleChart5M({
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
  onOpenPopout,
  isPopoutModal = false,
}: CandleChart5MProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showEma, setShowEma] = useState<boolean>(true);
  const [showRsi, setShowRsi] = useState<boolean>(true);
  const [showTargets, setShowTargets] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan State
  // visibleCount: number of candles to render (e.g., from 15 to total klines)
  const defaultVisible = Math.min(klines.length || 50, 50);
  const [visibleCount, setVisibleCount] = useState<number>(defaultVisible);
  const [panOffset, setPanOffset] = useState<number>(0); // 0 = rightmost (latest)

  // Sync visible count when klines change if not custom zoomed
  useEffect(() => {
    if (klines.length > 0 && visibleCount > klines.length) {
      setVisibleCount(klines.length);
    }
  }, [klines.length, visibleCount]);

  const baseAsset = symbol.replace('USDT', '');

  // Calculate metrics
  const latestKline = klines[klines.length - 1];
  const currentGainPct = latestKline ? latestKline.changePercent : 0;
  const currentRangePct = latestKline ? latestKline.rangePercent : 0;
  const isGoingUp = currentGainPct > 0;

  // Scalp targets for the selected coin
  const currentPrice = latestKline ? latestKline.close : 0;

  const isCustomEntrySensible = Boolean(
    customEntry &&
    currentPrice > 0 &&
    Math.abs(customEntry - currentPrice) / currentPrice < 0.08
  );

  const entryPrice = isCustomEntrySensible && customEntry ? customEntry : currentPrice;
  const target1 = isCustomEntrySensible && customTarget1 ? customTarget1 : (currentPrice > 0 ? currentPrice * 1.012 : 0);
  const target2 = isCustomEntrySensible && customTarget2 ? customTarget2 : (currentPrice > 0 ? currentPrice * 1.024 : 0);
  const stopLoss = isCustomEntrySensible && customStopLoss ? customStopLoss : (currentPrice > 0 ? currentPrice * 0.994 : 0);

  // Zoom Window Slice
  const visibleKlines = useMemo(() => {
    if (!klines.length) return [];
    const count = Math.max(12, Math.min(klines.length, visibleCount));
    const maxOffset = Math.max(0, klines.length - count);
    const safeOffset = Math.max(0, Math.min(panOffset, maxOffset));
    const end = klines.length - safeOffset;
    const start = Math.max(0, end - count);
    return klines.slice(start, end);
  }, [klines, visibleCount, panOffset]);

  // Zoom Controls Handlers
  const handleZoomIn = () => {
    setVisibleCount((prev) => Math.max(12, Math.floor(prev * 0.75)));
  };

  const handleZoomOut = () => {
    setVisibleCount((prev) => Math.min(klines.length || 100, Math.ceil(prev * 1.35)));
  };

  const handleResetZoom = () => {
    setVisibleCount(Math.min(klines.length || 50, 50));
    setPanOffset(0);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Chart dimensions & scaling
  const chartHeight = isPopoutModal ? 380 : 270;
  const volumeHeight = isPopoutModal ? 65 : 50;
  const rsiHeight = showRsi ? (isPopoutModal ? 75 : 60) : 0;
  const totalSvgHeight = chartHeight + volumeHeight + rsiHeight + 35;
  const padding = { top: 22, right: 88, bottom: 25, left: 10 };

  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (!visibleKlines.length) return { minPrice: 0, maxPrice: 1, maxVolume: 1 };
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    visibleKlines.forEach((k) => {
      if (k.low < min) min = k.low;
      if (k.high > max) max = k.high;
      if (k.volume > maxVol) maxVol = k.volume;
    });

    if (showTargets && currentPrice > 0) {
      if (target2 > 0 && target2 < max * 1.25) max = Math.max(max, target2);
      if (target1 > 0 && target1 < max * 1.25) max = Math.max(max, target1);
      if (stopLoss > 0 && stopLoss > min * 0.75) min = Math.min(min, stopLoss);
    }

    const priceBuffer = (max - min) * 0.08 || min * 0.01;
    return {
      minPrice: Math.max(0, min - priceBuffer),
      maxPrice: max + priceBuffer,
      maxVolume: maxVol * 1.1 || 1,
    };
  }, [visibleKlines, showTargets, currentPrice, target1, target2, stopLoss]);

  // Scalers
  const getY = (price: number) => {
    if (maxPrice === minPrice) return chartHeight / 2;
    return (
      padding.top +
      ((maxPrice - price) / (maxPrice - minPrice)) * (chartHeight - padding.top)
    );
  };

  const getVolY = (vol: number) => {
    const volTop = chartHeight + 8;
    const volAvailable = volumeHeight - 8;
    return volTop + volAvailable - (vol / maxVolume) * volAvailable;
  };

  const getRsiY = (rsiVal: number) => {
    const rsiTop = chartHeight + volumeHeight + 12;
    const available = rsiHeight - 14;
    const clamped = Math.max(0, Math.min(100, rsiVal));
    return rsiTop + available - (clamped / 100) * available;
  };

  const hoveredKline = hoveredIndex !== null && visibleKlines[hoveredIndex] ? visibleKlines[hoveredIndex] : latestKline;

  const formatPrice = (val?: number) => {
    if (val === undefined || val === null || isNaN(val) || val <= 0) return '0.00';
    if (val < 0.0001) return val.toFixed(8);
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val < 100) return val.toFixed(3);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Build EMA Paths
  const { ema9Path, ema21Path, rsiPath } = useMemo(() => {
    if (!visibleKlines.length) return { ema9Path: '', ema21Path: '', rsiPath: '' };

    const totalCandles = visibleKlines.length;
    const availableWidth = 1000 - padding.left - padding.right;
    const candleSlot = availableWidth / Math.max(totalCandles, 1);

    let e9 = '';
    let e21 = '';
    let rsi = '';

    visibleKlines.forEach((k, idx) => {
      const x = padding.left + idx * candleSlot + candleSlot / 2;

      if (k.ema9 !== undefined) {
        const y9 = getY(k.ema9);
        e9 += e9 === '' ? `M ${x} ${y9}` : ` L ${x} ${y9}`;
      }

      if (k.ema21 !== undefined) {
        const y21 = getY(k.ema21);
        e21 += e21 === '' ? `M ${x} ${y21}` : ` L ${x} ${y21}`;
      }

      if (k.rsi !== undefined) {
        const yrsi = getRsiY(k.rsi);
        rsi += rsi === '' ? `M ${x} ${yrsi}` : ` L ${x} ${yrsi}`;
      }
    });

    return { ema9Path: e9, ema21Path: e21, rsiPath: rsi };
  }, [visibleKlines, minPrice, maxPrice, showRsi]);

  const latestRsi = latestKline && latestKline.rsi !== undefined ? latestKline.rsi : null;
  const latestEma9 = latestKline && latestKline.ema9 !== undefined ? latestKline.ema9 : null;
  const latestEma21 = latestKline && latestKline.ema21 !== undefined ? latestKline.ema21 : null;

  // Geometry for Targets
  const totalCandles = visibleKlines.length;
  const availableWidth = 1000 - padding.left - padding.right;
  const candleSlot = availableWidth / Math.max(totalCandles, 1);
  const projectionCandleCount = Math.min(10, Math.max(4, Math.floor(totalCandles * 0.28)));
  const endX = 1000 - padding.right;
  const startX = Math.max(padding.left + 50, endX - candleSlot * projectionCandleCount);

  const rawTp2Y = target2 > 0 ? getY(target2) : 0;
  const rawTp1Y = target1 > 0 ? getY(target1) : 0;
  const rawEntryY = entryPrice > 0 ? getY(entryPrice) : 0;
  const rawSlY = stopLoss > 0 ? getY(stopLoss) : 0;

  const coinDisplay = getCoinDisplayInfo({
    symbol,
    name: coinName,
    baseAsset,
    isAlpha,
    chainName,
  });

  return (
    <div
      className={`bg-[#0e1422] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col ${
        isPopoutModal ? 'h-full border-none rounded-none bg-[#090d16]' : ''
      }`}
      id="candle-chart-container"
    >
      {/* Chart Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#0d131f]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
            {coinDisplay.avatarText}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-tight">{coinDisplay.primaryTitle}</h2>
              <span className="text-xs font-mono text-slate-400">{coinDisplay.secondaryTicker}</span>
              {isAlpha ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ALPHA {chainName ? `· ${chainName}` : ''}
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  SPOT
                </span>
              )}
              {isGoingUp && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Bullish
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{isAlpha ? `Binance Alpha Web3 · ${chainName || 'Token'}` : 'Binance Spot USDT Market'}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                Latest: {latestKline ? formatTime(latestKline.openTime) : '--'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls & Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          {latestKline && (
            <div className="flex items-center gap-2.5 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono-nums">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Price</span>
                <span className="font-extrabold text-white">${formatPrice(latestKline.close)}</span>
              </div>
              <div className="h-5 w-[1px] bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">5M Change</span>
                <span className={`font-bold ${currentGainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currentGainPct >= 0 ? '+' : ''}
                  {currentGainPct.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Quick Switch Coin */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Search and switch coin (Press /)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Search</span>
            </button>
          )}

          {/* Pop-Out / Fullscreen Button */}
          {onOpenPopout && (
            <button
              type="button"
              onClick={onOpenPopout}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title={isPopoutModal ? 'Close Pop-Out Chart' : 'Open in Separate Pop-Out Window'}
            >
              {isPopoutModal ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isPopoutModal ? 'Exit Fullscreen' : 'Pop Out'}</span>
            </button>
          )}

          {/* Direct Binance Links */}
          <div className="flex items-center gap-1">
            <a
              href={`https://www.binance.com/en/trade/${baseAsset}_USDT?type=spot`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-800 transition-colors"
              title="Open Binance Spot market"
            >
              <span>Spot</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>

          {/* Indicators & Targets Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setShowTargets(!showTargets)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                showTargets ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>Targets</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                showEma ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              EMA
            </button>
            <button
              type="button"
              onClick={() => setShowRsi(!showRsi)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                showRsi ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              RSI
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh 5m Kline"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Target Level Strip & Zoom Control Strip */}
      <div className="px-4 py-2 bg-[#0a0f1a] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Scalp Targets Overview */}
        <div className="flex items-center gap-4 text-slate-300 font-mono">
          <span className="text-slate-500">Entry: <strong className="text-slate-200">${formatPrice(entryPrice)}</strong></span>
          <span className="text-emerald-400">TP1 (+1.2%): <strong>${formatPrice(target1)}</strong></span>
          <span className="text-emerald-300">TP2 (+2.4%): <strong>${formatPrice(target2)}</strong></span>
          <span className="text-rose-400">SL (-0.6%): <strong>${formatPrice(stopLoss)}</strong></span>
        </div>

        {/* Zoom & Inspection Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-mono">
            Zoom ({visibleKlines.length} candles):
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
            title="Zoom In (Fewer candles, larger detail)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
            title="Zoom Out (More candles, wider view)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-mono cursor-pointer"
            title="Reset to default 50 candles"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Hover Inspection Line */}
      {hoveredKline && (
        <div className="px-4 py-1.5 bg-[#090d16] border-b border-slate-800/60 text-xs font-mono-nums flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
          <span className="text-slate-400">
            Time: <strong className="text-white font-semibold">{formatTime(hoveredKline.openTime)}</strong>
          </span>
          <span>Open: <strong className="text-slate-200">${formatPrice(hoveredKline.open)}</strong></span>
          <span>High: <strong className="text-emerald-400">${formatPrice(hoveredKline.high)}</strong></span>
          <span>Low: <strong className="text-rose-400">${formatPrice(hoveredKline.low)}</strong></span>
          <span>Close: <strong className="text-slate-200">${formatPrice(hoveredKline.close)}</strong></span>
          <span>
            Change:{' '}
            <strong className={(hoveredKline.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {(hoveredKline.changePercent ?? 0) >= 0 ? '+' : ''}
              {(hoveredKline.changePercent ?? 0).toFixed(2)}%
            </strong>
          </span>
          {hoveredKline.rsi !== undefined && (
            <span>RSI: <strong className="text-cyan-400">{hoveredKline.rsi.toFixed(1)}</strong></span>
          )}
        </div>
      )}

      {/* Candlestick SVG Canvas with Zoom & Wheel Support */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="relative w-full p-2 select-none overflow-x-hidden flex-1"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {isLoading && klines.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span>Streaming 5m Binance candles...</span>
          </div>
        ) : klines.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center text-slate-500">
            No 5m candle data available for this coin.
          </div>
        ) : (
          <div className="w-full">
            <svg
              viewBox={`0 0 1000 ${totalSvgHeight}`}
              className="w-full h-[360px] sm:h-[400px] overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="volGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="volRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Price Scale Vertical Border */}
              <line
                x1={1000 - padding.right}
                y1={padding.top}
                x2={1000 - padding.right}
                y2={chartHeight}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Price Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const price = minPrice + (maxPrice - minPrice) * ratio;
                const y = getY(price);
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={1000 - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={1000 - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="9"
                      className="font-mono-nums"
                    >
                      ${formatPrice(price)}
                    </text>
                  </g>
                );
              })}

              {/* Dividers for Volume & RSI */}
              <line
                x1={padding.left}
                y1={chartHeight}
                x2={1000 - padding.right}
                y2={chartHeight}
                stroke="#334155"
                strokeWidth="1"
              />

              {showRsi && (
                <>
                  <line
                    x1={padding.left}
                    y1={chartHeight + volumeHeight + 5}
                    x2={1000 - padding.right}
                    y2={chartHeight + volumeHeight + 5}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <line
                    x1={padding.left}
                    y1={getRsiY(70)}
                    x2={1000 - padding.right}
                    y2={getRsiY(70)}
                    stroke="#ef4444"
                    strokeDasharray="2 2"
                    strokeOpacity="0.4"
                    strokeWidth="1"
                  />
                  <line
                    x1={padding.left}
                    y1={getRsiY(30)}
                    x2={1000 - padding.right}
                    y2={getRsiY(30)}
                    stroke="#10b981"
                    strokeDasharray="2 2"
                    strokeOpacity="0.4"
                    strokeWidth="1"
                  />
                  <text x={1000 - padding.right + 5} y={getRsiY(70) + 3} fill="#ef4444" fontSize="8">
                    70 OB
                  </text>
                  <text x={1000 - padding.right + 5} y={getRsiY(30) + 3} fill="#10b981" fontSize="8">
                    30 OS
                  </text>
                </>
              )}

              {/* Candles & Volume Bars */}
              {visibleKlines.map((kline, idx) => {
                const candleWidth = Math.max(2, Math.min(22, candleSlot * 0.72));
                const centerX = padding.left + idx * candleSlot + candleSlot / 2;
                const openY = getY(kline.open);
                const closeY = getY(kline.close);
                const highY = getY(kline.high);
                const lowY = getY(kline.low);

                const isBull = kline.close >= kline.open;
                const bodyY = Math.min(openY, closeY);
                const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
                const color = isBull ? '#10b981' : '#ef4444';

                const volTop = getVolY(kline.volume);
                const volH = Math.max(1, chartHeight + volumeHeight - volTop);

                const isHovered = hoveredIndex === idx;
                const isCurrent = idx === totalCandles - 1 && panOffset === 0;

                return (
                  <g
                    key={kline.openTime}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredIndex(idx)}
                  >
                    {isHovered && (
                      <rect
                        x={centerX - candleSlot / 2}
                        y={padding.top}
                        width={candleSlot}
                        height={totalSvgHeight - padding.top - padding.bottom}
                        fill="#38bdf8"
                        fillOpacity="0.08"
                      />
                    )}

                    <rect
                      x={centerX - candleWidth / 2}
                      y={volTop}
                      width={candleWidth}
                      height={volH}
                      fill={isBull ? 'url(#volGreen)' : 'url(#volRed)'}
                      opacity={isHovered ? 1 : 0.7}
                    />

                    <line
                      x1={centerX}
                      y1={highY}
                      x2={centerX}
                      y2={lowY}
                      stroke={color}
                      strokeWidth={isCurrent || isHovered ? 1.8 : 1.2}
                    />

                    <rect
                      x={centerX - candleWidth / 2}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                      rx="1"
                    />

                    {isCurrent && (
                      <circle
                        cx={centerX}
                        cy={closeY}
                        r="3.5"
                        fill="#38bdf8"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className="animate-ping"
                      />
                    )}

                    {(idx % Math.max(4, Math.floor(totalCandles / 7)) === 0 || isCurrent) && (
                      <text
                        x={centerX}
                        y={totalSvgHeight - 8}
                        textAnchor="middle"
                        fill={isCurrent ? '#38bdf8' : '#64748b'}
                        fontSize="9"
                        fontWeight={isCurrent ? 'bold' : 'normal'}
                        className="font-mono-nums"
                      >
                        {formatTime(kline.openTime)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Indicator Lines: EMA 9 & EMA 21 */}
              {showEma && ema9Path && (
                <path d={ema9Path} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
              )}
              {showEma && ema21Path && (
                <path d={ema21Path} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
              )}

              {/* Indicator Line: RSI 14 */}
              {showRsi && rsiPath && (
                <path d={rsiPath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
              )}

              {/* Scalp Targets Overlay Lines */}
              {showTargets && currentPrice > 0 && (
                <g className="targets-overlay pointer-events-none">
                  {rawEntryY > 0 && (
                    <>
                      {rawTp1Y > 0 && (
                        <rect
                          x={startX}
                          y={Math.min(rawTp1Y, rawEntryY)}
                          width={endX - startX}
                          height={Math.max(2, Math.abs(rawEntryY - rawTp1Y))}
                          fill="#10b981"
                          fillOpacity="0.08"
                          rx="3"
                        />
                      )}
                      {rawSlY > 0 && (
                        <rect
                          x={startX}
                          y={Math.min(rawEntryY, rawSlY)}
                          width={endX - startX}
                          height={Math.max(2, Math.abs(rawSlY - rawEntryY))}
                          fill="#f43f5e"
                          fillOpacity="0.08"
                          rx="3"
                        />
                      )}
                    </>
                  )}

                  {/* Target 1 Line */}
                  {target1 > 0 && (
                    <g>
                      <line x1={startX} y1={rawTp1Y} x2={endX} y2={rawTp1Y} stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x={endX - 6} y={rawTp1Y - 4} textAnchor="end" fill="#34d399" fontSize="9" fontWeight="bold">
                        TP1 +1.2% (${formatPrice(target1)})
                      </text>
                    </g>
                  )}

                  {/* Target 2 Line */}
                  {target2 > 0 && (
                    <g>
                      <line x1={startX} y1={rawTp2Y} x2={endX} y2={rawTp2Y} stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x={endX - 6} y={rawTp2Y - 4} textAnchor="end" fill="#6ee7b7" fontSize="9" fontWeight="bold">
                        TP2 +2.4% (${formatPrice(target2)})
                      </text>
                    </g>
                  )}

                  {/* Stop Loss Line */}
                  {stopLoss > 0 && (
                    <g>
                      <line x1={startX} y1={rawSlY} x2={endX} y2={rawSlY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x={endX - 6} y={rawSlY + 12} textAnchor="end" fill="#fb7185" fontSize="9" fontWeight="bold">
                        SL -0.6% (${formatPrice(stopLoss)})
                      </text>
                    </g>
                  )}
                </g>
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="px-4 py-2 bg-[#090d16] border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Bullish 5M</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>Bearish 5M</span>
          </span>
          {showEma && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              <span>EMA 9 / 21</span>
            </span>
          )}
          {showRsi && (
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" />
              <span>RSI 14</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Scroll mouse wheel to zoom in/out</span>
        </div>
      </div>
    </div>
  );
}
