import { Unit, Trip, UnitPnL } from '../types';

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
  const filtered = units.filter(
    u =>
      normal(u.model).includes('hiace') &&
      normal(u.zone) === 'amba' &&
      normal(u.property).includes('leasing')
  );
  // If the user's uploaded master only has Hiaces or didn't set zone/property explicitly,
  // return all matching Hiaces or fallback to all units if 0 matched so the user doesn't get an empty screen
  if (filtered.length === 0 && units.length > 0) {
    const hiaces = units.filter(u => normal(u.model).includes('hiace') || normal(u.type).includes('hiace'));
    return hiaces.length > 0 ? hiaces : units;
  }
  return filtered;
};

export const calculateUnitPnL = (
  units: Unit[],
  trips: Trip[],
  leaseCost: number
): UnitPnL[] => {
  const scoped = scopeUnits(units);
  return scoped
    .map(unit => {
      const ownTrips = trips.filter(
        t => normal(t.patent) === normal(unit.patent)
      );
      const revenue = ownTrips.reduce((sum, t) => sum + (t.rate || 0), 0);
      const coverage = leaseCost > 0 ? revenue / leaseCost : 0;
      const result = revenue - leaseCost;
      return {
        ...unit,
        trips: ownTrips,
        tripCount: ownTrips.length,
        revenue,
        lease: leaseCost,
        coverage,
        result,
      };
    })
    .sort((a, b) => a.result - b.result); // Lowest result first to highlight absorption alerts
};
