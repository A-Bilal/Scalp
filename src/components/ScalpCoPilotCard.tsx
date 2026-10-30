import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { DetailedScalpEvaluation, SearchResult } from '../types';
import {
  Search,
  Target,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Calculator,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  BookmarkCheck,
} from 'lucide-react';

interface ScalpCoPilotCardProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  evaluation: DetailedScalpEvaluation | null;
  isLoading: boolean;
  onRefresh: () => void;
  onToggleTrackedCoin?: (symbol: string) => void;
  isCoinTracked?: boolean;
}

export default function ScalpCoPilotCard({
  symbol,
  onSelectSymbol,
  evaluation,
  isLoading,
  onRefresh,
  onToggleTrackedCoin,
  isCoinTracked = false,
}: ScalpCoPilotCardProps) {
  const [inputSymbol, setInputSymbol] = useState('');
  const [copiedBracket, setCopiedBracket] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Simple Trade Size Calculator (Defaults: $500 balance, $10 risk)
  const [accountSize, setAccountSize] = useState<number>(() => {
    const saved = localStorage.getItem('scalp_account_size');
    return saved ? parseFloat(saved) || 500 : 500;
  });
  const [riskPercent, setRiskPercent] = useState<number>(() => {
    const saved = localStorage.getItem('scalp_risk_percent');
    return saved ? parseFloat(saved) || 2 : 2;
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('scalp_account_size', accountSize.toString());
  }, [accountSize]);

  useEffect(() => {
    localStorage.setItem('scalp_risk_percent', riskPercent.toString());
  }, [riskPercent]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search autocomplete
  useEffect(() => {
    const q = inputSymbol.trim();
    if (!q) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/binance/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results)) {
            setSearchResults(data.results.slice(0, 6));
            setShowSuggestions(data.results.length > 0);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 150);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [inputSymbol]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      onSelectSymbol(inputSymbol.trim());
      setShowSuggestions(false);
      setInputSymbol('');
    }
  };

  const handleSelectSuggestion = (token: SearchResult) => {
    onSelectSymbol(token.canonicalSymbol || token.symbol || token.baseAsset);
    setShowSuggestions(false);
    setInputSymbol('');
  };

  const baseAsset = evaluation
    ? evaluation.baseAsset
    : symbol.replace(/^ALPHA_/, '').replace(/USDT$/, '');

  const formatPrice = (p?: number) => {
    if (!p || isNaN(p) || p <= 0) return '0.00';
    if (p < 0.0001) return p.toFixed(8);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    if (p < 100) return p.toFixed(3);
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Prices
  const entryPrice = evaluation?.suggestedEntry || evaluation?.lastPrice || 0;
  const tp1 = evaluation?.target1 || (entryPrice > 0 ? entryPrice * 1.012 : 0);
  const tp2 = evaluation?.target2 || (entryPrice > 0 ? entryPrice * 1.024 : 0);
  const sl = evaluation?.stopLoss || (entryPrice > 0 ? entryPrice * 0.994 : 0);

  // Position sizing in plain dollars
  const dollarRisk = (accountSize * riskPercent) / 100;
  const slDistancePercent = entryPrice > 0 ? Math.abs((entryPrice - sl) / entryPrice) * 100 : 0.6;
  const positionSizeUsdt =
    slDistancePercent > 0 ? (dollarRisk / (slDistancePercent / 100)) : dollarRisk * 10;
  const estimatedProfit = (tp1 - entryPrice) > 0 ? ((tp1 - entryPrice) / entryPrice) * positionSizeUsdt : dollarRisk * 2;

  const handleCopyPlan = () => {
    const text = `🎯 ${symbol} Scalp Plan:
• Entry: $${formatPrice(entryPrice)}
• Take Profit: $${formatPrice(tp1)} (+1.2%)
• Stop Loss: $${formatPrice(sl)} (-0.6%)
• Suggested Position Size: $${positionSizeUsdt.toFixed(0)}`;

    navigator.clipboard.writeText(text);
    setCopiedBracket(true);
    setTimeout(() => setCopiedBracket(false), 2000);
  };

  const isBuyFriendly = evaluation ? evaluation.verdictType === 'strong' || evaluation.longCompatibility : true;

  return (
    <div className="bg-[#0e1422] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full" id="scalp-copilot-desk">
      {/* Header Bar */}
      <div className="p-3.5 bg-[#0d131f] border-b border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Scalp Plan &amp; Trade Helper</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic entry, profit target, and stop loss for {baseAsset}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleTrackedCoin && (
            <button
              type="button"
              onClick={() => onToggleTrackedCoin(symbol)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                isCoinTracked
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={isCoinTracked ? 'Saved in Watchlist' : 'Add to Watchlist'}
            >
              {isCoinTracked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title="Refresh setup"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Search Coin input */}
      <div className="p-3 border-b border-slate-800/80 bg-[#0a0f1a] relative" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Switch to another coin (e.g. SOL, DOGE)..."
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSuggestions(true);
            }}
            className="w-full pl-8 pr-16 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!inputSymbol.trim()}
            className="absolute right-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded transition-all cursor-pointer"
          >
            Go
          </button>
        </form>

        {/* Search Results Dropdown */}
        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-[#0c121e] border border-slate-700 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
            {searchResults.map((t) => (
              <button
                key={t.symbol}
                type="button"
                onClick={() => handleSelectSuggestion(t)}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{t.baseAsset}</span>
                  <span className="text-[11px] text-slate-400">{t.name}</span>
                </div>
                <span className="text-slate-300 font-mono">${formatPrice(t.lastPrice || 0)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Simple Verdict: Can I scalp this coin right now? */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">Momentum Status:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                isBuyFriendly
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isBuyFriendly ? 'Bullish (Good for Quick Scalp)' : 'Caution (Pullback / Resistance)'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {evaluation?.summaryNote || `Short-term 5-minute setup ready. Buy near entry and aim for +1.2% profit.`}
          </p>
        </div>

        {/* Clear Three-Level Trade Plan (Entry, Take Profit, Stop Loss) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              3-Step Trade Levels
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              Reward / Risk: 2 to 1
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* 1. Entry */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                1. Buy Near
              </span>
              <span className="text-sm font-black text-white font-mono block">
                ${formatPrice(entryPrice)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Current price</span>
            </div>

            {/* 2. Take Profit */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[10px] uppercase text-emerald-400 font-bold block mb-1">
                2. Take Profit
              </span>
              <span className="text-sm font-black text-emerald-400 font-mono block">
                ${formatPrice(tp1)}
              </span>
              <span className="text-[10px] text-emerald-300/80 block mt-0.5">+1.2% Gain</span>
            </div>

            {/* 3. Stop Loss */}
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
              <span className="text-[10px] uppercase text-rose-400 font-bold block mb-1">
                3. Stop Loss
              </span>
              <span className="text-sm font-black text-rose-400 font-mono block">
                ${formatPrice(sl)}
              </span>
              <span className="text-[10px] text-rose-300/80 block mt-0.5">-0.6% Limit</span>
            </div>
          </div>
        </div>

        {/* Position Size Calculator (Collapsible / Simple) */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full p-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>How much should I buy? (Calculator)</span>
            </div>
            {showCalculator ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showCalculator && (
            <div className="p-3 pt-0 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Trading Balance ($)</label>
                  <input
                    type="number"
                    min="10"
                    step="50"
                    value={accountSize}
                    onChange={(e) => setAccountSize(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Max Risk per Trade</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setRiskPercent(pct)}
                        className={`flex-1 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                          riskPercent === pct
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Simple Result */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Recommended Order:</span>
                  <span className="text-sm font-black text-white font-mono">
                    ${(positionSizeUsdt || 0).toFixed(0)} USDT
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Est. Profit at TP:</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    +${estimatedProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Execution Actions */}
        <div className="space-y-2 pt-1">
          <a
            href={`https://www.binance.com/en/trade/${baseAsset}_USDT?type=spot`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <span>Trade {baseAsset} on Binance</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleCopyPlan}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedBracket ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Trade Plan Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Trade Plan (Entry, TP, SL)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
