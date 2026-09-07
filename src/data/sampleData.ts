import { Unit, Trip, Settings } from '../types';

export const defaultSettings: Settings = {
  lease: 2744000,
  diesel: 1500,
  consumption: 10,
};

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
    service: 'Andreani',
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
    { patent: 'AF821CD', service: 'Mercado Libre', driver: 'Carlos Benítez', count: 24, avgRate: 145000 },
    { patent: 'AF903EF', service: 'Andreani', driver: 'Esteban Morales', count: 21, avgRate: 152000 },
    { patent: 'AE349GH', service: 'Cencosud', driver: 'Matías Gomez', count: 19, avgRate: 140000 },
    { patent: 'AG102XP', service: 'Quilmes', driver: 'Lucas Rossi', count: 22, avgRate: 135000 },
    { patent: 'AD912LK', service: 'Carrefour', driver: 'Federico Silva', count: 14, avgRate: 138000 },
    { patent: 'AF405MN', service: 'DHL Supply', driver: 'Jorge Peralta', count: 11, avgRate: 142000 },
    { patent: 'AF710QR', service: 'Frávega', driver: 'Santiago Diaz', count: 7, avgRate: 125000 },
    // AG550TZ is idle (0 trips)
  ];

  const trips: Trip[] = [];
  let idCounter = 1;

  tripTemplates.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      // Pick a day in current month between 1 and min(28, currentDay)
      const day = 1 + (i % 26);
      const variation = (Math.sin(i * 1.5) * 15000);
      const rate = Math.round((t.avgRate + variation) / 1000) * 1000;
      trips.push({
        id: `trip-sample-${idCounter++}`,
        date: new Date(year, month, day, 10, 30),
        patent: t.patent,
        service: t.service,
        driver: t.driver,
        vehicleType: 'HIACE',
        property: 'LEASING',
        rate,
      });
    }
  });

  return trips;
};
