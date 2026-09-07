import React, { useState, useEffect, useMemo } from 'react';
import { Unit, Trip, Settings, AppState, SupabaseConfig, UnitPnL } from './types';
import { defaultSettings, sampleUnits, generateSampleTrips } from './data/sampleData';
import { calculateUnitPnL, getTripFingerprint, deduplicateTrips } from './utils/formatters';
import { parseUnitsExcel, parseTripsExcel } from './services/excelService';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  fetchCloudData,
  syncCloudUnits,
  syncCloudSettings,
  insertCloudTrip,
  insertCloudTripsBatch,
} from './services/supabaseService';
import { Header } from './components/Header';
import { NavigationTabs, TabType } from './components/NavigationTabs';
import { AdminAccessBanner } from './components/AdminAccessBanner';
import { DashboardView } from './components/DashboardView';
import { FleetView } from './components/FleetView';
import { TripsView } from './components/TripsView';
import { CostsView } from './components/CostsView';
import { UnitDetailModal } from './components/UnitDetailModal';
import { Toast } from './components/Toast';

const STORAGE_KEY = 'ruta-clara-pnl-v1';

export default function App() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedUnitForModal, setSelectedUnitForModal] = useState<UnitPnL | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('admin') === '1';
    }
    return false;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(prev => (prev === message ? null : prev));
    }, 3200);
  };

  // Load initial local data
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.units && Array.isArray(parsed.units)) {
          setUnits(parsed.units);
        }
        if (parsed.trips && Array.isArray(parsed.trips)) {
          const parsedTrips = parsed.trips.map((t: any) => ({
            ...t,
            date: t.date ? new Date(t.date) : null,
          }));
          const cleaned = deduplicateTrips(parsedTrips).uniqueTrips;
          setTrips(cleaned);
          const latestTrip = cleaned
            .filter((t: Trip) => t.date instanceof Date)
            .sort((a: Trip, b: Trip) => ((b.date as Date).getTime() || 0) - ((a.date as Date).getTime() || 0))[0];
          if (latestTrip && latestTrip.date instanceof Date) {
            setSelectedMonth(
              `${latestTrip.date.getFullYear()}-${String(latestTrip.date.getMonth() + 1).padStart(2, '0')}`
            );
          }
        }
        if (parsed.settings) {
          setSettings({ ...defaultSettings, ...parsed.settings });
        }
      } else {
        // Automatically provide demo data if virgin launch so the dashboard isn't blank
        setUnits(sampleUnits);
        const sampleT = generateSampleTrips();
        setTrips(sampleT);
        showToast('Demostración de flota cargada con éxito');
      }
    } catch (e) {
      console.error('Error loading local state:', e);
    }
  }, []);

  // Save local state changes
  useEffect(() => {
    const stateToSave: AppState = {
      units,
      trips,
      settings,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }, [units, trips, settings]);

  // Attempt to check cloud once on mount
  useEffect(() => {
    const checkCloud = async () => {
      try {
        const cloudData = await fetchCloudData(supabaseConfig);
        if (cloudData && cloudData.units && cloudData.units.length > 0) {
          setUnits(cloudData.units);
          setTrips(cloudData.trips);
          setSettings(cloudData.settings);
          showToast('Datos sincronizados desde la nube (Supabase).');
        }
      } catch (err) {
        // Quiet fallback to local state
      }
    };
    checkCloud();
  }, []);

  // Filter trips by period/month
  const periodTrips = useMemo(() => {
    if (!selectedMonth) return trips;
    return trips.filter(t => {
      if (!t.date) return false;
      const tMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      return tMonth === selectedMonth;
    });
  }, [trips, selectedMonth]);

  // Calculated PnL for scoped units (Hiace AMBA Leasing)
  const unitsPnL = useMemo(() => {
    return calculateUnitPnL(units, periodTrips, settings);
  }, [units, periodTrips, settings]);

  // Import and Creation handlers
  const handleImportUnits = async (file: File) => {
    try {
      showToast('Procesando archivo de unidades...');
      const imported = await parseUnitsExcel(file);
      setUnits(prev => {
        const map = new Map<string, Unit>();
        prev.forEach(u => map.set(u.patent.toUpperCase().trim(), u));
        imported.forEach(u => map.set(u.patent.toUpperCase().trim(), u));
        return Array.from(map.values());
      });
      showToast(`${imported.length} unidades leídas. Sincronizando con Supabase...`);

      // Sync to cloud if configured
      try {
        await syncCloudUnits(imported, supabaseConfig);
        showToast(`${imported.length} unidades actualizadas en Supabase.`);
      } catch (err: any) {
        console.warn('Error syncing units to Supabase:', err);
      }
    } catch (error: any) {
      showToast(`Error al importar unidades: ${error.message}`);
    }
  };

  const handleImportTrips = async (file: File) => {
    try {
      showToast('Procesando archivo de viajes/servicios...');
      const imported = await parseTripsExcel(file);

      // Deduplicación en memoria: indexar por huella digital para no repetir viajes
      let newCount = 0;
      let existingCount = 0;

      setTrips(prev => {
        const map = new Map<string, Trip>();
        for (const t of prev) {
          map.set(getTripFingerprint(t), t);
        }
        for (const t of imported) {
          const key = getTripFingerprint(t);
          if (!map.has(key)) {
            newCount++;
          } else {
            existingCount++;
          }
          map.set(key, t);
        }
        return Array.from(map.values());
      });

      const latestTrip = imported
        .filter(t => t.date instanceof Date)
        .sort((a, b) => ((b.date as Date).getTime() || 0) - ((a.date as Date).getTime() || 0))[0];
      if (latestTrip && latestTrip.date instanceof Date) {
        setSelectedMonth(
          `${latestTrip.date.getFullYear()}-${String(latestTrip.date.getMonth() + 1).padStart(2, '0')}`
        );
      }

      if (newCount === 0) {
        showToast(`Archivo procesado (${imported.length} viajes). Todos ya estaban cargados (0 duplicados).`);
      } else {
        showToast(`${newCount} viajes nuevos cargados (${existingCount} ya existían y no se duplicaron).`);
      }

      // Guardar en Supabase sin duplicados
      try {
        const result = await insertCloudTripsBatch(imported, supabaseConfig);
        if (result.inserted > 0) {
          showToast(`Supabase: ${result.inserted} viajes nuevos guardados en la nube.`);
        } else if (result.skipped > 0) {
          showToast(`Supabase: Al día (${result.skipped} viajes ya estaban guardados previamente).`);
        }
      } catch (err: any) {
        console.warn('Error saving trips to Supabase:', err);
        showToast(`Viajes guardados en sesión (${err.message || 'Verificá conexión'})`);
      }
    } catch (error: any) {
      showToast(`Error al importar viajes: ${error.message}`);
    }
  };

  const handleDeduplicateTrips = () => {
    setTrips(prev => {
      const { uniqueTrips, duplicatesCount } = deduplicateTrips(prev);
      if (duplicatesCount > 0) {
        showToast(`Se depuraron ${duplicatesCount} viajes repetidos con éxito.`);
      } else {
        showToast('No se encontraron viajes duplicados. El registro está 100% limpio.');
      }
      return uniqueTrips;
    });
  };

  const handleAddTrip = async (newTripData: Omit<Trip, 'id'>) => {
    const tempTrip: Trip = {
      ...newTripData,
      id: `local-${Date.now()}`,
    };
    setTrips(prev => [tempTrip, ...prev]);
    showToast('Guardando viaje en la base de datos...');

    try {
      const saved = await insertCloudTrip(tempTrip, supabaseConfig);
      setTrips(prev => prev.map(t => (t.id === tempTrip.id ? saved : t)));
      showToast('Viaje almacenado con éxito en Supabase.');
    } catch (err: any) {
      console.warn('Error saving trip to Supabase:', err);
      showToast(`Viaje guardado en sesión (${err.message || 'Error nube'})`);
    }
  };

  const handleLoadSampleData = () => {
    setUnits(sampleUnits);
    const sampleT = generateSampleTrips();
    setTrips(sampleT);
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    showToast('Datos de demostración cargados.');
  };

  const handleReset = () => {
    if (window.confirm('¿Restablecer unidades, viajes y volver a parámetros iniciales?')) {
      setUnits([]);
      setTrips([]);
      setSettings(defaultSettings);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Datos restablecidos a cero.');
    }
  };

  const handleUpdateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    syncCloudSettings(newSettings, supabaseConfig).catch(() => {});
  };

  const handleUpdateSupabaseConfig = (newConfig: SupabaseConfig) => {
    setSupabaseConfig(newConfig);
    saveStoredSupabaseConfig(newConfig);
  };

  const handleSyncCloudNow = async () => {
    try {
      showToast('Publicando unidades, viajes y tarifas en Supabase...');
      await syncCloudUnits(units, supabaseConfig);
      await insertCloudTripsBatch(trips, supabaseConfig);
      await syncCloudSettings(settings, supabaseConfig);
      showToast('Datos publicados con éxito en Supabase.');
    } catch (e: any) {
      showToast(`No se pudo publicar: ${e.message || 'Verificá conexión de Supabase'}`);
    }
  };

  const handlePullCloudNow = async () => {
    try {
      showToast('Descargando datos desde Supabase...');
      const cloudData = await fetchCloudData(supabaseConfig);
      setUnits(cloudData.units);
      setTrips(cloudData.trips);
      setSettings(cloudData.settings);
      showToast(`Datos sincronizados: ${cloudData.units.length} unidades y ${cloudData.trips.length} viajes.`);
    } catch (e: any) {
      showToast(`Error al conectar con la nube: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col font-sans">
      {/* Header */}
      <Header
        settings={settings}
        isAdmin={isAdmin}
        onToggleAdmin={() => setIsAdmin(!isAdmin)}
        onReset={handleReset}
        onLoadSampleData={handleLoadSampleData}
        hasData={units.length > 0}
      />

      {/* Main Tabs */}
      <NavigationTabs
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        unitsCount={unitsPnL.length}
        tripsCount={periodTrips.length}
        isAdmin={isAdmin}
      />

      {/* Main Container */}
      <main className="max-w-[1420px] w-full mx-auto px-[4.5vw] py-8 sm:py-10 flex-1">
        {isAdmin && <AdminAccessBanner onShowToast={showToast} />}

        {currentTab === 'dashboard' && (
          <DashboardView
            unitsPnL={unitsPnL}
            trips={periodTrips}
            settings={settings}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onImportUnits={handleImportUnits}
            onImportTrips={handleImportTrips}
            onLoadSampleData={handleLoadSampleData}
            onGoToFleet={() => setCurrentTab('fleet')}
            onSelectUnit={setSelectedUnitForModal}
            isAdmin={isAdmin}
          />
        )}

        {currentTab === 'fleet' && (
          <FleetView 
            unitsPnL={unitsPnL} 
            settings={settings}
            selectedMonth={selectedMonth} 
            onSelectUnit={setSelectedUnitForModal}
          />
        )}

        {currentTab === 'trips' && (
          <TripsView
            trips={trips}
            units={units}
            onImportTrips={handleImportTrips}
            onAddTrip={handleAddTrip}
            onDeduplicateTrips={handleDeduplicateTrips}
          />
        )}

        {currentTab === 'costs' && (
          <CostsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            supabaseConfig={supabaseConfig}
            onUpdateSupabaseConfig={handleUpdateSupabaseConfig}
            onSyncCloudNow={handleSyncCloudNow}
            onPullCloudNow={handlePullCloudNow}
            onShowToast={showToast}
          />
        )}

        {/* Drill-down Detail Modal for any clicked unit */}
        {selectedUnitForModal && (
          <UnitDetailModal
            unit={selectedUnitForModal}
            settings={settings}
            onClose={() => setSelectedUnitForModal(null)}
          />
        )}
      </main>

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
