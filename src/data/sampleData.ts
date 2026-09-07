import { Unit, Trip, Settings, Tariff } from '../types';

export const defaultSettings: Settings = {
  lease: 2744000,
  diesel: 1650,
  consumption: 10,
  driverFixed: 1400000,
  driverBonus: 500000,
  driverDaysBase: 25,
  avgKmPerTrip: 100,
};

export const defaultTariffs: Tariff[] = [
  { id: 'tar-entregar', service: 'Entregar - Ultima milla', client: 'Entregar', rate: 1800, pricingType: 'package', vehicleType: 'Utilitario', requiresHelper: false, description: 'Tarifa por paquete (Kangoo / Fiorino / Partner)' },
  { id: 'tar-1', service: 'Mercado Libre', client: 'Mercado Libre', rate: 165000, pricingType: 'route', vehicleType: 'Camioneta', requiresHelper: false, description: 'Ruta última milla / jornada completa (Hiace / Master / Boxer)' },
  { id: 'tar-2', service: 'Andreani', client: 'Andreani', rate: 155000, pricingType: 'route', vehicleType: 'Camioneta', requiresHelper: false, description: 'Distribución paquetería AMBA - Camioneta (Hiace / Master)' },
  { id: 'tar-2-med', service: 'Andreani', client: 'Andreani', rate: 135000, pricingType: 'route', vehicleType: 'Utilitario', requiresHelper: false, description: 'Distribución paquetería AMBA - Utilitario (Kangoo / Partner)' },
  { id: 'tar-3', service: 'Cencosud', client: 'Cencosud', rate: 155000, pricingType: 'route', vehicleType: 'Camioneta', requiresHelper: true, description: 'Reparto retail / supermercados (Hiace / Master)' },
  { id: 'tar-4', service: 'Quilmes', client: 'Cervecería Quilmes', rate: 175000, pricingType: 'route', vehicleType: 'Chasis', requiresHelper: true, description: 'Distribución bebidas AMBA - Chasis' },
  { id: 'tar-5', service: 'Carrefour', client: 'Carrefour', rate: 150000, pricingType: 'route', vehicleType: 'Camioneta', requiresHelper: true, description: 'Logística abastecimiento sucursales (Camioneta)' },
  { id: 'tar-6', service: 'Fravega', client: 'Fravega', rate: 160000, pricingType: 'route', vehicleType: 'Camioneta', requiresHelper: true, description: 'Electrodomésticos / paquetería pesada (Camioneta)' },
  { id: 'tar-7', service: 'Distribución general', client: 'Varios', rate: 135000, pricingType: 'route', vehicleType: 'Utilitario', requiresHelper: false, description: 'Flete estándar utilitario (Kangoo / Fiorino)' },
  { id: 'tar-8', service: 'Larga distancia', client: 'Varios', rate: 220000, pricingType: 'route', vehicleType: 'Chasis', requiresHelper: false, description: 'Servicio interurbano / interior - Chasis' },
  { id: 'tar-9', service: 'Troncal Larga Distancia', client: 'Varios', rate: 340000, pricingType: 'route', vehicleType: 'Semi', requiresHelper: false, description: 'Carga masiva troncal / interurbana - Semi' },
];

export const sampleUnits: Unit[] = [
  {
    patent: 'AF821CD',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L2H2',
    property: 'LEASING',
    service: 'Mercado Libre',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AF903EF',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L2H2',
    property: 'LEASING',
    service: 'Entregar - Ultima milla',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AE349GH',
    brand: 'Toyota',
    model: 'Hiace Commuter',
    type: 'HIACE L1H1',
    property: 'LEASING',
    service: 'Cencosud',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AG102XP',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L2H2',
    property: 'LEASING',
    service: 'Quilmes',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AD912LK',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L2H2',
    property: 'LEASING',
    service: 'Carrefour',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AF405MN',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L1H1',
    property: 'LEASING',
    service: 'DHL Supply',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AF710QR',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L2H2',
    property: 'LEASING',
    service: 'Frávega',
    status: 'Activo',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
  {
    patent: 'AG550TZ',
    brand: 'Toyota',
    model: 'Hiace Furgón',
    type: 'HIACE L2H2',
    property: 'LEASING',
    service: 'Sin servicio',
    status: 'F/S Mantenimiento',
    region: 'Buenos Aires',
    zone: 'AMBA',
  },
];

export const generateSampleTrips = (): Trip[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const tripTemplates = [
    { patent: 'AF821CD', service: 'Mercado Libre', driver: 'Carlos Benítez', count: 24, avgRate: 155000, route: 'Ruta ML-AMBA 101' },
    { patent: 'AF903EF', service: 'Entregar - Ultima milla', driver: 'Esteban Morales', count: 22, isPackage: true, avgPackages: 88, ratePerPkg: 1800, route: 'Ruta Entregar 204' },
    { patent: 'AE349GH', service: 'Cencosud', driver: 'Matías Gomez', count: 19, avgRate: 140000, route: 'Ruta Retail Cencosud' },
    { patent: 'AG102XP', service: 'Quilmes', driver: 'Lucas Rossi', count: 22, avgRate: 145000, route: 'Ruta Bebidas Quilmes' },
    { patent: 'AD912LK', service: 'Carrefour', driver: 'Federico Silva', count: 14, avgRate: 138000, route: 'Ruta Sucursales Carrefour' },
    { patent: 'AF405MN', service: 'Andreani', driver: 'Jorge Peralta', count: 11, avgRate: 148000, route: 'Ruta Troncal Andreani' },
    { patent: 'AF710QR', service: 'Frávega', driver: 'Santiago Diaz', count: 8, avgRate: 135000, route: 'Ruta Hogar Frávega' },
    // AG550TZ is idle (0 trips)
  ];

  const trips: Trip[] = [];
  let idCounter = 1;

  tripTemplates.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      // Pick a day in current month between 1 and min(28, currentDay)
      const day = 1 + (i % 26);
      const km = Math.round(75 + (i * 3) % 65);

      if (t.isPackage) {
        const pkgsVariation = Math.round(Math.sin(i * 1.7) * 12);
        const packages = Math.max(50, t.avgPackages! + pkgsVariation);
        const rate = packages * t.ratePerPkg!;
        trips.push({
          id: `trip-sample-${idCounter++}`,
          date: new Date(year, month, day, 10, 30),
          patent: t.patent,
          service: t.service,
          driver: t.driver,
          route: t.route,
          packages,
          pricingType: 'package',
          vehicleType: 'HIACE',
          property: 'LEASING',
          rate,
          km,
        });
      } else {
        const variation = (Math.sin(i * 1.5) * 15000);
        const rate = Math.round(((t.avgRate || 140000) + variation) / 1000) * 1000;
        trips.push({
          id: `trip-sample-${idCounter++}`,
          date: new Date(year, month, day, 10, 30),
          patent: t.patent,
          service: t.service,
          driver: t.driver,
          route: t.route,
          pricingType: 'route',
          vehicleType: 'HIACE',
          property: 'LEASING',
          rate,
          km,
        });
      }
    }
  });

  return trips;
};
