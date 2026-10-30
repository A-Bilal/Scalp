import React from 'react';
import { Home, Flame, Store, LayoutGrid, Sliders } from 'lucide-react';
import { CoinCategoryKey } from './CategoryCoinsModal';

export type MobileTab = 'terminal' | 'scalps' | 'alpha' | 'scanner' | 'more';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onOpenCategoryCoins?: (cat: CoinCategoryKey) => void;
  onOpenSettings?: () => void;
  scalpCount?: number;
  alphaCount?: number;
  bullishCount?: number;
}

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  scalpCount = 0,
  alphaCount = 0,
  bullishCount = 0,
}: MobileBottomNavProps) {
  const handleTabClick = (tab: MobileTab) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.7)] px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      aria-label="Enterprise Navigation"
      id="mobile-bottom-navigation"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
        {/* 1. Terminal / Home */}
        <button
          type="button"
          onClick={() => handleTabClick('terminal')}
          className={`flex flex-col items-center justify-center py-1 px-1 transition-all rounded-lg select-none min-h-[44px] cursor-pointer ${
            activeTab === 'terminal'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'terminal' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </button>

        {/* 2. Hot Scalps (Flame) */}
        <button
          type="button"
          onClick={() => handleTabClick('scalps')}
          className={`flex flex-col items-center justify-center py-1 px-1 transition-all rounded-lg select-none min-h-[44px] relative cursor-pointer ${
            activeTab === 'scalps'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Flame className={`w-5 h-5 ${activeTab === 'scalps' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
            {scalpCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 font-mono text-[9px] font-bold bg-rose-500 text-white rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                {scalpCount > 9 ? '9+' : scalpCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Scalps</span>
        </button>

        {/* 3. Alpha Tokens (Store) */}
        <button
          type="button"
          onClick={() => handleTabClick('alpha')}
          className={`flex flex-col items-center justify-center py-1 px-1 transition-all rounded-lg select-none min-h-[44px] relative cursor-pointer ${
            activeTab === 'alpha'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Store className={`w-5 h-5 ${activeTab === 'alpha' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
            {alphaCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 font-mono text-[9px] font-bold bg-amber-500 text-slate-950 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                {alphaCount > 99 ? '99+' : alphaCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Alpha</span>
        </button>

        {/* 4. Screener / Scanner (LayoutGrid) */}
        <button
          type="button"
          onClick={() => handleTabClick('scanner')}
          className={`flex flex-col items-center justify-center py-1 px-1 transition-all rounded-lg select-none min-h-[44px] relative cursor-pointer ${
            activeTab === 'scanner'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <LayoutGrid className={`w-5 h-5 ${activeTab === 'scanner' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
            {bullishCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 font-mono text-[9px] font-bold bg-emerald-500 text-slate-950 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                {bullishCount > 99 ? '99+' : bullishCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Scanner</span>
        </button>

        {/* 5. More / Setup (Sliders) */}
        <button
          type="button"
          onClick={() => handleTabClick('more')}
          className={`flex flex-col items-center justify-center py-1 px-1 transition-all rounded-lg select-none min-h-[44px] cursor-pointer ${
            activeTab === 'more'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className={`w-5 h-5 ${activeTab === 'more' ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
}
