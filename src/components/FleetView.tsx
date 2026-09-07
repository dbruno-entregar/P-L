import React, { useState, useMemo } from 'react';
import { UnitPnL, Settings } from '../types';
import { currency, formatNumber, normal } from '../utils/formatters';
import { exportPnLToExcel } from '../services/excelService';
import { Search, Download, ArrowUpDown, Filter, ChevronRight, Truck } from 'lucide-react';

interface FleetViewProps {
  unitsPnL: UnitPnL[];
  settings: Settings;
  selectedMonth: string;
  onSelectUnit?: (unit: UnitPnL) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({ 
  unitsPnL, 
  settings, 
  selectedMonth,
  onSelectUnit 
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'out' | 'deficit'>('all');
  const [sortField, setSortField] = useState<'patent' | 'trips' | 'days' | 'revenue' | 'costs' | 'coverage' | 'result'>('result');
  const [sortAsc, setSortAsc] = useState(true); // Default to ascending on result to show deficit first

  const activeCount = unitsPnL.filter(u => normal(u.status).includes('activo')).length;
  const outCount = unitsPnL.filter(u => normal(u.status).includes('f/s') || normal(u.status).includes('fuera')).length;
  const netResult = unitsPnL.reduce((sum, u) => sum + u.result, 0);

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
      if (statusFilter === 'deficit') return u.result < 0;

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
        valA = a.leaseCost + a.driverCost + a.fuelCost;
        valB = b.leaseCost + b.driverCost + b.fuelCost;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [unitsPnL, search, statusFilter, sortField, sortAsc]);

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
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar patente o servicio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {unitsPnL.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] font-semibold text-[12px] rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
              title="Descargar reporte en formato Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Exportar Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet Metrics Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-white flex flex-col gap-1">
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Unidades</span>
          <strong className="text-[21px] text-[#1A1A1A] font-bold">
            {unitsPnL.length > 0 ? formatNumber(unitsPnL.length) : '—'}
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
          <span className="text-[11px] text-[#6B7280] font-semibold uppercase tracking-wider">Resultado neto</span>
          <strong
            className={`text-[21px] font-bold ${
              netResult < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
            }`}
          >
            {unitsPnL.length > 0 ? currency(netResult) : '—'}
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
                filteredUnits.map(u => {
                  const pct = Math.max(0, Math.min(Math.round(u.coverage * 100), 100));
                  const isOff =
                    normal(u.status).includes('f/s') ||
                    normal(u.status).includes('fuera') ||
                    normal(u.status).includes('taller');
                  const unitTotalCosts = u.leaseCost + u.driverCost + u.fuelCost;

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
                        {currency(unitTotalCosts)}
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
                            u.result < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
                          }`}
                        >
                          {currency(u.result)}
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
      </div>
    </div>
  );
};
