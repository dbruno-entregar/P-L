import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip, Unit, Tariff } from '../types';
import { currency, formatDate, formatNumber, normal, deduplicateTrips, findTariffForService, detectClient } from '../utils/formatters';
import { Search, Upload, Plus, X, Check, FileSpreadsheet, ShieldCheck, Sparkles, AlertCircle, Tag, UserCheck, Filter, ChevronLeft, ChevronRight, Building } from 'lucide-react';
import { TariffModal } from './TariffModal';

interface TripsViewProps {
  trips: Trip[];
  units?: Unit[];
  tariffs?: Tariff[];
  onImportTrips: (file: File) => void;
  onAddTrip?: (newTrip: Omit<Trip, 'id'>) => Promise<void> | void;
  onDeduplicateTrips?: () => void;
  onUpdateTariffs?: (newTariffs: Tariff[]) => void;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  units = [],
  tariffs = [],
  onImportTrips,
  onAddTrip,
  onDeduplicateTrips,
  onUpdateTariffs,
}) => {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(1);
  }, [search, clientFilter, serviceFilter, vehicleTypeFilter]);

  // Available unique options for dropdown filters
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      const c = t.client || detectClient(t.service);
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [trips]);

  const uniqueServices = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      const s = (t.service || '').trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [trips]);

  const uniqueVehicleTypes = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      const vt = (t.vehicleType || '').trim();
      if (vt) set.add(vt);
    });
    return Array.from(set).sort();
  }, [trips]);

  // Analyze duplicates in current trip set
  const duplicateInfo = useMemo(() => {
    return deduplicateTrips(trips);
  }, [trips]);

  // Form state for adding a single trip
  const [newPatent, setNewPatent] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('Furgón Grande (Hiace)');
  const [newClient, setNewClient] = useState('');
  const [newService, setNewService] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [newPackages, setNewPackages] = useState('');
  const [newRequiresHelper, setNewRequiresHelper] = useState(false);
  const [newDriver, setNewDriver] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Determine if selected service is per-package
  const activeServiceTariff = useMemo(() => {
    return findTariffForService(newService, tariffs, newVehicleType);
  }, [newService, tariffs, newVehicleType]);

  const isPackageService = useMemo(() => {
    if (activeServiceTariff) {
      return activeServiceTariff.pricingType === 'package';
    }
    return newService.toLowerCase().includes('entregar');
  }, [activeServiceTariff, newService]);

  const handlePatentChange = (val: string) => {
    const p = val.toUpperCase();
    setNewPatent(p);
    const foundUnit = units.find(u => u.patent.toUpperCase() === p);
    if (foundUnit && foundUnit.type) {
      const vType = foundUnit.type;
      setNewVehicleType(vType);
      if (newService) {
        const match = findTariffForService(newService, tariffs, vType);
        if (match && match.pricingType !== 'package') {
          setNewRate(String(match.rate));
        }
      }
    }
  };

  const handlePackagesChange = (val: string) => {
    setNewPackages(val);
    const numPkts = Number(val) || 0;
    if (activeServiceTariff && activeServiceTariff.pricingType === 'package') {
      const calcTotal = Math.round(numPkts * activeServiceTariff.rate);
      setNewRate(String(calcTotal));
    }
  };

  const handleVehicleTypeChange = (val: string) => {
    setNewVehicleType(val);
    const match = findTariffForService(newService, tariffs, val);
    if (match && match.pricingType !== 'package') {
      setNewRate(String(match.rate));
    }
  };

  const handleServiceSelect = (val: string) => {
    setNewService(val);
    const match = findTariffForService(val, tariffs, newVehicleType);
    const detectedClient = detectClient(val, match?.client);
    if (detectedClient) {
      setNewClient(detectedClient);
    }
    if (match) {
      if (match.requiresHelper !== undefined) {
        setNewRequiresHelper(Boolean(match.requiresHelper));
      }
      if (match.pricingType === 'package') {
        const numPkts = Number(newPackages) || 0;
        if (numPkts > 0) {
          setNewRate(String(Math.round(numPkts * match.rate)));
        } else {
          setNewRate('');
        }
      } else {
        setNewRate(String(match.rate));
      }
    }
  };

  const filteredTrips = useMemo(() => {
    return trips
      .filter(t => {
        if (clientFilter !== 'all') {
          const tClient = t.client || detectClient(t.service);
          if (normal(tClient) !== normal(clientFilter)) return false;
        }

        if (serviceFilter !== 'all' && normal(t.service) !== normal(serviceFilter)) {
          return false;
        }

        if (vehicleTypeFilter !== 'all' && normal(t.vehicleType) !== normal(vehicleTypeFilter)) {
          return false;
        }

        if (!search) return true;
        const q = normal(search);
        const tClient = t.client || detectClient(t.service);
        return (
          normal(t.patent).includes(q) ||
          normal(t.service).includes(q) ||
          normal(tClient).includes(q) ||
          normal(t.driver).includes(q) ||
          (t.route && normal(t.route).includes(q)) ||
          normal(t.vehicleType).includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = a.date ? a.date.getTime() : 0;
        const timeB = b.date ? b.date.getTime() : 0;
        return timeB - timeA;
      });
  }, [trips, search, clientFilter, serviceFilter, vehicleTypeFilter]);

  const totalFilteredAmount = filteredTrips.reduce((sum, t) => sum + t.rate, 0);
  const totalPackagesDelivered = filteredTrips.reduce((sum, t) => sum + (t.packages || 0), 0);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatent.trim()) return;

    setSubmitting(true);
    try {
      if (onAddTrip) {
        await onAddTrip({
          patent: newPatent.toUpperCase().trim(),
          client: newClient.trim() || detectClient(newService, activeServiceTariff?.client) || undefined,
          service: newService.trim() || 'Distribución',
          route: newRoute.trim() || undefined,
          packages: newPackages ? Number(newPackages) : undefined,
          pricingType: isPackageService ? 'package' : 'route',
          requiresHelper: newRequiresHelper,
          driver: newDriver.trim() || 'No asignado',
          vehicleType: newVehicleType.trim() || 'HIACE',
          property: 'LEASING',
          rate: Number(newRate) || 0,
          date: newDate ? new Date(`${newDate}T12:00:00`) : new Date(),
        });
      }
      setShowAddModal(false);
      setNewPatent('');
      setNewVehicleType('Furgón Grande (Hiace)');
      setNewClient('');
      setNewService('');
      setNewRoute('');
      setNewPackages('');
      setNewRequiresHelper(false);
      setNewDriver('');
      setNewRate('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase m-0">
              OPERACIÓN DIARIA & ALMACENAMIENTO
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <ShieldCheck className="w-3 h-3" />
              Anti-duplicados activo
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#1A1A1A] tracking-[-1.2px] leading-tight m-0">
            Fletes / Viajes
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1 m-0">
            Los viajes se acumulan y persisten en Supabase. Si volvés a cargar el mismo archivo, el sistema detecta las huellas operativas y no genera registros duplicados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar patente o chofer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            onClick={() => setShowTariffModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] font-semibold text-[12px] rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
            title="Administrar tarifas vigentes por cliente/servicio"
          >
            <Tag className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Tarifario ({tariffs.length})</span>
          </button>

          {onAddTrip && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] font-semibold text-[12px] rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
              title="Registrar manualmente un viaje en la base de datos"
            >
              <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Registrar viaje</span>
            </button>
          )}

          <label className="flex items-center gap-2 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>Importar servicios</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) onImportTrips(e.target.files[0]);
              }}
            />
          </label>
        </div>
      </div>

      {/* Filter toolbar: Cliente, Servicio y Tipo de Vehículo */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#4B5563]">
          <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Filtrar por:</span>
        </div>

        {/* Cliente Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="clientFilterSelect" className="text-[12px] text-[#6B7280] font-medium">
            Cliente:
          </label>
          <select
            id="clientFilterSelect"
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[12.5px] font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-[220px]"
          >
            <option value="all">Todos los clientes ({uniqueClients.length})</option>
            {uniqueClients.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Servicio Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="serviceFilterSelect" className="text-[12px] text-[#6B7280] font-medium">
            Servicio:
          </label>
          <select
            id="serviceFilterSelect"
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[12.5px] font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-[220px]"
          >
            <option value="all">Todos los servicios ({uniqueServices.length})</option>
            {uniqueServices.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Vehículo Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="vehicleTypeFilterSelect" className="text-[12px] text-[#6B7280] font-medium">
            Tipo Vehículo:
          </label>
          <select
            id="vehicleTypeFilterSelect"
            value={vehicleTypeFilter}
            onChange={e => setVehicleTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[12.5px] font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-[220px]"
          >
            <option value="all">Todos los vehículos ({uniqueVehicleTypes.length} tipos)</option>
            {uniqueVehicleTypes.map(vt => (
              <option key={vt} value={vt}>
                {vt}
              </option>
            ))}
          </select>
        </div>

        {/* Limpiar filtros */}
        {(clientFilter !== 'all' || serviceFilter !== 'all' || vehicleTypeFilter !== 'all' || search) && (
          <button
            onClick={() => {
              setClientFilter('all');
              setServiceFilter('all');
              setVehicleTypeFilter('all');
              setSearch('');
            }}
            className="px-2.5 py-1 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-[#BFDBFE] ml-auto"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Banner de alerta si hay duplicados residuales de cargas previas */}
      {duplicateInfo.duplicatesCount > 0 && onDeduplicateTrips && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-[13px] text-[#92400E] shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" />
            <div>
              <span className="font-bold">Atención:</span> Se detectaron{' '}
              <strong>{duplicateInfo.duplicatesCount} viajes repetidos</strong> en la memoria del navegador.
              Podés unificarlos para que las métricas de P&L reflejen viajes únicos reales.
            </div>
          </div>
          <button
            onClick={onDeduplicateTrips}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-[12px] font-semibold rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Depurar duplicados ahora</span>
          </button>
        </div>
      )}

      {/* Summary strip */}
      {trips.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-[#E5E7EB] rounded-xl text-[12px] shadow-xs">
          <div className="flex flex-wrap items-center gap-4 text-[#6B7280]">
            <span>
              Total viajes almacenados: <strong className="text-[#1A1A1A]">{formatNumber(trips.length)}</strong>
            </span>
            <span>•</span>
            <span>
              Viajes filtrados: <strong className="text-[#1A1A1A]">{formatNumber(filteredTrips.length)}</strong>
            </span>
            {totalPackagesDelivered > 0 && (
              <>
                <span>•</span>
                <span>
                  Paquetes entregados: <strong className="text-[#047857] font-semibold">{formatNumber(totalPackagesDelivered)}</strong>
                </span>
              </>
            )}
            <span>•</span>
            <span>
              Facturación acumulada: <strong className="text-[#10B981] font-semibold">{currency(totalFilteredAmount)}</strong>
            </span>
          </div>
          <span className="text-[#6B7280] mono text-[11px]">
            Mostrando hasta 300 registros más recientes
          </span>
        </div>
      )}

      {/* Table Panel */}
      <div className="border border-[#E5E7EB] rounded-xl bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[850px] text-left">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#6B7280] mono text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Patente</th>
                <th className="py-3.5 px-4">Ruta</th>
                <th className="py-3.5 px-4">Servicio / Cliente</th>
                <th className="py-3.5 px-4 text-center">Ayudante</th>
                <th className="py-3.5 px-4 text-center">Entregados</th>
                <th className="py-3.5 px-4">Chofer</th>
                <th className="py-3.5 px-4">Tipo unidad</th>
                <th className="py-3.5 px-4 text-right">Total Ruta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredTrips.length > 0 ? (
                filteredTrips
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map(t => {
                    const isPkg = t.pricingType === 'package' || (t.packages && t.packages > 0) || (t.service && t.service.toLowerCase().includes('entregar'));

                    return (
                      <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3.5 px-4 mono text-[12px] text-[#6B7280]">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-[13px] text-[#1A1A1A] font-bold">
                            {t.patent}
                          </strong>
                        </td>
                        <td className="py-3.5 px-4">
                          {t.route ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                              {t.route}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] text-[12px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#1A1A1A]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium">{t.service || '—'}</span>
                              {isPkg ? (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  title="Tarifa calculada por paquete entregado"
                                >
                                  Por paquete
                                </span>
                              ) : (
                                tariffs && tariffs.length > 0 && findTariffForService(t.service, tariffs) && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                                    title="Servicio reconocido en el tarifario maestro"
                                  >
                                    Tarifado
                                  </span>
                                )
                              )}
                            </div>
                            {(t.client || detectClient(t.service) || t.site) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] flex-wrap">
                                <Building className="w-3 h-3 text-[#9CA3AF]" />
                                <span className="font-medium text-[#4B5563]">{t.client || detectClient(t.service)}</span>
                                {t.site && <span className="text-[#9CA3AF]">• {t.site}</span>}
                                {t.province && <span className="text-[#9CA3AF]">({t.province})</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.requiresHelper || (tariffs && tariffs.length > 0 && findTariffForService(t.service, tariffs)?.requiresHelper) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" title="Servicio con peón / ayudante">
                              <Check className="w-3 h-3 text-indigo-600" />
                              <span>Sí</span>
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] text-[12px] font-medium">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.packages && t.packages > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {formatNumber(t.packages)} pqts
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] text-[12px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#6B7280]">
                          {t.driver || '—'}
                        </td>
                        <td className="py-3.5 px-4 mono text-[11px] text-[#6B7280]">
                          {t.vehicleType || 'HIACE'}
                        </td>
                        <td className="py-3.5 px-4 mono text-[13px] font-bold text-right text-[#1A1A1A]">
                          {currency(t.rate)}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#6B7280] text-[13px]">
                    {trips.length === 0
                      ? 'No hay viajes cargados. Podés importar un archivo Excel o registrar un viaje individual.'
                      : 'No se encontraron viajes con el término de búsqueda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {filteredTrips.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9FA] border-t border-[#E5E7EB] text-[12px]">
            <span className="text-[#6B7280]">
              Mostrando <strong className="text-[#1A1A1A]">{(page - 1) * pageSize + 1}</strong> - <strong className="text-[#1A1A1A]">{Math.min(page * pageSize, filteredTrips.length)}</strong> de <strong className="text-[#1A1A1A]">{filteredTrips.length}</strong> fletes
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="mono font-bold text-[#1A1A1A] px-2">
                Pág {page} de {Math.ceil(filteredTrips.length / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(filteredTrips.length / pageSize)}
                onClick={() => setPage(prev => Math.min(Math.ceil(filteredTrips.length / pageSize), prev + 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Registrar Viaje Directamente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-0.5">
                  NUEVO REGISTRO
                </p>
                <h3 className="text-[18px] font-bold text-[#1A1A1A] m-0">
                  Registrar Flete / Viaje
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-[#F3F4F6] rounded-lg text-[#6B7280] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                    Patente del vehículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AF123AB"
                    value={newPatent}
                    onChange={e => handlePatentChange(e.target.value)}
                    list="units-patent-list"
                    className="w-full mono text-[13px] uppercase font-bold p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                  <datalist id="units-patent-list">
                    {units.map(u => (
                      <option key={u.patent} value={u.patent}>
                        {u.service ? `${u.patent} (${u.service} - ${u.type || 'Hiace'})` : `${u.patent} (${u.type || 'Hiace'})`}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                    Fecha del servicio
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Tipo de vehículo y Chofer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[12px] font-semibold text-[#1A1A1A]">
                      Tipo de Vehículo *
                    </label>
                    <span className="text-[10.5px] text-[#2563EB] font-medium">
                      Tarifa según vehículo
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Furgón Grande (Hiace), Mediano, Chasis..."
                    value={newVehicleType}
                    onChange={e => handleVehicleTypeChange(e.target.value)}
                    list="trip-vehicle-types"
                    className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                  <datalist id="trip-vehicle-types">
                    <option value="Furgón Grande (Hiace / Master / Sprinter)" />
                    <option value="Furgón Mediano (Kangoo / Partner / Expert)" />
                    <option value="Furgón Chico (Berlingo / Fiorino)" />
                    <option value="Chasis / Camión Liviano" />
                    <option value="Camión Balancín / Semi" />
                    <option value="HIACE" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                    Chofer asignado
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del chofer"
                    value={newDriver}
                    onChange={e => setNewDriver(e.target.value)}
                    className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Ruta / Recorrido
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ruta 104, AMBA 1, Nordelta..."
                  value={newRoute}
                  onChange={e => setNewRoute(e.target.value)}
                  className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Entregar, Mercado Libre..."
                    value={newClient}
                    onChange={e => setNewClient(e.target.value)}
                    list="clients-list-trips"
                    className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                  <datalist id="clients-list-trips">
                    {uniqueClients.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-semibold text-[#1A1A1A]">
                      Servicio
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Ej: Ultima milla, Colecta..."
                    value={newService}
                    list="tariffs-services-list"
                    onChange={e => handleServiceSelect(e.target.value)}
                    className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                  <datalist id="tariffs-services-list">
                    {tariffs.map(t => (
                      <option key={t.id} value={t.service}>
                        {t.pricingType === 'package' 
                          ? `${t.service} - $${t.rate.toLocaleString('es-AR')}/paquete` 
                          : `${t.service} (${t.vehicleType || 'General'}) - $${t.rate.toLocaleString('es-AR')}/ruta`}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Indicador de tarifa por ruta vinculada al vehículo */}
              {activeServiceTariff && !isPackageService && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-[11.5px] text-blue-900">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>
                      Tarifa de ruta para <strong>{activeServiceTariff.vehicleType || 'vehículo general'}</strong>:
                    </span>
                  </div>
                  <span className="mono font-bold text-blue-950">
                    ${activeServiceTariff.rate.toLocaleString('es-AR')} / ruta
                  </span>
                </div>
              )}

              {/* Si el servicio es por paquete, habilitar cantidad de paquetes y cálculo automático */}
              {isPackageService && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11.5px] text-emerald-800 font-semibold">
                    <span>Servicio valorizado por paquete entregado</span>
                    {activeServiceTariff && (
                      <span className="mono font-bold">${activeServiceTariff.rate.toLocaleString('es-AR')} / pqt</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium text-emerald-900 mb-1">
                      Cantidad de Paquetes Entregados *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ej: 85"
                      value={newPackages}
                      onChange={e => handlePackagesChange(e.target.value)}
                      required
                      className="w-full mono text-[13px] font-bold p-2 bg-white border border-emerald-300 rounded-lg text-emerald-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Tilde Ayudante */}
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                <div>
                  <label htmlFor="trip-helper-check" className="text-[12.5px] font-bold text-[#1E293B] flex items-center gap-1.5 cursor-pointer">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Requiere Ayudante</span>
                  </label>
                  <p className="text-[11px] text-[#64748B] m-0">
                    Tildá si este flete se realiza con peón o acompañante
                  </p>
                </div>
                <input
                  id="trip-helper-check"
                  type="checkbox"
                  checked={newRequiresHelper}
                  onChange={e => setNewRequiresHelper(e.target.checked)}
                  className="w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Total Ruta sin IVA (ARS) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  placeholder="Ej: 153000"
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  className="w-full mono text-[13px] font-semibold p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
                {isPackageService && activeServiceTariff && newPackages && (
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Cálculo: {newPackages} paquetes × ${activeServiceTariff.rate.toLocaleString('es-AR')} = {currency(Number(newRate) || 0)}
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white hover:bg-[#F3F4F6] text-[#4B5563] text-[12px] font-semibold rounded-lg border border-[#E5E7EB] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Guardando...' : 'Guardar flete'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Administrar Tarifario Maestro */}
      <TariffModal
        isOpen={showTariffModal}
        onClose={() => setShowTariffModal(false)}
        tariffs={tariffs}
        onSaveTariffs={updated => {
          if (onUpdateTariffs) onUpdateTariffs(updated);
        }}
      />
    </div>
  );
};
