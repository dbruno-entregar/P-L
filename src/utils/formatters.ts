import { Unit, Trip, UnitPnL, Settings, WoWComparison, WeekStats, DailyStats, Tariff, ServiceMetric, WeeklyServiceAnalysis, ServiceRouteBreakdown, ServiceUnitBreakdown } from '../types';

export const currency = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-AR').format(value || 0);
};

export const normal = (value: any): string => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

export const pick = (row: Record<string, any>, names: string[]): any => {
  const keys = Object.keys(row);
  const matchedKey = keys.find(k => names.includes(normal(k)));
  return matchedKey !== undefined ? row[matchedKey] : '';
};

export const cleanMoney = (value: any): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const str = String(value ?? '').trim();
  if (!str) return 0;
  // Handle formats like "$ 150.000,00" or "150000" or "150,000.00"
  const cleaned = str
    .replace(/[^0-9,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

export const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    // Excel serial date to JS Date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  const str = String(value).trim();
  const bits = str.split(/[/-]/);
  if (bits.length === 3) {
    // Check if DD/MM/YYYY or YYYY-MM-DD
    if (bits[0].length === 4) {
      return new Date(Number(bits[0]), Number(bits[1]) - 1, Number(bits[2]));
    } else {
      return new Date(Number(bits[2]), Number(bits[1]) - 1, Number(bits[0]));
    }
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (date: Date | string | null): string => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

export const scopeUnits = (units: Unit[]): Unit[] => {
  // Focus exclusively on AMBA Toyota leasing units for now
  const filtered = units.filter(
    u =>
      (normal(u.brand).includes('toyota') || normal(u.model).includes('hiace') || normal(u.type).includes('hiace')) &&
      normal(u.zone).includes('amba') &&
      normal(u.property).includes('leasing')
  );
  // Fallback if zone or property wasn't strictly typed in uploaded Excel
  if (filtered.length === 0 && units.length > 0) {
    const toyotaOrHiace = units.filter(
      u => normal(u.brand).includes('toyota') || normal(u.model).includes('hiace') || normal(u.type).includes('hiace')
    );
    return toyotaOrHiace.length > 0 ? toyotaOrHiace : units;
  }
  return filtered;
};

/**
 * Determina si una fecha corresponde a un día no laborable (Domingos y Feriados Nacionales de Argentina).
 */
export const isSundayOrHoliday = (date: Date | string | null | undefined): boolean => {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;

  // 1. Domingo
  if (d.getDay() === 0) return true;

  // 2. Feriados Nacionales de Argentina (Mes en JS es 0-indexed)
  const day = d.getDate();
  const month = d.getMonth();

  // Feriados Inamovibles y Fijos Principales
  if (month === 0 && day === 1) return true;   // 1 Enero - Año Nuevo
  if (month === 2 && day === 24) return true;  // 24 Marzo - Memoria por la Verdad y Justicia
  if (month === 3 && day === 2) return true;   // 2 Abril - Malvinas
  if (month === 4 && day === 1) return true;   // 1 Mayo - Día del Trabajador
  if (month === 4 && day === 25) return true;  // 25 Mayo - Revolución de Mayo
  if (month === 5 && day === 17) return true;  // 17 Junio - General Güemes
  if (month === 5 && day === 20) return true;  // 20 Junio - General Belgrano / Día de la Bandera
  if (month === 6 && day === 9) return true;   // 9 Julio - Día de la Independencia
  if (month === 7 && day === 17) return true;  // 17 Agosto - General San Martín
  if (month === 9 && day === 12) return true;  // 12 Octubre - Diversidad Cultural
  if (month === 10 && day === 20) return true; // 20 Noviembre - Soberanía Nacional
  if (month === 11 && day === 8) return true;  // 8 Diciembre - Inmaculada Concepción
  if (month === 11 && day === 25) return true; // 25 Diciembre - Navidad

  // Feriados variables (Carnaval y Viernes Santo por año)
  const y = d.getFullYear();
  if (y === 2024) {
    if (month === 1 && (day === 12 || day === 13)) return true; // Carnaval 2024
    if (month === 2 && day === 29) return true;                 // Viernes Santo 2024
  } else if (y === 2025) {
    if (month === 2 && (day === 3 || day === 4)) return true;   // Carnaval 2025
    if (month === 3 && day === 18) return true;                 // Viernes Santo 2025
  } else if (y === 2026) {
    if (month === 1 && (day === 16 || day === 17)) return true; // Carnaval 2026
    if (month === 3 && day === 3) return true;                  // Viernes Santo 2026
  }

  return false;
};

export const getDailyDriverRate = (settings: Settings): number => {
  const totalDriver = (settings.driverFixed || 0) + (settings.driverBonus || 0);
  const daysBase = settings.driverDaysBase > 0 ? settings.driverDaysBase : 25;
  return Math.round(totalDriver / daysBase);
};

export const calculateUnitPnL = (
  units: Unit[],
  trips: Trip[],
  settings: Settings
): UnitPnL[] => {
  const scoped = scopeUnits(units);
  const dailyDriverRate = getDailyDriverRate(settings);
  const fuelPerKm = ((settings.consumption || 10) / 100) * (settings.diesel || 1650);

  return scoped
    .map(unit => {
      const ownTrips = trips.filter(
        t => normal(t.patent) === normal(unit.patent)
      );

      // Días laborables activos trabajados (excluyendo domingos y feriados nacionales)
      const activeDaysSet = new Set(
        ownTrips
          .filter(t => t.date && !isSundayOrHoliday(t.date))
          .map(t => t.date!.toISOString().slice(0, 10))
      );
      const activeDays = activeDaysSet.size;

      const revenue = ownTrips.reduce((sum, t) => sum + (t.rate || 0), 0);

      // Estimated Km (uses recorded km per trip if provided, else avgKmPerTrip)
      const kmEstimated = ownTrips.reduce((sum, t) => {
        const tripKm = t.km && t.km > 0 ? t.km : (settings.avgKmPerTrip || 100);
        return sum + tripKm;
      }, 0);

      // Driver cost: assigned active working days * daily driver cost
      const driverCost = activeDays * dailyDriverRate;

      // Fuel cost: kmEstimated * fuel cost per km
      const fuelCost = Math.round(kmEstimated * fuelPerKm);

      // Fixed lease cost per month (includes insurance and patent)
      const lease = settings.lease || 0;

      // Total operational cost
      const totalCost = lease + driverCost + fuelCost;

      // Net operating result
      const result = revenue - totalCost;
      const grossResult = revenue - lease;

      // Lease absorption coverage
      const coverage = lease > 0 ? revenue / lease : 0;
      const operatingMarginPct = revenue > 0 ? (result / revenue) * 100 : 0;

      return {
        ...unit,
        trips: ownTrips,
        tripCount: ownTrips.length,
        activeDays,
        kmEstimated,
        revenue,
        driverCost,
        fuelCost,
        lease,
        totalCost,
        coverage,
        operatingMarginPct,
        result,
        grossResult,
      };
    })
    .sort((a, b) => a.result - b.result); // Deficit units first to prioritize alerts
};

export interface WeekWindowOption {
  num: number;
  startDay: number;
  endDay: number;
  label: string;
}

/**
 * Agrupa los días del mes en semanas operativas naturales de Lunes a Domingo.
 */
export const getMonthWeekWindows = (year: number, month: number): WeekWindowOption[] => {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const windows: WeekWindowOption[] = [];

  let currentStartDay = 1;
  let weekNum = 1;

  while (currentStartDay <= lastDayOfMonth) {
    const d = new Date(year, month, currentStartDay);
    const jsDay = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const daysUntilSunday = jsDay === 0 ? 0 : 7 - jsDay;
    const currentEndDay = Math.min(lastDayOfMonth, currentStartDay + daysUntilSunday);

    windows.push({
      num: weekNum,
      startDay: currentStartDay,
      endDay: currentEndDay,
      label: `Semana ${weekNum} (${currentStartDay}/${month + 1} - ${currentEndDay}/${month + 1})`,
    });

    currentStartDay = currentEndDay + 1;
    weekNum++;
  }

  return windows;
};

export const calculateWoW = (
  units: Unit[],
  trips: Trip[],
  selectedMonth: string
): WoWComparison => {
  const scoped = scopeUnits(units);
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  if (selectedMonth && selectedMonth.includes('-')) {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      year = y;
      month = m - 1;
    }
  }

  // Generar semanas operativas de Lunes a Domingo del mes seleccionado
  const weekWindows = getMonthWeekWindows(year, month);

  const allWeeks: WeekStats[] = weekWindows.map(w => {
    const startDate = new Date(year, month, w.startDay, 0, 0, 0);
    const endDate = new Date(year, month, w.endDay, 23, 59, 59);

    // Filter trips in this week
    const weekTrips = trips.filter(t => {
      if (!t.date) return false;
      const time = t.date.getTime();
      return time >= startDate.getTime() && time <= endDate.getTime();
    });

    const activePatents = new Set<string>();
    let totalRevenue = 0;

    weekTrips.forEach(t => {
      activePatents.add(normal(t.patent));
      totalRevenue += t.rate || 0;
    });

    const idlePatents: string[] = [];
    scoped.forEach(u => {
      if (!activePatents.has(normal(u.patent))) {
        idlePatents.push(u.patent);
      }
    });

    const activeUnitsCount = scoped.length - idlePatents.length;
    const idleUnitsCount = idlePatents.length;

    return {
      weekNumber: w.num,
      weekLabel: w.label,
      startDate,
      endDate,
      activeUnitsCount,
      idleUnitsCount,
      idlePatents,
      totalTrips: weekTrips.length,
      totalRevenue,
    };
  });

  // Determine current and previous week
  // If we are looking at current month, find which week includes today
  const today = new Date();
  let currentIdx = -1;

  if (today.getFullYear() === year && today.getMonth() === month) {
    const day = today.getDate();
    currentIdx = weekWindows.findIndex(w => day >= w.startDay && day <= w.endDay);
  }

  // If month is past, use the last week with trips, or the last week
  if (currentIdx === -1) {
    const lastWithTrips = allWeeks.map((w, idx) => ({ w, idx })).filter(item => item.w.totalTrips > 0);
    if (lastWithTrips.length > 0) {
      currentIdx = lastWithTrips[lastWithTrips.length - 1].idx;
    } else {
      currentIdx = allWeeks.length - 1;
    }
  }

  const currentWeek = allWeeks[currentIdx] || allWeeks[allWeeks.length - 1];
  const previousWeek = currentIdx > 0 ? allWeeks[currentIdx - 1] : currentWeek;

  const idleDiff = currentWeek.idleUnitsCount - previousWeek.idleUnitsCount;
  let idleTrend: 'better' | 'worse' | 'equal' = 'equal';
  if (idleDiff < 0) {
    idleTrend = 'better'; // Fewer idle vans = improvement
  } else if (idleDiff > 0) {
    idleTrend = 'worse'; // More idle vans = deterioration
  }

  return {
    currentWeek,
    previousWeek,
    idleDiff,
    idleTrend,
    allWeeks,
  };
};

export const calculateDailyStats = (
  units: Unit[],
  trips: Trip[],
  selectedMonth: string
): DailyStats[] => {
  const scoped = scopeUnits(units);
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  if (selectedMonth && selectedMonth.includes('-')) {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      year = y;
      month = m - 1;
    }
  } else if (trips.length > 0) {
    const validTrip = trips.find(t => t.date);
    if (validTrip && validTrip.date) {
      const d = validTrip.date instanceof Date ? validTrip.date : new Date(validTrip.date);
      year = d.getFullYear();
      month = d.getMonth();
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const results: DailyStats[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const fullDate = new Date(year, month, day);
    const dayTrips = trips.filter(t => {
      if (!t.date) return false;
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    const activePatents = new Set<string>();
    let totalRevenue = 0;
    dayTrips.forEach(t => {
      activePatents.add(normal(t.patent));
      totalRevenue += t.rate || 0;
    });

    const idlePatents: string[] = [];
    scoped.forEach(u => {
      if (!activePatents.has(normal(u.patent))) {
        idlePatents.push(u.patent);
      }
    });

    const activeUnitsCount = scoped.length - idlePatents.length;
    const idleUnitsCount = idlePatents.length;

    results.push({
      dayNumber: day,
      dateLabel: `${day}`,
      fullDate,
      idleUnitsCount,
      activeUnitsCount,
      totalTrips: dayTrips.length,
      totalRevenue,
      idlePatents,
    });
  }

  return results;
};

/**
 * Genera una huella digital única y determinística para un viaje.
 * Permite identificar de manera inequívoca si un viaje ya fue cargado,
 * evitando duplicaciones al reimportar el mismo archivo o al guardar en Supabase.
 */
export const getTripFingerprint = (t: {
  patent: string;
  date?: Date | string | null;
  rate?: number;
  service?: string;
  client?: string;
  site?: string;
  driver?: string;
  remito?: string;
  route?: string;
  packages?: number;
  km?: number;
}): string => {
  const normPatent = (t.patent || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  let dateStr = 'nodate';
  if (t.date) {
    if (t.date instanceof Date) {
      dateStr = !isNaN(t.date.getTime()) ? t.date.toISOString().slice(0, 10) : 'nodate';
    } else if (typeof t.date === 'string') {
      dateStr = t.date.slice(0, 10);
    }
  }

  // Si existe un remito / comprobante explícito
  const normRemito = (t.remito || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normRemito && normRemito.length >= 2) {
    return `R_${normPatent}_${dateStr}_${normRemito}`;
  }

  // Si existe una ruta específica (ej. "Ruta 402", "CABA 10")
  const normRoute = (t.route || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normRoute && normRoute.length >= 2) {
    const rateNum = Math.round(Number(t.rate) || 0);
    return `RO_${normPatent}_${dateStr}_${normRoute}_${rateNum}`;
  }

  // Clave compuesta operacional: Patente + Fecha + Importe + Cliente + Servicio + Site + Chofer
  const normService = (t.service || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normClient = (t.client || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normSite = (t.site || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normDriver = (t.driver || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rateNum = Math.round(Number(t.rate) || 0);

  return `T_${normPatent}_${dateStr}_${rateNum}_${normClient}_${normService}_${normSite}_${normDriver}`;
};

/**
 * Elimina duplicados de una lista de viajes preservando la última versión.
 */
export const deduplicateTrips = <T extends {
  patent: string;
  date?: Date | string | null;
  rate?: number;
  service?: string;
  driver?: string;
  remito?: string;
  route?: string;
  packages?: number;
  km?: number;
}>(trips: T[]): { uniqueTrips: T[]; duplicatesCount: number } => {
  const map = new Map<string, T>();
  let duplicatesCount = 0;

  for (const trip of trips) {
    const key = getTripFingerprint(trip);
    if (map.has(key)) {
      duplicatesCount++;
    }
    // Conserva la versión más reciente
    map.set(key, trip);
  }

  return {
    uniqueTrips: Array.from(map.values()),
    duplicatesCount,
  };
};

/**
 * Normaliza cualquier denominación de vehículo a una de las 4 categorías maestras:
 * - Camioneta: Hiace, Master, Boxer, Sprinter, Ducato, Transit, etc.
 * - Utilitario: Kangoo, Fiorino, Partner, Berlingo, Expert, furgón chico/mediano, etc.
 * - Chasis: Camión chasis / rígido liviano o mediano.
 * - Semi: Semirremolque, tractor con semi / batea.
 */
export const normalizeVehicleCategory = (val?: string): string => {
  if (!val) return '';
  const n = normal(val);

  // Fiorino
  if (n.includes('fiorino') || n.includes('strada') || n.includes('saveiro') || n.includes('utilitario chico')) {
    return 'Fiorino';
  }

  // Utilitario mediano
  if (n.includes('utilitario mediano') || n.includes('utilitario') || n.includes('kangoo') || n.includes('partner') || n.includes('berlingo') || n.includes('expert') || n.includes('furgon chico') || n.includes('furgon mediano')) {
    return 'Utilitario mediano';
  }

  // Camioneta: Hiace, Master, Boxer, Sprinter, Ducato, Transit, furgón grande
  if (
    n.includes('camioneta') ||
    n.includes('hiace') ||
    n.includes('master') ||
    n.includes('boxer') ||
    n.includes('sprinter') ||
    n.includes('ducato') ||
    n.includes('transit') ||
    n.includes('furgon grande') ||
    n.includes('furgon')
  ) {
    return 'Camioneta';
  }

  // Semi: Semirremolque, tractor con semi
  if (
    n.includes('semi') ||
    n.includes('semirremolque') ||
    n.includes('acoplado') ||
    n.includes('batea')
  ) {
    return 'Semi';
  }

  // Sub-categorías específicas de Chasis (Liviano vs Mediano vs Pesado)
  if (n.includes('liviano') || n.includes('chico') || n.includes('chasis liviano')) {
    return 'Chasis Liviano';
  }

  if (n.includes('pesado') || n.includes('grande') || n.includes('chasis pesado')) {
    return 'Chasis Pesado';
  }

  if (n.includes('mediano') || n.includes('chasis mediano')) {
    return 'Chasis Mediano';
  }

  // Chasis estándar / general
  if (
    n.includes('chasis') ||
    n.includes('camion') ||
    n.includes('cargo') ||
    n.includes('accelo') ||
    n.includes('atego') ||
    n.includes('chassis')
  ) {
    return 'Chasis';
  }

  return val;
};

/**
 * Identifica el cliente exacto (Mercado Libre, Pickit, Entregar, etc.) a partir del tarifario o nombre del servicio.
 */
export const detectClient = (serviceName: string = '', tariffClient?: string, tripClient?: string): string => {
  const providedClient = (tariffClient || tripClient || '').trim();
  if (providedClient) {
    const provLower = providedClient.toLowerCase();
    if (provLower.includes('pickit')) return 'Pickit';
    if (provLower.includes('entregar')) return 'Entregar';
    if (provLower.includes('mercado libre') || provLower.includes('meli')) return 'Mercado Libre';

    const forbidden = ['andreani', 'cencosud', 'cencocus', 'quilmes', 'carrefour', 'frávega', 'fravega'];
    if (!forbidden.some(p => provLower.includes(p))) {
      return providedClient;
    }
  }

  const lower = (serviceName || '').toLowerCase().trim();

  // Explicit client names in service name
  if (lower.includes('pickit')) return 'Pickit';
  if (lower.includes('entregar')) return 'Entregar';
  if (lower.includes('mercado libre') || lower.includes('meli')) return 'Mercado Libre';

  // Keyword associations for Pickit & Entregar
  if (lower.includes('dropoff') || lower.includes('colecta') || lower.includes('puntos')) {
    return 'Pickit';
  }

  if (lower.includes('paquetería') || lower.includes('paquete')) {
    return 'Entregar';
  }

  // Keyword associations for Mercado Libre / Meli
  if (
    lower.includes('first mile') ||
    lower.includes('middle mile') ||
    lower.includes('last mile') ||
    lower.includes('service center') ||
    lower.includes('sbh') ||
    lower.includes('arba') ||
    lower.includes('arx') ||
    lower.includes('sbu') ||
    lower.includes('scf') ||
    lower.includes('srsc') ||
    lower.includes('line haul') ||
    lower.includes('troncal') ||
    lower.includes('primera milla') ||
    lower.includes('última milla') ||
    lower.includes('ultima milla')
  ) {
    return 'Mercado Libre';
  }

  return 'Mercado Libre';
};

/**
 * Busca en el tarifario la tarifa correspondiente a un servicio, cliente, site y vehículo.
 */
export const findTariffForService = <T extends { service: string; client?: string; vehicleType?: string; originSite?: string; rate: number }>(
  serviceName: string | undefined,
  tariffs: T[],
  vehicleType?: string,
  clientName?: string,
  siteName?: string
): T | undefined => {
  if (!tariffs || tariffs.length === 0) return undefined;

  const targetService = normal(serviceName);
  const targetClient = normal(clientName);
  const targetSite = normal(siteName);

  if (!targetService && !targetClient && !targetSite) return undefined;

  const catTarget = vehicleType ? normalizeVehicleCategory(vehicleType) : '';
  const normVehicle = vehicleType ? normal(vehicleType) : '';

  const matchesVehicle = (t: T) => {
    if (!catTarget && !normVehicle) return true;
    if (!t.vehicleType) return true;
    const tCat = normalizeVehicleCategory(t.vehicleType);
    const tv = normal(t.vehicleType);
    return (catTarget && tCat === catTarget) || tv === normVehicle || normVehicle.includes(tv) || tv.includes(normVehicle);
  };

  const matchesClient = (t: T) => {
    if (!targetClient) return true;
    if (!t.client) return false;
    const cNorm = normal(t.client);
    return cNorm === targetClient || targetClient.includes(cNorm) || cNorm.includes(targetClient);
  };

  const matchesSite = (t: T) => {
    if (!targetSite) return true;
    if (!t.originSite) return false;
    const sNorm = normal(t.originSite);
    return sNorm === targetSite || targetSite.includes(sNorm) || sNorm.includes(targetSite);
  };

  const matchesService = (t: T) => {
    if (!targetService) return true;
    const sNorm = normal(t.service);
    return sNorm === targetService || targetService.includes(sNorm) || sNorm.includes(targetService);
  };

  // 1. Coincidencia estricta: Cliente + Site + Servicio + Vehículo
  if (targetClient && targetSite && targetService) {
    const match = tariffs.find(t => matchesClient(t) && matchesSite(t) && matchesService(t) && matchesVehicle(t));
    if (match) return match;
  }

  // 2. Coincidencia: Cliente + Site + Vehículo
  if (targetClient && targetSite) {
    const match = tariffs.find(t => matchesClient(t) && matchesSite(t) && matchesVehicle(t));
    if (match) return match;
  }

  // 3. Coincidencia: Cliente + Site
  if (targetClient && targetSite) {
    const match = tariffs.find(t => matchesClient(t) && matchesSite(t));
    if (match) return match;
  }

  // 4. Coincidencia: Cliente + Servicio + Vehículo
  if (targetClient && targetService) {
    const match = tariffs.find(t => matchesClient(t) && matchesService(t) && matchesVehicle(t));
    if (match) return match;
  }

  // 5. Coincidencia: Cliente + Servicio
  if (targetClient && targetService) {
    const match = tariffs.find(t => matchesClient(t) && matchesService(t));
    if (match) return match;
  }

  // 6. Coincidencia: Servicio exacto + Vehículo
  if (targetService) {
    const match = tariffs.find(t => normal(t.service) === targetService && matchesVehicle(t));
    if (match) return match;
  }

  // 7. Coincidencia: Servicio exacto
  if (targetService) {
    const match = tariffs.find(t => normal(t.service) === targetService);
    if (match) return match;
  }

  // 8. Coincidencia: Site / Service Center + Vehículo
  if (targetSite || targetService) {
    const siteQuery = targetSite || targetService;
    const match = tariffs.find(t => {
      if (!t.originSite) return false;
      const sNorm = normal(t.originSite);
      return (sNorm.includes(siteQuery) || siteQuery.includes(sNorm)) && matchesVehicle(t);
    });
    if (match) return match;
  }

  // 9. Coincidencia: Cliente + Vehículo
  if (targetClient) {
    const match = tariffs.find(t => matchesClient(t) && matchesVehicle(t));
    if (match) return match;
  }

  // 10. Coincidencia: Cliente exacto
  if (targetClient) {
    const match = tariffs.find(t => matchesClient(t));
    if (match) return match;
  }

  // 11. Búsqueda parcial de respaldo
  return tariffs.find(t => {
    const s = normal(t.service);
    const c = t.client ? normal(t.client) : '';
    const site = t.originSite ? normal(t.originSite) : '';
    const query = targetService || targetClient || targetSite;
    return (s && (query.includes(s) || s.includes(query))) ||
           (c && (query.includes(c) || c.includes(query))) ||
           (site && (query.includes(site) || site.includes(query)));
  });
};

/**
 * Calcula el análisis económico y operativo por tipo de servicio
 * con periodicidad semanal (o consolidado mensual).
 */
export const calculateWeeklyServiceAnalysis = (
  trips: Trip[],
  units: Unit[],
  settings: Settings,
  tariffs: Tariff[] = [],
  selectedMonth: string,
  selectedWeekNum: number | 'all' = 1
): WeeklyServiceAnalysis => {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  if (selectedMonth && selectedMonth.includes('-')) {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      year = y;
      month = m - 1;
    }
  }

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const allWeekOptions = getMonthWeekWindows(year, month);

  let startDate: Date;
  let endDate: Date;
  let weekLabel: string;

  if (selectedWeekNum === 'all') {
    startDate = new Date(year, month, 1, 0, 0, 0);
    endDate = new Date(year, month, lastDayOfMonth, 23, 59, 59);
    weekLabel = `Mes Completo (${selectedMonth})`;
  } else {
    const selectedOption = allWeekOptions.find(w => w.num === selectedWeekNum) || allWeekOptions[0];
    startDate = new Date(year, month, selectedOption.startDay, 0, 0, 0);
    endDate = new Date(year, month, selectedOption.endDay, 23, 59, 59);
    weekLabel = selectedOption.label;
  }

  // Filtrar viajes del período seleccionado
  const periodTrips = trips.filter(t => {
    if (!t.date) return selectedWeekNum === 'all';
    const time = t.date.getTime();
    return time >= startDate.getTime() && time <= endDate.getTime();
  });

  // Calcular métricas completas por servicio
  const services = calculateServicesAnalysis(periodTrips, units, settings, tariffs);

  const globalOccupiedUnits = new Set<string>();
  periodTrips.forEach(t => {
    const p = (t.patent || '').trim().toUpperCase();
    if (p) globalOccupiedUnits.add(p);
  });

  const totalRevenue = services.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalCost = services.reduce((sum, s) => sum + s.estimatedTotalCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalTrips = periodTrips.length;
  const totalPackages = services.reduce((sum, s) => sum + s.totalPackages, 0);

  return {
    weekNumber: selectedWeekNum,
    weekLabel,
    startDate,
    endDate,
    totalRevenue,
    totalCost,
    totalProfit,
    marginPct,
    totalOccupiedUnitsCount: globalOccupiedUnits.size,
    totalTrips,
    totalPackages,
    allWeekOptions,
    services,
  };
};


/**
 * Genera el análisis de rentabilidad, volumen, paquetes y costos por tipo de servicio.
 */
export const calculateServicesAnalysis = (
  trips: Trip[],
  units: Unit[],
  settings: Settings,
  tariffs: Tariff[] = []
): ServiceMetric[] => {
  if (!trips || trips.length === 0) return [];

  const dailyDriverRate = getDailyDriverRate(settings);
  const fuelPerKm = ((settings.consumption || 10) / 100) * (settings.diesel || 1650);
  const dailyLeaseRate = Math.round((settings.lease || 0) / (settings.driverDaysBase || 25));

  const totalAllRevenue = trips.reduce((sum, t) => sum + (t.rate || 0), 0);
  const totalAllTrips = trips.length;

  // Agrupar viajes por nombre normalizado de servicio
  const serviceGroups = new Map<string, { displayName: string; trips: Trip[] }>();

  for (const trip of trips) {
    const raw = (trip.service || '').trim();
    const displayName = raw || 'Distribución general';
    const key = normal(displayName);

    if (!serviceGroups.has(key)) {
      serviceGroups.set(key, { displayName, trips: [] });
    }
    serviceGroups.get(key)!.trips.push(trip);
  }

  // Construir mapa de servicios distintos por (fecha + patente) para prorratear costos fijos diarios
  const unitDateServicesMap = new Map<string, Set<string>>();
  for (const trip of trips) {
    if (!trip.date || isSundayOrHoliday(trip.date)) continue;
    const dateStr = trip.date.toISOString().slice(0, 10);
    const pat = (trip.patent || '').trim().toUpperCase();
    if (!pat) continue;
    const key = `${dateStr}-${pat}`;
    if (!unitDateServicesMap.has(key)) {
      unitDateServicesMap.set(key, new Set());
    }
    const sName = normal(trip.service || 'Distribución general');
    unitDateServicesMap.get(key)!.add(sName);
  }

  const results: ServiceMetric[] = [];

  for (const [, group] of serviceGroups.entries()) {
    const groupTrips = group.trips;
    const serviceName = group.displayName;

    // Buscar en tarifario
    const tariff = findTariffForService(serviceName, tariffs);
    const client = detectClient(serviceName, tariff?.client, groupTrips.find(t => (t as any).client)?.client);

    // Determinar modalidad de cobro (por paquete vs por ruta)
    const hasPackagePricing =
      groupTrips.some(t => t.pricingType === 'package' || (t.packages !== undefined && t.packages > 0)) ||
      (tariff && tariff.pricingType === 'package') ||
      normal(serviceName).includes('entregar');

    const pricingType = hasPackagePricing ? 'package' : 'route';
    const requiresHelper = Boolean(
      tariff?.requiresHelper || groupTrips.some(t => t.requiresHelper)
    );

    const totalRevenue = groupTrips.reduce((sum, t) => sum + (t.rate || 0), 0);
    const totalTrips = groupTrips.length;
    const totalPackages = groupTrips.reduce((sum, t) => sum + (t.packages || 0), 0);

    const avgPackagesPerTrip = totalPackages > 0 && totalTrips > 0 ? Math.round(totalPackages / totalTrips) : 0;
    const avgRevenuePerTrip = totalTrips > 0 ? Math.round(totalRevenue / totalTrips) : 0;

    const revenueSharePct = totalAllRevenue > 0 ? (totalRevenue / totalAllRevenue) * 100 : 0;
    const tripSharePct = totalAllTrips > 0 ? (totalTrips / totalAllTrips) * 100 : 0;

    // Conteo de unidades y choferes únicos
    const unitsSet = new Set<string>();
    const driversSet = new Set<string>();
    const activeDateAndUnitSet = new Set<string>();
    const activeDatesSet = new Set<string>();

    let estimatedKm = 0;

    for (const t of groupTrips) {
      if (t.patent) unitsSet.add(t.patent.toUpperCase().trim());
      if (t.driver && t.driver.trim() && t.driver !== '—' && t.driver !== 'No asignado') {
        driversSet.add(t.driver.trim());
      }

      const dateStr = t.date ? t.date.toISOString().slice(0, 10) : 'no-date';
      if (dateStr !== 'no-date' && !isSundayOrHoliday(t.date)) {
        activeDatesSet.add(dateStr);
        activeDateAndUnitSet.add(`${dateStr}-${(t.patent || '').toUpperCase()}`);
      }

      const km = t.km && t.km > 0 ? t.km : (tariff?.estimatedKm || settings.avgKmPerTrip || 100);
      estimatedKm += km;
    }

    const uniqueUnits = Array.from(unitsSet);
    const uniqueDrivers = Array.from(driversSet);
    const uniqueUnitsCount = uniqueUnits.length;
    const uniqueDriversCount = uniqueDrivers.length;
    const activeDaysCount = activeDatesSet.size;

    // Prorrateo de jornadas de unidades: si una unidad atendió N servicios en la misma fecha,
    // cada servicio absorbe 1/N de la jornada de esa unidad ese día.
    let activeUnitDays = 0;
    if (activeDateAndUnitSet.size > 0) {
      for (const key of activeDateAndUnitSet) {
        const servicesCount = unitDateServicesMap.get(key)?.size || 1;
        activeUnitDays += 1 / servicesCount;
      }
    } else {
      activeUnitDays = totalTrips;
    }

    // Costos operativos asignados al servicio:
    // 1. Chofer: jornadas prorrateadas trabajadas * tarifa diaria de chofer
    const estimatedDriverCost = Math.round(activeUnitDays * dailyDriverRate);

    // 2. Combustible: km totales recorridos * costo por km
    const estimatedFuelCost = Math.round(estimatedKm * fuelPerKm);

    // 3. Contribución de leasing: canon diario por jornada prorrateada de camioneta afectada
    const estimatedLeaseContribution = Math.round(activeUnitDays * dailyLeaseRate);

    const estimatedTotalCost = estimatedDriverCost + estimatedFuelCost + estimatedLeaseContribution;
    const estimatedNetResult = totalRevenue - estimatedTotalCost;
    const estimatedMarginPct = totalRevenue > 0 ? (estimatedNetResult / totalRevenue) * 100 : 0;

    // Desglose por ruta
    const routeMap = new Map<string, { tripCount: number; packages: number; revenue: number }>();
    for (const t of groupTrips) {
      const rName = t.route?.trim() || 'Ruta estándar';
      if (!routeMap.has(rName)) {
        routeMap.set(rName, { tripCount: 0, packages: 0, revenue: 0 });
      }
      const item = routeMap.get(rName)!;
      item.tripCount += 1;
      item.packages += (t.packages || 0);
      item.revenue += (t.rate || 0);
    }
    const routesBreakdown: ServiceRouteBreakdown[] = Array.from(routeMap.entries()).map(([route, stats]) => ({
      route,
      tripCount: stats.tripCount,
      packages: stats.packages,
      revenue: stats.revenue,
    })).sort((a, b) => b.revenue - a.revenue);

    // Desglose por unidad (patente)
    const unitMap = new Map<string, { tripCount: number; packages: number; revenue: number }>();
    for (const t of groupTrips) {
      const pat = (t.patent || 'Sin patente').toUpperCase().trim();
      if (!unitMap.has(pat)) {
        unitMap.set(pat, { tripCount: 0, packages: 0, revenue: 0 });
      }
      const item = unitMap.get(pat)!;
      item.tripCount += 1;
      item.packages += (t.packages || 0);
      item.revenue += (t.rate || 0);
    }
    const unitsBreakdown: ServiceUnitBreakdown[] = Array.from(unitMap.entries()).map(([patent, stats]) => ({
      patent,
      tripCount: stats.tripCount,
      packages: stats.packages,
      revenue: stats.revenue,
    })).sort((a, b) => b.revenue - a.revenue);

    results.push({
      serviceName,
      client,
      pricingType,
      requiresHelper,
      modality: tariff?.modality,
      originSite: tariff?.originSite,
      vehicleType: tariff?.vehicleType,
      tariffRate: tariff?.rate,
      tariffEstimatedKm: tariff?.estimatedKm,
      totalTrips,
      totalRevenue,
      revenueSharePct,
      tripSharePct,
      totalPackages,
      avgPackagesPerTrip,
      avgRevenuePerTrip,
      uniqueUnitsCount,
      uniqueUnits,
      uniqueDriversCount,
      uniqueDrivers,
      activeDaysCount,
      estimatedKm,
      estimatedDriverCost,
      estimatedFuelCost,
      estimatedLeaseContribution,
      estimatedTotalCost,
      estimatedNetResult,
      estimatedMarginPct,
      trips: groupTrips.sort((a, b) => {
        const timeA = a.date ? a.date.getTime() : 0;
        const timeB = b.date ? b.date.getTime() : 0;
        return timeB - timeA;
      }),
      routesBreakdown,
      unitsBreakdown,
    });
  }

  // Ordenar de mayor a menor facturación
  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
};

