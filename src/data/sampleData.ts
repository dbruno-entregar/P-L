import { Unit, Trip, Settings, Tariff } from '../types';
import { detectClient } from '../utils/formatters';
import { officialTariffMatrix } from './officialTariffs';

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
  ...officialTariffMatrix,
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
    service: 'Pickit - Dropoff Tablada',
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
    service: 'Mercado Libre',
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
    service: 'Pickit - Colecta AMBA',
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
    service: 'Entregar - Ruta Fija AMBA',
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
    { patent: 'AF821CD', service: 'Mercado Libre', driver: 'Carlos Benítez', count: 24, avgRate: 399685, route: 'Ruta ML-AMBA 101' },
    { patent: 'AF903EF', service: 'Entregar - Ultima milla', driver: 'Esteban Morales', count: 22, isPackage: true, avgPackages: 88, ratePerPkg: 1800, route: 'Ruta Entregar 204' },
    { patent: 'AE349GH', service: 'Pickit - Dropoff Tablada', driver: 'Matías Gomez', count: 19, avgRate: 165000, route: 'Ruta Dropoff Tablada' },
    { patent: 'AG102XP', service: 'Primera Milla - ARBA01', driver: 'Lucas Rossi', count: 22, avgRate: 300614, route: 'Ruta ARBA01' },
    { patent: 'AD912LK', service: 'Pickit - Colecta AMBA', driver: 'Federico Silva', count: 14, avgRate: 145000, route: 'Colecta Puntos Pickit' },
    { patent: 'AF405MN', service: 'Entregar - Ruta Fija AMBA', driver: 'Jorge Peralta', count: 11, avgRate: 160000, route: 'Ruta Paquetería Entregar' },
  ];

  const trips: Trip[] = [];
  let idCounter = 1;

  tripTemplates.forEach(t => {
    for (let i = 0; i < t.count; i++) {
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
          client: detectClient(t.service),
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
        const variation = (Math.sin(i * 1.5) * 5000);
        const rate = Math.round(((t.avgRate || 160000) + variation) / 1000) * 1000;
        trips.push({
          id: `trip-sample-${idCounter++}`,
          date: new Date(year, month, day, 10, 30),
          patent: t.patent,
          client: detectClient(t.service),
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
