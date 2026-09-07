import React from 'react';
import { UnitPnL, Settings } from '../types';
import { currency, formatDate, formatNumber, getDailyDriverRate } from '../utils/formatters';
import { X, Calendar, Truck, User, DollarSign, Fuel, ShieldCheck, TrendingUp, TrendingDown, Clock, MapPin } from 'lucide-react';

interface UnitDetailModalProps {
  unit: UnitPnL | null;
  settings: Settings;
  onClose: () => void;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({ unit, settings, onClose }) => {
  if (!unit) return null;

  const dailyDriver = getDailyDriverRate(settings);
  const isDeficit = unit.result < 0;
  const coveragePct = Math.round(unit.coverage * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-[14px] sm:text-[16px] font-black px-3 py-1 bg-white text-[#1A1A1A] rounded-lg tracking-wider">
                {unit.patent}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#2563EB]/30 text-[#60A5FA] border border-[#2563EB]/50">
                {unit.type || 'HIACE L2H2'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300">
                {unit.property || 'LEASING'} · {unit.zone || 'AMBA'}
              </span>
            </div>
            <p className="text-[14px] text-gray-300 font-medium">
              Servicio asignado: <strong className="text-white">{unit.service || 'Operación general'}</strong> · Estado: <span className="text-[#10B981] font-semibold">{unit.status || 'Activo'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Dashboard for this Unit */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] bg-[#F8F9FA] space-y-4">
          <div className="flex items-center justify-between">
            <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase">
              DESGLOSE FINANCIERO & P&L DE LA UNIDAD
            </p>
            <span
              className={`mono text-[12px] font-bold px-2.5 py-1 rounded-full ${
                isDeficit
                  ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                  : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
              }`}
            >
              {isDeficit ? 'En Déficit' : 'Superávit'} ({unit.operatingMarginPct.toFixed(1)}% margen)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Facturación */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] font-medium block">Facturación</span>
              <strong className="text-[16px] sm:text-[18px] text-[#1A1A1A] font-bold block mt-0.5 mono">
                {currency(unit.revenue)}
              </strong>
              <small className="text-[11px] text-[#6B7280]">
                {unit.tripCount} {unit.tripCount === 1 ? 'viaje' : 'viajes'} en período
              </small>
            </div>

            {/* Costo Chofer Cooperativa */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] font-medium block">Chofer Cooperativa</span>
              <strong className="text-[16px] sm:text-[18px] text-[#DC2626] font-bold block mt-0.5 mono">
                -{currency(unit.driverCost)}
              </strong>
              <small className="text-[11px] text-[#6B7280]">
                {unit.activeDays} días @ {currency(dailyDriver)}/día
              </small>
            </div>

            {/* Combustible */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] font-medium block">Combustible Est.</span>
              <strong className="text-[16px] sm:text-[18px] text-[#DC2626] font-bold block mt-0.5 mono">
                -{currency(unit.fuelCost)}
              </strong>
              <small className="text-[11px] text-[#6B7280]">
                {unit.kmEstimated} km ({settings.consumption}L/100km)
              </small>
            </div>

            {/* Canon Leasing */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] font-medium block">Canon Leasing</span>
              <strong className="text-[16px] sm:text-[18px] text-[#DC2626] font-bold block mt-0.5 mono">
                -{currency(unit.lease)}
              </strong>
              <small className="text-[11px] text-[#6B7280]">
                Fijo (incl. seguro & patente)
              </small>
            </div>
          </div>

          {/* Net Result Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDeficit ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#ECFDF5] border-[#A7F3D0]'
          }`}>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block text-[#4B5563]">
                Resultado Neto Operativo
              </span>
              <strong className={`text-[22px] font-black mono ${isDeficit ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                {currency(unit.result)}
              </strong>
              <p className="text-[12px] text-[#4B5563] mt-0.5 m-0">
                Total costos operativos: <strong>{currency(unit.totalCost)}</strong> (Leasing + Chofer + Diésel)
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider block text-[#4B5563]">
                Absorción de Canon Leasing
              </span>
              <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                <div className="w-28 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      coveragePct < 50 ? 'bg-[#DC2626]' : coveragePct < 100 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${Math.min(coveragePct, 100)}%` }}
                  />
                </div>
                <span className="mono text-[16px] font-black text-[#1A1A1A]">
                  {coveragePct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trips History Table */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-[#1A1A1A] m-0">
              Viajes Realizados en el Período ({unit.trips.length})
            </h3>
            <span className="text-[12px] text-[#6B7280]">
              Ordenados por fecha
            </span>
          </div>

          {unit.trips.length > 0 ? (
            <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[#6B7280] mono text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Cliente / Servicio</th>
                    <th className="py-2.5 px-3">Chofer</th>
                    <th className="py-2.5 px-3">Km / Remito</th>
                    <th className="py-2.5 px-3 text-right">Tarifa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {unit.trips
                    .slice()
                    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
                    .map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-3 mono text-[#1A1A1A] whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A1A1A]">
                          {t.service || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[#4B5563]">
                          {t.driver || '—'}
                        </td>
                        <td className="py-2.5 px-3 mono text-[#6B7280]">
                          {t.km ? `${t.km} km` : t.remito || 'Est. 100 km'}
                        </td>
                        <td className="py-2.5 px-3 text-right mono font-bold text-[#1A1A1A]">
                          {currency(t.rate)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
              <p className="text-[13px] text-[#6B7280] m-0">
                Esta camioneta no registra viajes ni fletes en el período seleccionado.
              </p>
              <p className="text-[12px] text-[#DC2626] font-semibold mt-1">
                Está generando costo ocioso de leasing: {currency(unit.lease)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#E5E7EB] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2D2D2D] text-white text-[12px] font-bold rounded-lg cursor-pointer transition-colors"
          >
            Cerrar detalle
          </button>
        </div>
      </div>
    </div>
  );
};
