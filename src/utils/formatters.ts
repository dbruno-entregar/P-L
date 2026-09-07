import { Unit, Trip, UnitPnL, Settings, WoWComparison, WeekStats, Tariff, ServiceMetric, WeeklyServiceAnalysis, ServiceRouteBreakdown, ServiceUnitBreakdown } from '../types';

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

      // Distinct active days worked in the period
      const activeDaysSet = new Set(
        ownTrips
          .filter(t => t.date)
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

  // Days in month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // Create 4-5 weekly windows for the month
  const weekWindows = [
    { num: 1, startDay: 1, endDay: 7, label: 'Semana 1 (1-7)' },
    { num: 2, startDay: 8, endDay: 14, label: 'Semana 2 (8-14)' },
    { num: 3, startDay: 15, endDay: 21, label: 'Semana 3 (15-21)' },
    { num: 4, startDay: 22, endDay: 28, label: 'Semana 4 (22-28)' },
  ];

  if (lastDayOfMonth > 28) {
    weekWindows.push({
      num: 5,
      startDay: 29,
      endDay: lastDayOfMonth,
      label: `Semana 5 (29-${lastDayOfMonth})`,
    });
  }

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

  // Clave compuesta operacional: Patente + Fecha + Importe + Servicio + Chofer
  const normService = (t.service || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normDriver = (t.driver || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rateNum = Math.round(Number(t.rate) || 0);

  return `T_${normPatent}_${dateStr}_${rateNum}_${normService}_${normDriver}`;
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
 * Busca en el tarifario la tarifa correspondiente a un servicio o cliente.
 * Si se especifica un tipo de vehículo, prioriza la tarifa fijada para ese vehículo (esencial para servicios por ruta).
 */
export const findTariffForService = <T extends { service: string; client?: string; vehicleType?: string; rate: number }>(
  serviceName: string | undefined,
  tariffs: T[],
  vehicleType?: string
): T | undefined => {
  if (!serviceName || !tariffs || tariffs.length === 0) return undefined;

  const target = normal(serviceName);
  if (!target) return undefined;

  const normVehicle = vehicleType ? normal(vehicleType) : '';

  // 1. Coincidencia exacta de servicio y tipo de vehículo (si se indicó vehículo)
  if (normVehicle) {
    const exactWithVehicle = tariffs.find(t => {
      if (normal(t.service) !== target) return false;
      if (!t.vehicleType) return false;
      const tv = normal(t.vehicleType);
      return tv === normVehicle || normVehicle.includes(tv) || tv.includes(normVehicle);
    });
    if (exactWithVehicle) return exactWithVehicle;
  }

  // 2. Coincidencia exacta de servicio
  const exact = tariffs.find(t => normal(t.service) === target);
  if (exact) return exact;

  // 3. Coincidencia exacta de cliente con tipo de vehículo
  if (normVehicle) {
    const exactClientWithVehicle = tariffs.find(t => {
      if (!t.client || normal(t.client) !== target) return false;
      if (!t.vehicleType) return false;
      const tv = normal(t.vehicleType);
      return tv === normVehicle || normVehicle.includes(tv) || tv.includes(normVehicle);
    });
    if (exactClientWithVehicle) return exactClientWithVehicle;
  }

  // 4. Coincidencia exacta de cliente
  const exactClient = tariffs.find(t => t.client && normal(t.client) === target);
  if (exactClient) return exactClient;

  // 5. Contención parcial
  const partial = tariffs.find(t => {
    const s = normal(t.service);
    const c = t.client ? normal(t.client) : '';
    return (s && (target.includes(s) || s.includes(target))) ||
           (c && (target.includes(c) || c.includes(target)));
  });

  return partial;
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

  const allWeekOptions = [
    { num: 1, label: 'Semana 1 (1-7)', startDay: 1, endDay: 7 },
    { num: 2, label: 'Semana 2 (8-14)', startDay: 8, endDay: 14 },
    { num: 3, label: 'Semana 3 (15-21)', startDay: 15, endDay: 21 },
    { num: 4, label: 'Semana 4 (22-28)', startDay: 22, endDay: 28 },
  ];

  if (lastDayOfMonth > 28) {
    allWeekOptions.push({
      num: 5,
      label: `Semana 5 (29-${lastDayOfMonth})`,
      startDay: 29,
      endDay: lastDayOfMonth,
    });
  }

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

  const results: ServiceMetric[] = [];

  for (const [, group] of serviceGroups.entries()) {
    const groupTrips = group.trips;
    const serviceName = group.displayName;

    // Buscar en tarifario
    const tariff = findTariffForService(serviceName, tariffs);
    const client = tariff?.client;

    // Determinar modalidad de cobro (por paquete vs por ruta)
    const hasPackagePricing =
      groupTrips.some(t => t.pricingType === 'package' || (t.packages !== undefined && t.packages > 0)) ||
      (tariff && tariff.pricingType === 'package') ||
      normal(serviceName).includes('entregar');

    const pricingType = hasPackagePricing ? 'package' : 'route';

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
      if (dateStr !== 'no-date') {
        activeDatesSet.add(dateStr);
        activeDateAndUnitSet.add(`${dateStr}-${(t.patent || '').toUpperCase()}`);
      }

      const km = t.km && t.km > 0 ? t.km : (settings.avgKmPerTrip || 100);
      estimatedKm += km;
    }

    const uniqueUnits = Array.from(unitsSet);
    const uniqueDrivers = Array.from(driversSet);
    const uniqueUnitsCount = uniqueUnits.length;
    const uniqueDriversCount = uniqueDrivers.length;
    const activeDaysCount = activeDatesSet.size;

    // Costos operativos asignados al servicio:
    // 1. Chofer: jornadas activas trabajadas * tarifa diaria de chofer
    const activeUnitDays = activeDateAndUnitSet.size > 0 ? activeDateAndUnitSet.size : totalTrips;
    const estimatedDriverCost = activeUnitDays * dailyDriverRate;

    // 2. Combustible: km totales recorridos * costo por km
    const estimatedFuelCost = Math.round(estimatedKm * fuelPerKm);

    // 3. Contribución de leasing: canon diario por jornada de camioneta afectada
    const estimatedLeaseContribution = activeUnitDays * dailyLeaseRate;

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
      tariffRate: tariff?.rate,
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

