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

export interface Trip {
  id: string;
  date: Date | null;
  patent: string;
  service?: string;
  driver?: string;
  vehicleType?: string;
  property?: string;
  rate: number;
}

export interface Settings {
  lease: number;
  diesel: number;
  consumption: number;
}

export interface UnitPnL extends Unit {
  trips: Trip[];
  tripCount: number;
  revenue: number;
  lease: number;
  coverage: number; // e.g. 0.85 = 85%
  result: number;   // revenue - lease
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
