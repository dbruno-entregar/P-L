import React, { useState, useMemo } from 'react';
import { UnitPnL, Trip, Settings } from '../types';
import { currency, formatNumber, calculateUnitPnL } from '../utils/formatters';
import { 
  Sliders, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign, 
  Percent, 
  Fuel, 
  Users, 
  Truck,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

interface WhatIfSimulatorProps {
  unitsPnL: UnitPnL[];
  trips: Trip[];
  settings: Settings;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  unitsPnL,
  trips,
  settings,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Simulation Control States
  const [rateChangePct, setRateChangePct] = useState<number>(0);
  const [volumeChangePct, setVolumeChangePct] = useState<number>(0);
  const [dieselPrice, setDieselPrice] = useState<number>(settings.diesel || 1650);
  const [leasePrice, setLeasePrice] = useState<number>(settings.lease || 1500000);
  const [driverFixedPrice, setDriverFixedPrice] = useState<number>(settings.driverFixed || 1400000);

  // Sync state if settings change externally
  React.useEffect(() => {
    setDieselPrice(settings.diesel || 1650);
    setLeasePrice(settings.lease || 1500000);
    setDriverFixedPrice(settings.driverFixed || 1400000);
  }, [settings.diesel, settings.lease, settings.driverFixed]);

  // Check if any filter is modified
  const isModified = 
    rateChangePct !== 0 || 
    volumeChangePct !== 0 || 
    dieselPrice !== (settings.diesel || 1650) || 
    leasePrice !== (settings.lease || 1500000) || 
    driverFixedPrice !== (settings.driverFixed || 1400000);

  const handleReset = () => {
    setRateChangePct(0);
    setVolumeChangePct(0);
    setDieselPrice(settings.diesel || 1650);
    setLeasePrice(settings.lease || 1500000);
    setDriverFixedPrice(settings.driverFixed || 1400000);
  };

  // Base Real Metrics
  const realMetrics = useMemo(() => {
    const unitsCount = unitsPnL.length;
    const revenue = unitsPnL.reduce((sum, u) => sum + u.revenue, 0);
    const lease = unitsCount * (settings.lease || 0);
    const driverCost = unitsPnL.reduce((sum, u) => sum + u.driverCost, 0);
    const fuelCost = unitsPnL.reduce((sum, u) => sum + u.fuelCost, 0);
    const totalCost = lease + driverCost + fuelCost;
    const netResult = revenue - totalCost;
    const marginPct = revenue > 0 ? (netResult / revenue) * 100 : 0;
    const coverage = lease > 0 ? (revenue / lease) * 100 : 0;

    return {
      revenue,
      lease,
      driverCost,
      fuelCost,
      totalCost,
      netResult,
      marginPct,
      coverage,
    };
  }, [unitsPnL, settings]);

  // Simulated Metrics Calculation
  const simMetrics = useMemo(() => {
    if (unitsPnL.length === 0) {
      return realMetrics;
    }

    const simSettings: Settings = {
      ...settings,
      diesel: dieselPrice,
      lease: leasePrice,
      driverFixed: driverFixedPrice,
    };

    // Apply rate change and volume multiplier to trips
    const rateMultiplier = 1 + rateChangePct / 100;
    const volumeMultiplier = 1 + volumeChangePct / 100;

    // Simulate trips
    const simulatedTrips = trips.map(t => ({
      ...t,
      rate: (t.rate || 0) * rateMultiplier,
      km: Math.round((t.km || settings.avgKmPerTrip || 100) * volumeMultiplier),
    }));

    // Calculate PnL for units with simulated settings & trips
    const simUnitsPnL = calculateUnitPnL(unitsPnL, simulatedTrips, simSettings);

    const unitsCount = simUnitsPnL.length;
    let revenue = simUnitsPnL.reduce((sum, u) => sum + u.revenue, 0) * volumeMultiplier;
    const lease = unitsCount * leasePrice;
    
    // Scale driver cost by volume if trips increase days
    const driverCost = simUnitsPnL.reduce((sum, u) => sum + u.driverCost, 0) * (volumeChangePct > 0 ? (1 + volumeChangePct / 200) : 1);
    const fuelCost = simUnitsPnL.reduce((sum, u) => sum + u.fuelCost, 0) * volumeMultiplier;
    
    const totalCost = lease + driverCost + fuelCost;
    const netResult = revenue - totalCost;
    const marginPct = revenue > 0 ? (netResult / revenue) * 100 : 0;
    const coverage = lease > 0 ? (revenue / lease) * 100 : 0;

    return {
      revenue: Math.round(revenue),
      lease: Math.round(lease),
      driverCost: Math.round(driverCost),
      fuelCost: Math.round(fuelCost),
      totalCost: Math.round(totalCost),
      netResult: Math.round(netResult),
      marginPct,
      coverage,
    };
  }, [unitsPnL, trips, settings, rateChangePct, volumeChangePct, dieselPrice, leasePrice, driverFixedPrice, realMetrics]);

  // Differences
  const diffRevenue = simMetrics.revenue - realMetrics.revenue;
  const diffTotalCost = simMetrics.totalCost - realMetrics.totalCost;
  const diffNetResult = simMetrics.netResult - realMetrics.netResult;
  const diffMarginPct = simMetrics.marginPct - realMetrics.marginPct;

  return (
    <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] rounded-2xl p-5 text-white shadow-xl border border-indigo-500/20 transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-white tracking-tight m-0">
                Simulador de Escenarios ("What-If")
              </h2>
              {isModified && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  Simulación Activa
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-400 mt-0.5 m-0">
              Evaluá el impacto en rentabilidad variando tarifas, volumen, diésel y leasing en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isModified && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[12px] font-semibold transition-all border border-slate-700 cursor-pointer"
              title="Restablecer a valores reales"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer
            </button>
          )}
          <button className="p-1.5 text-slate-400 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-slate-800 space-y-6">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Escenarios Rápidos:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setRateChangePct(10);
                  setVolumeChangePct(0);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium transition-all cursor-pointer"
              >
                +10% Tarifas
              </button>
              <button
                onClick={() => {
                  setRateChangePct(0);
                  setVolumeChangePct(15);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[12px] font-medium transition-all cursor-pointer"
              >
                +15% Volumen
              </button>
              <button
                onClick={() => {
                  setDieselPrice(1900);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/30 text-amber-300 text-[12px] font-medium transition-all cursor-pointer"
              >
                Diésel $1.900/L
              </button>
              <button
                onClick={() => {
                  setRateChangePct(8);
                  setDieselPrice(1850);
                  setLeasePrice(1650000);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-300 text-[12px] font-medium transition-all cursor-pointer"
              >
                Inflación + Reajuste
              </button>
            </div>
          </div>

          {/* Interactive Sliders & Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Tarifa (%) */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-indigo-400" />
                  Tarifas (%)
                </span>
                <span className={`font-mono font-bold ${rateChangePct > 0 ? 'text-emerald-400' : rateChangePct < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {rateChangePct > 0 ? `+${rateChangePct}%` : `${rateChangePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="1"
                value={rateChangePct}
                onChange={e => setRateChangePct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-30%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>

            {/* 2. Volumen Viajes (%) */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  Volumen Viajes
                </span>
                <span className={`font-mono font-bold ${volumeChangePct > 0 ? 'text-emerald-400' : volumeChangePct < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {volumeChangePct > 0 ? `+${volumeChangePct}%` : `${volumeChangePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-40"
                max="60"
                step="2"
                value={volumeChangePct}
                onChange={e => setVolumeChangePct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-40%</span>
                <span>0%</span>
                <span>+60%</span>
              </div>
            </div>

            {/* 3. Precio Diésel ($/L) */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                Diésel ($/Litro)
              </label>
              <input
                type="number"
                value={dieselPrice}
                onChange={e => setDieselPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <div className="text-[10px] text-slate-500">Base: ${formatNumber(settings.diesel || 1650)}/L</div>
            </div>

            {/* 4. Leasing ($/Mes) */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                Leasing ($/Mes)
              </label>
              <input
                type="number"
                step="50000"
                value={leasePrice}
                onChange={e => setLeasePrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500"
              />
              <div className="text-[10px] text-slate-500">Base: ${formatNumber(settings.lease || 1500000)}</div>
            </div>

            {/* 5. Sueldo Chofer ($/Mes) */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                Sueldo Chofer ($)
              </label>
              <input
                type="number"
                step="50000"
                value={driverFixedPrice}
                onChange={e => setDriverFixedPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500"
              />
              <div className="text-[10px] text-slate-500">Base: ${formatNumber(settings.driverFixed || 1400000)}</div>
            </div>
          </div>

          {/* Results Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Facturación */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facturación Total</div>
              <div className="my-2">
                <div className="text-[20px] font-mono font-bold text-white">
                  {currency(simMetrics.revenue)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Real: <span className="font-mono">{currency(realMetrics.revenue)}</span>
                </div>
              </div>
              <div className={`text-[12px] font-bold flex items-center gap-1 ${diffRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diffRevenue >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{diffRevenue >= 0 ? '+' : ''}{currency(diffRevenue)}</span>
              </div>
            </div>

            {/* Costos Operativos */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Costos Operativos</div>
              <div className="my-2">
                <div className="text-[20px] font-mono font-bold text-slate-200">
                  {currency(simMetrics.totalCost)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Real: <span className="font-mono">{currency(realMetrics.totalCost)}</span>
                </div>
              </div>
              <div className={`text-[12px] font-bold flex items-center gap-1 ${diffTotalCost <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diffTotalCost <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                <span>{diffTotalCost > 0 ? '+' : ''}{currency(diffTotalCost)}</span>
              </div>
            </div>

            {/* Resultado Neto */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              simMetrics.netResult >= 0 
                ? 'bg-emerald-950/40 border-emerald-500/30' 
                : 'bg-rose-950/40 border-rose-500/30'
            }`}>
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Resultado Neto Simulado</div>
              <div className="my-2">
                <div className={`text-[22px] font-mono font-extrabold ${simMetrics.netResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {currency(simMetrics.netResult)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Real: <span className="font-mono">{currency(realMetrics.netResult)}</span>
                </div>
              </div>
              <div className={`text-[12px] font-extrabold flex items-center gap-1 ${diffNetResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diffNetResult >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{diffNetResult >= 0 ? '+' : ''}{currency(diffNetResult)}</span>
              </div>
            </div>

            {/* Margen Operativo (%) */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              simMetrics.marginPct >= 15 
                ? 'bg-indigo-950/40 border-indigo-500/30' 
                : simMetrics.marginPct >= 0 
                ? 'bg-amber-950/40 border-amber-500/30'
                : 'bg-rose-950/40 border-rose-500/30'
            }`}>
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Margen Operativo Simulado</div>
              <div className="my-2">
                <div className={`text-[22px] font-mono font-extrabold ${
                  simMetrics.marginPct >= 15 ? 'text-indigo-300' : simMetrics.marginPct >= 0 ? 'text-amber-300' : 'text-rose-300'
                }`}>
                  {simMetrics.marginPct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-400">
                  Real: <span className="font-mono">{realMetrics.marginPct.toFixed(1)}%</span>
                </div>
              </div>
              <div className={`text-[12px] font-extrabold flex items-center gap-1 ${diffMarginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diffMarginPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{diffMarginPct >= 0 ? '+' : ''}{diffMarginPct.toFixed(1)} p.p.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
