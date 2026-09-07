import React, { useRef } from 'react';
import { UnitPnL, Trip, Settings } from '../types';
import { currency, formatNumber } from '../utils/formatters';
import { Upload, ArrowRight, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  unitsPnL: UnitPnL[];
  trips: Trip[];
  settings: Settings;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onImportUnits: (file: File) => void;
  onImportTrips: (file: File) => void;
  onLoadSampleData: () => void;
  onGoToFleet: () => void;
  isAdmin: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  unitsPnL,
  trips,
  settings,
  selectedMonth,
  onMonthChange,
  onImportUnits,
  onImportTrips,
  onLoadSampleData,
  onGoToFleet,
  isAdmin,
}) => {
  const unitsFileInputRef = useRef<HTMLInputElement>(null);
  const tripsFileInputRef = useRef<HTMLInputElement>(null);

  const unitsCount = unitsPnL.length;
  const tripsCount = trips.length;

  const totalRevenue = unitsPnL.reduce((sum, u) => sum + u.revenue, 0);
  const totalLease = unitsCount * settings.lease;
  const totalResult = totalRevenue - totalLease;
  const overallAbsorption = totalLease > 0 ? (totalRevenue / totalLease) * 100 : 0;

  const averageRate = tripsCount > 0 ? trips.reduce((sum, t) => sum + t.rate, 0) / tripsCount : 0;
  const breakEvenTrips = averageRate > 0 ? Math.ceil(settings.lease / averageRate) : 0;

  const idleUnits = unitsPnL.filter(u => u.tripCount === 0);
  const idleCount = idleUnits.length;
  const idleCost = idleCount * settings.lease;

  // Month label formatting
  const formattedPeriodLabel = () => {
    if (unitsCount === 0) return 'Importá los datos para comenzar el análisis.';
    if (!selectedMonth) return 'Seleccioná un período para acotar los resultados.';
    try {
      const [year, month] = selectedMonth.split('-');
      const d = new Date(Number(year), Number(month) - 1, 2);
      const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(d);
      return `Resultados acumulados · ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    } catch {
      return `Período: ${selectedMonth}`;
    }
  };

  const getProgressClass = (coverage: number) => {
    if (coverage < 0.5) return 'danger';
    if (coverage < 1) return 'warning';
    return 'good';
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-transparent">
        <div>
          <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-1">
            VISIÓN EJECUTIVA
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#1A1A1A] tracking-[-1.2px] leading-tight m-0">
            La flota, bajo control.
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1 m-0">
            {formattedPeriodLabel()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 text-[11px] font-bold text-[#6B7280]">
            <label htmlFor="monthFilter">Período</label>
            <input
              id="monthFilter"
              type="month"
              value={selectedMonth}
              onChange={e => onMonthChange(e.target.value)}
              className="text-[13px] font-medium border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>
      </div>

      {/* Setup Panel (Only visible if admin or no units) */}
      {(unitsCount === 0 || isAdmin) && (
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-7 bg-[#1A1A1A] rounded-xl text-[#F3F4F6] border border-[#374151] shadow-sm">
          <div className="max-w-xl">
            <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#60A5FA] uppercase mb-1">
              CARGA DE DATOS OPERATIVOS
            </p>
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-white tracking-[-0.5px] m-0 mb-2">
              Importá tus archivos reales o explorá la demo.
            </h2>
            <p className="text-[13px] text-[#9CA3AF] leading-relaxed m-0">
              El maestro identifica las Hiace Leasing en AMBA. El archivo de servicios suma automáticamente los viajes y la facturación por patente para contrastar contra el canon devengado.
            </p>
            {unitsCount === 0 && (
              <div className="mt-4">
                <button
                  onClick={onLoadSampleData}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[12px] rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Cargar datos de flota demostración
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Upload Units */}
            <label className="w-full sm:w-[190px] min-h-[130px] p-4 border border-dashed border-[#4B5563] hover:border-[#60A5FA] rounded-xl cursor-pointer flex flex-col justify-between bg-[#262626] hover:bg-[#2d2d2d] transition-colors">
              <input
                ref={unitsFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) onImportUnits(e.target.files[0]);
                }}
              />
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] font-bold text-[#60A5FA]">01</span>
                <Upload className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div>
                <strong className="block text-[13px] text-white font-bold mb-0.5">Maestro unidades</strong>
                <small className="text-[#9CA3AF] text-[11px] block">Unidades.xlsx / CSV</small>
              </div>
            </label>

            {/* Upload Trips */}
            <label className="w-full sm:w-[190px] min-h-[130px] p-4 border border-dashed border-[#4B5563] hover:border-[#60A5FA] rounded-xl cursor-pointer flex flex-col justify-between bg-[#262626] hover:bg-[#2d2d2d] transition-colors">
              <input
                ref={tripsFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) onImportTrips(e.target.files[0]);
                }}
              />
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] font-bold text-[#60A5FA]">02</span>
                <Upload className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div>
                <strong className="block text-[13px] text-white font-bold mb-0.5">Servicios / viajes</strong>
                <small className="text-[#9CA3AF] text-[11px] block">Fletes por patente</small>
              </div>
            </label>
          </div>
        </section>
      )}

      {/* KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1 */}
        <article className="min-h-[137px] p-5 border border-[#E5E7EB] bg-white rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Facturación del período</span>
          <strong className="text-[25px] tracking-tight text-[#1A1A1A] font-bold">
            {unitsCount > 0 ? currency(totalRevenue) : '—'}
          </strong>
          <small className="text-[11px] text-[#6B7280] font-medium">
            {tripsCount > 0 ? `${formatNumber(tripsCount)} viajes cargados` : 'Sin viajes cargados'}
          </small>
        </article>

        {/* KPI 2 */}
        <article className="min-h-[137px] p-5 border border-[#E5E7EB] bg-white rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Absorción del leasing</span>
          <strong className="text-[25px] tracking-tight text-[#1A1A1A] font-bold">
            {unitsCount > 0 ? `${Math.round(overallAbsorption)}%` : '—'}
          </strong>
          <small className="text-[11px] text-[#6B7280] font-medium">
            Facturación / canon total
          </small>
        </article>

        {/* KPI 3 */}
        <article className="min-h-[137px] p-5 border border-[#E5E7EB] bg-white rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Costo leasing devengado</span>
          <strong className="text-[25px] tracking-tight text-[#1A1A1A] font-bold">
            {unitsCount > 0 ? currency(totalLease) : '—'}
          </strong>
          <small className="text-[11px] text-[#6B7280] font-medium">
            {unitsCount > 0 ? `${unitsCount} unidades Hiace AMBA` : '—'}
          </small>
        </article>

        {/* KPI 4 */}
        <article className="min-h-[137px] p-5 border border-[#DBEAFE] bg-[#EFF6FF] rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#2563EB] font-semibold uppercase tracking-wider">Resultado operativo</span>
          <strong className={`text-[25px] tracking-tight font-bold ${totalResult < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
            {unitsCount > 0 ? currency(totalResult) : '—'}
          </strong>
          <small className="text-[11px] text-[#6B7280] font-medium">
            Antes de combustible y peajes
          </small>
        </article>
      </section>

      {/* Dashboard Break-even & Idle Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Punto de Equilibrio */}
        <article className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-1">
                PUNTO DE EQUILIBRIO
              </p>
              <h2 className="text-[17px] font-bold text-[#1A1A1A] tracking-[-0.5px] m-0">
                Viajes necesarios para pagar el leasing
              </h2>
            </div>
            <span className="mono text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-1 rounded tracking-wide">
              EN VIVO
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-6">
            <strong className="text-[44px] tracking-[-2px] text-[#1A1A1A] font-extrabold leading-none">
              {breakEvenTrips > 0 ? breakEvenTrips : '—'}
            </strong>
            <span className="text-[13px] text-[#6B7280] max-w-[200px] leading-snug">
              viajes promedio por unidad / mes
            </span>
          </div>

          <p className="text-[12px] text-[#6B7280] m-0">
            {averageRate > 0
              ? `Tarifa promedio actual: ${currency(averageRate)} por viaje.`
              : 'Se calcula con la tarifa promedio de los viajes cargados.'}
          </p>
        </article>

        {/* Cobertura de Datos / Inactividad */}
        <article className="lg:col-span-5 bg-white border border-[#FDE68A] bg-gradient-to-br from-white to-[#FEFDF8] rounded-xl p-6 flex flex-col justify-between shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#D97706] uppercase mb-1">
                COBERTURA DE DATOS
              </p>
              <h2 className="text-[17px] font-bold text-[#1A1A1A] tracking-[-0.5px] m-0">
                Unidades sin viajes cargados
              </h2>
            </div>
          </div>

          <div className="flex items-baseline gap-3 my-6">
            <strong className="text-[44px] tracking-[-2px] text-[#D97706] font-extrabold leading-none">
              {unitsCount > 0 ? idleCount : '—'}
            </strong>
            <span className="text-[13px] text-[#6B7280] leading-snug">
              {unitsCount > 0 ? `${currency(idleCost)} de canon sin cubrir` : '—'}
            </span>
          </div>

          <p className="text-[12px] text-[#6B7280] leading-relaxed m-0">
            El canon queda sin cubrir según el archivo importado. No confirma inactividad si faltan servicios por cargar.
          </p>
        </article>
      </section>

      {/* Seguimiento por Unidad (Top 5 lowest absorption) */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-0.5">
              SEGUIMIENTO POR UNIDAD
            </p>
            <h2 className="text-[17px] font-bold text-[#1A1A1A] tracking-[-0.5px] m-0">
              Absorción de leasing
            </h2>
          </div>
          <button
            onClick={onGoToFleet}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors cursor-pointer"
          >
            Ver flota completa <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {unitsCount === 0 ? (
          <div className="text-center py-10 text-[#6B7280] text-[13px]">
            Importá el maestro y los servicios para ver el detalle de absorción.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {unitsPnL.slice(0, 5).map(unit => {
              const pct = Math.max(0, Math.min(Math.round(unit.coverage * 100), 100));
              const progressVariant = getProgressClass(unit.coverage);

              return (
                <div
                  key={unit.patent}
                  className="grid grid-cols-1 sm:grid-cols-[130px_1fr_120px_100px] gap-3 sm:gap-4 items-center py-3.5"
                >
                  <div>
                    <strong className="text-[13px] text-[#1A1A1A] font-bold">{unit.patent}</strong>
                    <div className="mono text-[11px] text-[#6B7280] truncate">
                      {unit.service || 'Sin servicio'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="coverage-bar flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className={`coverage-fill h-full rounded-full ${
                          progressVariant === 'danger'
                            ? 'bg-[#EF4444]'
                            : progressVariant === 'warning'
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#10B981]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="mono text-[12px] font-semibold text-[#1A1A1A] w-12 text-right">
                      {Math.round(unit.coverage * 100)}%
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <strong
                      className={`text-[13px] font-bold ${
                        unit.result < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
                      }`}
                    >
                      {currency(unit.result)}
                    </strong>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="mono text-[11px] text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded">
                      {unit.tripCount} viajes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
