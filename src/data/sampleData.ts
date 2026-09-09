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

export const meliTariffs: Tariff[] = [
  // --- PRIMERA MILLA ---
  { id: 'tar-meli-pm-1', client: 'Mercado Libre', service: 'Primera Milla - ARBA01', rate: 300614, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARBA01', requiresHelper: false, estimatedKm: 40, description: 'Buenos Aires (ARBA01) - Camioneta - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-2', client: 'Mercado Libre', service: 'Primera Milla - ARBA01', rate: 521196, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'ARBA01', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARBA01) - Chasis - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-3', client: 'Mercado Libre', service: 'Primera Milla - ARBA01', rate: 555942, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis Pesado', originSite: 'ARBA01', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARBA01) - Chasis Pesado - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-4', client: 'Mercado Libre', service: 'Primera Milla - ARBA01', rate: 780954, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Semi', originSite: 'ARBA01', requiresHelper: false, estimatedKm: 50, description: 'Buenos Aires (ARBA01) - Semi - Base 0-50 km | Jornada Completa' },

  { id: 'tar-meli-pm-5', client: 'Mercado Libre', service: 'Primera Milla - ARBA02', rate: 300614, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 40, description: 'Buenos Aires (ARBA02) - Camioneta - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-6', client: 'Mercado Libre', service: 'Primera Milla - ARBA02', rate: 521196, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARBA02) - Chasis - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-7', client: 'Mercado Libre', service: 'Primera Milla - ARBA02', rate: 448871, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis Liviano', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARBA02) - Chasis Liviano - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-8', client: 'Mercado Libre', service: 'Primera Milla - ARBA02', rate: 555942, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis Pesado', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARBA02) - Chasis Pesado - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-9', client: 'Mercado Libre', service: 'Primera Milla - ARBA02', rate: 780994, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Semi', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 50, description: 'Buenos Aires (ARBA02) - Semi - Base 0-50 km | Jornada Completa' },

  { id: 'tar-meli-pm-10', client: 'Mercado Libre', service: 'Primera Milla - ARBA04', rate: 300614, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARBA04', requiresHelper: false, estimatedKm: 40, description: 'Buenos Aires (ARBA04) - Camioneta - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-11', client: 'Mercado Libre', service: 'Primera Milla - ARBA04 (Media Jornada)', rate: 240491, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARBA04', requiresHelper: false, estimatedKm: 25, description: 'Buenos Aires (ARBA04) - Camioneta - Base 0-50 km | Jornada Media' },
  { id: 'tar-meli-pm-12', client: 'Mercado Libre', service: 'Primera Milla - ARBA04', rate: 521196, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'ARBA04', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARBA04) - Chasis - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-13', client: 'Mercado Libre', service: 'Primera Milla - ARBA04', rate: 780994, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Semi', originSite: 'ARBA04', requiresHelper: false, estimatedKm: 50, description: 'Buenos Aires (ARBA04) - Semi - Base 0-50 km | Jornada Completa' },

  { id: 'tar-meli-pm-14', client: 'Mercado Libre', service: 'Primera Milla - ARXBA3', rate: 300614, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 40, description: 'Buenos Aires (ARXBA3) - Camioneta - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-15', client: 'Mercado Libre', service: 'Primera Milla - ARXBA3', rate: 521196, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARXBA3) - Chasis - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-16', client: 'Mercado Libre', service: 'Primera Milla - ARXBA3', rate: 448871, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis Liviano', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARXBA3) - Chasis Liviano - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-17', client: 'Mercado Libre', service: 'Primera Milla - ARXBA3', rate: 555942, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis Pesado', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARXBA3) - Chasis Pesado - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-18', client: 'Mercado Libre', service: 'Primera Milla - ARXBA3', rate: 780994, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Semi', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 50, description: 'Buenos Aires (ARXBA3) - Semi - Base 0-50 km | Jornada Completa' },

  { id: 'tar-meli-pm-19', client: 'Mercado Libre', service: 'Primera Milla - ARXMQ1', rate: 324791, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARXMQ1', requiresHelper: false, estimatedKm: 40, description: 'Buenos Aires (ARXMQ1) - Camioneta - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-20', client: 'Mercado Libre', service: 'Primera Milla - ARXMQ1', rate: 481473, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'ARXMQ1', requiresHelper: false, estimatedKm: 45, description: 'Buenos Aires (ARXMQ1) - Chasis - Base 0-50 km | Jornada Completa' },

  { id: 'tar-meli-pm-21', client: 'Mercado Libre', service: 'Primera Milla - ARXCF1', rate: 300614, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Camioneta', originSite: 'ARXCF1', requiresHelper: false, estimatedKm: 35, description: 'CABA (ARXCF1) - Camioneta - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-22', client: 'Mercado Libre', service: 'Primera Milla - ARXCF1', rate: 521196, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'ARXCF1', requiresHelper: false, estimatedKm: 40, description: 'CABA (ARXCF1) - Chasis - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-23', client: 'Mercado Libre', service: 'Primera Milla - ARXCF1', rate: 448871, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis Liviano', originSite: 'ARXCF1', requiresHelper: false, estimatedKm: 40, description: 'CABA (ARXCF1) - Chasis Liviano - Base 0-50 km | Jornada Completa' },
  { id: 'tar-meli-pm-24', client: 'Mercado Libre', service: 'Primera Milla - ARXCF1', rate: 780994, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Semi', originSite: 'ARXCF1', requiresHelper: false, estimatedKm: 45, description: 'CABA (ARXCF1) - Semi - Base 0-50 km | Jornada Completa' },

  // --- ÚLTIMA MILLA ---
  { id: 'tar-meli-um-1', client: 'Mercado Libre', service: 'Última Milla - AMBA Camioneta', rate: 399685, pricingType: 'route', modality: 'Última milla', vehicleType: 'Camioneta', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 65, description: 'AMBA - Camioneta - Base 1-50 km | Ciclo AM (Con Ayudante)' },
  { id: 'tar-meli-um-2', client: 'Mercado Libre', service: 'Última Milla - AMBA Chasis', rate: 601859, pricingType: 'route', modality: 'Última milla', vehicleType: 'Chasis', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 70, description: 'AMBA - Chasis - Base 1-50 km | Ciclo AM (Con Ayudante)' },
  { id: 'tar-meli-um-3', client: 'Mercado Libre', service: 'Última Milla - AMBA Chasis Mediano (AM)', rate: 615515, pricingType: 'route', modality: 'Última milla', vehicleType: 'Chasis Mediano', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 70, description: 'AMBA - Chasis Mediano - Base 1-50 km | Ciclo AM (Con Ayudante)' },
  { id: 'tar-meli-um-4', client: 'Mercado Libre', service: 'Última Milla - AMBA Chasis Mediano (PM)', rate: 615515, pricingType: 'route', modality: 'Última milla', vehicleType: 'Chasis Mediano', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 70, description: 'AMBA - Chasis Mediano - Base 1-50 km | Ciclo PM (Con Ayudante)' },
  { id: 'tar-meli-um-5', client: 'Mercado Libre', service: 'Última Milla - AMBA Chasis Mediano c/Plataforma (AM)', rate: 590304, pricingType: 'route', modality: 'Última milla', vehicleType: 'Chasis Mediano', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 70, description: 'AMBA - Chasis Mediano con Plataforma (Flet) - Base 1-50 km | Ciclo AM (Con Ayudante)' },
  { id: 'tar-meli-um-6', client: 'Mercado Libre', service: 'Última Milla - AMBA Chasis Mediano c/Plataforma (PM)', rate: 590304, pricingType: 'route', modality: 'Última milla', vehicleType: 'Chasis Mediano', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 70, description: 'AMBA - Chasis Mediano con Plataforma (Flet) - Base 1-50 km | Ciclo PM (Con Ayudante)' },
  { id: 'tar-meli-um-7', client: 'Mercado Libre', service: 'Última Milla - AMBA Fiorino', rate: 218790, pricingType: 'route', modality: 'Última milla', vehicleType: 'Fiorino', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: false, estimatedKm: 50, description: 'AMBA - Fiorino - Base 1-50 km | Ciclo AM' },
  { id: 'tar-meli-um-8', client: 'Mercado Libre', service: 'Última Milla - AMBA Semi', rate: 741436, pricingType: 'route', modality: 'Última milla', vehicleType: 'Semi', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: true, estimatedKm: 80, description: 'AMBA - Semi - Base 1-50 km | Ciclo AM (Con Ayudante)' },
  { id: 'tar-meli-um-9', client: 'Mercado Libre', service: 'Última Milla - AMBA Utilitario Mediano', rate: 264116, pricingType: 'route', modality: 'Última milla', vehicleType: 'Utilitario mediano', originSite: 'SBU1 / SBU2 / SBU3 / SCF2 / SCF3 / SRSC1', requiresHelper: false, estimatedKm: 55, description: 'AMBA - Utilitario mediano - Base 1-50 km | Ciclo AM' },

  // --- LINE HAUL / TRONCAL ---
  { id: 'tar-meli-lh-1', client: 'Mercado Libre', service: 'Line Haul - ARBA01 - ARBA02 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARBA01', requiresHelper: false, estimatedKm: 120, description: 'Line Haul SEMI: ARBA01 - ARBA02 - ARXCK1' },
  { id: 'tar-meli-lh-2', client: 'Mercado Libre', service: 'Line Haul - ARBA01 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARBA01', requiresHelper: false, estimatedKm: 110, description: 'Line Haul SEMI: ARBA01 - ARXCK1' },
  { id: 'tar-meli-lh-3', client: 'Mercado Libre', service: 'Line Haul - ARBA02 - ARXCF1 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 120, description: 'Line Haul SEMI: ARBA02 - ARXCF1 - ARXCK1' },
  { id: 'tar-meli-lh-4', client: 'Mercado Libre', service: 'Line Haul - ARBA02 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARBA02', requiresHelper: false, estimatedKm: 110, description: 'Line Haul SEMI: ARBA02 - ARXCK1' },
  { id: 'tar-meli-lh-5', client: 'Mercado Libre', service: 'Line Haul - ARXBA3 - ARXCF1 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 125, description: 'Line Haul SEMI: ARXBA3 - ARXCF1 - ARXCK1' },
  { id: 'tar-meli-lh-6', client: 'Mercado Libre', service: 'Line Haul - ARXBA3 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARXBA3', requiresHelper: false, estimatedKm: 115, description: 'Line Haul SEMI: ARXBA3 - ARXCK1' },
  { id: 'tar-meli-lh-7', client: 'Mercado Libre', service: 'Line Haul - ARXCF1 - ARXCK1', rate: 1897785, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'ARXCF1', requiresHelper: false, estimatedKm: 90, description: 'Line Haul SEMI: ARXCF1 - ARXCK1' },
];

export const defaultTariffs: Tariff[] = [
  ...meliTariffs,
  { id: 'tar-entregar', service: 'Entregar - Ultima milla', client: 'Entregar', rate: 1800, pricingType: 'package', modality: 'Última milla', vehicleType: 'Utilitario', originSite: 'Hub Pompeya (CABA)', requiresHelper: false, estimatedKm: 65, description: 'Tarifa por paquete (Kangoo / Fiorino / Partner)' },
  { id: 'tar-[#1]', service: 'Mercado Libre', client: 'Mercado Libre', rate: 399685, pricingType: 'route', modality: 'Última milla', vehicleType: 'Camioneta', originSite: 'Site Mercado Libre Tablada', requiresHelper: false, estimatedKm: 85, description: 'Ruta última milla / jornada completa (Hiace / Master / Boxer)' },
  { id: 'tar-2', service: 'Andreani', client: 'Andreani', rate: 155000, pricingType: 'route', modality: 'Última milla', vehicleType: 'Camioneta', originSite: 'Planta Andreani Benavídez', requiresHelper: false, estimatedKm: 110, description: 'Distribución paquetería AMBA - Camioneta (Hiace / Master)' },
  { id: 'tar-2-med', service: 'Andreani', client: 'Andreani', rate: 135000, pricingType: 'route', modality: 'Dropoff', vehicleType: 'Utilitario', originSite: 'Planta Andreani Benavídez', requiresHelper: false, estimatedKm: 70, description: 'Distribución paquetería AMBA - Utilitario (Kangoo / Partner)' },
  { id: 'tar-3', service: 'Cencosud', client: 'Cencosud', rate: 155000, pricingType: 'route', modality: 'Distribución Retail / Tiendas', vehicleType: 'Camioneta', originSite: 'CD Cencosud Esteban Echeverría', requiresHelper: true, estimatedKm: 95, description: 'Reparto retail / supermercados (Hiace / Master)' },
  { id: 'tar-4', service: 'Quilmes', client: 'Cervecería Quilmes', rate: 175000, pricingType: 'route', modality: 'Primera milla', vehicleType: 'Chasis', originSite: 'Planta Cervecería Zárate', requiresHelper: true, estimatedKm: 180, description: 'Distribución bebidas AMBA - Chasis' },
  { id: 'tar-5', service: 'Carrefour', client: 'Carrefour', rate: 150000, pricingType: 'route', modality: 'Distribución Retail / Tiendas', vehicleType: 'Camioneta', originSite: 'CD Carrefour Monte Grande', requiresHelper: true, estimatedKm: 90, description: 'Logística abastecimiento sucursales (Camioneta)' },
  { id: 'tar-6', service: 'Fravega', client: 'Fravega', rate: 160000, pricingType: 'route', modality: 'Última milla', vehicleType: 'Camioneta', originSite: 'CD Frávega Tortuguitas', requiresHelper: true, estimatedKm: 105, description: 'Electrodomésticos / paquetería pesada (Camioneta)' },
  { id: 'tar-7', service: 'Distribución general', client: 'Varios', rate: 135000, pricingType: 'route', modality: 'Última milla', vehicleType: 'Utilitario', originSite: 'Base Operativa Capital', requiresHelper: false, description: 'Flete estándar utilitario (Kangoo / Fiorino)' },
  { id: 'tar-8', service: 'Larga distancia', client: 'Varios', rate: 220000, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Chasis', originSite: 'Centro Logístico Dock Sud', requiresHelper: false, estimatedKm: 320, description: 'Servicio interurbano / interior - Chasis' },
  { id: 'tar-9', service: 'Troncal Larga Distancia', client: 'Varios', rate: 340000, pricingType: 'route', modality: 'Troncal / Larga Distancia', vehicleType: 'Semi', originSite: 'Puerto Nuevo / Retiro', requiresHelper: false, estimatedKm: 550, description: 'Carga masiva troncal / interurbana - Semi' },
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
