export interface Unit {
  patent: string;
  brand?: string;
  model?: string;
  type?: string;
  property?: string;
  service?: string;
  status?: string;
  region?: string;
  zone?: string;
}

export type TariffPricingType = 'route' | 'package'; // 'route': tarifa fija por ruta / 'package': tarifa por paquete entregado

export interface Trip {
  id: string;
  date: Date | null;
  patent: string;
  service?: string;
  driver?: string;
  vehicleType?: string;
  property?: string;
  rate: number; // Total facturación / Total ruta
  km?: number;
  remito?: string;
  route?: string; // Nombre / Código de Ruta (ej. "Ruta 402", "CABA Norte")
  packages?: number; // Cantidad de bultos o paquetes entregados
  pricingType?: TariffPricingType;
  requiresHelper?: boolean; // Tilde: indica si el flete requiere ayudante / peón
}

export type VehicleCategory = 'Camioneta' | 'Utilitario' | 'Chasis' | 'Semi';

export interface Tariff {
  id: string;
  service: string;
  client?: string;
  pricingType: TariffPricingType; // 'route' (por ruta fija) o 'package' (por cantidad de paquetes)
  modality?: string; // Modalidad operativa: 'Primera milla', 'Última milla', 'Dropoff', etc.
  vehicleType?: VehicleCategory | string; // Camioneta (Hiace, Master), Utilitario (Kangoo, Fiorino), Chasis, Semi
  originSite?: string; // Site donde cargan o desde donde salen las unidades (ej: Site Tablada, CD Benavídez)
  requiresHelper?: boolean; // Tilde: indica si el servicio requiere acompañante / ayudante / peón
  estimatedKm?: number; // Km aprox del recorrido/servicio (opcional, no es requisito)
  rate: number; // Monto por ruta ($) o valor por paquete ($)
  description?: string;
  notes?: string;
}

export interface Settings {
  lease: number; // Canon mensual de leasing por unidad (ARS) - cubre seguro y patente
  diesel: number; // Precio diésel premium por litro (ARS), default 1650
  consumption: number; // Consumo estimado L / 100 km, default 10
  driverFixed: number; // Sueldo fijo chofer cooperativa (ARS), default 1400000
  driverBonus: number; // Adicional por premios chofer (ARS), default 500000
  driverDaysBase: number; // Días laborables base mensual, default 25
  avgKmPerTrip: number; // Km promedio estimado por flete/servicio, default 100
}

export interface UnitPnL extends Unit {
  trips: Trip[];
  tripCount: number;
  activeDays: number;
  kmEstimated: number;
  revenue: number;
  driverCost: number; // activeDays * (driverTotal / driverDaysBase)
  fuelCost: number; // (kmEstimated / 100) * consumption * diesel
  lease: number;
  totalCost: number; // lease + driverCost + fuelCost
  coverage: number; // revenue / lease
  operatingMarginPct: number; // (result / revenue) * 100
  result: number; // revenue - totalCost (net profit/loss)
  grossResult: number; // revenue - lease
}

export interface WeekStats {
  weekNumber: number;
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  activeUnitsCount: number;
  idleUnitsCount: number;
  idlePatents: string[];
  totalTrips: number;
  totalRevenue: number;
}

export interface WoWComparison {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  idleDiff: number; // current - previous
  idleTrend: 'better' | 'worse' | 'equal';
  allWeeks: WeekStats[];
}

export interface ServiceRouteBreakdown {
  route: string;
  tripCount: number;
  packages: number;
  revenue: number;
}

export interface ServiceUnitBreakdown {
  patent: string;
  tripCount: number;
  packages: number;
  revenue: number;
}

export interface ServiceMetric {
  serviceName: string;
  client?: string;
  pricingType: TariffPricingType;
  requiresHelper?: boolean;
  tariffRate?: number;
  modality?: string;
  originSite?: string;
  vehicleType?: string;
  tariffEstimatedKm?: number;
  totalTrips: number;
  totalRevenue: number;
  revenueSharePct: number;
  tripSharePct: number;
  totalPackages: number;
  avgPackagesPerTrip: number;
  avgRevenuePerTrip: number;
  uniqueUnitsCount: number;
  uniqueUnits: string[];
  uniqueDriversCount: number;
  uniqueDrivers: string[];
  activeDaysCount: number;
  estimatedKm: number;
  estimatedDriverCost: number;
  estimatedFuelCost: number;
  estimatedLeaseContribution: number;
  estimatedTotalCost: number;
  estimatedNetResult: number;
  estimatedMarginPct: number;
  trips: Trip[];
  routesBreakdown: ServiceRouteBreakdown[];
  unitsBreakdown: ServiceUnitBreakdown[];
}

export interface WeeklyServiceAnalysis {
  weekNumber: number | 'all';
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPct: number;
  totalOccupiedUnitsCount: number;
  totalTrips: number;
  totalPackages: number;
  allWeekOptions: { num: number; label: string; startDay: number; endDay: number }[];
  services: ServiceMetric[];
}

export interface AppState {
  units: Unit[];
  trips: Trip[];
  settings: Settings;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export type CostViewMode = 'leasing_only' | 'full';
