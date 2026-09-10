import React, { useState, useMemo, useEffect } from 'react';
import { UnitPnL, Settings, CostViewMode } from '../types';
import { currency, formatNumber, normal } from '../utils/formatters';
import { exportPnLToExcel } from '../services/excelService';
import { Search, Download, ArrowUpDown, ChevronRight, Truck, Fuel } from 'lucide-react';

interface FleetViewProps {
  unitsPnL: UnitPnL[];
  settings: Settings;
  selectedMonth: string;
  onSelectUnit?: (unit: UnitPnL) => void;
  costViewMode?: CostViewMode;
  onCostViewModeChange?: (mode: CostViewMode) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({ 
  unitsPnL, 
  settings, 
  selectedMonth,
  onSelectUnit,
  costViewMode = 'full',
  onCostViewModeChange,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'out' | 'deficit'>('all');
  const [sortField, setSortField] = useState<'patent' | 'trips' | 'days' | 'revenue' | 'costs' | 'coverage' | 'result'>('result');
  const [sortAsc, setSortAsc] = useState(true); // Default to ascending on result to show deficit first
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const isLeasingOnly = costViewMode === 'leasing_only';

  const activeCount = unitsPnL.filter(u => normal(u.status).includes('activo')).length;
  const outCount = unitsPnL.filter(u => normal(u.status).includes('f/s') || normal(u.status).includes('fuera')).length;
  
  const totalDisplayResult = unitsPnL.reduce(
    (sum, u) => sum + (isLeasingOnly ? (u.grossResult || 0) : u.result),
    0
  );

  const filteredUnits = useMemo(() => {
    let result = unitsPnL.filter(u => {
      const matchSearch =
        !search ||
        normal(u.patent).includes(normal(search)) ||
        normal(u.service).includes(normal(search)) ||
        normal(u.type).includes(normal(search));

      if (!matchSearch) return false;

      if (statusFilter === 'active') return normal(u.status).includes('activo');
      if (statusFilter === 'out') return normal(u.status).includes('f/s') || normal(u.status).includes('fuera');
      if (statusFilter === 'deficit') return isLeasingOnly ? (u.grossResult || 0) < 0 : u.result < 0;

      return true;
    });

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === 'trips') {
        valA = a.tripCount;
        valB = b.tripCount;
      } else if (sortField === 'days') {
        valA = a.activeDays;
        valB = b.activeDays;
      } else if (sortField === 'costs') {
        valA = isLeasingOnly ? a.lease : a.totalCost;
        valB = isLeasingOnly ? b.lease : b.totalCost;
      } else if (sortField === 'result') {
        valA = isLeasingOnly ? a.grossResult : a.result;
        valB = isLeasingOnly ? b.grossResult : b.result;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [unitsPnL, search, statusFilter, sortField, sortAsc, isLeasingOnly]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'result' ? true : false);
    }
  };

  const handleExport = () => {
    exportPnLToExcel(unitsPnL, selectedMonth || 'General');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-1">
            GESTIÓN DE UNIDADES · TOYOTA LEASING AMBA
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#1A1A1A] tracking-[-1.2px] leading-tight m-0">
            Flota P&L
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1 m-0">
            Hacé click en cualquier camioneta para abrir su ficha completa de fletes, chofer y combustible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cost Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg border border-[#E5E7EB]">
            <button
              onClick={() => onCostViewModeChange?.('leasing_only')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                isLeasingOnly
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#BFDBFE]'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Solo Leasing</span>
            </button>
            <button
              onClick={() => onCostViewModeChange?.('full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                !isLeasingOnly
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#BFDBFE]'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Leas + Chof + Comb</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar patente, servicio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] text-[12px] font-semibold rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-[#2563EB]" />
            <span>Exportar P&L</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-[#E5E7EB] rounded-xl bg-[#F8F9FA] p-1.5">
        <div className="p-4 bg-white flex flex-col gap-1">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Total Flota Scoped</span>
          <strong className="text-[21px] text-[#1A1A1A] font-bold">
            {formatNumber(unitsPnL.length)} u.
          </strong>
        </div>
        <div className="p-4 bg-white flex flex-col gap-1">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Activas</span>
          <strong className="text-[21px] text-[#10B981] font-bold">
            {unitsPnL.length > 0 ? formatNumber(activeCount) : '—'}
          </strong>
        </div>
        <div className="p-4 bg-white flex flex-col gap-1">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Fuera de servicio</span>
          <strong className="text-[21px] text-[#EF4444] font-bold">
            {unitsPnL.length > 0 ? formatNumber(outCount) : '—'}
          </strong>
        </div>
        <div className="p-4 bg-white flex flex-col gap-1">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">
            {isLeasingOnly ? 'Resultado Bruto' : 'Resultado Neto'}
          </span>
          <strong
            className={`text-[21px] font-bold ${
              totalDisplayResult < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
            }`}
          >
            {unitsPnL.length > 0 ? currency(totalDisplayResult) : '—'}
          </strong>
        </div>
      </section>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[#6B7280] font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3" /> Filtrar:
        </span>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          Todas ({unitsPnL.length})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-[#10B981] text-white'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          Activas ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter('deficit')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
            statusFilter === 'deficit'
              ? 'bg-[#EF4444] text-white'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          En Déficit ({unitsPnL.filter(u => u.result < 0).length})
        </button>
        <button
          onClick={() => setStatusFilter('out')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
            statusFilter === 'out'
              ? 'bg-[#6B7280] text-white'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          Fuera de servicio ({outCount})
        </button>
      </div>

      {/* Table Panel */}
      <div className="border border-[#E5E7EB] rounded-xl bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[920px] text-left">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#6B7280] mono text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
                <th
                  onClick={() => handleSort('patent')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Unidad</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Servicio</th>
                <th className="py-3.5 px-4">Estado</th>
                <th
                  onClick={() => handleSort('days')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Días ruta</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('trips')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Viajes</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenue')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Facturación</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('costs')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Costos oper.</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('coverage')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Absorción</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('result')}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Resultado</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredUnits.length > 0 ? (
                filteredUnits
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map(u => {
                  const pct = Math.max(0, Math.min(Math.round(u.coverage * 100), 100));
                  const isOff =
                    normal(u.status).includes('f/s') ||
                    normal(u.status).includes('fuera') ||
                    normal(u.status).includes('taller');
                  const displayCost = isLeasingOnly ? u.lease : u.totalCost;
                  const displayRes = isLeasingOnly ? u.grossResult : u.result;

                  return (
                    <tr 
                      key={u.patent} 
                      onClick={() => onSelectUnit?.(u)}
                      className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                      title="Click para ver ficha completa con viajes y desglose de costos"
                    >
                      <td className="py-3.5 px-4">
                        <strong className="text-[13px] text-[#1A1A1A] font-bold block mono">
                          {u.patent}
                        </strong>
                        <span className="mono text-[11px] text-[#6B7280]">
                          {u.type || 'HIACE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[#1A1A1A]">
                        {u.service || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`status-badge ${isOff ? 'off' : ''}`}>
                          {u.status || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 mono text-[12px] font-medium text-[#1A1A1A]">
                        {u.activeDays} d
                      </td>
                      <td className="py-3.5 px-4 mono text-[12px] font-medium text-[#1A1A1A]">
                        {u.tripCount}
                      </td>
                      <td className="py-3.5 px-4 mono text-[12px] font-semibold text-[#1A1A1A]">
                        {currency(u.revenue)}
                      </td>
                      <td className="py-3.5 px-4 mono text-[12px] font-medium text-[#DC2626]">
                        {currency(displayCost)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-[110px]">
                          <div className="coverage-bar flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className={`coverage-fill h-full rounded-full ${
                                u.coverage < 0.5
                                  ? 'bg-[#EF4444]'
                                  : u.coverage < 1
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#10B981]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="mono text-[11px] font-semibold text-[#1A1A1A] w-9 text-right">
                            {Math.round(u.coverage * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <strong
                          className={`mono text-[13px] font-bold ${
                            displayRes < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
                          }`}
                        >
                          {currency(displayRes)}
                        </strong>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectUnit?.(u);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Ficha</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#6B7280] text-[13px]">
                    {unitsPnL.length === 0
                      ? 'Aún no hay unidades importadas.'
                      : 'No se encontraron unidades con los filtros seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredUnits.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#F8FAFC] border-t border-[#E5E7EB] text-[12px] text-[#6B7280]">
            <div>
              Mostrando <strong className="text-[#1A1A1A]">{(page - 1) * pageSize + 1}</strong> - <strong className="text-[#1A1A1A]">{Math.min(page * pageSize, filteredUnits.length)}</strong> de <strong className="text-[#1A1A1A]">{filteredUnits.length}</strong> unidades
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1A1A1A] font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Anterior
              </button>
              <span className="mono font-bold text-[#1A1A1A] px-2">
                Pág {page} de {Math.ceil(filteredUnits.length / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(filteredUnits.length / pageSize)}
                onClick={() => setPage(prev => Math.min(Math.ceil(filteredUnits.length / pageSize), prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1A1A1A] font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
