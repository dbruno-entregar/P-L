import React, { useState, useMemo, useEffect } from 'react';
import { Tariff, TariffPricingType } from '../types';
import { currency, formatNumber } from '../utils/formatters';
import { exportTariffsToExcel, downloadTariffsExcelTemplate } from '../services/excelService';
import { isAllowedTariff } from '../services/supabaseService';
import {
  Search,
  Plus,
  X,
  Check,
  Download,
  Percent,
  Sparkles,
  Package,
  Route,
  Truck,
  UserCheck,
  Building,
  MapPin,
  Edit2,
  Trash2,
  Copy,
  Tag,
  Filter,
  Gauge,
} from 'lucide-react';

interface TariffsViewProps {
  tariffs: Tariff[];
  onUpdateTariffs: (newTariffs: Tariff[]) => void;
  onGoToTrips?: () => void;
  onGoToServices?: () => void;
}

const DEFAULT_MODALITIES = [
  'Última milla',
  'Primera milla',
  'Dropoff',
  'Distribución Retail / Tiendas',
  'Troncal / Larga Distancia',
  'Crossdocking',
  'Transferencia entre Hubs',
  'Logística Inversa',
];

const PRESET_VEHICLES = [
  'Camioneta',
  'Utilitario',
  'Chasis',
  'Semi',
  'Cualquier vehículo / General',
];

const COMMON_SITES = [
  'Site Mercado Libre Tablada',
  'Hub Pompeya (CABA)',
  'Base Operativa Central',
  'ARBA01 - Mercado Libre',
  'ARBA02 - Mercado Libre',
  'ARXCF1 - Mercado Libre',
];

export const TariffsView: React.FC<TariffsViewProps> = ({
  tariffs,
  onUpdateTariffs,
  onGoToTrips,
  onGoToServices,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [selectedModalityFilter, setSelectedModalityFilter] = useState('all');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('all');
  const [selectedPricingTypeFilter, setSelectedPricingTypeFilter] = useState<'all' | 'route' | 'package'>('all');
  const [selectedHelperFilter, setSelectedHelperFilter] = useState<'all' | 'with-helper' | 'without-helper'>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedClientFilter, selectedModalityFilter, selectedVehicleFilter, selectedPricingTypeFilter, selectedHelperFilter]);

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formClient, setFormClient] = useState('');
  const [formService, setFormService] = useState('');
  const [formPricingType, setFormPricingType] = useState<TariffPricingType>('route');
  const [formModality, setFormModality] = useState('Última milla');
  const [isCustomModality, setIsCustomModality] = useState(false);
  const [customModalityInput, setCustomModalityInput] = useState('');
  const [formVehicleType, setFormVehicleType] = useState(PRESET_VEHICLES[0]);
  const [formOriginSite, setFormOriginSite] = useState('');
  const [formRequiresHelper, setFormRequiresHelper] = useState(false);
  const [formEstimatedKm, setFormEstimatedKm] = useState('');
  const [formRate, setFormRate] = useState('165000');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Percent adjustment modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustPercent, setAdjustPercent] = useState<number>(10);
  const [adjustScope, setAdjustScope] = useState<'all' | 'route' | 'package'>('all');
  const [adjustClient, setAdjustClient] = useState('all');

  // Close form on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFormOpen) {
        setIsFormOpen(false);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen]);

  const cleanTariffs = useMemo(() => {
    return tariffs.filter(isAllowedTariff);
  }, [tariffs]);

  // Unique clients and modalities collected from tariffs
  const allClients = useMemo(() => {
    const set = new Set<string>();
    cleanTariffs.forEach(t => {
      if (t.client && t.client.trim()) set.add(t.client.trim());
    });
    return Array.from(set).sort();
  }, [cleanTariffs]);

  const allModalities = useMemo(() => {
    const set = new Set<string>(DEFAULT_MODALITIES);
    cleanTariffs.forEach(t => {
      if (t.modality && t.modality.trim()) set.add(t.modality.trim());
    });
    return Array.from(set).sort();
  }, [cleanTariffs]);

  const allVehicleTypes = useMemo(() => {
    const set = new Set<string>(PRESET_VEHICLES);
    cleanTariffs.forEach(t => {
      if (t.vehicleType && t.vehicleType.trim()) set.add(t.vehicleType.trim());
    });
    return Array.from(set).sort();
  }, [cleanTariffs]);

  const allSites = useMemo(() => {
    const set = new Set<string>(COMMON_SITES);
    cleanTariffs.forEach(t => {
      if (t.originSite && t.originSite.trim()) set.add(t.originSite.trim());
    });
    return Array.from(set).sort();
  }, [cleanTariffs]);

  // Filtered tariffs
  const filteredTariffs = useMemo(() => {
    return cleanTariffs.filter(t => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const matchService = t.service.toLowerCase().includes(q);
        const matchClient = (t.client || '').toLowerCase().includes(q);
        const matchModality = (t.modality || '').toLowerCase().includes(q);
        const matchSite = (t.originSite || '').toLowerCase().includes(q);
        const matchVehicle = (t.vehicleType || '').toLowerCase().includes(q);
        if (!matchService && !matchClient && !matchModality && !matchSite && !matchVehicle) {
          return false;
        }
      }

      // Client filter
      if (selectedClientFilter !== 'all') {
        if ((t.client || '').toLowerCase() !== selectedClientFilter.toLowerCase()) return false;
      }

      // Modality filter
      if (selectedModalityFilter !== 'all') {
        if ((t.modality || '').toLowerCase() !== selectedModalityFilter.toLowerCase()) return false;
      }

      // Vehicle Type filter
      if (selectedVehicleFilter !== 'all') {
        if ((t.vehicleType || '').toLowerCase() !== selectedVehicleFilter.toLowerCase()) return false;
      }

      // Pricing Type
      if (selectedPricingTypeFilter !== 'all') {
        if (t.pricingType !== selectedPricingTypeFilter) return false;
      }

      // Helper
      if (selectedHelperFilter === 'with-helper') {
        if (!t.requiresHelper) return false;
      } else if (selectedHelperFilter === 'without-helper') {
        if (t.requiresHelper) return false;
      }

      return true;
    });
  }, [
    tariffs,
    searchTerm,
    selectedClientFilter,
    selectedModalityFilter,
    selectedVehicleFilter,
    selectedPricingTypeFilter,
    selectedHelperFilter,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const total = cleanTariffs.length;
    const routeCount = cleanTariffs.filter(t => t.pricingType === 'route').length;
    const packageCount = cleanTariffs.filter(t => t.pricingType === 'package').length;
    const withHelperCount = cleanTariffs.filter(t => t.requiresHelper).length;

    const routeTariffs = cleanTariffs.filter(t => t.pricingType === 'route');
    const avgRouteRate = routeTariffs.length > 0
      ? Math.round(routeTariffs.reduce((sum, t) => sum + t.rate, 0) / routeTariffs.length)
      : 0;

    const packageTariffs = cleanTariffs.filter(t => t.pricingType === 'package');
    const avgPackageRate = packageTariffs.length > 0
      ? Math.round(packageTariffs.reduce((sum, t) => sum + t.rate, 0) / packageTariffs.length)
      : 0;

    return {
      total,
      routeCount,
      packageCount,
      withHelperCount,
      avgRouteRate,
      avgPackageRate,
      clientsCount: allClients.length,
    };
  }, [cleanTariffs, allClients]);

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormClient('');
    setFormService('');
    setFormPricingType('route');
    setFormModality('Última milla');
    setIsCustomModality(false);
    setCustomModalityInput('');
    setFormVehicleType(PRESET_VEHICLES[0]);
    setFormOriginSite('Site Mercado Libre Tablada');
    setFormRequiresHelper(false);
    setFormEstimatedKm('');
    setFormRate('165000');
    setFormDescription('');
    setFormNotes('');
    setIsFormOpen(true);
  };

  const handleStartEdit = (t: Tariff) => {
    setEditingId(t.id);
    setFormClient(t.client || '');
    setFormService(t.service || '');
    setFormPricingType(t.pricingType || 'route');

    if (t.modality && !DEFAULT_MODALITIES.includes(t.modality)) {
      setFormModality('custom');
      setIsCustomModality(true);
      setCustomModalityInput(t.modality);
    } else {
      setFormModality(t.modality || 'Última milla');
      setIsCustomModality(false);
      setCustomModalityInput('');
    }

    setFormVehicleType(t.vehicleType || PRESET_VEHICLES[0]);
    setFormOriginSite(t.originSite || '');
    setFormRequiresHelper(Boolean(t.requiresHelper));
    setFormEstimatedKm(t.estimatedKm !== undefined && t.estimatedKm !== null ? String(t.estimatedKm) : '');
    setFormRate(String(t.rate || (t.pricingType === 'package' ? 1800 : 165000)));
    setFormDescription(t.description || '');
    setFormNotes(t.notes || '');
    setIsFormOpen(true);
  };

  const handleDuplicate = (t: Tariff) => {
    const duplicated: Tariff = {
      ...t,
      id: `tar-${Date.now()}`,
      service: `${t.service} (Copia)`,
      estimatedKm: t.estimatedKm,
    };
    onUpdateTariffs([...cleanTariffs, duplicated]);
  };

  const handleDelete = (id: string) => {
    const target = cleanTariffs.find(t => t.id === id);
    const label = target ? `${target.service} (${target.client || 'Sin cliente'})` : 'esta tarifa';
    if (window.confirm(`¿Confirmás eliminar ${label} del tarifario maestro?`)) {
      onUpdateTariffs(cleanTariffs.filter(t => t.id !== id));
    }
  };

  const handleToggleHelperInline = (id: string) => {
    const updated = cleanTariffs.map(t =>
      t.id === id ? { ...t, requiresHelper: !t.requiresHelper } : t
    );
    onUpdateTariffs(updated);
  };

  const handlePricingTypeChange = (type: TariffPricingType) => {
    setFormPricingType(type);
    if (type === 'package') {
      if (Number(formRate) > 10000) {
        setFormRate('1800');
      }
    } else {
      if (Number(formRate) < 5000) {
        setFormRate('165000');
      }
    }
  };

  const handleModalitySelectChange = (val: string) => {
    if (val === '__custom__') {
      setIsCustomModality(true);
      setFormModality('__custom__');
    } else {
      setIsCustomModality(false);
      setFormModality(val);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formService.trim()) {
      alert('Por favor indicá el nombre del servicio o recorrido.');
      return;
    }

    const finalModality = isCustomModality
      ? (customModalityInput.trim() || 'Modalidad Personalizada')
      : formModality;

    const finalClient = formClient.trim() || formService.trim();
    const finalRate = Math.max(0, Number(formRate) || 0);
    const finalEstimatedKm = formEstimatedKm.trim() ? Math.max(0, Number(formEstimatedKm)) : undefined;

    if (editingId) {
      // Update
      const updated = cleanTariffs.map(t =>
        t.id === editingId
          ? {
            ...t,
            client: finalClient,
            service: formService.trim(),
            pricingType: formPricingType,
            modality: finalModality,
            vehicleType: formVehicleType.trim() || undefined,
            originSite: formOriginSite.trim() || undefined,
            requiresHelper: formRequiresHelper,
            estimatedKm: finalEstimatedKm,
            rate: finalRate,
            description: formDescription.trim() || undefined,
            notes: formNotes.trim() || undefined,
          }
          : t
      );
      onUpdateTariffs(updated);
    } else {
      // Create
      const newTariff: Tariff = {
        id: `tar-${Date.now()}`,
        client: finalClient,
        service: formService.trim(),
        pricingType: formPricingType,
        modality: finalModality,
        vehicleType: formVehicleType.trim() || undefined,
        originSite: formOriginSite.trim() || undefined,
        requiresHelper: formRequiresHelper,
        estimatedKm: finalEstimatedKm,
        rate: finalRate,
        description:
          formDescription.trim() ||
          (formPricingType === 'package'
            ? `Tarifa por paquete ($${finalRate}/pqt) - ${finalModality}`
            : `Tarifa por ruta ($${finalRate.toLocaleString('es-AR')}) - ${finalModality}`),
        notes: formNotes.trim() || undefined,
      };
      onUpdateTariffs([...cleanTariffs, newTariff]);
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleApplyPercentAdjust = () => {
    if (!adjustPercent || isNaN(adjustPercent)) return;
    const factor = 1 + adjustPercent / 100;

    const updated = cleanTariffs.map(t => {
      // Check scope
      if (adjustScope !== 'all' && t.pricingType !== adjustScope) return t;
      if (adjustClient !== 'all' && (t.client || '').toLowerCase() !== adjustClient.toLowerCase()) {
        return t;
      }

      const newRate =
        t.pricingType === 'package'
          ? Math.round(t.rate * factor)
          : Math.round((t.rate * factor) / 100) * 100;

      return {
        ...t,
        rate: Math.max(0, newRate),
      };
    });

    onUpdateTariffs(updated);
    setIsAdjustOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section with title and actions */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200 uppercase tracking-wider">
                <Tag className="w-3 h-3" />
                Tarifario Maestro
              </span>
              <span className="text-[12px] text-[#6B7280]">
                {stats.total} tarifas comerciales configuradas
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] tracking-tight">
              Tarifario de Servicios y Clientes
            </h1>
            <p className="text-[13.5px] text-[#6B7280] max-w-3xl mt-1 leading-relaxed">
              Definí y administrá el esquema de facturación para cada servicio de acuerdo al <strong>cliente</strong>, <strong>tipo de cobro</strong> (por ruta o por paquete), <strong>modalidad logística</strong>, <strong>tipo de vehículo</strong> y <strong>site de carga</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              id="btn-new-tariff"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Servicio / Tarifa</span>
            </button>

            <button
              id="btn-adjust-tariffs-percent"
              onClick={() => setIsAdjustOpen(true)}
              className="px-3.5 py-2.5 bg-white border border-[#D1D5DB] hover:border-gray-400 text-[#374151] rounded-xl text-[13px] font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Aumentar o ajustar tarifas por porcentaje"
            >
              <Percent className="w-3.5 h-3.5 text-blue-600" />
              <span>Ajuste (%)</span>
            </button>

            <button
              id="btn-download-tariff-template"
              onClick={downloadTariffsExcelTemplate}
              className="px-3 py-2.5 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#4B5563] rounded-xl text-[12.5px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar plantilla de tarifario en Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plantilla</span>
            </button>

            <button
              id="btn-export-tariffs-excel"
              onClick={() => exportTariffsToExcel(tariffs)}
              className="px-3 py-2.5 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#4B5563] rounded-xl text-[12.5px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Exportar listado completo de tarifas a Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Key Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[#F3F4F6]">
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
              Clientes Activos
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[20px] font-bold text-[#1E293B]">
                {stats.clientsCount}
              </span>
              <span className="text-[11px] text-[#64748B]">cuentas</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
              Por Ruta Fija
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[20px] font-bold text-[#2563EB]">
                {stats.routeCount}
              </span>
              <span className="text-[11px] text-[#64748B]">
                (prom. {currency(stats.avgRouteRate)})
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
              Por Paquete
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[20px] font-bold text-emerald-700">
                {stats.packageCount}
              </span>
              <span className="text-[11px] text-[#64748B]">
                (prom. {currency(stats.avgPackageRate)}/pqt)
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
              Con Acompañante
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[20px] font-bold text-indigo-700">
                {stats.withHelperCount}
              </span>
              <span className="text-[11px] text-[#64748B]">servicios</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
              Asociación Automática
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[12px] text-emerald-800 font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Activa en Excel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal Dialog for Create or Edit */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fade-in"
          onClick={() => {
            setIsFormOpen(false);
            setEditingId(null);
          }}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xl relative max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4 mb-6 sticky top-0 bg-white z-10 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
                  {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#1A1A1A]">
                    {editingId ? 'Editar Servicio / Tarifa' : 'Alta de Nuevo Servicio en el Tarifario'}
                  </h2>
                  <p className="text-[12.5px] text-[#6B7280]">
                    Completá los parámetros del servicio para tarificar automáticamente cada flete.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-6">
              {/* Grid 1: Cliente & Nombre del Servicio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    Cliente / Empresa Contratante *
                  </label>
                  <div className="relative">
                    <input
                      id="input-tariff-client"
                      type="text"
                      list="clients-datalist"
                      value={formClient}
                      onChange={e => setFormClient(e.target.value)}
                      placeholder="Ej. Mercado Libre, Andreani, Cencosud..."
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13.5px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                      required
                    />
                    <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <datalist id="clients-datalist">
                    {allClients.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Identifica a la empresa o dador de carga.
                  </span>
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    Nombre del Servicio / Recorrido *
                  </label>
                  <input
                    id="input-tariff-service"
                    type="text"
                    value={formService}
                    onChange={e => setFormService(e.target.value)}
                    placeholder="Ej. Mercado Libre - Última Milla CABA"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13.5px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    required
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Nombre con el que figura en el Excel de viajes o en los remitos.
                  </span>
                </div>
              </div>

              {/* Grid 2: Tipo de Tarifa (Ruta vs Paquetes) & Valor Pactado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-2">
                    Tipo de Cobro *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handlePricingTypeChange('route')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${formPricingType === 'route'
                        ? 'border-[#2563EB] bg-blue-50/50 text-[#1E3A8A] ring-2 ring-blue-500/20'
                        : 'border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-gray-50'
                        }`}
                    >
                      <Route className={`w-4 h-4 mt-0.5 ${formPricingType === 'route' ? 'text-[#2563EB]' : 'text-gray-400'}`} />
                      <div>
                        <span className="text-[12.5px] font-bold block">Por Ruta Fija</span>
                        <span className="text-[11px] text-[#6B7280]">Monto por flete o jornada</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePricingTypeChange('package')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${formPricingType === 'package'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-gray-50'
                        }`}
                    >
                      <Package className={`w-4 h-4 mt-0.5 ${formPricingType === 'package' ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <div>
                        <span className="text-[12.5px] font-bold block">Por Paquete</span>
                        <span className="text-[11px] text-[#6B7280]">Monto por bulto entregado</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    {formPricingType === 'package' ? (
                      <span className="flex items-center gap-1.5 text-emerald-900">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span>Valor por Paquete Entregado (ARS) *</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#1E3A8A]">
                        <Route className="w-4 h-4 text-[#2563EB]" />
                        <span>Valor por Ruta / Jornada Completa (ARS) *</span>
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-500 font-semibold text-[14px]">$</span>
                    <input
                      id="input-tariff-rate"
                      type="number"
                      min="0"
                      step="1"
                      value={formRate}
                      onChange={e => setFormRate(e.target.value)}
                      placeholder={formPricingType === 'package' ? '1800' : '165000'}
                      className={`w-full pl-8 pr-3.5 py-2.5 bg-white border rounded-xl text-[14px] font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 ${formPricingType === 'package'
                        ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                        : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      required
                    />
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    {formPricingType === 'package'
                      ? 'Tarifa que se multiplica automáticamente por la cantidad de entregados en el viaje.'
                      : 'Tarifa fija acordada para el flete o recorrido sin IVA.'}
                  </span>
                </div>
              </div>

              {/* Grid 3: Modalidad Operativa (con desplegable + opción para incluir nueva) & Tipo de Vehículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    Modalidad Operativa *
                  </label>
                  <select
                    id="select-tariff-modality"
                    value={isCustomModality ? '__custom__' : formModality}
                    onChange={e => handleModalitySelectChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13.5px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <optgroup label="Modalidades predeterminadas">
                      {allModalities.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </optgroup>
                    <option value="__custom__">➕ Otra modalidad (incluir nueva)...</option>
                  </select>

                  {/* Campo extra si seleccionó incluir una nueva modalidad */}
                  {isCustomModality && (
                    <div className="mt-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl animate-fade-in">
                      <label className="block text-[11.5px] font-bold text-blue-900 mb-1">
                        Escribí el nombre de la nueva modalidad:
                      </label>
                      <input
                        id="input-custom-modality"
                        type="text"
                        value={customModalityInput}
                        onChange={e => setCustomModalityInput(e.target.value)}
                        placeholder="Ej. Inbound Express, Reparto Nocturno, etc."
                        className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <span className="text-[10.5px] text-blue-700 mt-1 block">
                        Esta nueva modalidad quedará guardada y disponible en el desplegable.
                      </span>
                    </div>
                  )}
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Ej. Primera milla, última milla, dropoff, transferencias, etc.
                  </span>
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    Tipo de Vehículo Requerido *
                  </label>
                  <div className="relative">
                    <select
                      id="select-tariff-vehicle"
                      value={formVehicleType}
                      onChange={e => setFormVehicleType(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13.5px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      {PRESET_VEHICLES.map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Truck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Porte o categoría de unidad asignada para este servicio.
                  </span>
                </div>
              </div>

              {/* Grid 4: Site donde cargan las unidades & Km Aprox (Opcional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    Site de Carga / Salida de Unidades *
                  </label>
                  <div className="relative">
                    <input
                      id="input-tariff-site"
                      type="text"
                      list="sites-datalist"
                      value={formOriginSite}
                      onChange={e => setFormOriginSite(e.target.value)}
                      placeholder="Ej. Site Mercado Libre Tablada, Planta Benavídez..."
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13.5px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <datalist id="sites-datalist">
                    {allSites.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Depósito, hub, centro de distribución o planta donde cargan las unidades.
                  </span>
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-slate-500" />
                      <span>Km Aproximados del Recorrido</span>
                    </span>
                    <span className="text-[11px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      Opcional (no es requisito)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-tariff-km"
                      type="number"
                      min="0"
                      step="1"
                      value={formEstimatedKm}
                      onChange={e => setFormEstimatedKm(e.target.value)}
                      placeholder="Ej. 85 (dejar vacío si varía)"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13.5px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <Gauge className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <span className="absolute right-3.5 top-2.5 text-gray-400 text-[12px] font-medium">km</span>
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Distancia estimada. Dejá vacío si varía; se usa para estimar combustible en fletes sin km cargados.
                  </span>
                </div>
              </div>

              {/* Grid 5: Checkbox Acompañante & Descripción */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Checkbox Acompañante / Ayudante */}
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                  <div>
                    <label htmlFor="form-helper-checkbox" className="text-[13px] font-bold text-[#1E293B] flex items-center gap-2 cursor-pointer">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Requiere Acompañante</span>
                    </label>
                    <p className="text-[11.5px] text-[#64748B] mt-0.5 mb-0">
                      Marcá esta casilla si el servicio exige chofer + peón / ayudante a bordo.
                    </p>
                  </div>
                  <input
                    id="form-helper-checkbox"
                    type="checkbox"
                    checked={formRequiresHelper}
                    onChange={e => setFormRequiresHelper(e.target.checked)}
                    className="w-5 h-5 text-[#2563EB] rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Descripción opcional */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1A1A] mb-1.5">
                    Descripción Comercial / Observaciones (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Ej. Incluye peajes y descarga en planta; jornada de 8 hs."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[13px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Aclaraciones contractuales, horarios pactados o condiciones especiales.
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 text-[13px] font-semibold text-[#4B5563] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-tariff-form"
                  type="submit"
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Guardar Modificaciones' : 'Guardar en Tarifario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and search toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              id="search-tariffs-input"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, servicio, site de carga, modalidad o vehículo..."
              className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[13px] text-[#1A1A1A] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Client */}
            <select
              value={selectedClientFilter}
              onChange={e => setSelectedClientFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-[12px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Todos los clientes</option>
              {allClients.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Filter by Modality */}
            <select
              value={selectedModalityFilter}
              onChange={e => setSelectedModalityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-[12px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Todas las modalidades</option>
              {allModalities.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Filter by Vehicle Type */}
            <select
              id="select-vehicle-filter"
              value={selectedVehicleFilter}
              onChange={e => setSelectedVehicleFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-[12px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Todos los vehículos</option>
              {allVehicleTypes.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Filter by Pricing Type */}
            <select
              value={selectedPricingTypeFilter}
              onChange={e => setSelectedPricingTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-[12px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Por Ruta & Por Paquete</option>
              <option value="route">Solo Por Ruta</option>
              <option value="package">Solo Por Paquete</option>
            </select>

            {/* Filter by Helper */}
            <select
              value={selectedHelperFilter}
              onChange={e => setSelectedHelperFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-[#D1D5DB] rounded-xl text-[12px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Con & Sin Acompañante</option>
              <option value="with-helper">Solo Con Acompañante</option>
              <option value="without-helper">Sin Acompañante</option>
            </select>
          </div>
        </div>

        {/* Active filters indicators */}
        {(searchTerm || selectedClientFilter !== 'all' || selectedModalityFilter !== 'all' || selectedVehicleFilter !== 'all' || selectedPricingTypeFilter !== 'all' || selectedHelperFilter !== 'all') && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#F3F4F6] text-[11.5px] text-[#6B7280]">
            <Filter className="w-3 h-3 text-[#2563EB]" />
            <span>Mostrando {filteredTariffs.length} de {tariffs.length} tarifas</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedClientFilter('all');
                setSelectedModalityFilter('all');
                setSelectedVehicleFilter('all');
                setSelectedPricingTypeFilter('all');
                setSelectedHelperFilter('all');
              }}
              className="text-[#2563EB] hover:underline font-semibold ml-2 cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Main Tariffs Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11.5px] font-bold text-[#475569] uppercase tracking-wider">
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Servicio / Recorrido</th>
                <th className="py-3.5 px-4">Modalidad</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Site de Carga</th>
                <th className="py-3.5 px-4 text-center">Km Aprox</th>
                <th className="py-3.5 px-4">Vehículo</th>
                <th className="py-3.5 px-4 text-center">Acompañante</th>
                <th className="py-3.5 px-4 text-right">Tarifa Pactada</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredTariffs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#6B7280]">
                    <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-[14px] text-[#1A1A1A]">No se encontraron tarifas</p>
                    <p className="text-[12.5px] text-[#6B7280] mt-0.5">
                      Probá ajustando la búsqueda o creá una nueva tarifa con el botón superior.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTariffs
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map(t => {
                  const isPackage = t.pricingType === 'package';
                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-semibold text-[#1E293B]">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t.client || 'Varios'}</span>
                        </div>
                      </td>

                      {/* Servicio */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#0F172A] block">{t.service}</span>
                        {t.description && (
                          <span className="text-[11px] text-[#64748B] line-clamp-1">
                            {t.description}
                          </span>
                        )}
                      </td>

                      {/* Modalidad */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                          {t.modality || 'Última milla'}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4">
                        {isPackage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Package className="w-3 h-3 text-emerald-600" />
                            <span>Por Paquete</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Route className="w-3 h-3 text-blue-600" />
                            <span>Por Ruta</span>
                          </span>
                        )}
                      </td>

                      {/* Site de Carga */}
                      <td className="py-3.5 px-4 text-[#334155]">
                        <div className="flex items-center gap-1 text-[12px]">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[180px]" title={t.originSite || 'No especificado'}>
                            {t.originSite || 'Base Operativa'}
                          </span>
                        </div>
                      </td>

                      {/* Km Aprox (Opcional) */}
                      <td className="py-3.5 px-4 text-center">
                        {t.estimatedKm !== undefined && t.estimatedKm > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                            title="Km aproximados estimados para este servicio (opcional)"
                          >
                            <Gauge className="w-3 h-3 text-slate-500" />
                            <span>{t.estimatedKm} km</span>
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF] text-[12px] italic" title="No especificado (no es requisito)">
                            —
                          </span>
                        )}
                      </td>

                      {/* Vehículo */}
                      <td className="py-3.5 px-4 text-[#334155]">
                        <div className="flex items-center gap-1 text-[12px]">
                          <Truck className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[160px]" title={t.vehicleType || 'Cualquiera'}>
                            {t.vehicleType ? t.vehicleType.split('(')[0].trim() : 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Acompañante con Checkbox interactivo */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleHelperInline(t.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${t.requiresHelper
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                            : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                          title="Hacé clic para cambiar si requiere acompañante"
                        >
                          {t.requiresHelper ? (
                            <>
                              <Check className="w-3 h-3 text-indigo-600" />
                              <span>SÍ</span>
                            </>
                          ) : (
                            <span>NO</span>
                          )}
                        </button>
                      </td>

                      {/* Tarifa Pactada */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-bold text-[14px] ${isPackage ? 'text-emerald-700' : 'text-[#1E293B]'}`}>
                          {currency(t.rate)}
                        </span>
                        <span className="block text-[10.5px] text-[#64748B] font-medium">
                          {isPackage ? '/ paquete' : '/ ruta completa'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(t)}
                            className="p-1.5 text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar esta tarifa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(t)}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Duplicar tarifa"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar tarifa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredTariffs.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#F8FAFC] border-t border-[#E5E7EB] text-[12px] text-[#6B7280]">
            <div>
              Mostrando <strong className="text-[#1A1A1A]">{(page - 1) * pageSize + 1}</strong> - <strong className="text-[#1A1A1A]">{Math.min(page * pageSize, filteredTariffs.length)}</strong> de <strong className="text-[#1A1A1A]">{filteredTariffs.length}</strong> tarifas
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
                Pág {page} de {Math.ceil(filteredTariffs.length / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(filteredTariffs.length / pageSize)}
                onClick={() => setPage(prev => Math.min(Math.ceil(filteredTariffs.length / pageSize), prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1A1A1A] font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Ajuste por Porcentaje */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#1A1A1A]">
                  Ajuste Masivo de Tarifas
                </h3>
              </div>
              <button
                onClick={() => setIsAdjustOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-[#6B7280] mb-4">
              Aplicá una variación porcentual por paritarias, inflación o renegociación contractual.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Porcentaje de Variación (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={adjustPercent}
                    onChange={e => setAdjustPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-[14px] font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-gray-400 text-[13px] font-bold">%</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 15, 20].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAdjustPercent(p)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${adjustPercent === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      +{p}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Alcance por Tipo de Cobro
                </label>
                <select
                  value={adjustScope}
                  onChange={e => setAdjustScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-[13px] text-[#1A1A1A]"
                >
                  <option value="all">Todas las tarifas (Rutas y Paquetes)</option>
                  <option value="route">Solo tarifas por Ruta Fija</option>
                  <option value="package">Solo tarifas por Paquete</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Filtrar por Cliente
                </label>
                <select
                  value={adjustClient}
                  onChange={e => setAdjustClient(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-[13px] text-[#1A1A1A]"
                >
                  <option value="all">Todos los clientes</option>
                  {allClients.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyPercentAdjust}
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar {adjustPercent >= 0 ? `+${adjustPercent}%` : `${adjustPercent}%`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
