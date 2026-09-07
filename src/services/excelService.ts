import * as XLSX from 'xlsx';
import { Unit, Trip, UnitPnL } from '../types';
import { pick, parseDate, cleanMoney, normal, getTripFingerprint } from '../utils/formatters';

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

export const parseTripsExcel = async (file: File): Promise<Trip[]> => {
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

  let idCounter = Date.now();
  const seenFingerprints = new Set<string>();
  const trips: Trip[] = [];

  for (const row of rows) {
    const dateVal = pick(row, ['fecha', 'dia', 'date', 'fec']);
    const parsedDate = parseDate(dateVal);
    const patent = String(pick(row, ['patente', 'dominio', 'matricula', 'unidad'])).trim().toUpperCase();
    const service = String(pick(row, ['cliente', 'servicio', 'operacion']) || row.__sourceSheet || '').trim();
    const driver = String(pick(row, ['chofer', 'conductor', 'driver'])).trim();
    const vehicleType = String(pick(row, ['tipo de unidad', 'tipo de vehiculo', 'unidad', 'tipo'])).trim();
    const property = String(pick(row, ['propiedad vehiculo', 'propiedad del vehiculo', 'propiedad'])).trim();
    const rateVal = pick(row, ['tarifa s/iva', 'tarifa sin iva', 'tarifa', 'importe', 'monto', 'facturacion', 'precio']);
    const rate = cleanMoney(rateVal);
    const kmVal = pick(row, ['km', 'kilometros', 'kilometraje', 'distancia', 'kms']);
    const km = kmVal ? cleanMoney(kmVal) : undefined;
    const remito = String(pick(row, ['remito', 'nro remito', 'hoja de ruta', 'id', 'comprobante', 'guia', 'servicio id'])).trim();

    if (!patent || patent.length < 4) continue;

    // Deduplicación determinística basada en huella digital (Patente + Fecha + Tarifa + Remito/Servicio/Chofer)
    const fingerprint = getTripFingerprint({
      patent,
      date: parsedDate,
      rate,
      service,
      driver,
      remito,
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
    });
  }

  if (trips.length === 0) {
    throw new Error('No se detectaron filas de viajes con patente válida.');
  }

  return trips;
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
