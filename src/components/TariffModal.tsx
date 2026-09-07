import React, { useState } from 'react';
import { Tariff, TariffPricingType } from '../types';
import { currency } from '../utils/formatters';
import { downloadTripsExcelTemplate } from '../services/excelService';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Download,
  Percent,
  Sparkles,
  Info,
  Package,
  Route,
  Truck,
  UserCheck,
} from 'lucide-react';

interface TariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  tariffs: Tariff[];
  onSaveTariffs: (newTariffs: Tariff[]) => void;
}

const PRESET_VEHICLES = [
  { label: '🚐 Furgón Grande', value: 'Furgón Grande (Hiace / Master / Sprinter)' },
  { label: '🚙 Furgón Mediano', value: 'Furgón Mediano (Kangoo / Partner / Expert)' },
  { label: '🚗 Furgón Chico', value: 'Furgón Chico (Berlingo / Fiorino)' },
  { label: '🚚 Camión Liviano', value: 'Chasis / Camión Liviano' },
  { label: '🌐 General', value: 'Cualquier vehículo' },
];

export const TariffModal: React.FC<TariffModalProps> = ({
  isOpen,
  onClose,
  tariffs,
  onSaveTariffs,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editPricingType, setEditPricingType] = useState<TariffPricingType>('route');
  const [editVehicleType, setEditVehicleType] = useState<string>('');
  const [editRequiresHelper, setEditRequiresHelper] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPercentAdjust, setShowPercentAdjust] = useState(false);
  const [percentValue, setPercentValue] = useState<number>(10);

  // Add form state
  const [newService, setNewService] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newPricingType, setNewPricingType] = useState<TariffPricingType>('route');
  const [newVehicleType, setNewVehicleType] = useState<string>('Furgón Grande (Hiace / Master / Sprinter)');
  const [newRequiresHelper, setNewRequiresHelper] = useState<boolean>(false);
  const [newRate, setNewRate] = useState<string>('165000');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (t: Tariff) => {
    setEditingId(t.id);
    setEditRate(t.rate);
    setEditPricingType(t.pricingType || (t.service.toLowerCase().includes('entregar') ? 'package' : 'route'));
    setEditVehicleType(t.vehicleType || '');
    setEditRequiresHelper(Boolean(t.requiresHelper));
  };

  const handleSaveEdit = (id: string) => {
    const updated = tariffs.map(t =>
      t.id === id
        ? {
            ...t,
            rate: Math.max(0, editRate),
            pricingType: editPricingType,
            vehicleType: editVehicleType.trim() || undefined,
            requiresHelper: editRequiresHelper,
          }
        : t
    );
    onSaveTariffs(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este servicio del tarifario maestro?')) {
      const updated = tariffs.filter(t => t.id !== id);
      onSaveTariffs(updated);
    }
  };

  const handleServiceChange = (val: string) => {
    setNewService(val);
    const low = val.toLowerCase();
    if (low.includes('entregar') || low.includes('paquet') || low.includes('ultima milla')) {
      if (newPricingType !== 'package') {
        setNewPricingType('package');
        if (newRate === '165000' || Number(newRate) > 10000) {
          setNewRate('1800');
        }
      }
    }
  };

  const handlePricingTypeSelect = (type: TariffPricingType) => {
    setNewPricingType(type);
    if (type === 'package') {
      if (Number(newRate) > 10000) {
        setNewRate('1800');
      }
    } else if (type === 'route') {
      if (Number(newRate) < 5000) {
        setNewRate('165000');
      }
    }
  };

  const handleAddTariff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.trim()) return;

    const newTariffItem: Tariff = {
      id: `tar-${Date.now()}`,
      service: newService.trim(),
      client: newClient.trim() || newService.trim(),
      vehicleType: newVehicleType.trim() || undefined,
      requiresHelper: newRequiresHelper,
      rate: Math.max(0, Number(newRate) || 0),
      pricingType: newPricingType,
      description:
        newDesc.trim() ||
        (newPricingType === 'package'
          ? 'Tarifa por paquete entregado'
          : `Tarifa por ruta - ${newVehicleType.trim() || 'General'}`),
    };

    onSaveTariffs([...tariffs, newTariffItem]);
    setNewService('');
    setNewClient('');
    setNewPricingType('route');
    setNewVehicleType('Furgón Grande (Hiace / Master / Sprinter)');
    setNewRequiresHelper(false);
    setNewRate('165000');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleApplyPercentAdjust = () => {
    if (!percentValue || isNaN(percentValue)) return;
    const factor = 1 + percentValue / 100;
    const updated = tariffs.map(t => ({
      ...t,
      // Si es por paquete redondea a enteros, si es por ruta redondea a decenas o centenas
      rate:
        t.pricingType === 'package'
          ? Math.round(t.rate * factor)
          : Math.round((t.rate * factor) / 100) * 100,
    }));
    onSaveTariffs(updated);
    setShowPercentAdjust(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5E7EB] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EFF6FF] text-[#2563EB] rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#1A1A1A] m-0">
                Tarifario Maestro de Servicios
              </h2>
              <p className="text-[13px] text-[#6B7280] m-0">
                Definí tarifas fijas por ruta diferenciadas por tipo de vehículo, o variables por paquete entregado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="mx-6 mt-4 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-start gap-2.5 text-[12.5px] text-[#166534]">
          <Sparkles className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
          <div>
            <strong>Tarifas por ruta según vehículo:</strong> En servicios que se pagan por ruta, la tarifa pactada varía según el porte o capacidad de la unidad (ej. Furgón Grande, Mediano, Chico o Camión). Podés dar de alta múltiples tarifas para el mismo cliente según el vehículo necesario.
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo servicio</span>
            </button>

            <button
              onClick={() => setShowPercentAdjust(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F9FAFB] text-[#374151] border border-[#D1D5DB] text-[12px] font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Ajuste porcentual de inflación o paritarias"
            >
              <Percent className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Ajustar % inflación</span>
            </button>
          </div>

          <button
            onClick={() => downloadTripsExcelTemplate(tariffs)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1F2937] text-[12px] font-semibold rounded-lg transition-colors cursor-pointer"
            title="Descarga la plantilla con columnas: Fecha | Ruta | Servicio | Patente | Entregados | Tipo de vehiculo | Propiedad | Total ruta"
          >
            <Download className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>Descargar Plantilla Excel</span>
          </button>
        </div>

        {/* Form to adjust % inflation */}
        {showPercentAdjust && (
          <div className="mx-6 my-2 p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1E40AF]">Aumentar todas las tarifas:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={percentValue}
                  onChange={e => setPercentValue(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-[#93C5FD] rounded text-[13px] font-bold text-center"
                />
                <span className="font-bold text-[#1E40AF]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPercentAdjust(false)}
                className="px-2.5 py-1 text-[12px] text-[#4B5563] hover:bg-white/60 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyPercentAdjust}
                className="px-3 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded shadow-xs cursor-pointer"
              >
                Aplicar aumento masivo
              </button>
            </div>
          </div>
        )}

        {/* Form to add a new service */}
        {showAddForm && (
          <form onSubmit={handleAddTariff} className="mx-6 my-2 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#1A1A1A] m-0">
                Alta de nuevo servicio / cliente en el tarifario
              </h4>
              <span className="text-[11px] text-[#6B7280]">
                * Campos requeridos
              </span>
            </div>
            
            {/* Selector de Modalidad: Por Ruta vs Por Paquete */}
            <div>
              <label className="block text-[11.5px] font-semibold text-[#374151] mb-1.5">
                Modalidad de Cobro *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePricingTypeSelect('route')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-[12.5px] font-semibold transition-all cursor-pointer ${
                    newPricingType === 'route'
                      ? 'bg-white border-[#2563EB] text-[#2563EB] shadow-xs ring-2 ring-[#2563EB]/10'
                      : 'bg-[#F3F4F6] border-transparent text-[#6B7280] hover:bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <Route className="w-4 h-4" />
                  <div className="text-left">
                    <span className="block">Por Ruta fija ($ / jornada)</span>
                    <span className="text-[10px] font-normal opacity-80">La tarifa varía según el vehículo necesario</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePricingTypeSelect('package')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-[12.5px] font-semibold transition-all cursor-pointer ${
                    newPricingType === 'package'
                      ? 'bg-emerald-50 border-[#10B981] text-[#047857] shadow-xs ring-2 ring-[#10B981]/10'
                      : 'bg-[#F3F4F6] border-transparent text-[#6B7280] hover:bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <div className="text-left">
                    <span className="block">Por Paquete ($ / unidad)</span>
                    <span className="text-[10px] font-normal opacity-80">Total ruta = paquetes entregados × tarifa</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  placeholder="ej. Andreani, Mercado Libre, Cencosud..."
                  value={newService}
                  onChange={e => handleServiceChange(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Cliente / Empresa</label>
                <input
                  type="text"
                  placeholder="ej. Correo Andreani S.A."
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Campo Tipo de Vehículo Requerido (especialmente clave para servicios por ruta) */}
              <div className="sm:col-span-2 p-3 bg-white border border-[#DBEAFE] rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#2563EB]" />
                    <label className="text-[12px] font-bold text-[#1E40AF]">
                      Tipo de Vehículo Necesario *
                    </label>
                  </div>
                  <span className="text-[11px] text-[#2563EB] font-medium">
                    {newPricingType === 'route'
                      ? 'Tarifa diferenciada por vehículo para servicios por ruta'
                      : 'Vehículo sugerido para la operación'}
                  </span>
                </div>

                {/* Botones de sugerencia rápida */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold text-[#6B7280]">Elegir porte:</span>
                  {PRESET_VEHICLES.map(v => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => setNewVehicleType(v.value)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                        newVehicleType === v.value
                          ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-2xs'
                          : 'bg-[#F9FAFB] border-[#D1D5DB] text-[#374151] hover:bg-white hover:border-[#9CA3AF]'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="ej. Furgón Grande (Hiace / Master / Sprinter), Furgón Mediano, Chasis..."
                  value={newVehicleType}
                  onChange={e => setNewVehicleType(e.target.value)}
                  list="vehicle-type-suggestions"
                  required
                  className="w-full px-3 py-1.5 bg-[#F9FAFB] border border-[#CBD5E1] rounded-lg text-[13px] text-[#1A1A1A] font-medium focus:bg-white focus:outline-none focus:border-[#2563EB]"
                />
                <datalist id="vehicle-type-suggestions">
                  <option value="Furgón Grande (Hiace / Master / Sprinter)" />
                  <option value="Furgón Mediano (Kangoo / Partner / Expert)" />
                  <option value="Furgón Chico (Berlingo / Fiorino)" />
                  <option value="Chasis / Camión Liviano" />
                  <option value="Camión Balancín / Semirremolque" />
                  <option value="Cualquier vehículo (Tarifa general)" />
                </datalist>
                <span className="text-[10.5px] text-[#6B7280] block">
                  Si un mismo cliente paga diferente según se use Furgón Chico ($135.000) o Furgón Grande ($165.000), creá una tarifa para cada tipo de vehículo.
                </span>
              </div>

              {/* Tilde: Requiere Ayudante */}
              <div className="sm:col-span-2 p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                <div>
                  <label htmlFor="modal-new-helper" className="text-[12.5px] font-bold text-[#1E293B] flex items-center gap-1.5 cursor-pointer">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Requiere Ayudante (Acompañante / Peón)</span>
                  </label>
                  <p className="text-[11px] text-[#64748B] m-0">
                    Tildá esta casilla si el servicio exige tripulación con chofer y ayudante de carga/descarga
                  </p>
                </div>
                <input
                  id="modal-new-helper"
                  type="checkbox"
                  checked={newRequiresHelper}
                  onChange={e => setNewRequiresHelper(e.target.checked)}
                  className="w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#4B5563] mb-1">
                  {newPricingType === 'package' ? 'Tarifa por Paquete ($ ARS) *' : 'Tarifa por Ruta / Jornada ($ ARS) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={newPricingType === 'package' ? '50' : '1000'}
                  placeholder={newPricingType === 'package' ? 'ej. 1800' : 'ej. 165000'}
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-[13px] text-[#1A1A1A] font-semibold focus:outline-none focus:border-[#2563EB]"
                />
                <span className="text-[10.5px] text-[#6B7280] mt-0.5 block">
                  {newPricingType === 'package' 
                    ? 'Total ruta = Entregados × esta tarifa' 
                    : `Tarifa para ruta asignada a ${newVehicleType || 'esta unidad'}`}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#4B5563] mb-1">Descripción / Modalidad</label>
                <input
                  type="text"
                  placeholder={newPricingType === 'package' ? 'ej. Paquetería liviana AMBA' : 'ej. Jornada completa 8hs / Troncal'}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-white rounded-lg border border-transparent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Guardar servicio
              </button>
            </div>
          </form>
        )}

        {/* Tariffs List Table */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {tariffs.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280]">
              <Info className="w-8 h-8 mx-auto text-[#9CA3AF] mb-2" />
              <p className="font-semibold text-[#374151]">Aún no tenés servicios cargados en el tarifario.</p>
              <p className="text-[13px]">Hacé clic en &quot;Nuevo servicio&quot; para crear el primero.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-2.5 pr-4">Servicio / Operación</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Modalidad</th>
                  <th className="py-2.5 px-3">Vehículo Requerido</th>
                  <th className="py-2.5 px-3 text-center">Ayudante</th>
                  <th className="py-2.5 px-3 text-right">Tarifa Pactada</th>
                  <th className="py-2.5 pl-3 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                {tariffs.map(t => {
                  const isPackage = t.pricingType === 'package' || t.service.toLowerCase().includes('entregar');
                  const isEditing = editingId === t.id;

                  return (
                    <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="py-3 pr-4 font-semibold text-[#1A1A1A]">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isPackage ? 'bg-[#10B981]' : 'bg-[#2563EB]'}`} />
                          <span>{t.service}</span>
                        </div>
                        {t.description && (
                          <span className="text-[11px] text-[#9CA3AF] font-normal block pl-4">
                            {t.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#4B5563]">
                        {t.client || '—'}
                      </td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <select
                            value={editPricingType}
                            onChange={e => setEditPricingType(e.target.value as TariffPricingType)}
                            className="px-2 py-1 bg-white border border-[#2563EB] rounded text-[12px] font-medium text-[#1A1A1A]"
                          >
                            <option value="route">Por Ruta fija</option>
                            <option value="package">Por Paquete</option>
                          </select>
                        ) : isPackage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Package className="w-3 h-3" />
                            <span>Por paquete</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Route className="w-3 h-3" />
                            <span>Por ruta</span>
                          </span>
                        )}
                      </td>
                      {/* Columna Tipo de Vehículo */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editVehicleType}
                            onChange={e => setEditVehicleType(e.target.value)}
                            list="vehicle-type-suggestions"
                            placeholder="Tipo de vehículo"
                            className="w-full px-2 py-1 bg-white border border-[#2563EB] rounded text-[12px] font-medium text-[#1A1A1A]"
                          />
                        ) : t.vehicleType ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                            <Truck className="w-3 h-3 text-[#64748B] shrink-0" />
                            <span className="truncate max-w-[170px]" title={t.vehicleType}>{t.vehicleType}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#9CA3AF] italic">
                            Cualquiera / General
                          </span>
                        )}
                      </td>
                      {/* Columna Ayudante con tilde rápido */}
                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editRequiresHelper}
                              onChange={e => setEditRequiresHelper(e.target.checked)}
                              className="w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </label>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = tariffs.map(item =>
                                item.id === t.id ? { ...item, requiresHelper: !item.requiresHelper } : item
                              );
                              onSaveTariffs(updated);
                            }}
                            className="inline-flex items-center cursor-pointer transition-transform hover:scale-105"
                            title="Hacé clic para cambiar si requiere ayudante"
                          >
                            {t.requiresHelper ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Check className="w-3 h-3 text-indigo-600" />
                                <span>Sí</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-[#9CA3AF] bg-[#F9FAFB] border border-[#E5E7EB] hover:text-[#4B5563]">
                                <span>No</span>
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#1A1A1A]">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step={editPricingType === 'package' ? '50' : '1000'}
                              value={editRate}
                              onChange={e => setEditRate(Number(e.target.value))}
                              className="w-28 px-2 py-1 text-right bg-white border border-[#2563EB] rounded font-bold text-[13px] text-[#1A1A1A]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(t.id)}
                              className="p-1 bg-[#10B981] hover:bg-[#059669] text-white rounded cursor-pointer"
                              title="Guardar tarifa"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className={isPackage ? 'text-emerald-700' : 'text-[#1A1A1A]'}>
                              {currency(t.rate)}
                            </span>
                            <span className="text-[10.5px] font-normal text-[#6B7280]">
                              {isPackage ? 'por paquete' : 'por ruta'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEdit(t)}
                              className="p-1 text-[#6B7280] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition-colors cursor-pointer"
                              title="Modificar precio, modalidad o vehículo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded transition-colors cursor-pointer"
                            title="Eliminar del tarifario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] rounded-b-2xl flex items-center justify-between text-[12px] text-[#6B7280]">
          <span>{tariffs.length} tarifas registradas en el maestro</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F3F4F6] text-[#1A1A1A] font-semibold rounded-lg border border-[#D1D5DB] transition-colors cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
