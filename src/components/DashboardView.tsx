import React, { useRef, useMemo } from 'react';
import { UnitPnL, Trip, Settings, ServiceMetric } from '../types';
import { currency, formatNumber, calculateWoW, getDailyDriverRate } from '../utils/formatters';
import { 
  Upload, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Truck,
  Fuel,
  Users,
  Minus,
  Package,
  Route,
  ChevronRight
} from 'lucide-react';

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
  onGoToServices?: () => void;
  onSelectUnit?: (unit: UnitPnL) => void;
  servicesAnalysis?: ServiceMetric[];
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
  onGoToServices,
  onSelectUnit,
  servicesAnalysis = [],
  isAdmin,
}) => {
  const unitsFileInputRef = useRef<HTMLInputElement>(null);
  const tripsFileInputRef = useRef<HTMLInputElement>(null);

  const unitsCount = unitsPnL.length;
  const tripsCount = trips.length;

  // Operational Cost Calculations
  const totalRevenue = unitsPnL.reduce((sum, u) => sum + u.revenue, 0);
  const totalLease = unitsCount * settings.lease;
  const totalDriverCost = unitsPnL.reduce((sum, u) => sum + u.driverCost, 0);
  const totalFuelCost = unitsPnL.reduce((sum, u) => sum + u.fuelCost, 0);
  const totalOperationalCost = totalLease + totalDriverCost + totalFuelCost;
  const netOperatingResult = totalRevenue - totalOperationalCost;
  const overallAbsorption = totalLease > 0 ? (totalRevenue / totalLease) * 100 : 0;
  const netMarginPct = totalRevenue > 0 ? (netOperatingResult / totalRevenue) * 100 : 0;

  const averageRate = tripsCount > 0 ? trips.reduce((sum, t) => sum + t.rate, 0) / tripsCount : 0;
  const dailyDriverRate = getDailyDriverRate(settings);

  // Week-over-Week (WoW) analysis for idle units
  const wow = useMemo(() => {
    return calculateWoW(unitsPnL, trips, selectedMonth);
  }, [unitsPnL, trips, selectedMonth]);

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
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[#1A1A1A] tracking-[-0.8px] leading-tight m-0">
              Profit & Loss
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              AMBA · Toyota Leasing
            </span>
          </div>
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
              El maestro identifica las Toyota Hiace en leasing en AMBA. Los viajes importados se deduplican automáticamente para no inflar la facturación.
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
                <small className="text-[#9CA3AF] text-[11px] block">Sin duplicados (remito/patente)</small>
              </div>
            </label>
          </div>
        </section>
      )}

      {/* KPI Grid - Executive P&L Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Facturación */}
        <article className="p-5 border border-[#E5E7EB] bg-white rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Facturación del período</span>
          <strong className="text-[25px] tracking-tight text-[#1A1A1A] font-bold mono mt-1">
            {unitsCount > 0 ? currency(totalRevenue) : '—'}
          </strong>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F3F4F6] text-[11px] text-[#6B7280]">
            <span>{tripsCount > 0 ? `${formatNumber(tripsCount)} viajes cargados` : 'Sin viajes'}</span>
            <span className="font-semibold text-[#1A1A1A]">Prom: {currency(averageRate)}</span>
          </div>
        </article>

        {/* KPI 2: Costos Operativos Totales */}
        <article className="p-5 border border-[#E5E7EB] bg-white rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Costos Operativos Totales</span>
          <strong className="text-[25px] tracking-tight text-[#DC2626] font-bold mono mt-1">
            {unitsCount > 0 ? currency(totalOperationalCost) : '—'}
          </strong>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F3F4F6] text-[10px] text-[#6B7280]">
            <span>Leas: {currency(totalLease)}</span>
            <span>Chof: {currency(totalDriverCost)}</span>
            <span>Diésel: {currency(totalFuelCost)}</span>
          </div>
        </article>

        {/* KPI 3: Resultado Neto Operativo */}
        <article className={`p-5 rounded-xl flex flex-col justify-between shadow-xs border ${
          netOperatingResult < 0 ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#ECFDF5] border-[#A7F3D0]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              netOperatingResult < 0 ? 'text-[#DC2626]' : 'text-[#059669]'
            }`}>
              Resultado Operativo Neto
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              netOperatingResult < 0 ? 'bg-[#DC2626]/10 text-[#DC2626]' : 'bg-[#059669]/10 text-[#059669]'
            }`}>
              {netMarginPct.toFixed(1)}% margen
            </span>
          </div>
          <strong className={`text-[25px] tracking-tight font-black mono mt-1 ${
            netOperatingResult < 0 ? 'text-[#DC2626]' : 'text-[#059669]'
          }`}>
            {unitsCount > 0 ? currency(netOperatingResult) : '—'}
          </strong>
          <small className="text-[11px] text-[#4B5563] mt-2 pt-2 border-t border-black/5 font-medium">
            Facturación menos Leasing, Chofer y Combustible
          </small>
        </article>

        {/* KPI 4: Absorción de Leasing */}
        <article className="p-5 border border-[#E5E7EB] bg-white rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Absorción del leasing</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
              Canon {currency(settings.lease)}
            </span>
          </div>
          <strong className="text-[25px] tracking-tight text-[#1A1A1A] font-bold mono mt-1">
            {unitsCount > 0 ? `${Math.round(overallAbsorption)}%` : '—'}
          </strong>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F3F4F6]">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  overallAbsorption < 70 ? 'bg-[#EF4444]' : overallAbsorption < 100 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                }`}
                style={{ width: `${Math.min(overallAbsorption, 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#6B7280]">
              {unitsCount} Toyotas AMBA
            </span>
          </div>
        </article>
      </section>

      {/* KPI METRIC: Camionetas sin ruta semana contra semana (WoW) */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase m-0">
                INDICADOR CLAVE DE OPERACIÓN
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                Semana vs Semana (WoW)
              </span>
            </div>
            <h2 className="text-[19px] font-extrabold text-[#1A1A1A] tracking-[-0.5px] m-0 mt-0.5">
              Camionetas que no tuvieron ruta semana contra semana
            </h2>
          </div>

          {/* WoW Variation Badge */}
          <div className="flex items-center gap-2">
            {wow.idleTrend === 'better' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[12px] font-bold">
                <TrendingDown className="w-4 h-4" />
                <span>{Math.abs(wow.idleDiff)} camionetas ociosas MENOS que la semana anterior</span>
              </div>
            )}
            {wow.idleTrend === 'worse' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[12px] font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>+{wow.idleDiff} camionetas ociosas MÁS que la semana anterior</span>
              </div>
            )}
            {wow.idleTrend === 'equal' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] text-[12px] font-bold">
                <Minus className="w-4 h-4" />
                <span>Sin variación de camionetas ociosas respecto a semana anterior</span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Timeline Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {wow.allWeeks.map(w => {
            const isCurrent = w.weekNumber === wow.currentWeek.weekNumber;

            return (
              <div
                key={w.weekNumber}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                    : 'bg-white text-[#1A1A1A] border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`text-[11px] font-bold ${isCurrent ? 'text-gray-300' : 'text-[#6B7280]'}`}>
                    {w.weekLabel}
                  </span>
                  {isCurrent && (
                    <span className="mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2563EB] text-white">
                      Actual
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <strong className={`text-[22px] font-black mono ${
                      w.idleUnitsCount > 0 ? (isCurrent ? 'text-[#FCA5A5]' : 'text-[#DC2626]') : (isCurrent ? 'text-[#86EFAC]' : 'text-[#059669]')
                    }`}>
                      {w.idleUnitsCount}
                    </strong>
                    <span className={`text-[12px] font-semibold ${isCurrent ? 'text-gray-300' : 'text-[#6B7280]'}`}>
                      sin ruta
                    </span>
                  </div>

                  <div className={`text-[11px] ${isCurrent ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                    {w.activeUnitsCount} en ruta · {w.totalTrips} viajes
                  </div>

                  <div className={`text-[11px] font-bold mono pt-1.5 border-t ${
                    isCurrent ? 'border-white/10 text-white' : 'border-[#F3F4F6] text-[#1A1A1A]'
                  }`}>
                    {currency(w.totalRevenue)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Costo Chofer Cooperativa & Rendimiento Operativo */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className="p-5 bg-white border border-[#E5E7EB] rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-[#2563EB]">
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Choferes Cooperativa</span>
          </div>
          <strong className="text-[20px] text-[#1A1A1A] font-bold mono block">
            {currency(totalDriverCost)} devengado
          </strong>
          <p className="text-[12px] text-[#6B7280] leading-relaxed m-0">
            Calculado sobre días efectivos en ruta a razón de <strong>{currency(dailyDriverRate)}/día</strong> (fijo $1.4M + $500k premio / 25 días).
          </p>
        </article>

        <article className="p-5 bg-white border border-[#E5E7EB] rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-[#D97706]">
            <Fuel className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Combustible Diésel</span>
          </div>
          <strong className="text-[20px] text-[#1A1A1A] font-bold mono block">
            {currency(totalFuelCost)} estimado
          </strong>
          <p className="text-[12px] text-[#6B7280] leading-relaxed m-0">
            Consumo esperado de <strong>{settings.consumption} L / 100 km</strong> a <strong>{currency(settings.diesel)}/litro</strong> de diésel premium.
          </p>
        </article>

        <article className="p-5 bg-white border border-[#E5E7EB] rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-[#10B981]">
            <Truck className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Canon Leasing Fijo</span>
          </div>
          <strong className="text-[20px] text-[#1A1A1A] font-bold mono block">
            {currency(totalLease)} mensual
          </strong>
          <p className="text-[12px] text-[#6B7280] leading-relaxed m-0">
            Cubre cuota financiera, póliza de seguro automotor integral y patente provincial para todas las Hiace AMBA.
          </p>
        </article>
      </section>

      {/* Resumen Ejecutivo: Análisis por Tipo de Servicio */}
      {servicesAnalysis.length > 0 && (
        <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
            <div>
              <div className="flex items-center gap-2">
                <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase m-0">
                  DESGLOSE ESTRATÉGICO POR CUENTA Y SERVICIO
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  {servicesAnalysis.length} servicios activos
                </span>
              </div>
              <h2 className="text-[19px] font-extrabold text-[#1A1A1A] tracking-[-0.5px] m-0 mt-0.5">
                Rendimiento por Tipo de Servicio y Modalidad
              </h2>
            </div>

            {onGoToServices && (
              <button
                onClick={onGoToServices}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] text-[12px] font-bold rounded-lg border border-[#BFDBFE] transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>Ver Análisis Completo por Servicio</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cards for top services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {servicesAnalysis.slice(0, 3).map(s => {
              const isPkg = s.pricingType === 'package';
              const isDeficit = s.estimatedNetResult < 0;

              return (
                <div
                  key={s.serviceName}
                  onClick={onGoToServices}
                  className="p-4 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl flex flex-col justify-between space-y-3 cursor-pointer transition-all shadow-2xs group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          isPkg
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {isPkg ? <Package className="w-2.5 h-2.5" /> : <Route className="w-2.5 h-2.5" />}
                        {isPkg ? 'Por Paquete' : 'Por Ruta'}
                      </span>
                      <h3 className="text-[15px] font-bold text-[#1A1A1A] truncate mt-1 m-0 group-hover:text-[#2563EB] transition-colors">
                        {s.serviceName}
                      </h3>
                      {s.client && s.client !== s.serviceName && (
                        <p className="text-[11px] text-[#6B7280] truncate m-0">{s.client}</p>
                      )}
                    </div>
                    <span className="mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#1A1A1A]">
                      {Math.round(s.revenueSharePct)}% share
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E7EB] text-[11.5px]">
                    <div>
                      <span className="text-[10px] uppercase text-[#6B7280] font-semibold block">Facturación</span>
                      <strong className="text-[14px] font-bold mono text-[#1A1A1A]">{currency(s.totalRevenue)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#6B7280] font-semibold block">Fletes</span>
                      <strong className="text-[14px] font-bold mono text-[#2563EB]">{s.totalTrips} viajes</strong>
                    </div>
                    {isPkg && s.totalPackages > 0 ? (
                      <div className="col-span-2 flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-200 font-semibold">
                        <span>{formatNumber(s.totalPackages)} bultos entregados</span>
                        <span>{s.avgPackagesPerTrip} / flete</span>
                      </div>
                    ) : (
                      <div className="col-span-2 flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span>Tarifa prom: {currency(s.avgRevenuePerTrip)}</span>
                        <span>{s.uniqueUnitsCount} camionetas</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-[11.5px]">
                    <span className="text-[#6B7280]">Margen Contribución:</span>
                    <span className={`mono font-bold ${isDeficit ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                      {currency(s.estimatedNetResult)} ({Math.round(s.estimatedMarginPct)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Seguimiento por Unidad (Top 5 lowest absorption) */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-0.5">
              SEGUIMIENTO POR UNIDAD (CLICK PARA VER FICHA DETALLADA)
            </p>
            <h2 className="text-[17px] font-bold text-[#1A1A1A] tracking-[-0.5px] m-0">
              Absorción de leasing y Resultado Neto
            </h2>
          </div>
          <button
            onClick={onGoToFleet}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors cursor-pointer"
          >
            Ver flota completa ({unitsCount}) <ArrowRight className="w-3.5 h-3.5" />
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
                  onClick={() => onSelectUnit?.(unit)}
                  className="grid grid-cols-1 sm:grid-cols-[140px_1fr_120px_120px_90px] gap-3 sm:gap-4 items-center py-3.5 hover:bg-[#F9FAFB] cursor-pointer px-2 rounded-lg transition-colors"
                  title="Click para ver la ficha detallada de viajes y costos de esta camioneta"
                >
                  <div>
                    <strong className="text-[13px] text-[#1A1A1A] font-bold block">{unit.patent}</strong>
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
                    <span className="text-[10px] text-[#6B7280] block">Facturación</span>
                    <strong className="text-[13px] font-bold text-[#1A1A1A] mono">
                      {currency(unit.revenue)}
                    </strong>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[#6B7280] block">Resultado Neto</span>
                    <strong
                      className={`text-[13px] font-bold mono ${
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
