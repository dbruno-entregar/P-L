import React, { useState, useEffect } from 'react';
import { Settings, SupabaseConfig } from '../types';
import { currency } from '../utils/formatters';
import {
  Cloud,
  Check,
  Copy,
  RefreshCw,
  UploadCloud,
  Database,
  Info,
  CheckCircle2,
  XCircle,
  Server,
  ExternalLink
} from 'lucide-react';
import { testSupabaseConnection, CloudTestResult } from '../services/supabaseService';

interface CostsViewProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
  supabaseConfig: SupabaseConfig;
  onUpdateSupabaseConfig: (config: SupabaseConfig) => void;
  onSyncCloudNow: () => void;
  onPullCloudNow: () => void;
  onShowToast: (msg: string) => void;
}

const SQL_SCHEMA = `-- ==============================================================================
-- SCRIPT SQL PARA SUPABASE (Profit & Loss · Flota Toyota Leasing)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Tabla de Maestro de Unidades
create table if not exists public.units (
  patent text primary key,
  brand text default 'Toyota',
  model text default 'Hiace',
  vehicle_type text default 'HIACE',
  property text default 'LEASING',
  service text default 'Sin servicio',
  status text default 'Activo',
  region text default 'Buenos Aires',
  zone text default 'AMBA',
  updated_at timestamptz not null default now()
);

-- 2. Tabla de Fletes / Viajes (Almacenamiento Acumulativo sin duplicados)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date,
  patent text not null,
  service text,
  driver text,
  vehicle_type text default 'HIACE',
  property text default 'LEASING',
  rate numeric not null default 0,
  km numeric,
  remito text,
  route text,
  packages numeric,
  created_at timestamptz not null default now()
);

-- Asegurar columnas si la tabla trips ya existía previamente sin ellas
alter table public.trips add column if not exists km numeric;
alter table public.trips add column if not exists remito text;
alter table public.trips add column if not exists route text;
alter table public.trips add column if not exists packages numeric;

-- Índices de búsqueda para alto rendimiento
create index if not exists idx_trips_patent on public.trips(patent);
create index if not exists idx_trips_date on public.trips(trip_date);

-- Limpieza preventiva de duplicados preexistentes antes de crear el índice único
delete from public.trips a using public.trips b
where a.ctid < b.ctid
  and a.patent = b.patent
  and coalesce(a.trip_date, '1970-01-01'::date) = coalesce(b.trip_date, '1970-01-01'::date)
  and a.rate = b.rate
  and coalesce(a.route, '') = coalesce(b.route, '')
  and coalesce(a.remito, '') = coalesce(b.remito, '')
  and coalesce(a.service, '') = coalesce(b.service, '');

-- Índice único para prevención estricta de duplicados a nivel base de datos
create unique index if not exists idx_trips_unique_record 
on public.trips(patent, trip_date, rate, coalesce(remito, ''), coalesce(service, ''), coalesce(route, ''));

-- 3. Tabla de Parámetros y Costos (Leasing, Chofer Cooperativa, Combustible)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  lease numeric not null default 2744000,
  diesel numeric not null default 1650,
  consumption numeric not null default 10,
  driver_fixed numeric not null default 1400000,
  driver_bonus numeric not null default 500000,
  driver_days_base numeric not null default 25,
  avg_km_per_trip numeric not null default 100,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 4. Tabla de Tarifario Maestro (Clientes, Servicios y Tarifas por Viaje / Paquete)
create table if not exists public.tariffs (
  id text primary key,
  service text not null,
  client text,
  rate numeric not null default 0,
  pricing_type text default 'route',
  description text,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.tariffs add column if not exists pricing_type text default 'route';

-- 5. Seguridad de Fila (RLS) habilitada con políticas permisivas
alter table public.units enable row level security;
alter table public.trips enable row level security;
alter table public.settings enable row level security;
alter table public.tariffs enable row level security;

-- Políticas de lectura públicas
drop policy if exists "Allow read units" on public.units;
create policy "Allow read units" on public.units for select using (true);

drop policy if exists "Allow read trips" on public.trips;
create policy "Allow read trips" on public.trips for select using (true);

drop policy if exists "Allow read settings" on public.settings;
create policy "Allow read settings" on public.settings for select using (true);

drop policy if exists "Allow read tariffs" on public.tariffs;
create policy "Allow read tariffs" on public.tariffs for select using (true);

-- Políticas de inserción y actualización
drop policy if exists "Allow insert/update units" on public.units;
create policy "Allow insert/update units" on public.units for all using (true) with check (true);

drop policy if exists "Allow insert/modify trips" on public.trips;
create policy "Allow insert/modify trips" on public.trips for all using (true) with check (true);

drop policy if exists "Allow update settings" on public.settings;
create policy "Allow update settings" on public.settings for all using (true) with check (true);

drop policy if exists "Allow insert/modify tariffs" on public.tariffs;
create policy "Allow insert/modify tariffs" on public.tariffs for all using (true) with check (true);
`;

export const CostsView: React.FC<CostsViewProps> = ({
  settings,
  onUpdateSettings,
  supabaseConfig,
  onUpdateSupabaseConfig,
  onSyncCloudNow,
  onPullCloudNow,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [urlInput, setUrlInput] = useState(supabaseConfig.supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseConfig.supabasePublishableKey);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CloudTestResult | null>(null);

  // Run a quick silent test when component mounts
  useEffect(() => {
    if (supabaseConfig.supabaseUrl && supabaseConfig.supabasePublishableKey) {
      testSupabaseConnection(supabaseConfig).then(res => setTestResult(res));
    }
  }, [supabaseConfig]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    onShowToast('Código SQL copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async () => {
    const newConfig: SupabaseConfig = {
      supabaseUrl: urlInput.trim(),
      supabasePublishableKey: keyInput.trim(),
    };
    onUpdateSupabaseConfig(newConfig);
    onShowToast('Configuración guardada. Probando conexión...');
    setTesting(true);
    const result = await testSupabaseConnection(newConfig);
    setTesting(false);
    setTestResult(result);
    if (result.ok) {
      onShowToast(`Conexión exitosa. Base de datos con ${result.tripsCount ?? 0} viajes.`);
    } else {
      onShowToast(`Error: ${result.message}`);
    }
  };

  const handleTestNow = async () => {
    setTesting(true);
    const result = await testSupabaseConnection({
      supabaseUrl: urlInput.trim(),
      supabasePublishableKey: keyInput.trim(),
    });
    setTesting(false);
    setTestResult(result);
    if (result.ok) {
      onShowToast(`Conexión exitosa: ${result.unitsCount} unidades, ${result.tripsCount} viajes en la nube`);
    } else {
      onShowToast(`Fallo en conexión: ${result.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-1">
          SUPUESTOS DEL MODELO
        </p>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#1A1A1A] tracking-[-1.2px] leading-tight m-0">
          Tarifas & Costos
        </h1>
        <p className="text-[14px] text-[#6B7280] mt-1 m-0">
          Los cambios se reflejan inmediatamente en todo el tablero y los cálculos de P&L.
        </p>
      </div>

      {/* Main Settings Grid */}
      <div className="space-y-6">
        {/* Sección 1: Canon de Leasing */}
        <section className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-0.5">
                COSTO FIJO DE FLOTA
              </p>
              <h2 className="text-[17px] font-bold text-[#1A1A1A] m-0">
                Canon Mensual de Leasing (Toyota Hiace)
              </h2>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              Cubre Seguro y Patente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Canon mensual por unidad (ARS)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={settings.lease}
                onChange={e =>
                  onUpdateSettings({ ...settings, lease: Number(e.target.value) || 0 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Costo fijo mensual devengado por cada Toyota en AMBA: {currency(settings.lease)}
              </small>
            </label>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#475569]">
              <strong className="text-[#0F172A] block mb-1">Estructura contractual:</strong>
              El canon es fijo por mes por cada unidad en leasing. Cubre tanto el costo financiero de la unidad como la cobertura integral de seguro y el impuesto automotor (patente).
            </div>
          </div>
        </section>

        {/* Sección 2: Choferes Cooperativa */}
        <section className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-0.5">
                ESQUEMA LABORAL COOPERATIVA
              </p>
              <h2 className="text-[17px] font-bold text-[#1A1A1A] m-0">
                Chofer Camioneta Grande (Toyota Hiace)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] mono">
                Total Mes: {currency((settings.driverFixed || 0) + (settings.driverBonus || 0))}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] mono">
                Diario: {currency(Math.round(((settings.driverFixed || 0) + (settings.driverBonus || 0)) / (settings.driverDaysBase || 25)))}/día
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Sueldo Fijo Chofer (ARS)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={settings.driverFixed}
                onChange={e =>
                  onUpdateSettings({ ...settings, driverFixed: Number(e.target.value) || 0 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Base pactada ({currency(settings.driverFixed)})
              </small>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Adicional por Premios (ARS)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={settings.driverBonus}
                onChange={e =>
                  onUpdateSettings({ ...settings, driverBonus: Number(e.target.value) || 0 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Presentismo, ruta completa, cuidado, sin multas
              </small>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Días Laborables Base (Mes)</span>
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                value={settings.driverDaysBase}
                onChange={e =>
                  onUpdateSettings({ ...settings, driverDaysBase: Number(e.target.value) || 25 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Divisor para costo diario ({settings.driverDaysBase || 25} días)
              </small>
            </label>
          </div>

          <div className="p-4 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl text-[12px] text-[#1E40AF] flex items-center justify-between">
            <span>
              ℹ️ El costo del chofer se devenga multiplicando el <strong>monto diario ({currency(Math.round(((settings.driverFixed || 0) + (settings.driverBonus || 0)) / (settings.driverDaysBase || 25)))})</strong> por la cantidad de <strong>días efectivos en ruta</strong> de cada unidad en el período.
            </span>
          </div>
        </section>

        {/* Sección 3: Combustible y Rendimiento */}
        <section className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase mb-0.5">
                COMBUSTIBLE & KILOMETRAJE
              </p>
              <h2 className="text-[17px] font-bold text-[#1A1A1A] m-0">
                Consumo y Rendimiento Diésel Premium
              </h2>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] mono">
              {currency(Math.round(((settings.consumption || 10) / 100) * (settings.diesel || 1650)))} por km
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Precio Diésel Premium (ARS / Litro)</span>
              <input
                type="number"
                min="0"
                step="10"
                value={settings.diesel}
                onChange={e =>
                  onUpdateSettings({ ...settings, diesel: Number(e.target.value) || 0 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Promedio de surtidor estación de servicio
              </small>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Consumo Esperado (L / 100 km)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={settings.consumption}
                onChange={e =>
                  onUpdateSettings({ ...settings, consumption: Number(e.target.value) || 0 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Consumo estándar Toyota Hiace urbana ({settings.consumption} L / 100km)
              </small>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
              <span>Km Promedio por Flete (Estimado)</span>
              <input
                type="number"
                min="10"
                step="10"
                value={settings.avgKmPerTrip}
                onChange={e =>
                  onUpdateSettings({ ...settings, avgKmPerTrip: Number(e.target.value) || 100 })
                }
                className="w-full mono text-[16px] font-bold p-3 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
              />
              <small className="text-[#6B7280] font-normal">
                Se utiliza si el archivo Excel no especifica odómetro
              </small>
            </label>
          </div>
        </section>
      </div>

      {/* Supabase Cloud Connection & Sync */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="mono text-[10px] tracking-[0.09em] font-bold text-[#2563EB] uppercase m-0">
                PERSISTENCIA & BASE DE DATOS
              </p>
              {testResult && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    testResult.ok
                      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                      : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                  }`}
                >
                  {testResult.ok ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Conectado ({testResult.tripsCount ?? 0} viajes en BD)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>Sin conexión</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <h2 className="text-[18px] font-bold text-[#1A1A1A] tracking-[-0.5px] m-0">
              Conexión Supabase (PostgreSQL) & Vercel
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPullCloudNow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1A1A1A] font-semibold text-[12px] rounded-lg transition-colors cursor-pointer"
              title="Descargar las unidades y viajes almacenados en Supabase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Traer de la nube</span>
            </button>
            <button
              onClick={onSyncCloudNow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#2D2D2D] text-white font-semibold text-[12px] rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Subir unidades, viajes y costos actuales a Supabase"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Publicar todo en la nube</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
            <span>Supabase Project URL</span>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="mono text-[12px] p-2.5 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] font-bold text-[#1A1A1A]">
            <span>Supabase Publishable Key (Anon)</span>
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="sb_publishable_..."
              className="mono text-[12px] p-2.5 border border-[#E5E7EB] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#2563EB]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[12px] rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Guardar credenciales
            </button>
            <button
              onClick={handleTestNow}
              disabled={testing}
              className="px-3 py-2 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] font-semibold text-[12px] rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer"
            >
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowVercelGuide(!showVercelGuide)}
              className="text-[12px] font-semibold text-[#2563EB] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Server className="w-3.5 h-3.5" />
              {showVercelGuide ? 'Ocultar guía Vercel' : '¿Cómo conectar con Vercel?'}
            </button>
            <button
              onClick={() => setShowSql(!showSql)}
              className="text-[12px] font-semibold text-[#2563EB] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              {showSql ? 'Ocultar SQL' : 'Ver esquema SQL'}
            </button>
          </div>
        </div>

        {/* Vercel Guide Card */}
        {showVercelGuide && (
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#334155] space-y-3">
            <strong className="text-[#0F172A] font-bold block text-[14px]">
              🚀 Cómo desplegar en Vercel y almacenar los viajes en Supabase:
            </strong>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Crear las tablas en Supabase:</strong> Abrí tu panel de Supabase, andá a <em>SQL Editor</em>, pegá el código del botón <strong>"Ver esquema SQL"</strong> y dale <em>Run</em>.
              </li>
              <li>
                <strong>Vercel Environment Variables:</strong> En tu proyecto de Vercel (<em>Settings &gt; Environment Variables</em>), agregá estas 2 variables para que carguen automáticamente sin tener que ingresarlas a mano:
                <div className="mono text-[11px] bg-white p-2.5 rounded-lg border border-[#CBD5E1] my-1 space-y-1">
                  <div>VITE_SUPABASE_URL = {urlInput || 'https://tu-proyecto.supabase.co'}</div>
                  <div>VITE_SUPABASE_ANON_KEY = {keyInput || 'tu-clave-anon'}</div>
                </div>
              </li>
              <li>
                <strong>Almacenamiento automático:</strong> Cada vez que importes un archivo Excel de viajes o registres un flete con el botón <em>"+ Registrar Viaje"</em>, se guardará directamente en la base de datos de Supabase y quedará acumulado de forma permanente.
              </li>
            </ol>
          </div>
        )}

        {/* SQL Schema viewer */}
        {showSql && (
          <div className="mt-4 p-4 bg-[#111827] text-[#F9FAFB] rounded-xl border border-[#1F2937] relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F2937]">
              <span className="mono text-[11px] text-[#60A5FA]">
                supabase-schema.sql (Tablas units, trips y settings)
              </span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1F2937] hover:bg-[#374151] rounded text-[11px] font-medium text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar SQL'}</span>
              </button>
            </div>
            <pre className="mono text-[11px] leading-relaxed overflow-x-auto text-[#9CA3AF] max-h-64 p-1 custom-scrollbar">
              {SQL_SCHEMA}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};
