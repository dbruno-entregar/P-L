import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Unit, Trip, Settings, SupabaseConfig, Tariff } from '../types';
import { getTripFingerprint, deduplicateTrips } from '../utils/formatters';
import { defaultTariffs } from '../data/sampleData';

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || 'https://dloqdrhemazhsbzcbbup.supabase.co',
  supabasePublishableKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_JCcAijUfpBGGZrGQx4PnYQ_imOTb4vM',
};

const CONFIG_STORAGE_KEY = 'ruta-clara-supabase-config';

export const getStoredSupabaseConfig = (): SupabaseConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.supabaseUrl && parsed.supabasePublishableKey && parsed.supabaseUrl.trim().length > 5) {
        return {
          supabaseUrl: parsed.supabaseUrl,
          supabasePublishableKey: parsed.supabasePublishableKey,
        };
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SUPABASE_CONFIG;
};

export const resetStoredSupabaseConfig = () => {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  } catch (e) {
    // fallback
  }
  supabaseInstance = null;
  currentConfigKey = '';
};

export const saveStoredSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  // Reset client so next call uses new credentials
  supabaseInstance = null;
  currentConfigKey = '';
};

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export const getSupabaseClient = (config = getStoredSupabaseConfig()): SupabaseClient | null => {
  const url = config.supabaseUrl?.trim();
  const key = config.supabasePublishableKey?.trim();

  if (!url || !key) {
    return null;
  }

  const configKey = `${url}_${key}`;
  if (!supabaseInstance || currentConfigKey !== configKey) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      currentConfigKey = configKey;
    } catch (e) {
      console.warn('Could not initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
};

export interface CloudTestResult {
  ok: boolean;
  message: string;
  unitsCount?: number;
  tripsCount?: number;
}

export const testSupabaseConnection = async (
  config = getStoredSupabaseConfig()
): Promise<CloudTestResult> => {
  const client = getSupabaseClient(config);
  if (!client) {
    return { ok: false, message: 'URL o Publishable Key de Supabase faltantes.' };
  }

  try {
    const [unitsCountRes, tripsCountRes] = await Promise.all([
      client.from('units').select('*', { count: 'exact', head: true }),
      client.from('trips').select('*', { count: 'exact', head: true }),
    ]);

    if (unitsCountRes.error) {
      throw new Error(`Error en tabla units: ${unitsCountRes.error.message}`);
    }
    if (tripsCountRes.error) {
      throw new Error(`Error en tabla trips: ${tripsCountRes.error.message}`);
    }

    return {
      ok: true,
      message: 'Conexión a Supabase establecida correctamente',
      unitsCount: unitsCountRes.count ?? 0,
      tripsCount: tripsCountRes.count ?? 0,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'No se pudo conectar a Supabase.',
    };
  }
};

export const fetchCloudData = async (config = getStoredSupabaseConfig()) => {
  const client = getSupabaseClient(config);
  if (!client) throw new Error('Cliente de Supabase no configurado');

  const [unitsRes, tripsRes, settingsRes] = await Promise.all([
    client.from('units').select('*').order('patent', { ascending: true }),
    client
      .from('trips')
      .select('*')
      .order('trip_date', { ascending: false })
      .range(0, 4999),
    client.from('settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  let tariffsRes: { data: any; error: any } = { data: null, error: null };
  try {
    tariffsRes = await client.from('tariffs').select('*').order('service', { ascending: true });
  } catch (e) {
    // Tabla de tarifas aún no creada en Supabase
  }

  if (unitsRes.error) throw unitsRes.error;
  if (tripsRes.error) throw tripsRes.error;

  const units: Unit[] = (unitsRes.data || []).map(u => ({
    patent: u.patent,
    brand: u.brand || 'Toyota',
    model: u.model || 'Hiace',
    type: u.vehicle_type || 'HIACE',
    property: u.property || 'LEASING',
    service: u.service || 'Sin servicio',
    status: u.status || 'Activo',
    region: u.region || 'Buenos Aires',
    zone: u.zone || 'AMBA',
  }));

  const rawTrips: Trip[] = (tripsRes.data || []).map(t => {
    const d = t.trip_date ? new Date(`${t.trip_date}T12:00:00`) : null;
    return {
      id: t.id ? String(t.id) : `cloud-${t.patent}-${t.trip_date}-${t.rate}`,
      date: d,
      patent: t.patent,
      service: t.service,
      driver: t.driver,
      vehicleType: t.vehicle_type,
      property: t.property,
      rate: Number(t.rate) || 0,
      km: t.km ? Number(t.km) : undefined,
      remito: t.remito || undefined,
      route: t.route || undefined,
      packages: t.packages ? Number(t.packages) : undefined,
      pricingType: t.pricing_type || (t.packages ? 'package' : 'route'),
    };
  });

  // Garantizar que no existan duplicados residuales provenientes de la base de datos
  const trips = deduplicateTrips(rawTrips).uniqueTrips;

  const settings: Settings = settingsRes.data
    ? {
        lease: Number(settingsRes.data.lease) || 2744000,
        diesel: Number(settingsRes.data.diesel) || 1650,
        consumption: Number(settingsRes.data.consumption) || 10,
        driverFixed: Number(settingsRes.data.driver_fixed) || 1400000,
        driverBonus: Number(settingsRes.data.driver_bonus) || 500000,
        driverDaysBase: Number(settingsRes.data.driver_days_base) || 25,
        avgKmPerTrip: Number(settingsRes.data.avg_km_per_trip) || 100,
      }
    : {
        lease: 2744000,
        diesel: 1650,
        consumption: 10,
        driverFixed: 1400000,
        driverBonus: 500000,
        driverDaysBase: 25,
        avgKmPerTrip: 100,
      };

  const tariffs: Tariff[] = (tariffsRes?.data && tariffsRes.data.length > 0)
    ? tariffsRes.data.map((t: any) => ({
        id: String(t.id || `tar-${t.service}`),
        service: t.service,
        client: t.client || undefined,
        vehicleType: t.vehicle_type || t.vehicleType || undefined,
        rate: Number(t.rate) || 0,
        pricingType: t.pricing_type === 'package' ? 'package' : 'route',
        description: t.description || undefined,
        notes: t.notes || undefined,
      }))
    : getStoredTariffs();

  return { units, trips, settings, tariffs };
};

export const TARIFFS_STORAGE_KEY = 'ruta_clara_tariffs';

export const getStoredTariffs = (): Tariff[] => {
  try {
    const raw = localStorage.getItem(TARIFFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(t => ({
          ...t,
          vehicleType: t.vehicleType || undefined,
          pricingType: t.pricingType || (t.service && t.service.toLowerCase().includes('entregar') ? 'package' : 'route'),
        }));
      }
    }
  } catch (e) {
    // fallback
  }
  return defaultTariffs;
};

export const setStoredTariffs = (tariffs: Tariff[]) => {
  try {
    localStorage.setItem(TARIFFS_STORAGE_KEY, JSON.stringify(tariffs));
  } catch (e) {
    // ignore
  }
};

export const syncCloudTariffs = async (tariffs: Tariff[], config = getStoredSupabaseConfig()) => {
  setStoredTariffs(tariffs);
  const client = getSupabaseClient(config);
  if (!client) return;

  try {
    const payload = tariffs.map(t => ({
      id: t.id,
      service: t.service.trim(),
      client: t.client?.trim() || null,
      vehicle_type: t.vehicleType?.trim() || null,
      rate: Number(t.rate) || 0,
      pricing_type: t.pricingType || 'route',
      description: t.description?.trim() || null,
      notes: t.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }));

    await client.from('tariffs').upsert(payload);
  } catch (e) {
    console.warn('No se pudo sincronizar tarifario a Supabase (puede requerir crear la tabla tariffs):', e);
  }
};

export const syncCloudUnits = async (units: Unit[], config = getStoredSupabaseConfig()) => {
  const client = getSupabaseClient(config);
  if (!client) throw new Error('Cliente Supabase no disponible');

  if (units.length === 0) return;

  const payload = units.map(u => ({
    patent: u.patent.toUpperCase().trim(),
    brand: u.brand || 'Toyota',
    model: u.model || 'Hiace',
    vehicle_type: u.type || 'HIACE',
    property: u.property || 'LEASING',
    service: u.service || 'Sin servicio',
    status: u.status || 'Activo',
    region: u.region || 'Buenos Aires',
    zone: u.zone || 'AMBA',
    updated_at: new Date().toISOString(),
  }));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    const { error } = await client.from('units').upsert(chunk, { onConflict: 'patent' });
    if (error) throw error;
  }
};

export const insertCloudTrip = async (trip: Trip, config = getStoredSupabaseConfig()): Promise<Trip> => {
  const client = getSupabaseClient(config);
  if (!client) throw new Error('Cliente Supabase no disponible');

  const payload: any = {
    trip_date: trip.date ? trip.date.toISOString().slice(0, 10) : null,
    patent: trip.patent.toUpperCase().trim(),
    service: trip.service || 'General',
    driver: trip.driver || 'No especificado',
    vehicle_type: trip.vehicleType || 'HIACE',
    property: trip.property || 'LEASING',
    rate: trip.rate || 0,
    km: trip.km || null,
    remito: trip.remito || null,
    route: trip.route || null,
    packages: trip.packages || null,
  };

  let res = await client.from('trips').insert([payload]).select().single();
  if (res.error && (res.error.message.includes('route') || res.error.message.includes('packages') || res.error.message.includes('remito') || res.error.message.includes('km'))) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.route;
    delete fallbackPayload.packages;
    delete fallbackPayload.remito;
    delete fallbackPayload.km;
    res = await client.from('trips').insert([fallbackPayload]).select().single();
  }

  if (res.error) throw res.error;
  const data = res.data;

  return {
    id: data.id ? String(data.id) : trip.id,
    date: data.trip_date ? new Date(`${data.trip_date}T12:00:00`) : trip.date,
    patent: data.patent,
    service: data.service,
    driver: data.driver,
    vehicleType: data.vehicle_type,
    property: data.property,
    rate: Number(data.rate) || 0,
    km: data.km ? Number(data.km) : undefined,
    remito: data.remito || undefined,
    route: data.route || trip.route || undefined,
    packages: data.packages ? Number(data.packages) : trip.packages || undefined,
    pricingType: trip.pricingType,
  };
};

export interface BatchInsertResult {
  inserted: number;
  skipped: number;
  total: number;
}

export const insertCloudTripsBatch = async (
  trips: Trip[],
  config = getStoredSupabaseConfig(),
  onProgress?: (processed: number, total: number) => void
): Promise<BatchInsertResult> => {
  const client = getSupabaseClient(config);
  if (!client) throw new Error('Cliente Supabase no disponible');

  if (trips.length === 0) return { inserted: 0, skipped: 0, total: 0 };

  // 1. Identificar rango de fechas de los viajes a insertar
  const validDates = trips
    .filter(t => t.date && !isNaN(t.date.getTime()))
    .map(t => t.date!.toISOString().slice(0, 10));

  const existingKeys = new Set<string>();

  if (validDates.length > 0) {
    validDates.sort();
    const minDate = validDates[0];
    const maxDate = validDates[validDates.length - 1];

    try {
      // Traer viajes existentes dentro de la ventana de fechas para chequear huellas
      let existingTrips: any[] | null = null;
      const resWithCols = await client
        .from('trips')
        .select('patent, trip_date, rate, service, driver, remito, route, packages')
        .gte('trip_date', minDate)
        .lte('trip_date', maxDate)
        .range(0, 49999);

      if (resWithCols.error) {
        // Fallback si algunas columnas aún no existen en la tabla remota
        const resFallback = await client
          .from('trips')
          .select('patent, trip_date, rate, service, driver')
          .gte('trip_date', minDate)
          .lte('trip_date', maxDate)
          .range(0, 49999);
        existingTrips = resFallback.data;
      } else {
        existingTrips = resWithCols.data;
      }

      if (existingTrips && existingTrips.length > 0) {
        existingTrips.forEach((et: any) => {
          const fp = getTripFingerprint({
            patent: et.patent,
            date: et.trip_date,
            rate: Number(et.rate) || 0,
            service: et.service,
            driver: et.driver,
            remito: et.remito,
            route: et.route,
            packages: et.packages ? Number(et.packages) : undefined,
          });
          existingKeys.add(fp);
        });
      }
    } catch (e) {
      console.warn('Advertencia al verificar duplicados en Supabase:', e);
    }
  }

  // 2. Filtrar descartando los que ya existen en Supabase o vienen duplicados en el lote
  const seenInBatch = new Set<string>();
  const toInsert: any[] = [];
  let skipped = 0;

  for (const t of trips) {
    const fp = getTripFingerprint(t);
    if (existingKeys.has(fp) || seenInBatch.has(fp)) {
      skipped++;
      continue;
    }
    seenInBatch.add(fp);
    toInsert.push({
      trip_date: t.date ? t.date.toISOString().slice(0, 10) : null,
      patent: t.patent.toUpperCase().trim(),
      service: t.service || 'General',
      driver: t.driver || 'No especificado',
      vehicle_type: t.vehicleType || 'HIACE',
      property: t.property || 'LEASING',
      rate: t.rate || 0,
      km: t.km || null,
      remito: t.remito || null,
      route: t.route || null,
      packages: t.packages || null,
    });
  }

  if (toInsert.length === 0) {
    return { inserted: 0, skipped, total: trips.length };
  }

  const CHUNK_SIZE = 150;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    let { error } = await client.from('trips').insert(chunk);

    // Si la tabla remota aún no fue migrada con las columnas nuevas, reintentar limpiando esas columnas
    if (error && (error.message.includes('remito') || error.message.includes('km') || error.message.includes('route') || error.message.includes('packages'))) {
      const sanitizedChunk = chunk.map(({ remito, km, route, packages, ...rest }: any) => rest);
      const retryRes = await client.from('trips').insert(sanitizedChunk);
      error = retryRes.error;
    }

    if (error) throw error;

    inserted += chunk.length;
    if (onProgress) {
      onProgress(inserted, toInsert.length);
    }
  }

  return { inserted, skipped, total: trips.length };
};

export const syncCloudSettings = async (settings: Settings, config = getStoredSupabaseConfig()) => {
  const client = getSupabaseClient(config);
  if (!client) throw new Error('Cliente Supabase no disponible');

  const { error } = await client.from('settings').upsert({
    id: 1,
    lease: settings.lease,
    diesel: settings.diesel,
    consumption: settings.consumption,
    driver_fixed: settings.driverFixed,
    driver_bonus: settings.driverBonus,
    driver_days_base: settings.driverDaysBase,
    avg_km_per_trip: settings.avgKmPerTrip,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const clearAllCloudTrips = async (config = getStoredSupabaseConfig()) => {
  const client = getSupabaseClient(config);
  if (!client) throw new Error('Cliente Supabase no disponible');

  const { error } = await client
    .from('trips')
    .delete()
    .neq('rate', -999999999);
  if (error) throw error;
};
