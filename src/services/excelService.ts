import * as XLSX from 'xlsx';
import { Unit, Trip, UnitPnL, Tariff, ServiceMetric, TariffPricingType } from '../types';
import { pick, parseDate, cleanMoney, normal, getTripFingerprint, findTariffForService, detectClient } from '../utils/formatters';

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
  tariffs: Tariff[] = [],
  units: Unit[] = []
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
    const matchedUnit = units && units.length > 0 ? units.find(u => u.patent.toUpperCase() === patent) : undefined;

    const province = String(pick(row, ['provincia', 'prov', 'jurisdiccion', 'region', 'zona'])).trim();
    const site = String(pick(row, ['site', 'deposito', 'hub', 'nodo', 'service center', 'servicecenter', 'center'])).trim();
    const explicitClient = String(pick(row, ['cliente', 'empresa', 'cuenta', 'dador de carga', 'dador'])).trim();
    
    const rawService = String(pick(row, ['servicio', 'tipo servicio', 'operacion']) || row.__sourceSheet || '').trim();
    let service = rawService;
    if (site && rawService && !rawService.toLowerCase().includes(site.toLowerCase())) {
      service = `${rawService} (${site})`;
    } else if (!service && site) {
      service = site;
    }
    if (!service) service = explicitClient ? `${explicitClient} - Servicio` : 'Mercado Libre';

    const route = String(pick(row, ['ruta', 'nombre ruta', 'hoja de ruta', 'recorrido', 'codigo ruta', 'zona']) || (site ? `Ruta ${site}` : '')).trim();
    const driver = String(pick(row, ['conductor', 'chofer', 'driver'])).trim();
    const rawVehicleType = String(pick(row, ['tipo de vehiculo', 'tipo de unidad', 'vehiculo', 'unidad'])).trim();
    const vehicleType = rawVehicleType || matchedUnit?.type || matchedUnit?.model || '';
    const propertyRaw = String(pick(row, ['tipo de flota', 'flota', 'propiedad vehiculo', 'propiedad del vehiculo', 'propiedad'])).trim();
    
    let property: 'PROPIA' | 'LEASING' | 'TERCIARIZADA' = 'LEASING';
    const propLower = propertyRaw.toLowerCase();
    if (propLower.includes('propia')) {
      property = 'PROPIA';
    } else if (propLower.includes('terciarizada')) {
      property = 'TERCIARIZADA';
    } else if (propLower.includes('leasing')) {
      property = 'LEASING';
    }

    // Modalidad / Tipo de cobro (ruta vs paquete) y Cantidad
    const tipoVal = String(pick(row, ['tipo', 'tipo cobro', 'tipo de cobro', 'modalidad'])).trim().toLowerCase();
    const cantidadRaw = pick(row, ['cantidad', 'cant', 'cant.', 'volumen', 'entregados', 'paquetes entregados', 'bultos']);
    const cantidadNum = cantidadRaw ? Math.abs(cleanMoney(cantidadRaw)) : undefined;

    let isPkg = tipoVal.includes('paquete') || tipoVal.includes('bulto');
    let isRoute = tipoVal.includes('ruta') || tipoVal.includes('jornada');

    let packages: number | undefined = undefined;
    let routesCount: number | undefined = undefined;

    if (isPkg) {
      packages = cantidadNum && cantidadNum > 0 ? cantidadNum : undefined;
    } else if (isRoute) {
      routesCount = cantidadNum && cantidadNum > 0 ? cantidadNum : 1;
    } else {
      // Fallback si no vino explícito el tipo
      packages = cantidadNum && cantidadNum > 0 ? cantidadNum : undefined;
    }

    const rateVal = pick(row, ['total ruta', 'total de ruta', 'total', 'tarifa s/iva', 'tarifa sin iva', 'tarifa', 'importe', 'monto', 'facturacion', 'precio']);
    let rate = cleanMoney(rateVal);

    const client = detectClient(rawService || service, undefined, explicitClient);

    // Buscar si el servicio, cliente o site está en el Tarifario Maestro
    const match = findTariffForService(rawService || service, tariffs, vehicleType, client || explicitClient, site);

    // Determinar la modalidad final si viene del tarifario
    const finalPricingType: 'package' | 'route' = 
      isPkg ? 'package' : 
      isRoute ? 'route' : 
      (match?.pricingType || (packages && packages > 0 ? 'package' : 'route'));

    // Si la fila del Excel no trae 'Total ruta' o viene en 0, autocompletar calculando tarifa
    if (rate === 0 && match && match.rate > 0) {
      if (finalPricingType === 'package') {
        const pkgs = packages || cantidadNum || 1;
        rate = Math.round(pkgs * match.rate);
        autoPricedCount++;
      } else {
        const rCount = routesCount || cantidadNum || 1;
        rate = Math.round(rCount * match.rate);
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
      client: client || undefined,
      service: service || 'Logística general',
      site: site || undefined,
      province: province || undefined,
      driver: driver || '—',
      vehicleType: vehicleType || 'HIACE',
      property: property || 'LEASING',
      rate,
      km: km && km > 0 ? km : undefined,
      remito: remito || undefined,
      route: route || undefined,
      packages: packages && packages > 0 ? packages : undefined,
      routesCount: routesCount && routesCount > 0 ? routesCount : 1,
      pricingType: finalPricingType,
      requiresHelper,
    });
  }

  if (trips.length === 0) {
    throw new Error('No se detectaron filas de viajes con patente válida.');
  }

  return { trips, autoPricedCount };
};

/**
 * Genera y descarga la plantilla Excel oficial estandarizada de 8 columnas:
 * Fecha | Provincia | Cliente | Servicio | Site | Patente | Tipo | Cantidad
 */
export const downloadTripsExcelTemplate = (tariffs: Tariff[] = []) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows: Record<string, any>[] = [
    {
      'Fecha': todayStr,
      'Provincia': 'Buenos Aires',
      'Cliente': 'Pickit',
      'Servicio': 'Dropoff Puntos',
      'Site': 'Hub Tablada',
      'Patente': 'AF821CD',
      'Tipo': 'Ruta',
      'Cantidad': 1,
    },
    {
      'Fecha': todayStr,
      'Provincia': 'CABA',
      'Cliente': 'Entregar',
      'Servicio': 'Paquetería Última Milla',
      'Site': 'Hub Pompeya',
      'Patente': 'AF822CD',
      'Tipo': 'Por Paquete',
      'Cantidad': 85,
    },
    {
      'Fecha': todayStr,
      'Provincia': 'Buenos Aires',
      'Cliente': 'Mercado Libre',
      'Servicio': 'Distribución AMBA',
      'Site': 'CD Benavídez',
      'Patente': 'AF823CD',
      'Tipo': 'Ruta',
      'Cantidad': 1,
    },
    {
      'Fecha': todayStr,
      'Provincia': 'Santa Fe',
      'Cliente': 'Andreani',
      'Servicio': 'Troncal Rosario',
      'Site': 'CD Rosario',
      'Patente': 'AF824CD',
      'Tipo': 'Ruta',
      'Cantidad': 1,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rutas Estandarizadas');
  XLSX.writeFile(wb, 'Plantilla_Rutas_Estandarizadas_RutaClara.xlsx');
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

export const parseTariffsExcel = async (file: File): Promise<{ tariffs: Tariff[]; count: number }> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const parsedTariffs: Tariff[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowKeys = Object.keys(r);

    const cleanRowKeys = rowKeys.map(k => ({
      original: k,
      clean: k.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    const getVal = (patterns: string[], excludePatterns: string[] = []): string => {
      const validKeys = cleanRowKeys.filter(item => {
        return !excludePatterns.some(ex => item.clean.includes(ex));
      });

      // Pass 1: Exact match
      for (const pattern of patterns) {
        const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = validKeys.find(item => item.clean === cleanPattern);
        if (found && r[found.original] !== undefined && r[found.original] !== null) {
          const val = String(r[found.original]).trim();
          if (val) return val;
        }
      }

      // Pass 2: Includes match
      for (const pattern of patterns) {
        const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = validKeys.find(item => item.clean.includes(cleanPattern));
        if (found && r[found.original] !== undefined && r[found.original] !== null) {
          const val = String(r[found.original]).trim();
          if (val) return val;
        }
      }

      return '';
    };

    const client = getVal(['cliente', 'client', 'empresa']);
    const service = getVal(['servicio', 'recorrido', 'serviciorecorrido', 'nombre', 'service'], ['tipotarifa']);
    const categoryRaw = getVal(['tipotarifa', 'categoria', 'categoría', 'tiposervicio', 'category']);
    const province = getVal(['provincia', 'prov', 'state', 'region', 'región']);
    const modality = getVal(['modalidad', 'operativa', 'modality']);
    const vehicleType = getVal(['vehiculo', 'vehículo', 'tipodevehiculorequerido', 'tipodevehiculo', 'unidad']);
    const originSite = getVal(['servicecenter', 'referencia', 'sitedecarga', 'site', 'origen', 'base', 'sitedecargasalida']);
    const pricingTypeRaw = getVal(['tipodecobro', 'tipocobro', 'cobro', 'tipo'], ['tipotarifa', 'tipovehiculo', 'servicio', 'cliente']);
    const helperRaw = getVal(['requiereacompaante', 'acompaante', 'ayudante', 'peon', 'helper']);
    const kmRaw = getVal(['kmaproxopcional', 'kmaprox', 'kmaproximado', 'km', 'distancia']);
    const rateRaw = getVal(['tarifa', 'valorpactadoars', 'valorpactado', 'valor', 'rate', 'monto', 'importe', 'precio', 'costo', 'pago', 'flete'], ['tipotarifa', 'tipodecobro', 'tipocobro', 'tipo', 'servicio', 'cliente', 'vehiculo']);
    const description = getVal(['descripcion', 'descripcin', 'detalle']);
    const notes = getVal(['notas', 'observaciones']);

    if (!service && !client && !rateRaw) continue;

    const rate = cleanMoney(rateRaw);
    const finalService = service || client || `Servicio ${i + 1}`;
    const finalClient = client || detectClient(finalService) || 'Cliente General';
    
    const isPackage = pricingTypeRaw.toLowerCase().includes('paquete') || pricingTypeRaw.toLowerCase().includes('package');
    const pricingType: TariffPricingType = isPackage ? 'package' : 'route';

    const requiresHelper = ['si', 'sí', 'true', '1', 'yes'].includes(helperRaw.toLowerCase().trim());
    const estimatedKm = kmRaw ? parseFloat(kmRaw.replace(',', '.')) : undefined;
    const isNaNKm = estimatedKm !== undefined && isNaN(estimatedKm) ? undefined : estimatedKm;

    const category = (categoryRaw.toLowerCase().includes('terceriz') || categoryRaw.toLowerCase().includes('terceros')) ? 'tercerizados' : 'servicio';

    parsedTariffs.push({
      id: `tar-imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      client: finalClient,
      service: finalService,
      category,
      province: province || undefined,
      pricingType,
      modality: modality || undefined,
      vehicleType: vehicleType || undefined,
      originSite: originSite || undefined,
      requiresHelper,
      estimatedKm: isNaNKm,
      rate: Math.max(0, rate),
      description: description || undefined,
      notes: notes || undefined,
    });
  }

  return { tariffs: parsedTariffs, count: parsedTariffs.length };
};

