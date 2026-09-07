import React, { useState, useMemo, useRef } from 'react';
import { Trip, Unit } from '../types';
import { currency, formatDate, formatNumber, normal } from '../utils/formatters';
import { Search, Upload, Plus, X, Check, FileSpreadsheet } from 'lucide-react';

interface TripsViewProps {
  trips: Trip[];
  units?: Unit[];
  onImportTrips: (file: File) => void;
  onAddTrip?: (newTrip: Omit<Trip, 'id'>) => Promise<void> | void;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  units = [],
  onImportTrips,
  onAddTrip,
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for adding a single trip
  const [newPatent, setNewPatent] = useState('');
  const [newService, setNewService] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const filteredTrips = useMemo(() => {
    return trips
      .filter(t => {
        if (!search) return true;
        const q = normal(search);
        return (
          normal(t.patent).includes(q) ||
          normal(t.service).includes(q) ||
          normal(t.driver).includes(q) ||
          normal(t.vehicleType).includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = a.date ? a.date.getTime() : 0;
        const timeB = b.date ? b.date.getTime() : 0;
        return timeB - timeA;
      });
  }, [trips, search]);

  const totalFilteredAmount = filteredTrips.reduce((sum, t) => sum + t.rate, 0);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatent.trim()) return;

    setSubmitting(true);
    try {
      if (onAddTrip) {
        await onAddTrip({
          patent: newPatent.toUpperCase().trim(),
          service: newService.trim() || 'Distribución',
          driver: newDriver.trim() || 'No asignado',
          vehicleType: 'HIACE',
          property: 'LEASING',
          rate: Number(newRate) || 0,
          date: newDate ? new Date(`${newDate}T12:00:00`) : new Date(),
        });
      }
      setShowAddModal(false);
      setNewPatent('');
      setNewService('');
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
          <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-1">
            OPERACIÓN DIARIA & ALMACENAMIENTO
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#1A1A1A] tracking-[-1.2px] leading-tight m-0">
            Fletes / Viajes
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1 m-0">
            Los viajes se acumulan y persisten en la base de datos de Supabase.
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

      {/* Summary strip */}
      {trips.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-[#E5E7EB] rounded-xl text-[12px] shadow-xs">
          <div className="flex items-center gap-4 text-[#6B7280]">
            <span>
              Total viajes almacenados: <strong className="text-[#1A1A1A]">{formatNumber(trips.length)}</strong>
            </span>
            <span>•</span>
            <span>
              Viajes filtrados: <strong className="text-[#1A1A1A]">{formatNumber(filteredTrips.length)}</strong>
            </span>
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
          <table className="w-full border-collapse min-w-[770px] text-left">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#6B7280] mono text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Patente</th>
                <th className="py-3.5 px-4">Servicio / Cliente</th>
                <th className="py-3.5 px-4">Chofer</th>
                <th className="py-3.5 px-4">Tipo unidad</th>
                <th className="py-3.5 px-4">Propiedad</th>
                <th className="py-3.5 px-4">Tarifa sin IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredTrips.length > 0 ? (
                filteredTrips.slice(0, 300).map(t => (
                  <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4 mono text-[12px] text-[#6B7280]">
                      {formatDate(t.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <strong className="text-[13px] text-[#1A1A1A] font-bold">
                        {t.patent}
                      </strong>
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-[#1A1A1A]">
                      {t.service || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-[#6B7280]">
                      {t.driver || '—'}
                    </td>
                    <td className="py-3.5 px-4 mono text-[11px] text-[#6B7280]">
                      {t.vehicleType || 'HIACE'}
                    </td>
                    <td className="py-3.5 px-4 mono text-[11px] text-[#6B7280]">
                      {t.property || 'LEASING'}
                    </td>
                    <td className="py-3.5 px-4 mono text-[13px] font-bold text-[#1A1A1A]">
                      {currency(t.rate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280] text-[13px]">
                    {trips.length === 0
                      ? 'No hay viajes cargados. Podés importar un archivo Excel o registrar un viaje individual.'
                      : 'No se encontraron viajes con el término de búsqueda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Viaje Directamente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
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
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Patente del vehículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: AF123AB"
                  value={newPatent}
                  onChange={e => setNewPatent(e.target.value.toUpperCase())}
                  list="units-patent-list"
                  className="w-full mono text-[13px] uppercase font-bold p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
                <datalist id="units-patent-list">
                  {units.map(u => (
                    <option key={u.patent} value={u.patent}>
                      {u.service ? `${u.patent} (${u.service})` : u.patent}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                    Tarifa sin IVA (ARS) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    placeholder="Ej: 110000"
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                    className="w-full mono text-[13px] font-semibold p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Servicio / Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ej: Distribución Farma, Mercado Libre"
                  value={newService}
                  onChange={e => setNewService(e.target.value)}
                  className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1A1A] mb-1">
                  Chofer asignado
                </label>
                <input
                  type="text"
                  placeholder="Nombre y apellido del chofer"
                  value={newDriver}
                  onChange={e => setNewDriver(e.target.value)}
                  className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
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
                  <span>{submitting ? 'Guardando en BD...' : 'Guardar viaje en base de datos'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
