import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { DetailedScalpEvaluation, SearchResult } from '../types';
import {
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Layers,
  Flame,
  LineChart,
  RefreshCw,
  Plus,
  DollarSign,
  Zap,
  Copy,
  Check,
} from 'lucide-react';

interface CoinScalpEvaluatorProps {
  onSelectCoinForChart?: (symbol: string) => void;
  onSelectSymbol?: (symbol: string) => void;
  selectedSymbol?: string;
  onPinSymbol?: (symbol: string) => void;
  pinnedSymbols?: string[];
  initialSymbol?: string;
}

export default function CoinScalpEvaluator({
  onSelectCoinForChart,
  onSelectSymbol,
  selectedSymbol,
  onPinSymbol,
  pinnedSymbols = [],
  initialSymbol = 'SOLUSDT',
}: CoinScalpEvaluatorProps) {
  const [inputSymbol, setInputSymbol] = useState('');
  const [currentQuery, setCurrentQuery] = useState(selectedSymbol || initialSymbol);
  const [evaluation, setEvaluation] = useState<DetailedScalpEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Real-time Autocomplete Dropdown State
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize when selectedSymbol changes
  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== currentQuery) {
      evaluateCoin(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query for autocomplete suggestions
  useEffect(() => {
    const q = inputSymbol.trim();
    if (!q || q.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/binance/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results)) {
            setSearchResults(data.results);
            setShowSuggestions(data.results.length > 0);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [inputSymbol]);

  // Quick suggestions for easy 1-click test
  const quickSuggestions = ['SOL', 'ETH', 'SUI', 'AVAX', 'NEAR', 'BTC', 'PEPE', 'DOGE'];

  const evaluateCoin = async (coinSymbol: string) => {
    const clean = coinSymbol.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorMsg(null);
    setCurrentQuery(clean);
    setShowSuggestions(false);

    try {
      const res = await fetch(`/api/binance/scalp-evaluate?symbol=${encodeURIComponent(clean)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to evaluate ${clean}. Check symbol name.`);
      }
      const data: DetailedScalpEvaluation = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch coin data. Verify Binance Spot or Alpha symbol name.');
      setEvaluation(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    evaluateCoin(initialSymbol);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      evaluateCoin(inputSymbol.trim());
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (token: SearchResult) => {
    setInputSymbol(token.baseAsset);
    setShowSuggestions(false);
    evaluateCoin(token.canonicalSymbol || token.symbol || token.baseAsset);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const shortenAddress = (addr?: string) => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatPrice = (p?: number) => {
    if (!p || isNaN(p) || p <= 0) return '0.00';
    if (p < 0.0001) return p.toFixed(8);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    if (p < 100) return p.toFixed(3);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVol = (v: number) => {
    if (!v) return '$0';
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div
      className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative"
      id="scalp-opportunity-evaluator"
    >
      {/* Top Accent Strip */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-amber-500" />

      {/* Header & Search Input Box */}
      <div className="p-4 sm:p-6 bg-gradient-to-b from-[#151f30] to-[#111827] border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Scalp Decision Engine
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Long-Only Focus (No Shorting)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Meme Coin Guard Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Instant Scalp Opportunity Evaluator
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Type any coin name to determine if it is suitable for a short-term long scalp. Analyzes EMA 9/21 trend stacks, RSI 14, 5M volume surges, $1M+ liquidity requirements, and meme coin risk.
            </p>
          </div>

          {/* Search Input Form with Live Autocomplete */}
          <div className="relative w-full md:w-80 lg:w-96" ref={dropdownRef}>
            <form onSubmit={handleSubmit}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="scalp-evaluator-coin-input"
                  type="text"
                  placeholder="Search Spot or Alpha (e.g. CAP, SUI, SOL)..."
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value)}
                  onFocus={(e) => {
                    if (searchResults.length > 0) setShowSuggestions(true);
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 150);
                  }}
                  autoComplete="off"
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm font-semibold text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputSymbol.trim()}
                  className="absolute right-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Evaluate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs text-slate-400">
                <span className="text-[11px] font-medium text-slate-500 shrink-0">Quick:</span>
                {quickSuggestions.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => evaluateCoin(sym)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all shrink-0 ${
                      currentQuery.startsWith(sym)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </form>

            {/* Instant Search Suggestions Dropdown */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-800">
                <div className="px-3 py-1.5 bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Coins & Alpha Tokens</span>
                  <span>{searchResults.length} results</span>
                </div>
                {searchResults.map((t) => (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => handleSelectSuggestion(t)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {t.iconUrl ? (
                        <img
                          src={t.iconUrl}
                          alt={t.baseAsset}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full shrink-0 bg-slate-800 object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">
                          {t.baseAsset.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                            {t.baseAsset}
                          </span>
                          {t.isAlpha ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              ALPHA
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              SPOT
                            </span>
                          )}
                          {t.chainName && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300">
                              {t.chainName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate flex items-center gap-2">
                          <span>{t.name}</span>
                          {t.contractAddress && (
                            <span className="font-mono text-[11px] text-slate-500">
                              {shortenAddress(t.contractAddress)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-semibold text-slate-200">
                        ${formatPrice(t.lastPrice || 0)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Vol: {formatVol(t.quoteVolume || 0)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Evaluator Content */}
      <div className="p-4 sm:p-6 space-y-6">
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">
              Running live technical analysis on {currentQuery}...
            </p>
            <p className="text-xs text-slate-500">
              Checking 5m &amp; 15m klines, EMA 9/21, RSI 14, 24h volume &amp; meme flags
            </p>
          </div>
        )}

        {errorMsg && !isLoading && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-200">Unable to Evaluate Symbol</h4>
              <p className="text-xs text-rose-300/90">{errorMsg}</p>
              <p className="text-[11px] text-slate-400">
                Tip: Try typing symbols like <span className="text-white font-mono">SOL</span>,{' '}
                <span className="text-white font-mono">SUI</span>,{' '}
                <span className="text-white font-mono">ETH</span>, or Binance Alpha tokens like{' '}
                <span className="text-white font-mono">ALPHA_447USDT</span>.
              </p>
            </div>
          </div>
        )}

        {evaluation && !isLoading && (
          <div className="space-y-6">
            {/* Top Verdict Card */}
            <div
              className={`p-4 sm:p-6 rounded-2xl border transition-all ${
                evaluation.verdictType === 'strong'
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-emerald-950/30'
                  : evaluation.verdictType === 'moderate'
                  ? 'bg-amber-950/30 border-amber-500/40 shadow-amber-950/30'
                  : 'bg-rose-950/30 border-rose-500/40 shadow-rose-950/30'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Coin Title & Main Verdict */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                      {evaluation.symbol}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">
                      {evaluation.name}
                    </span>
                    {evaluation.isAlpha ? (
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Binance Alpha
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Spot Market
                      </span>
                    )}
                    {evaluation.chainName && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {evaluation.chainName}
                      </span>
                    )}
                    {evaluation.canonicalSymbol && evaluation.canonicalSymbol !== evaluation.symbol && (
                      <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-800 text-slate-400 border border-slate-700">
                        ID: {evaluation.canonicalSymbol}
                      </span>
                    )}
                    {evaluation.contractAddress && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(evaluation.contractAddress!)}
                        className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all"
                        title="Copy Contract Address"
                      >
                        {copiedAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{shortenAddress(evaluation.contractAddress)}</span>
                      </button>
                    )}
                    {evaluation.isMeme ? (
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Meme Coin Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Non-Meme
                      </span>
                    )}
                  </div>

                  {/* Primary Decision Badge */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-3.5 py-1.5 rounded-xl font-black text-sm sm:text-base tracking-wide flex items-center gap-2 shadow-lg ${
                        evaluation.verdictType === 'strong'
                          ? 'bg-emerald-500 text-slate-950'
                          : evaluation.verdictType === 'moderate'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {evaluation.verdictType === 'strong' && <CheckCircle2 className="w-4 h-4" />}
                      {evaluation.verdictType === 'moderate' && <AlertTriangle className="w-4 h-4" />}
                      {evaluation.verdictType === 'avoid' && <XCircle className="w-4 h-4" />}
                      {evaluation.verdict}
                    </span>

                    {/* Long-Only Compatibility Pill */}
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                        evaluation.longCompatibility
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {evaluation.longCompatibility ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Long Scalp: COMPATIBLE (Uptrend Confirmed)</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                          <span>Long Scalp: INCOMPATIBLE (Down Trend - Do Not Long)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl pt-1">
                    {evaluation.summaryNote}
                  </p>
                </div>

                {/* Score & Price Block */}
                <div className="flex items-center sm:items-start lg:items-end justify-between sm:justify-start lg:flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-4 lg:pt-0 lg:pl-6">
                  {/* Scalp Score Meter */}
                  <div className="text-left lg:text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Scalp Opportunity Score
                    </span>
                    <div className="flex items-baseline lg:justify-end gap-1.5">
                      <span
                        className={`text-4xl font-black font-mono tracking-tight ${
                          evaluation.scalpScore >= 75
                            ? 'text-emerald-400'
                            : evaluation.scalpScore >= 50
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {evaluation.scalpScore}
                      </span>
                      <span className="text-sm font-bold text-slate-500">/ 100</span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          evaluation.scalpScore >= 75
                            ? 'bg-emerald-500'
                            : evaluation.scalpScore >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(5, evaluation.scalpScore)}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Price */}
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Current Price
                    </span>
                    <span className="text-xl font-black font-mono text-white">
                      ${formatPrice(evaluation.lastPrice)}
                    </span>
                    <div
                      className={`text-xs font-bold flex items-center justify-end gap-1 ${
                        (evaluation.change5m ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {(evaluation.change5m ?? 0) >= 0 ? '+' : ''}
                      {(evaluation.change5m ?? 0).toFixed(2)}% (5m)
                    </div>
                  </div>
                </div>
              </div>

              {/* Meme Coin Alert Banner if Applicable */}
              {evaluation.isMeme && (
                <div className="mt-4 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-rose-100">MEME COIN WARNING: </span>
                    You requested to exclude meme coins from your trading. {evaluation.symbol} is listed as a meme coin. Meme coins have sudden, violent liquidation wicks and no fundamental support, making systematic short-term scalping high-risk.
                  </div>
                </div>
              )}

              {/* Down Trend Warning Banner if Applicable */}
              {!evaluation.isGoingUp && (
                <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                  <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-amber-100">DOWNTREND ALERT (No Shorting): </span>
                    This coin is currently printing negative 5M candle change or trading below its EMA 21 moving average. Since you are trading long-only without shorting, avoid buying here until a confirmed 5M breakout with consecutive green candles occurs.
                  </div>
                </div>
              )}
            </div>

            {/* Quick Scalp Trade Setup Matrix */}
            <div className="bg-[#162032] border border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Calculated Scalp Trade Setup
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Risk/Reward: <span className="text-emerald-400 font-bold font-mono">{evaluation.riskReward}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Entry Zone */}
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">
                    Entry Level
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white">
                    ${formatPrice(evaluation.suggestedEntry)}
                  </div>
                  <span className="text-[10px] text-slate-400">Current Market / EMA 9 Retest</span>
                </div>

                {/* Target 1 */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                    Scalp Target 1 (+0.8%)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-300">
                    ${formatPrice(evaluation.target1)}
                  </div>
                  <span className="text-[10px] text-emerald-400/80">Quick Profit Lock (50%)</span>
                </div>

                {/* Target 2 */}
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
                  <span className="text-[11px] font-bold text-cyan-400 block mb-1">
                    Scalp Target 2 (+1.8%)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-cyan-300">
                    ${formatPrice(evaluation.target2)}
                  </div>
                  <span className="text-[10px] text-cyan-400/80">Runner Target</span>
                </div>

                {/* Invalidation / Stop Loss */}
                <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-lg">
                  <span className="text-[11px] font-bold text-rose-400 block mb-1">
                    Stop Loss (-0.6%)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-rose-300">
                    ${formatPrice(evaluation.stopLoss)}
                  </div>
                  <span className="text-[10px] text-rose-400/80">Invalidate Below EMA 21</span>
                </div>
              </div>
            </div>

            {/* Technical Indicators In-Depth Grid */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Technical Indicator Analysis
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Indicator 1: 24H Volume & $1M Liquidity Rule */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      24h Quote Volume
                    </span>
                    {evaluation.hasSufficientVolume ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                        &gt; $1M Pass
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300">
                        &lt; $1M Fail
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {formatVol(evaluation.quoteVolume24h)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {evaluation.hasSufficientVolume
                      ? 'High liquidity ensures tight bid-ask spreads and minimal slippage on market scalps.'
                      : 'WARNING: Volume under $1M leads to high slippage and illiquidity during quick exits.'}
                  </p>
                </div>

                {/* Indicator 2: EMA 9 vs EMA 21 Trend Stack */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      EMA 9 / EMA 21 Trend
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        evaluation.isInUptrend
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {evaluation.isInUptrend ? 'Bullish' : 'Bearish/Neutral'}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-white space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">EMA 9:</span>
                      <span className="font-bold">${formatPrice(evaluation.ema9)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">EMA 21:</span>
                      <span className="font-bold">${formatPrice(evaluation.ema21)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {evaluation.emaSignal}
                  </p>
                </div>

                {/* Indicator 3: RSI 14 Momentum */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      RSI (14) Momentum
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        evaluation.rsiZone === 'HEALTHY MOMENTUM'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : evaluation.rsiZone === 'OVERBOUGHT'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {evaluation.rsiZone}
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {evaluation.rsi14 !== undefined ? evaluation.rsi14.toFixed(1) : '50.0'}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {evaluation.rsiZone === 'HEALTHY MOMENTUM'
                      ? 'RSI between 52–68 indicates active buyers without extreme overbought exhaustion.'
                      : evaluation.rsiZone === 'OVERBOUGHT'
                      ? 'RSI > 70 indicates high risk of immediate pullback; wait for a retest.'
                      : 'RSI indicates weak or negative momentum.'}
                  </p>
                </div>

                {/* Indicator 4: 5M Volume Surge (RVOL) & Range */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      5M RVOL &amp; Range
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">
                      {evaluation.consecutiveGreen || 1} Green 5m
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {evaluation.volRatio !== undefined ? evaluation.volRatio.toFixed(1) : '1.0'}x Vol Surge
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    5M Candle Range is {evaluation.range5m !== undefined ? evaluation.range5m.toFixed(2) : '0.00'}%.{' '}
                    {(evaluation.volRatio || 1) >= 1.5
                      ? 'Volume is significantly higher than average.'
                      : 'Standard volume flow.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Pros & Cons Decision Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Positive Factors */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Scalp Strengths (Reasons to Long)</span>
                </div>
                {evaluation.pros.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {evaluation.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No strong bullish scalp triggers detected.</p>
                )}
              </div>

              {/* Negative / Warning Factors */}
              <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Warning Flags &amp; Invalidation Risks</span>
                </div>
                {evaluation.cons.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {evaluation.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No major warning flags detected. Clean setup.</p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const selectFn = onSelectSymbol || onSelectCoinForChart;
                    if (selectFn) selectFn(evaluation.symbol);
                    const chartElem = document.getElementById('chart-section');
                    if (chartElem) chartElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-700 hover:border-slate-600 shadow"
                >
                  <LineChart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open in 5M Interactive Chart</span>
                </button>

                {onPinSymbol && (
                  <button
                    type="button"
                    onClick={() => onPinSymbol(evaluation.symbol)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border ${
                      pinnedSymbols.includes(evaluation.symbol)
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {pinnedSymbols.includes(evaluation.symbol) ? 'Pinned in Watchlist' : 'Pin to Watchlist'}
                    </span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => evaluateCoin(evaluation.symbol)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Analyze Live</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
