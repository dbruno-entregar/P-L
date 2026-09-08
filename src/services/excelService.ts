import * as XLSX from 'xlsx';
import { Unit, Trip, UnitPnL, Tariff, ServiceMetric } from '../types';
import { pick, parseDate, cleanMoney, normal, getTripFingerprint, findTariffForService } from '../utils/formatters';

export const parseUnitsExcel = async (file: File): Promise<Unit[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('El archivo de unidades está vacío o no contiene filas válidas.');
  }

  const units: Unit[] = rows
    .map(row => {
      const patent = String(pick(row, ['patente', 'dominio', 'matricula', 'chapa'])).trim().toUpperCase();
      const brand = String(pick(row, ['marca'])).trim();
      const model = String(pick(row, ['modelo'])).trim();
      const type = String(pick(row, ['tipo de vehiculo', 'tipo unidad', 'tipo', 'unidad', 'categoria'])).trim();
      const property = String(pick(row, ['propiedad vehiculo', 'propiedad del vehiculo', 'propiedad', 'titularidad'])).trim();
      const service = String(pick(row, ['servicio', 'cliente', 'operacion', 'cuenta'])).trim();
      const status = String(pick(row, ['estado', 'status', 'condicion'])).trim();
      const region = String(pick(row, ['region', 'provincia'])).trim();
      const zone = String(pick(row, ['zona operacion', 'zona', 'jurisdiccion'])).trim();

      return {
        patent,
        brand: brand || 'Toyota',
        model: model || 'Hiace',
        type: type || 'HIACE',
        property: property || 'LEASING',
        service: service || 'Sin servicio',
        status: status || 'Activo',
        region: region || 'Buenos Aires',
        zone: zone || 'AMBA',
      };
    })
    .filter(u => u.patent && u.patent.length >= 4);

  if (units.length === 0) {
    throw new Error('No se detectaron unidades con columna de patente en el archivo.');
  }

  return units;
};

export interface ParseTripsResult {
  trips: Trip[];
  autoPricedCount: number;
}

export const parseTripsExcel = async (
  file: File,
  tariffs: Tariff[] = []
): Promise<ParseTripsResult> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  // Read all sheets if multiple exist
  const rows: Record<string, any>[] = workbook.SheetNames.flatMap(sheetName => {
    const sheetRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    return sheetRows.map(r => ({ ...r, __sourceSheet: sheetName }));
  });

  if (!rows || rows.length === 0) {
    throw new Error('El archivo de viajes/servicios no tiene filas.');
  }

  const seenFingerprints = new Set<string>();
  const trips: Trip[] = [];
  let autoPricedCount = 0;

  for (const row of rows) {
    const dateVal = pick(row, ['fecha', 'dia', 'date', 'fec']);
    const parsedDate = parseDate(dateVal);
    const patent = String(pick(row, ['patente', 'dominio', 'matricula', 'unidad'])).trim().toUpperCase();
    const service = String(pick(row, ['cliente', 'servicio', 'operacion']) || row.__sourceSheet || '').trim();
    const route = String(pick(row, ['ruta', 'nombre ruta', 'hoja de ruta', 'recorrido', 'codigo ruta', 'zona'])).trim();
    const driver = String(pick(row, ['chofer', 'conductor', 'driver'])).trim();
    const vehicleType = String(pick(row, ['tipo de unidad', 'tipo de vehiculo', 'unidad', 'tipo'])).trim();
    const property = String(pick(row, ['propiedad vehiculo', 'propiedad del vehiculo', 'propiedad'])).trim();
    const packagesRaw = pick(row, ['entregados', 'paquetes entregados', 'bultos entregados', 'paquetes', 'bultos', 'cant entregados', 'cantidad']);
    const packages = packagesRaw ? Math.round(cleanMoney(packagesRaw)) : undefined;

    const rateVal = pick(row, ['total ruta', 'total de ruta', 'total', 'tarifa s/iva', 'tarifa sin iva', 'tarifa', 'importe', 'monto', 'facturacion', 'precio']);
    let rate = cleanMoney(rateVal);

    // Buscar si el servicio o cliente está en el Tarifario Maestro (considerando tipo de vehículo para tarifas por ruta)
    const match = findTariffForService(service, tariffs, vehicleType);

    // Si la fila del Excel no trae 'Total ruta' o viene en 0, auto-completar desde el Tarifario Maestro
    if (rate === 0 && match && match.rate > 0) {
      if (match.pricingType === 'package' && packages && packages > 0) {
        // Tarifa por paquete entregado (ej: Entregar - Última milla)
        rate = Math.round(packages * match.rate);
        autoPricedCount++;
      } else if (match.pricingType === 'route' || !match.pricingType) {
        // Tarifa fija por ruta / jornada según vehículo
        rate = match.rate;
        autoPricedCount++;
      }
    }

    const kmVal = pick(row, ['km', 'kilometros', 'kilometraje', 'distancia', 'kms']);
    const km = kmVal ? cleanMoney(kmVal) : undefined;
    const remito = String(pick(row, ['remito', 'nro remito', 'id', 'comprobante', 'guia', 'servicio id'])).trim();

    const helperRaw = pick(row, ['ayudante', 'peon', 'con ayudante', 'requiere ayudante', 'acompaniante', 'acompañante', 'helper']);
    let requiresHelper: boolean | undefined = undefined;
    if (helperRaw !== undefined && helperRaw !== '') {
      const helperStr = String(helperRaw).toLowerCase().trim();
      requiresHelper = helperStr === 'si' || helperStr === 'sí' || helperStr === 'true' || helperStr === '1' || helperStr === 'x' || helperStr === 's';
    } else if (match && match.requiresHelper !== undefined) {
      requiresHelper = match.requiresHelper;
    }

    if (!patent || patent.length < 4) continue;

    // Deduplicación determinística basada en huella digital
    const fingerprint = getTripFingerprint({
      patent,
      date: parsedDate,
      rate,
      service,
      driver,
      remito,
      route,
      packages,
      km,
    });

    if (seenFingerprints.has(fingerprint)) {
      continue; // Omitir fila duplicada dentro del mismo archivo
    }
    seenFingerprints.add(fingerprint);

    trips.push({
      id: `trip-${fingerprint}`,
      date: parsedDate,
      patent,
      service: service || 'Logística general',
      driver: driver || '—',
      vehicleType: vehicleType || 'HIACE',
      property: property || 'LEASING',
      rate,
      km: km && km > 0 ? km : undefined,
      remito: remito || undefined,
      route: route || undefined,
      packages: packages && packages > 0 ? packages : undefined,
      pricingType: match?.pricingType || (packages && packages > 0 ? 'package' : 'route'),
      requiresHelper,
    });
  }

  if (trips.length === 0) {
    throw new Error('No se detectaron filas de viajes con patente válida.');
  }

  return { trips, autoPricedCount };
};

/**
 * Genera y descarga una plantilla Excel modelo con el formato exacto:
 * Fecha | Ruta | Servicio | Patente | Entregados | Tipo de vehiculo | Propiedad | Total ruta
 */
export const downloadTripsExcelTemplate = (tariffs: Tariff[] = []) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows: Record<string, any>[] = [];

  // 1. Ejemplo por paquete: "Entregar - Ultima milla"
  const entregarTariff = tariffs.find(t => t.pricingType === 'package' || normal(t.service).includes('entregar'));
  const pkgRate = entregarTariff ? entregarTariff.rate : 1800;
  rows.push({
    'Fecha': todayStr,
    'Ruta': 'Ruta 402 - Nordelta',
    'Servicio': 'Entregar - Ultima milla',
    'Patente': 'AF821CD',
    'Entregados': 85,
    'Tipo de vehiculo': 'HIACE',
    'Propiedad': 'LEASING',
    'Total ruta': 85 * pkgRate,
    'Chofer (Opcional)': 'Juan Pérez',
    'Km (Opcional)': 95,
  });

  // 2. Ejemplos de servicios por ruta fija
  const routeTariffs = tariffs.filter(t => t.pricingType !== 'package' && !normal(t.service).includes('entregar'));
  const samples = routeTariffs.slice(0, 4);

  if (samples.length > 0) {
    samples.forEach((t, idx) => {
      rows.push({
        'Fecha': todayStr,
        'Ruta': `Ruta ${100 + idx} - AMBA`,
        'Servicio': t.service,
        'Patente': `AF${822 + idx}CD`,
        'Ayudante (Opcional)': t.requiresHelper ? 'SI' : 'NO',
        'Entregados': '',
        'Tipo de vehiculo': t.vehicleType || 'HIACE',
        'Propiedad': 'LEASING',
        'Total ruta': t.rate,
        'Chofer (Opcional)': `Chofer ${idx + 2}`,
        'Km (Opcional)': 100,
      });
    });
  } else {
    rows.push({
      'Fecha': todayStr,
      'Ruta': 'Ruta 101 - CABA',
      'Servicio': 'Mercado Libre',
      'Patente': 'AF822CD',
      'Ayudante (Opcional)': 'NO',
      'Entregados': '',
      'Tipo de vehiculo': 'HIACE',
      'Propiedad': 'LEASING',
      'Total ruta': 165000,
      'Chofer (Opcional)': 'Carlos Gómez',
      'Km (Opcional)': 110,
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rutas y Servicios');
  XLSX.writeFile(wb, 'Plantilla_Rutas_y_Servicios_RutaClara.xlsx');
};

export const exportPnLToExcel = (units: UnitPnL[], monthLabel: string) => {
  const exportData = units.map(u => ({
    'Patente': u.patent,
    'Tipo': u.type || 'HIACE',
    'Servicio / Cliente': u.service || '—',
    'Estado': u.status || 'Activo',
    'Días en Ruta': u.activeDays,
    'Total Viajes': u.tripCount,
    'Km Estimados': u.kmEstimated,
    'Facturación (ARS)': u.revenue,
    'Costo Chofer Cooperativa (ARS)': u.driverCost,
    'Combustible Diésel Estimado (ARS)': u.fuelCost,
    'Canon Leasing Fijo (ARS)': u.lease,
    'Costo Operativo Total (ARS)': u.totalCost,
    'Absorción Leasing (%)': Math.round(u.coverage * 100) + '%',
    'Margen Operativo (%)': Math.round(u.operatingMarginPct) + '%',
    'Resultado Neto (ARS)': u.result,
    'Situación': u.result >= 0 ? 'SUPERÁVIT' : 'DÉFICIT',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'P&L Flota');

  const filename = `Profit_Loss_Flota_${monthLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const exportServicesToExcel = (services: ServiceMetric[], periodLabel: string) => {
  const exportData = services.map(s => ({
    'Servicio': s.serviceName,
    'Cliente': s.client || '—',
    'Modalidad': s.pricingType === 'package' ? 'Por Paquete' : 'Por Ruta',
    'Requiere Ayudante': s.requiresHelper ? 'SÍ' : 'NO',
    'Tarifa Pactada': s.tariffRate !== undefined 
      ? (s.pricingType === 'package' ? `$${s.tariffRate}/pqt` : `$${s.tariffRate}/ruta`) 
      : '—',
    'Facturación Total (ARS)': s.totalRevenue,
    'Participación Facturación (%)': (Math.round(s.revenueSharePct * 10) / 10) + '%',
    'Total Viajes / Fletes': s.totalTrips,
    'Paquetes Entregados': s.totalPackages > 0 ? s.totalPackages : '—',
    'Promedio Paquetes / Ruta': s.avgPackagesPerTrip > 0 ? s.avgPackagesPerTrip : '—',
    'Tarifa Promedio / Viaje (ARS)': s.avgRevenuePerTrip,
    'Camionetas Afectadas': s.uniqueUnitsCount,
    'Patentes': s.uniqueUnits.join(', '),
    'Choferes Involucrados': s.uniqueDriversCount,
    'Días Operados': s.activeDaysCount,
    'Km Estimados': s.estimatedKm,
    'Costo Chofer Devengado (ARS)': s.estimatedDriverCost,
    'Costo Combustible Diésel (ARS)': s.estimatedFuelCost,
    'Contribución Leasing (ARS)': s.estimatedLeaseContribution,
    'Costo Operativo Asignado (ARS)': s.estimatedTotalCost,
    'Margen de Contribución Neto (ARS)': s.estimatedNetResult,
    'Margen (%)': Math.round(s.estimatedMarginPct) + '%',
    'Situación': s.estimatedNetResult >= 0 ? 'SUPERÁVIT' : 'DÉFICIT',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Análisis por Servicio');

  const filename = `Analisis_Servicios_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const exportTariffsToExcel = (tariffs: Tariff[]) => {
  const exportData = tariffs.map(t => ({
    'Cliente': t.client || '—',
    'Servicio / Recorrido': t.service,
    'Tipo de Cobro': t.pricingType === 'package' ? 'Por Cantidad de Paquetes' : 'Por Ruta Fija',
    'Modalidad Operativa': t.modality || '—',
    'Tipo de Vehículo Requerido': t.vehicleType || '—',
    'Site de Carga / Salida': t.originSite || '—',
    'Km Aprox (Opcional)': t.estimatedKm !== undefined ? t.estimatedKm : '—',
    'Requiere Acompañante': t.requiresHelper ? 'SÍ' : 'NO',
    'Valor Pactado (ARS)': t.rate,
    'Unidad': t.pricingType === 'package' ? 'ARS / paquete' : 'ARS / ruta',
    'Descripción': t.description || '—',
    'Notas': t.notes || '—',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarifario Maestro');

  const filename = `Tarifario_Maestro_RutaClara_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const downloadTariffsExcelTemplate = () => {
  const template = [
    {
      'Cliente': 'Mercado Libre',
      'Servicio': 'Mercado Libre - Última Milla',
      'Tipo de Cobro': 'Por Ruta',
      'Modalidad': 'Última milla',
      'Tipo de Vehículo': 'Furgón Grande (Hiace / Master)',
      'Site de Carga': 'Site Mercado Libre Tablada',
      'Km Aprox (Opcional)': 85,
      'Requiere Acompañante': 'NO',
      'Valor Pactado': 165000,
      'Descripción': 'Jornada completa distribución AMBA',
    },
    {
      'Cliente': 'Entregar',
      'Servicio': 'Entregar - Paquetería',
      'Tipo de Cobro': 'Por Paquete',
      'Modalidad': 'Última milla',
      'Tipo de Vehículo': 'Utilitario (Kangoo / Partner)',
      'Site de Carga': 'Hub Pompeya (CABA)',
      'Km Aprox (Opcional)': 60,
      'Requiere Acompañante': 'NO',
      'Valor Pactado': 1800,
      'Descripción': 'Tarifa unitaria por paquete entregado',
    },
    {
      'Cliente': 'Cencosud',
      'Servicio': 'Cencosud - Reparto Retail',
      'Tipo de Cobro': 'Por Ruta',
      'Modalidad': 'Distribución Retail / Tiendas',
      'Tipo de Vehículo': 'Furgón Grande (Hiace / Master)',
      'Site de Carga': 'CD Cencosud Esteban Echeverría',
      'Km Aprox (Opcional)': 95,
      'Requiere Acompañante': 'SI',
      'Valor Pactado': 155000,
      'Descripción': 'Reparto con peón / ayudante',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Tarifario');
  XLSX.writeFile(workbook, 'Plantilla_Tarifario_Servicios.xlsx');
};

