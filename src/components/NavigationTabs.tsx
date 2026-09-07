import React from 'react';

export type TabType = 'dashboard' | 'fleet' | 'services' | 'trips' | 'costs';

interface NavigationTabsProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unitsCount: number;
  tripsCount: number;
  servicesCount?: number;
  isAdmin: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentTab,
  onSelectTab,
  unitsCount,
  tripsCount,
  servicesCount,
  isAdmin,
}) => {
  return (
    <nav className="px-[4.5vw] bg-white flex gap-6 border-b border-[#E5E7EB] overflow-x-auto whitespace-nowrap" aria-label="Navegación principal">
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`py-4 border-b-2 font-semibold text-[13px] transition-all cursor-pointer ${
          currentTab === 'dashboard'
            ? 'text-[#2563EB] border-[#2563EB]'
            : 'text-[#6B7280] hover:text-[#1A1A1A] border-transparent'
        }`}
      >
        Tablero Directorio
      </button>

      <button
        onClick={() => onSelectTab('fleet')}
        className={`py-4 border-b-2 font-semibold text-[13px] transition-all flex items-center gap-1.5 cursor-pointer ${
          currentTab === 'fleet'
            ? 'text-[#2563EB] border-[#2563EB]'
            : 'text-[#6B7280] hover:text-[#1A1A1A] border-transparent'
        }`}
      >
        <span>Flota P&L</span>
        {unitsCount > 0 && (
          <span className="mono text-[11px] text-[#2563EB] font-bold bg-[#EFF6FF] px-1.5 py-0.5 rounded">
            {unitsCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectTab('services')}
        className={`py-4 border-b-2 font-semibold text-[13px] transition-all flex items-center gap-1.5 cursor-pointer ${
          currentTab === 'services'
            ? 'text-[#2563EB] border-[#2563EB]'
            : 'text-[#6B7280] hover:text-[#1A1A1A] border-transparent'
        }`}
      >
        <span>Por Servicio</span>
        {servicesCount !== undefined && servicesCount > 0 && (
          <span className="mono text-[11px] text-[#2563EB] font-bold bg-[#EFF6FF] px-1.5 py-0.5 rounded">
            {servicesCount}
          </span>
        )}
      </button>

      {(isAdmin || tripsCount > 0) && (
        <button
          onClick={() => onSelectTab('trips')}
          className={`py-4 border-b-2 font-semibold text-[13px] transition-all flex items-center gap-1.5 cursor-pointer ${
            currentTab === 'trips'
              ? 'text-[#2563EB] border-[#2563EB]'
              : 'text-[#6B7280] hover:text-[#1A1A1A] border-transparent'
          }`}
        >
          <span>Fletes / Viajes</span>
          {tripsCount > 0 && (
            <span className="mono text-[11px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
              {tripsCount}
            </span>
          )}
        </button>
      )}

      {isAdmin && (
        <button
          onClick={() => onSelectTab('costs')}
          className={`py-4 border-b-2 font-semibold text-[13px] transition-all cursor-pointer ${
            currentTab === 'costs'
              ? 'text-[#2563EB] border-[#2563EB]'
              : 'text-[#6B7280] hover:text-[#1A1A1A] border-transparent'
          }`}
        >
          Tarifas & Costos
        </button>
      )}
    </nav>
  );
};
