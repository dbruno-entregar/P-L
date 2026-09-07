import React, { useState, useMemo } from 'react';
import { ServiceMetric, Tariff, UnitPnL, Trip, Unit, Settings, WeeklyServiceAnalysis } from '../types';
import { currency, formatNumber, normal, formatDate, calculateWeeklyServiceAnalysis } from '../utils/formatters';
import { exportServicesToExcel } from '../services/excelService';
import { 
  Search, 
  Download, 
  Package, 
  Route, 
  Truck, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  X, 
  Layers, 
  LayoutGrid, 
  Table as TableIcon,
  Fuel,
  DollarSign,
  Briefcase
} from 'lucide-react';

interface ServicesViewProps {
  services?: ServiceMetric[];
  trips?: Trip[];
  units?: Unit[];
  unitsPnL?: UnitPnL[];
  settings?: Settings;
  tariffs?: Tariff[];
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
  onSelectUnit?: (unit: UnitPnL) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services = [],
  trips = [],
  units = [],
  unitsPnL = [],
  settings,
  tariffs = [],
  selectedMonth,
  onMonthChange,
  onSelectUnit,
}) => {
  // Weekly selection state: 1, 2, 3, 4, 5 or 'all'
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(1);
  const [search, setSearch] = useState('');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'package' | 'route'>('all');
  const [sortField, setSortField] = useState<'revenue' | 'cost' | 'profit' | 'units' | 'trips' | 'margin' | 'packages' | 'name'>('revenue');
  const [sortAsc, setSortAsc] = useState(false); // Default highest first
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedService, setSelectedService] = useState<ServiceMetric | null>(null);

  // Calculate dynamic weekly analysis if trips and settings are provided
  const weeklyAnalysis = useMemo<WeeklyServiceAnalysis | null>(() => {
    if (trips && trips.length > 0 && settings) {
      return calculateWeeklyServiceAnalysis(
        trips,
        units,
        settings,
        tariffs,
        selectedMonth,
        selectedWeek
      );
    }
    return null;
  }, [trips, units, settings, tariffs, selectedMonth, selectedWeek]);

  // Active services list for current period (weekly or consolidated)
  const currentServices = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.services;
    return services;
  }, [weeklyAnalysis, services]);

  // All week options
  const weekOptions = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.allWeekOptions;
    return [
      { num: 1, label: 'Semana 1 (1-7)', startDay: 1, endDay: 7 },
      { num: 2, label: 'Semana 2 (8-14)', startDay: 8, endDay: 14 },
      { num: 3, label: 'Semana 3 (15-21)', startDay: 15, endDay: 21 },
      { num: 4, label: 'Semana 4 (22-28)', startDay: 22, endDay: 28 },
    ];
  }, [weeklyAnalysis]);

  // Totals across active services
  const totalRevenueAll = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.totalRevenue;
    return currentServices.reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [weeklyAnalysis, currentServices]);

  const totalCostAll = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.totalCost;
    return currentServices.reduce((sum, s) => sum + s.estimatedTotalCost, 0);
  }, [weeklyAnalysis, currentServices]);

  const totalNetResultAll = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.totalProfit;
    return totalRevenueAll - totalCostAll;
  }, [weeklyAnalysis, totalRevenueAll, totalCostAll]);

  const totalMarginPctAll = totalRevenueAll > 0 ? (totalNetResultAll / totalRevenueAll) * 100 : 0;

  const totalTripsAll = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.totalTrips;
    return currentServices.reduce((sum, s) => sum + s.totalTrips, 0);
  }, [weeklyAnalysis, currentServices]);

  const totalPackagesAll = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.totalPackages;
    return currentServices.reduce((sum, s) => sum + s.totalPackages, 0);
  }, [weeklyAnalysis, currentServices]);

  const totalOccupiedUnitsAll = useMemo(() => {
    if (weeklyAnalysis) return weeklyAnalysis.totalOccupiedUnitsCount;
    const patSet = new Set<string>();
    currentServices.forEach(s => s.uniqueUnits.forEach(p => patSet.add(p.toUpperCase())));
    return patSet.size;
  }, [weeklyAnalysis, currentServices]);

  const totalFleetUnits = units.length || unitsPnL.length;
  const fleetUtilizationPct = totalFleetUnits > 0 
    ? Math.round((totalOccupiedUnitsAll / totalFleetUnits) * 100) 
    : 0;

  // Filtered and sorted services
  const filteredServices = useMemo(() => {
    const list = currentServices.filter(s => {
      const matchSearch =
        !search ||
        normal(s.serviceName).includes(normal(search)) ||
        (s.client && normal(s.client).includes(normal(search))) ||
        s.uniqueUnits.some(p => normal(p).includes(normal(search))) ||
        s.routesBreakdown.some(r => normal(r.route).includes(normal(search))) ||
        s.uniqueDrivers.some(d => normal(d).includes(normal(search)));

      if (!matchSearch) return false;

      if (pricingFilter === 'package' && s.pricingType !== 'package') return false;
      if (pricingFilter === 'route' && s.pricingType !== 'route') return false;

      return true;
    });

    list.sort((a, b) => {
      let valA: any = a.totalRevenue;
      let valB: any = b.totalRevenue;

      if (sortField === 'cost') {
        valA = a.estimatedTotalCost;
        valB = b.estimatedTotalCost;
      } else if (sortField === 'profit') {
        valA = a.estimatedNetResult;
        valB = b.estimatedNetResult;
      } else if (sortField === 'units') {
        valA = a.uniqueUnitsCount;
        valB = b.uniqueUnitsCount;
      } else if (sortField === 'trips') {
        valA = a.totalTrips;
        valB = b.totalTrips;
      } else if (sortField === 'margin') {
        valA = a.estimatedMarginPct;
        valB = b.estimatedMarginPct;
      } else if (sortField === 'packages') {
        valA = a.totalPackages;
        valB = b.totalPackages;
      } else if (sortField === 'name') {
        valA = a.serviceName.toLowerCase();
        valB = b.serviceName.toLowerCase();
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [currentServices, search, pricingFilter, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' ? true : false);
    }
  };

  const handlePrevWeek = () => {
    if (selectedWeek === 'all') {
      setSelectedWeek(weekOptions.length);
    } else if (selectedWeek > 1) {
      setSelectedWeek((selectedWeek - 1) as number);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek === 'all') {
      setSelectedWeek(1);
    } else if (selectedWeek < weekOptions.length) {
      setSelectedWeek((selectedWeek + 1) as number);
    }
  };

  const handleExport = () => {
    const periodLabel = selectedWeek === 'all' 
      ? `Mes_${selectedMonth || 'General'}` 
      : `Semana_${selectedWeek}_${selectedMonth || 'General'}`;
    exportServicesToExcel(filteredServices, periodLabel);
  };

  // Find max revenue/cost for comparative chart bar normalization
  const maxRevenueOrCost = useMemo(() => {
    if (currentServices.length === 0) return 1;
    return Math.max(...currentServices.map(s => Math.max(s.totalRevenue, s.estimatedTotalCost)));
  }, [currentServices]);

  const currentPeriodLabel = selectedWeek === 'all' 
    ? `Mes Completo (${selectedMonth})` 
    : `Semana ${selectedWeek} (${selectedMonth})`;

  return (
    <div className="space-y-6">
      {/* Header & Period Navigation Controls */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-[#EFF6FF] text-[#2563EB] rounded-lg">
                <Briefcase className="w-4 h-4" />
              </span>
              <h1 className="text-[20px] sm:text-[24px] font-extrabold text-[#1A1A1A] tracking-[-0.6px] m-0">
                Análisis por Tipo de Servicio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                Corte Semanal
              </span>
            </div>
            <p className="text-[13px] text-[#6B7280] m-0">
              Evaluación de rentabilidad, costos operativos asignados (chofer, diésel, leasing) y camionetas ocupadas por servicio.
            </p>
          </div>

          {/* Month selector & Export button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onMonthChange && (
              <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 rounded-xl shadow-2xs">
                <Calendar className="w-4 h-4 text-[#6B7280]" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => onMonthChange(e.target.value)}
                  className="text-[12.5px] font-semibold text-[#1A1A1A] bg-transparent border-0 focus:outline-none cursor-pointer"
                  title="Cambiar mes de análisis"
                />
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={filteredServices.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F9FAFB] text-[#374151] border border-[#D1D5DB] rounded-xl text-[12px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Descargar planilla detallada de servicios en Excel"
            >
              <Download className="w-4 h-4 text-[#2563EB]" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Weekly Granularity Bar */}
        <div className="pt-3 border-t border-[#F3F4F6] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mr-1">
              Período:
            </span>

            <button
              onClick={handlePrevWeek}
              disabled={selectedWeek === 1}
              className="p-1.5 border border-[#E5E7EB] hover:bg-[#F3F4F6] rounded-lg text-[#6B7280] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {weekOptions.map(w => {
              const isSelected = selectedWeek === w.num;
              return (
                <button
                  key={w.num}
                  onClick={() => setSelectedWeek(w.num)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#1A1A1A] text-white shadow-xs'
                      : 'bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}

            <button
              onClick={() => setSelectedWeek('all')}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedWeek === 'all'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
              }`}
            >
              Mes Completo
            </button>

            <button
              onClick={handleNextWeek}
              disabled={selectedWeek === weekOptions.length}
              className="p-1.5 border border-[#E5E7EB] hover:bg-[#F3F4F6] rounded-lg text-[#6B7280] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar servicio, cliente o patente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-[12px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] text-[#1A1A1A]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Strip (Weekly Executive Summary) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Facturación */}
        <article className="p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Facturación ({currentPeriodLabel})</span>
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="my-2">
            <strong className="text-[22px] font-bold text-[#1A1A1A] mono block">
              {currency(totalRevenueAll)}
            </strong>
            <span className="text-[11px] text-[#6B7280]">
              {totalTripsAll} fletes realizados
            </span>
          </div>
          <div className="text-[10.5px] text-[#6B7280] pt-2 border-t border-[#F3F4F6] flex justify-between">
            <span>Ticket prom/ruta:</span>
            <strong className="text-[#1A1A1A] font-semibold mono">
              {totalTripsAll > 0 ? currency(Math.round(totalRevenueAll / totalTripsAll)) : '—'}
            </strong>
          </div>
        </article>

        {/* KPI 2: Costos Operativos Asignados */}
        <article className="p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Costos Asignados</span>
            <Fuel className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="my-2">
            <strong className="text-[22px] font-bold text-[#DC2626] mono block">
              {currency(totalCostAll)}
            </strong>
            <span className="text-[11px] text-[#6B7280]">
              Chofer + Diésel + Leasing
            </span>
          </div>
          <div className="text-[10.5px] text-[#6B7280] pt-2 border-t border-[#F3F4F6] flex justify-between">
            <span>Costo prom/ruta:</span>
            <strong className="text-[#1A1A1A] font-semibold mono">
              {totalTripsAll > 0 ? currency(Math.round(totalCostAll / totalTripsAll)) : '—'}
            </strong>
          </div>
        </article>

        {/* KPI 3: Ganancia Operativa Neta */}
        <article className={`p-4 rounded-xl shadow-xs flex flex-col justify-between border ${
          totalNetResultAll >= 0 
            ? 'bg-[#ECFDF5] border-[#A7F3D0]' 
            : 'bg-[#FEF2F2] border-[#FECACA]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              totalNetResultAll >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}>
              Ganancia Neta
            </span>
            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
              totalNetResultAll >= 0 ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#DC2626]/10 text-[#DC2626]'
            }`}>
              {totalMarginPctAll.toFixed(1)}% margen
            </span>
          </div>
          <div className="my-2">
            <strong className={`text-[22px] font-black mono block ${
              totalNetResultAll >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}>
              {currency(totalNetResultAll)}
            </strong>
            <span className="text-[11px] text-[#4B5563]">
              {totalNetResultAll >= 0 ? 'Superávit operativo' : 'Déficit operativo'}
            </span>
          </div>
          <div className="text-[10.5px] text-[#4B5563] pt-2 border-t border-black/5 flex justify-between">
            <span>Situación global:</span>
            <strong className="font-semibold">{totalMarginPctAll >= 15 ? 'Saludable' : totalMarginPctAll > 0 ? 'Aceptable' : 'Alerta'}</strong>
          </div>
        </article>

        {/* KPI 4: Unidades Ocupadas */}
        <article className="p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unidades Ocupadas</span>
            <Truck className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <strong className="text-[22px] font-bold text-[#1A1A1A] mono">
                {totalOccupiedUnitsAll}
              </strong>
              <span className="text-[13px] text-[#6B7280]">
                / {totalFleetUnits} unidades
              </span>
            </div>
            <span className="text-[11px] text-[#2563EB] font-semibold">
              {fleetUtilizationPct}% ocupación de flota
            </span>
          </div>
          <div className="text-[10.5px] text-[#6B7280] pt-2 border-t border-[#F3F4F6] flex justify-between">
            <span>Ociosas (sin ruta):</span>
            <strong className={`font-semibold ${totalFleetUnits - totalOccupiedUnitsAll > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {Math.max(0, totalFleetUnits - totalOccupiedUnitsAll)}
            </strong>
          </div>
        </article>

        {/* KPI 5: Paquetes Entregados */}
        <article className="p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Paquetes Entregados</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <strong className="text-[22px] font-bold text-emerald-700 mono block">
              {totalPackagesAll > 0 ? formatNumber(totalPackagesAll) : '0'}
            </strong>
            <span className="text-[11px] text-[#6B7280]">
              {currentServices.filter(s => s.pricingType === 'package').length} servicios por paquete
            </span>
          </div>
          <div className="text-[10.5px] text-[#6B7280] pt-2 border-t border-[#F3F4F6] flex justify-between">
            <span>Prom/ruta paquetería:</span>
            <strong className="text-[#1A1A1A] font-semibold mono">
              {totalPackagesAll > 0 && totalTripsAll > 0 
                ? Math.round(totalPackagesAll / totalTripsAll) 
                : '—'}
            </strong>
          </div>
        </article>
      </section>

      {/* Comparative Performance Chart: Facturación vs Costo vs Ganancia por Servicio */}
      {currentServices.length > 0 && (
        <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                Comparativa de Rendimiento por Servicio ({currentPeriodLabel})
              </h3>
              <p className="text-[11.5px] text-[#6B7280]">
                Proporción de facturación, costos operativos asignados y ganancia neta generada en el período.
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] text-[#4B5563]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#2563EB]"></span>
                <span>Facturación</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#6B7280]"></span>
                <span>Costo Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#059669]"></span>
                <span>Ganancia Neta</span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {currentServices.map(s => {
              const revWidth = maxRevenueOrCost > 0 ? (s.totalRevenue / maxRevenueOrCost) * 100 : 0;
              const costWidth = maxRevenueOrCost > 0 ? (s.estimatedTotalCost / maxRevenueOrCost) * 100 : 0;
              const profitWidth = maxRevenueOrCost > 0 ? (Math.max(0, s.estimatedNetResult) / maxRevenueOrCost) * 100 : 0;

              return (
                <div 
                  key={s.serviceName} 
                  onClick={() => setSelectedService(s)}
                  className="p-3.5 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl space-y-2 cursor-pointer transition-colors shadow-2xs"
                  title="Click para ver detalle operativo"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-[13px] text-[#1A1A1A] font-bold hover:text-[#2563EB] transition-colors">
                        {s.serviceName}
                      </strong>
                      {s.pricingType === 'package' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Por Paquete ({s.totalPackages > 0 ? `${formatNumber(s.totalPackages)} pqts` : ''})
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                          Por Ruta
                        </span>
                      )}
                      <span className="text-[11.5px] text-[#6B7280]">
                        ({s.uniqueUnitsCount} {s.uniqueUnitsCount === 1 ? 'camioneta' : 'camionetas'} · {s.totalTrips} viajes)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[12px] mono">
                      <span className="text-[#2563EB] font-bold">
                        Fact: {currency(s.totalRevenue)}
                      </span>
                      <span className="text-[#6B7280]">
                        Cost: {currency(s.estimatedTotalCost)}
                      </span>
                      <span className={`font-bold ${s.estimatedNetResult >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                        Gan: {currency(s.estimatedNetResult)} ({Math.round(s.estimatedMarginPct)}%)
                      </span>
                    </div>
                  </div>

                  {/* Multi-Bar visual comparison */}
                  <div className="space-y-1 pt-1">
                    {/* Revenue Bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] mono text-[#6B7280] w-12 text-right">Fact</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#2563EB] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(2, revWidth))}%` }}
                        />
                      </div>
                    </div>

                    {/* Cost Bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] mono text-[#6B7280] w-12 text-right">Costo</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#6B7280] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(2, costWidth))}%` }}
                        />
                      </div>
                    </div>

                    {/* Profit Bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] mono text-[#6B7280] w-12 text-right">Neto</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            s.estimatedNetResult >= 0 ? 'bg-[#059669]' : 'bg-[#DC2626]'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, profitWidth))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Controls Bar: Modalidad Filter, Sorting & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pricing Filter Buttons */}
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5 text-[12px] shadow-xs">
            <button
              onClick={() => setPricingFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                pricingFilter === 'all' ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              Todos ({currentServices.length})
            </button>
            <button
              onClick={() => setPricingFilter('package')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                pricingFilter === 'package' ? 'bg-emerald-700 text-white font-semibold' : 'text-[#6B7280] hover:text-emerald-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Por Paquete ({currentServices.filter(s => s.pricingType === 'package').length})</span>
            </button>
            <button
              onClick={() => setPricingFilter('route')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                pricingFilter === 'route' ? 'bg-[#2563EB] text-white font-semibold' : 'text-[#6B7280] hover:text-[#2563EB]'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Por Ruta ({currentServices.filter(s => s.pricingType === 'route').length})</span>
            </button>
          </div>
        </div>

        {/* View mode toggle and Sorting */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5 text-[12px] shadow-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
              title="Vista en tabla analítica"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
              title="Vista en tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table View or Cards View */}
      {filteredServices.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-xl text-[#6B7280] text-[13px]">
          {currentServices.length === 0
            ? `No hay viajes cargados en el período seleccionado (${currentPeriodLabel}).`
            : 'No se encontraron servicios que coincidan con los filtros aplicados.'}
        </div>
      ) : viewMode === 'table' ? (
        /* Detailed Analytical Table */
        <div className="border border-[#E5E7EB] rounded-xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[1050px] text-left">
              <thead>
                <tr className="bg-[#F8F9FA] text-[#6B7280] mono text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
                  <th className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('name')}>
                    Servicio / Cliente
                  </th>
                  <th className="py-3.5 px-3 text-center cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('units')}>
                    Unidades Ocupadas
                  </th>
                  <th className="py-3.5 px-3 text-center cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('trips')}>
                    Fletes
                  </th>
                  <th className="py-3.5 px-3 text-center cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('packages')}>
                    Bultos / Pqts
                  </th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('revenue')}>
                    Facturación Total
                  </th>
                  <th className="py-3.5 px-3 text-right">Chofer</th>
                  <th className="py-3.5 px-3 text-right">Diésel</th>
                  <th className="py-3.5 px-3 text-right">Leasing</th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('cost')}>
                    Costo Total
                  </th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('profit')}>
                    Ganancia Neta
                  </th>
                  <th className="py-3.5 px-3 text-center cursor-pointer hover:text-[#1A1A1A]" onClick={() => handleSort('margin')}>
                    Margen %
                  </th>
                  <th className="py-3.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredServices.map(service => {
                  const isPackage = service.pricingType === 'package';
                  const isDeficit = service.estimatedNetResult < 0;

                  return (
                    <tr 
                      key={service.serviceName} 
                      className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                      onClick={() => setSelectedService(service)}
                    >
                      {/* Servicio / Cliente */}
                      <td className="py-3.5 px-4">
                        <div>
                          <strong className="text-[13px] text-[#1A1A1A] font-bold block">{service.serviceName}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {service.client && (
                              <span className="text-[11px] text-[#6B7280]">{service.client} ·</span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                isPackage
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {isPackage ? <Package className="w-2.5 h-2.5" /> : <Route className="w-2.5 h-2.5 text-[#2563EB]" />}
                              {isPackage ? 'Por Paquete' : 'Por Ruta'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Unidades Ocupadas */}
                      <td className="py-3.5 px-3 text-center">
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-[#F3F4F6] text-[#1A1A1A] border border-[#E5E7EB]"
                          title={`Patentes ocupadas: ${service.uniqueUnits.join(', ')}`}
                        >
                          <Truck className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>{service.uniqueUnitsCount}</span>
                        </span>
                      </td>

                      {/* Fletes */}
                      <td className="py-3.5 px-3 mono text-center font-bold text-[#1A1A1A] text-[12px]">
                        {formatNumber(service.totalTrips)}
                      </td>

                      {/* Bultos / Paquetes */}
                      <td className="py-3.5 px-3 text-center">
                        {service.totalPackages > 0 ? (
                          <span className="mono text-[11.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {formatNumber(service.totalPackages)}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF] text-[12px]">—</span>
                        )}
                      </td>

                      {/* Facturación */}
                      <td className="py-3.5 px-4 mono font-bold text-right text-[13px] text-[#1A1A1A]">
                        {currency(service.totalRevenue)}
                      </td>

                      {/* Chofer */}
                      <td className="py-3.5 px-3 mono text-right text-[11.5px] text-[#6B7280]">
                        {currency(service.estimatedDriverCost)}
                      </td>

                      {/* Diésel */}
                      <td className="py-3.5 px-3 mono text-right text-[11.5px] text-[#6B7280]">
                        {currency(service.estimatedFuelCost)}
                      </td>

                      {/* Leasing */}
                      <td className="py-3.5 px-3 mono text-right text-[11.5px] text-[#6B7280]">
                        {currency(service.estimatedLeaseContribution)}
                      </td>

                      {/* Costo Total */}
                      <td className="py-3.5 px-4 mono font-bold text-right text-[12.5px] text-[#DC2626]">
                        {currency(service.estimatedTotalCost)}
                      </td>

                      {/* Ganancia Neta */}
                      <td className="py-3.5 px-4 text-right">
                        <strong className={`mono text-[13px] font-bold ${isDeficit ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                          {currency(service.estimatedNetResult)}
                        </strong>
                      </td>

                      {/* Margen % */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          service.estimatedMarginPct >= 20
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : service.estimatedMarginPct > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        }`}>
                          {service.estimatedMarginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedService(service);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-[#DBEAFE] cursor-pointer transition-colors"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bento Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServices.map(service => {
            const isPackage = service.pricingType === 'package';
            const isDeficit = service.estimatedNetResult < 0;

            return (
              <div
                key={service.serviceName}
                className="bg-white border border-[#E5E7EB] hover:border-[#BFDBFE] rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPackage
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isPackage ? <Package className="w-3 h-3" /> : <Route className="w-3 h-3" />}
                          {isPackage ? 'Por Paquete' : 'Por Ruta Fija'}
                        </span>

                        {service.client && service.client !== service.serviceName && (
                          <span className="text-[11px] text-[#6B7280] font-medium truncate">
                            {service.client}
                          </span>
                        )}
                      </div>

                      <h3 className="text-[17px] font-extrabold text-[#1A1A1A] tracking-[-0.3px] truncate m-0" title={service.serviceName}>
                        {service.serviceName}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="mono text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {Math.round(service.revenueSharePct)}% flota
                      </span>
                    </div>
                  </div>

                  {/* Pricing info badge */}
                  <div className="flex items-center gap-2 text-[11.5px] text-[#6B7280] pt-1">
                    {service.tariffRate !== undefined ? (
                      <span>
                        Tarifa pactada: <strong className="text-[#1A1A1A] font-bold mono">
                          {isPackage 
                            ? `$${service.tariffRate.toLocaleString('es-AR')} / pqt` 
                            : currency(service.tariffRate)}
                        </strong>
                      </span>
                    ) : (
                      <span>
                        Tarifa prom: <strong className="text-[#1A1A1A] font-bold mono">{currency(service.avgRevenuePerTrip)} / flete</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#F3F4F6]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280] block">Facturación</span>
                    <strong className="text-[17px] font-black mono text-[#1A1A1A] tracking-tight">
                      {currency(service.totalRevenue)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#DC2626] block">Costo Total</span>
                    <strong className="text-[17px] font-black mono text-[#DC2626] tracking-tight">
                      {currency(service.estimatedTotalCost)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#2563EB] block">Total Fletes</span>
                    <strong className="text-[15px] font-black mono text-[#2563EB] tracking-tight">
                      {formatNumber(service.totalTrips)} viajes
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280] block">Unidades Ocupadas</span>
                    <strong className="text-[15px] font-black mono text-[#1A1A1A] tracking-tight">
                      {service.uniqueUnitsCount} camionetas
                    </strong>
                  </div>

                  {isPackage || service.totalPackages > 0 ? (
                    <div className="col-span-2 flex items-center justify-between pt-1 border-t border-[#E5E7EB] text-[11px]">
                      <span className="text-emerald-800 font-bold">
                        {formatNumber(service.totalPackages)} bultos entregados
                      </span>
                      <span className="mono text-emerald-900 font-semibold">
                        {service.avgPackagesPerTrip} pqts / flete
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Fleet Resources Attached (Patentes) */}
                <div className="space-y-1.5 text-[11.5px] text-[#6B7280]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-[#4B5563]">
                      <Truck className="w-3.5 h-3.5 text-[#2563EB]" />
                      Camionetas asignadas ({service.uniqueUnitsCount}):
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {service.uniqueUnits.slice(0, 6).map(patent => {
                      const matchUnit = unitsPnL.find(u => normal(u.patent) === normal(patent));
                      return (
                        <button
                          key={patent}
                          onClick={e => {
                            e.stopPropagation();
                            if (matchUnit && onSelectUnit) onSelectUnit(matchUnit);
                          }}
                          className="mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-pointer text-[#1A1A1A]"
                          title="Click para ver la ficha P&L de esta unidad"
                        >
                          {patent}
                        </button>
                      );
                    })}
                    {service.uniqueUnitsCount > 6 && (
                      <span className="text-[10.5px] font-bold text-[#6B7280] px-1 py-0.5">
                        +{service.uniqueUnitsCount - 6}
                      </span>
                    )}
                  </div>
                </div>

                {/* Estimated P&L Contribution Strip */}
                <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#6B7280] block">Ganancia Operativa</span>
                    <strong className={`mono text-[15px] font-bold ${isDeficit ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                      {currency(service.estimatedNetResult)}
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-[#6B7280] block">Margen</span>
                    <span className={`inline-flex items-center gap-1 mono text-[12px] font-bold px-2 py-0.5 rounded-full ${
                      isDeficit ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {isDeficit ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {Math.round(service.estimatedMarginPct)}%
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <button
                  onClick={() => setSelectedService(service)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#F9FAFB] hover:bg-[#EFF6FF] text-[#2563EB] text-[12px] font-semibold rounded-lg border border-[#E5E7EB] hover:border-[#BFDBFE] transition-colors cursor-pointer"
                >
                  <span>Ver detalle de rutas y costos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Drill-down Modal: Service Details, Routes, Units, and Trips Log */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedService.pricingType === 'package'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {selectedService.pricingType === 'package' ? <Package className="w-3 h-3" /> : <Route className="w-3 h-3" />}
                    {selectedService.pricingType === 'package' ? 'Modalidad Por Paquete Entregado' : 'Modalidad Por Ruta Fija'}
                  </span>
                  {selectedService.client && (
                    <span className="text-[12px] text-[#6B7280] font-medium">
                      Cliente: <strong>{selectedService.client}</strong>
                    </span>
                  )}
                </div>
                <h2 className="text-[22px] font-black text-[#1A1A1A] tracking-[-0.6px] m-0">
                  {selectedService.serviceName}
                </h2>
              </div>

              <button
                onClick={() => setSelectedService(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] block">Facturación</span>
                <strong className="text-[17px] font-black mono text-[#1A1A1A]">
                  {currency(selectedService.totalRevenue)}
                </strong>
                <small className="text-[10px] text-[#6B7280] block mt-0.5">
                  {Math.round(selectedService.revenueSharePct)}% de la facturación
                </small>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <span className="text-[10px] uppercase font-bold text-[#DC2626] block">Costo Total</span>
                <strong className="text-[17px] font-black mono text-[#DC2626]">
                  {currency(selectedService.estimatedTotalCost)}
                </strong>
                <small className="text-[10px] text-[#6B7280] block mt-0.5">
                  Chofer + Diésel + Leasing
                </small>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] block">Unidades Afectadas</span>
                <strong className="text-[17px] font-black mono text-[#2563EB]">
                  {selectedService.uniqueUnitsCount} camionetas
                </strong>
                <small className="text-[10px] text-[#6B7280] block mt-0.5">
                  {selectedService.totalTrips} fletes en total
                </small>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] block">Ganancia Neta</span>
                <strong className={`text-[17px] font-black mono ${
                  selectedService.estimatedNetResult < 0 ? 'text-[#DC2626]' : 'text-[#059669]'
                }`}>
                  {currency(selectedService.estimatedNetResult)}
                </strong>
                <small className={`text-[10px] font-bold block mt-0.5 ${
                  selectedService.estimatedNetResult < 0 ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  {Math.round(selectedService.estimatedMarginPct)}% margen
                </small>
              </div>
            </div>

            {/* Section 1: Costos Operativos Asignados */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-[12px]">
              <div className="flex items-center justify-between font-bold text-[#1A1A1A] pb-1 border-b border-gray-200">
                <span>Estructura de Costos Asignada al Servicio</span>
                <span className="mono">{currency(selectedService.estimatedTotalCost)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11.5px] text-[#4B5563]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3 text-[#2563EB]" /> Chofer:</span>
                  <strong className="mono text-[#1A1A1A]">{currency(selectedService.estimatedDriverCost)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Fuel className="w-3 h-3 text-[#D97706]" /> Diésel ({formatNumber(selectedService.estimatedKm)} km):</span>
                  <strong className="mono text-[#1A1A1A]">{currency(selectedService.estimatedFuelCost)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-[#10B981]" /> Leasing proporcional:</span>
                  <strong className="mono text-[#1A1A1A]">{currency(selectedService.estimatedLeaseContribution)}</strong>
                </div>
              </div>
            </div>

            {/* Section 2: Camionetas Toyota Hiace Afectadas */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
                <Truck className="w-4 h-4 text-[#2563EB]" />
                <span>Camionetas Toyota Hiace Asignadas ({selectedService.unitsBreakdown.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {selectedService.unitsBreakdown.map(u => {
                  const matchUnit = unitsPnL.find(p => normal(p.patent) === normal(u.patent));
                  return (
                    <div
                      key={u.patent}
                      onClick={() => {
                        if (matchUnit && onSelectUnit) onSelectUnit(matchUnit);
                      }}
                      className="p-3 bg-white border border-[#E5E7EB] hover:border-[#2563EB] rounded-xl flex flex-col justify-between cursor-pointer transition-colors shadow-xs"
                      title="Click para ver la ficha P&L de esta unidad"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className="mono text-[13px] font-bold text-[#1A1A1A]">{u.patent}</strong>
                        <span className="mono text-[10px] text-[#6B7280]">{u.tripCount} viajes</span>
                      </div>
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-[#6B7280]">Recaudado:</span>
                        <strong className="mono text-[#10B981] font-bold">{currency(u.revenue)}</strong>
                      </div>
                      {u.packages > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold pt-1 border-t border-gray-100 mt-1">
                          <span>Entregados:</span>
                          <span>{formatNumber(u.packages)} pqts</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Rutas Realizadas */}
            {selectedService.routesBreakdown.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
                  <Route className="w-4 h-4 text-[#2563EB]" />
                  <span>Desglose por Rutas / Recorridos ({selectedService.routesBreakdown.length})</span>
                </div>
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-[#F8F9FA] text-[#6B7280] mono text-[10px] uppercase border-b border-[#E5E7EB]">
                      <tr>
                        <th className="py-2.5 px-3">Ruta</th>
                        <th className="py-2.5 px-3 text-center">Viajes</th>
                        {selectedService.totalPackages > 0 && <th className="py-2.5 px-3 text-center">Bultos</th>}
                        <th className="py-2.5 px-3 text-right">Facturación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {selectedService.routesBreakdown.map(r => (
                        <tr key={r.route} className="hover:bg-[#F9FAFB]">
                          <td className="py-2 px-3 font-semibold text-[#1A1A1A]">{r.route}</td>
                          <td className="py-2 px-3 text-center mono font-medium">{r.tripCount}</td>
                          {selectedService.totalPackages > 0 && (
                            <td className="py-2 px-3 text-center mono text-emerald-800 font-bold">
                              {r.packages > 0 ? formatNumber(r.packages) : '—'}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right mono font-bold text-[#1A1A1A]">{currency(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 4: Registro de Viajes Recientes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px] font-bold text-[#1A1A1A]">
                <span>Últimos fletes registrados ({Math.min(selectedService.trips.length, 50)})</span>
                <span className="text-[11px] text-[#6B7280]">Orden cronológico</span>
              </div>
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11.5px] border-collapse">
                  <thead className="bg-[#F8F9FA] text-[#6B7280] mono text-[9.5px] uppercase border-b border-[#E5E7EB] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Patente</th>
                      <th className="py-2 px-3">Ruta</th>
                      {selectedService.totalPackages > 0 && <th className="py-2 px-3 text-center">Bultos</th>}
                      <th className="py-2 px-3">Chofer</th>
                      <th className="py-2 px-3 text-right">Total Ruta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {selectedService.trips.slice(0, 50).map(t => (
                      <tr key={t.id} className="hover:bg-[#F9FAFB]">
                        <td className="py-1.5 px-3 mono text-[#6B7280]">{formatDate(t.date)}</td>
                        <td className="py-1.5 px-3 mono font-bold text-[#1A1A1A]">{t.patent}</td>
                        <td className="py-1.5 px-3 text-[#4B5563]">{t.route || '—'}</td>
                        {selectedService.totalPackages > 0 && (
                          <td className="py-1.5 px-3 text-center mono font-bold text-emerald-800">
                            {t.packages && t.packages > 0 ? `${t.packages} pqts` : '—'}
                          </td>
                        )}
                        <td className="py-1.5 px-3 text-[#6B7280]">{t.driver || '—'}</td>
                        <td className="py-1.5 px-3 text-right mono font-bold text-[#1A1A1A]">{currency(t.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white text-[12px] font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
