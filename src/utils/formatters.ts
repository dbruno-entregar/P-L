import { Unit, Trip, UnitPnL, Settings, WoWComparison, WeekStats } from '../types';

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
