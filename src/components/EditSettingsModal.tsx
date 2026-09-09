import React, { useState } from 'react';
import { Settings } from '../types';
import { currency, formatNumber } from '../utils/formatters';
import { X, Save, Sliders, DollarSign, Fuel, Users, Truck, CheckCircle2 } from 'lucide-react';

interface EditSettingsModalProps {
  settings: Settings;
  onSave: (newSettings: Settings) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const EditSettingsModal: React.FC<EditSettingsModalProps> = ({
  settings,
  onSave,
  onClose,
  onShowToast,
}) => {
  const [lease, setLease] = useState<number>(settings.lease || 1500000);
  const [diesel, setDiesel] = useState<number>(settings.diesel || 1650);
  const [consumption, setConsumption] = useState<number>(settings.consumption || 10);
  const [driverFixed, setDriverFixed] = useState<number>(settings.driverFixed || 1400000);
  const [driverBonus, setDriverBonus] = useState<number>(settings.driverBonus || 500000);
  const [driverDaysBase, setDriverDaysBase] = useState<number>(settings.driverDaysBase || 25);
  const [avgKmPerTrip, setAvgKmPerTrip] = useState<number>(settings.avgKmPerTrip || 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newSettings: Settings = {
      lease: Number(lease) || 0,
      diesel: Number(diesel) || 0,
      consumption: Number(consumption) || 0,
      driverFixed: Number(driverFixed) || 0,
      driverBonus: Number(driverBonus) || 0,
      driverDaysBase: Number(driverDaysBase) || 25,
      avgKmPerTrip: Number(avgKmPerTrip) || 100,
    };

    onSave(newSettings);
    onShowToast('¡Parámetros de costos guardados y aplicados a todo el P&L!');
    onClose();
  };

  const totalDriverMonth = (Number(driverFixed) || 0) + (Number(driverBonus) || 0);
  const dailyDriverRate = Math.round(totalDriverMonth / (Number(driverDaysBase) || 25));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E5E7EB] relative animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB]">
          <div className="p-3 bg-[#EFF6FF] text-[#2563EB] rounded-xl border border-[#BFDBFE]">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <span className="mono text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">
              CONFIGURACIÓN ADMINISTRATIVA
            </span>
            <h2 className="text-[20px] font-extrabold text-[#1A1A1A] tracking-tight m-0">
              Modificar Parámetros de Costos
            </h2>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Leasing Mensual */}
            <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <label className="text-[12px] font-bold text-[#0F172A] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#2563EB]" />
                Canon Leasing Mensual ($)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                value={lease}
                onChange={e => setLease(Number(e.target.value))}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[15px] font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                required
              />
              <span className="text-[10px] text-[#64748B] block">
                Valor actual: {currency(lease)} / mes x unidad
              </span>
            </div>

            {/* 2. Precio Diésel */}
            <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <label className="text-[12px] font-bold text-[#0F172A] flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-amber-500" />
                Precio Diésel ($ / Litro)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={diesel}
                onChange={e => setDiesel(Number(e.target.value))}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[15px] font-mono font-bold text-[#0F172A] focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[10px] text-[#64748B] block">
                Costo por litro de combustible
              </span>
            </div>

            {/* 3. Sueldo Fijo Chofer */}
            <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <label className="text-[12px] font-bold text-[#0F172A] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                Sueldo Fijo Chofer ($ / Mes)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                value={driverFixed}
                onChange={e => setDriverFixed(Number(e.target.value))}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[15px] font-mono font-bold text-[#0F172A] focus:outline-none focus:border-purple-600"
                required
              />
              <span className="text-[10px] text-[#64748B] block">
                Base mensual pactada
              </span>
            </div>

            {/* 4. Premios Chofer */}
            <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <label className="text-[12px] font-bold text-[#0F172A] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Adicional Premios ($ / Mes)
              </label>
              <input
                type="number"
                min="0"
                step="25000"
                value={driverBonus}
                onChange={e => setDriverBonus(Number(e.target.value))}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[15px] font-mono font-bold text-[#0F172A] focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[10px] text-[#64748B] block">
                Premios presentismo / ruta
              </span>
            </div>

            {/* 5. Días Laborables Base */}
            <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <label className="text-[12px] font-bold text-[#0F172A] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                Días Laborables Base (Mes)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                value={driverDaysBase}
                onChange={e => setDriverDaysBase(Number(e.target.value))}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[15px] font-mono font-bold text-[#0F172A] focus:outline-none focus:border-blue-600"
                required
              />
              <span className="text-[10px] text-[#64748B] block">
                Jornada diaria: {currency(dailyDriverRate)} / día
              </span>
            </div>

            {/* 6. Consumo Diésel & Km Promedio */}
            <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <label className="text-[12px] font-bold text-[#0F172A]">
                Consumo (L / 100 km)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={consumption}
                onChange={e => setConsumption(Number(e.target.value))}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[15px] font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                required
              />
              <span className="text-[10px] text-[#64748B] block">
                Estimado por flete: {avgKmPerTrip} km
              </span>
            </div>
          </div>

          {/* Impact Summary Banner */}
          <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-[12px] text-[#1E40AF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
              <span>Costo Total Chofer: <strong>{currency(totalDriverMonth)} / mes</strong> ({currency(dailyDriverRate)}/día)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#F3F4F6] text-[#4B5563] text-[13px] font-semibold rounded-lg border border-[#D1D5DB] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-bold rounded-lg transition-colors cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              Guardar Parámetros
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
