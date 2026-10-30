import { Home, Flame, Store, LayoutGrid, Sliders } from 'lucide-react';
import { MobileTab } from './MobileBottomNav';

interface TopNavTabsProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  scalpCount?: number;
  alphaCount?: number;
  bullishCount?: number;
  unreadAlertCount?: number;
}

export default function TopNavTabs({
  activeTab,
  onSelectTab,
  scalpCount = 0,
  alphaCount = 0,
  bullishCount = 0,
  unreadAlertCount = 0,
}: TopNavTabsProps) {
  const tabs = [
    {
      id: 'terminal' as MobileTab,
      label: 'Terminal & Chart',
      icon: Home,
      count: null,
    },
    {
      id: 'scalps' as MobileTab,
      label: 'Hot Scalps',
      icon: Flame,
      count: scalpCount > 0 ? scalpCount : null,
      highlight: true,
    },
    {
      id: 'alpha' as MobileTab,
      label: 'Alpha Web3',
      icon: Store,
      count: alphaCount > 0 ? alphaCount : null,
    },
    {
      id: 'scanner' as MobileTab,
      label: 'Market Screener',
      icon: LayoutGrid,
      count: bullishCount > 0 ? bullishCount : null,
    },
    {
      id: 'more' as MobileTab,
      label: 'Alert Rules',
      icon: Sliders,
      count: unreadAlertCount > 0 ? unreadAlertCount : null,
    },
  ];

  return (
    <div className="w-full bg-[#0a0e17] border-b border-slate-800/80 px-4 lg:px-8 py-2 sticky top-[57px] z-20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-slate-950' : tab.highlight ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full leading-tight ${
                      isActive
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span>Click any tab to view page</span>
        </div>
      </div>
    </div>
  );
}
