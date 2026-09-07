import React from 'react';
import { currency } from '../utils/formatters';
import { Settings } from '../types';
import { ShieldCheck, Shield, RotateCcw, Sparkles } from 'lucide-react';

interface HeaderProps {
  settings: Settings;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onReset: () => void;
  onLoadSampleData: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  isAdmin,
  onToggleAdmin,
  onReset,
  onLoadSampleData,
  hasData,
}) => {
  return (
    <header className="h-auto md:h-[76px] px-[4.5vw] py-3 md:py-0 flex flex-wrap items-center justify-between gap-4 bg-white border-b border-[#E5E7EB]">
      <div className="flex items-center gap-3">
        <span className="brand-mark">R</span>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-[15px] tracking-[0.05em] font-medium text-[#4B5563] whitespace-nowrap">
            RUTA <strong className="text-[#1A1A1A] font-extrabold">CLARA</strong>
          </span>
          <small className="mono text-[9px] text-[#6B7280] tracking-[0.09em] font-semibold uppercase">
            P&L DE FLOTA
          </small>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 ml-auto mr-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[#6B7280] font-medium">Canon Hiace</span>
          <strong className="mono text-[12px] text-[#1A1A1A] font-semibold">
            {currency(settings.lease)}
          </strong>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[#6B7280] font-medium">Diesel</span>
          <strong className="mono text-[12px] text-[#1A1A1A] font-semibold">
            {currency(settings.diesel)}/L
          </strong>
        </div>
      </div>

      <div className="flex items-center gap-2.5 ml-auto md:ml-0">
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
