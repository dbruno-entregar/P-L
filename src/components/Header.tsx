import React from 'react';
import { currency } from '../utils/formatters';
import { Settings } from '../types';
import { ShieldCheck, Shield, RotateCcw, Sparkles, Sliders } from 'lucide-react';

interface HeaderProps {
  settings: Settings;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onReset: () => void;
  onLoadSampleData: () => void;
  hasData: boolean;
  isLoadingCloud?: boolean;
  onOpenEditSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  isAdmin,
  onToggleAdmin,
  onReset,
  onLoadSampleData,
  hasData,
  isLoadingCloud = false,
  onOpenEditSettings,
}) => {
  return (
    <header className="h-auto md:h-[76px] px-[4.5vw] py-3 md:py-0 flex flex-wrap items-center justify-between gap-4 bg-white border-b border-[#E5E7EB]">
      <div className="flex items-center gap-3">
        <span className="brand-mark">P</span>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-[15px] tracking-[0.05em] font-medium text-[#4B5563] whitespace-nowrap">
            PROFIT <strong className="text-[#1A1A1A] font-extrabold">& LOSS</strong>
          </span>
          <small className="mono text-[9px] text-[#6B7280] tracking-[0.09em] font-semibold uppercase">
            FLOTA AMBA
          </small>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 ml-auto mr-4 cursor-pointer group" onClick={onOpenEditSettings} title="Clic para editar parámetros de costos">
        <div className="flex flex-col gap-0.5 group-hover:text-[#2563EB] transition-colors">
          <span className="text-[11px] text-[#6B7280] font-medium group-hover:text-[#2563EB]">Canon Hiace</span>
          <strong className="mono text-[12px] text-[#1A1A1A] group-hover:text-[#2563EB] font-semibold">
            {currency(settings.lease)}
          </strong>
        </div>
        <div className="flex flex-col gap-0.5 group-hover:text-[#2563EB] transition-colors">
          <span className="text-[11px] text-[#6B7280] font-medium group-hover:text-[#2563EB]">Diesel</span>
          <strong className="mono text-[12px] text-[#1A1A1A] group-hover:text-[#2563EB] font-semibold">
            {currency(settings.diesel)}/L
          </strong>
        </div>
        {isAdmin && (
          <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
            Editar
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 ml-auto md:ml-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-lg text-[11px] font-semibold shadow-2xs" title="Datos sincronizados automáticamente con Supabase">
          <span className={`w-2 h-2 rounded-full ${isLoadingCloud ? 'bg-[#F59E0B] animate-ping' : 'bg-[#10B981]'}`}></span>
          <span className="hidden sm:inline">{isLoadingCloud ? 'Sincronizando...' : 'Nube Automática'}</span>
        </div>

        <span className="scope-pill">AMBA · Hiace Leasing</span>

        {!hasData && (
          <button
            onClick={onLoadSampleData}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] font-semibold text-[12px] rounded-lg border border-[#BFDBFE] transition-colors cursor-pointer shadow-xs"
            title="Cargar datos reales de ejemplo para visualizar inmediatamente"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cargar demo</span>
          </button>
        )}

        <button
          onClick={onToggleAdmin}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer shadow-xs ${
            isAdmin
              ? 'bg-[#1A1A1A] text-white border border-[#1A1A1A]'
              : 'bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] border border-[#E5E7EB]'
          }`}
          title={isAdmin ? 'Modo Administrador activo' : 'Habilitar modo administrador'}
        >
          {isAdmin ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Admin On</span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Administrar</span>
            </>
          )}
        </button>

        {isAdmin && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] font-semibold text-[12px] rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
            title="Restablecer todos los datos a cero"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>
        )}
      </div>
    </header>
  );
};
