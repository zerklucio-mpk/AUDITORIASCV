import React, { useState, useEffect, useCallback } from 'react';
import { FormData, Answers, CompletedAudit, HistorySnapshot, Question, Area, ExtinguisherArea, Extinguisher, InspectionRecord, FirstAidKitArea, FirstAidKit } from './types';
import { 
  getAudits, addAudit, getSnapshots, addSnapshot, deleteAllAudits, getQuestions, getAreas, 
  getExtinguisherAreas, getAllExtinguishers, getInspectedExtinguisherIdsOnly,
  getFirstAidKitAreas, getFirstAidKits
} from './services/supabaseClient';
import { calculateAverageCompliance } from './services/utils';
import { AppProvider } from './context/AppContext';
import AuditWelcomeScreen from './components/AuditWelcomeScreen';
import AuditQuestionsScreen from './components/AuditQuestionsScreen';
import DashboardScreen from './components/DashboardScreen';
import SummaryDashboardScreen from './components/SummaryDashboardScreen';
import SpinnerIcon from './components/icons/SpinnerIcon';
import Sidebar from './components/Sidebar';
import ExtinguishersScreen from './components/ExtinguishersScreen';
import FirstAidKitsScreen from './components/FirstAidKitsScreen';

export type Screen = 'summary' | 'welcome' | 'questions' | 'dashboard';
export type ActiveView = 'areas' | 'extintores' | 'botiquines';

interface ExtinguisherData {
  areas: ExtinguisherArea[];
  extinguishers: Extinguisher[];
  inspectedIds: Set<string>;
}

interface FirstAidKitData {
  areas: FirstAidKitArea[];
  kits: FirstAidKit[];
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('summary');
  const [activeView, setActiveView] = useState<ActiveView>('areas');
  const [completedAudits, setCompletedAudits] = useState<CompletedAudit[]>([]);
  const [historicalSnapshots, setHistoricalSnapshots] = useState<HistorySnapshot[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [currentAudit, setCurrentAudit] = useState<Omit<CompletedAudit, 'id'> | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Answers>({});
  
  // Main data loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Module-specific data
  const [extinguisherData, setExtinguisherData] = useState<ExtinguisherData | null>(null);
  const [firstAidKitData, setFirstAidKitData] = useState<FirstAidKitData | null>(null);
  const [isModuleLoading, setIsModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);


  const fetchMainData = useCallback(async () => {
    try {
        setError(null);
        setIsLoading(true);
        const [audits, snapshots, fetchedQuestions, fetchedAreas] = await Promise.all([
          getAudits(), 
          getSnapshots(),
          getQuestions(),
          getAreas(),
        ]);
        setCompletedAudits(audits);
        setHistoricalSnapshots(snapshots);
        setQuestions(fetchedQuestions);
        setAreas(fetchedAreas);
    } catch (error) {
        console.error("Fallo al leer los datos de Supabase", error);
        setError("No se pudieron cargar los datos. Por favor, configura la conexión y las tablas de la base de datos.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  const fetchExtinguisherData = useCallback(async () => {
    setModuleError(null);
    setIsModuleLoading(true);
    try {
      const results = await Promise.allSettled([
        getExtinguisherAreas(),
        getAllExtinguishers(),
        getInspectedExtinguisherIdsOnly()
      ]);

      const [areasResult, extinguishersResult, inspectionsResult] = results;

      const areas = areasResult.status === 'fulfilled' ? areasResult.value : [];
      const extinguishers = extinguishersResult.status === 'fulfilled' ? extinguishersResult.value : [];
      const inspectedIds = inspectionsResult.status === 'fulfilled' ? inspectionsResult.value : new Set<string>();
      
      setExtinguisherData({ areas, extinguishers, inspectedIds });

      const failedFetches: string[] = [];
      if (areasResult.status === 'rejected') {
        failedFetches.push('Áreas de Extintores');
        console.error("Error al cargar áreas de extintores:", areasResult.reason);
      }
      if (extinguishersResult.status === 'rejected') {
        failedFetches.push('Extintores');
        console.error("Error al cargar extintores:", extinguishersResult.reason);
      }
      if (inspectionsResult.status === 'rejected') {
        failedFetches.push('Estado de Inspecciones');
        console.error("Error al cargar estado de inspecciones:", inspectionsResult.reason);
      }

      if (failedFetches.length > 0) {
        const errorMessage = `No se pudieron cargar los siguientes datos: ${failedFetches.join(', ')}. Es muy probable que necesites configurar las Políticas de Seguridad (RLS) para permitir el acceso de lectura ('SELECT') en las tablas correspondientes de Supabase.`;
        setModuleError(errorMessage);
      }

    } catch (e: any) {
      console.error("Fallo inesperado al cargar datos de extintores:", e);
      setModuleError('Ocurrió un error inesperado. Revisa la consola para más detalles.');
    } finally {
      setIsModuleLoading(false);
    }
  }, []);

  const fetchFirstAidKitData = useCallback(async () => {
    setModuleError(null);
    setIsModuleLoading(true);
    try {
      const results = await Promise.allSettled([
        getFirstAidKitAreas(),
        getFirstAidKits()
      ]);

      const [areasResult, kitsResult] = results;

      const areas = areasResult.status === 'fulfilled' ? areasResult.value : [];
      const kits = kitsResult.status === 'fulfilled' ? kitsResult.value : [];
      
      setFirstAidKitData({ areas, kits });

      const failedFetches: string[] = [];
      if (areasResult.status === 'rejected') {
        failedFetches.push('Áreas de Botiquines');
        console.error("Error al cargar áreas de botiquines:", areasResult.reason);
      }
      if (kitsResult.status === 'rejected') {
        failedFetches.push('Registros de Botiquines');
        console.error("Error al cargar botiquines:", kitsResult.reason);
      }
      
      if (failedFetches.length > 0) {
        const errorMessage = `No se pudieron cargar los siguientes datos: ${failedFetches.join(', ')}. Es muy probable que necesites configurar las Políticas de Seguridad (RLS) para permitir el acceso de lectura ('SELECT') en las tablas correspondientes de Supabase.`;
        setModuleError(errorMessage);
      }

    } catch (e: any) {
      console.error("Fallo inesperado al cargar datos de botiquines:", e);
      setModuleError('Ocurrió un error inesperado. Revisa la consola para más detalles.');
    } finally {
      setIsModuleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMainData();
  }, [fetchMainData]);
  
  useEffect(() => {
    if ((currentScreen === 'questions' || currentScreen === 'dashboard') && !currentAudit) {
      console.warn('Estado inconsistente detectado: Faltan datos de auditoría. Volviendo al resumen.');
      setCurrentScreen('summary');
    }
  }, [currentScreen, currentAudit]);

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    // Carga inteligente de datos bajo demanda
    if (view === 'extintores' && !extinguisherData) {
      fetchExtinguisherData();
    }
    if (view === 'botiquines' && !firstAidKitData) {
      fetchFirstAidKitData();
    }
    if (view === 'areas') {
      setCurrentScreen('summary');
    }
  };


  const handleStartAuditProcess = () => {
    setCurrentScreen('welcome');
  };

  const handleFormSubmit = (data: FormData) => {
    setCurrentAudit({ auditData: data, answers: {} });
    setCurrentAnswers({});
    setCurrentScreen('questions');
  };
  
  const handleQuestionsComplete = async (answers: Answers) => {
    if (currentAudit) {
      const completedAudit: Omit<CompletedAudit, 'id'> = { ...currentAudit, answers };
      try {
        setIsLoading(true);
        await addAudit(completedAudit);
        await fetchMainData();
        setCurrentAudit(completedAudit);
        setCurrentAnswers(answers);
        setCurrentScreen('dashboard');
      } catch (error) {
          console.error("Error guardando la auditoría en Supabase:", error);
          setError("Hubo un error al guardar la auditoría. Revisa la configuración de Supabase.");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleBackToSummary = () => {
    setCurrentAudit(null);
    setCurrentScreen('summary');
  };
  
  const handleBackToWelcome = () => {
    setCurrentScreen('welcome');
  };
  
  const handleBackToQuestions = () => {
    setCurrentScreen('questions');
  };

  const handleArchiveAndReset = async () => {
    if (completedAudits.length === 0) {
        alert("No hay auditorías para archivar.");
        return;
    }
    
    const averageCompliance = calculateAverageCompliance(completedAudits);
    const newSnapshot: HistorySnapshot = {
        name: new Date().toISOString().split('T')[0],
        value: averageCompliance,
    };

    try {
        setIsLoading(true);
        await addSnapshot(newSnapshot);
        await deleteAllAudits();
        
        await fetchMainData(); 
        alert("Ciclo archivado y reiniciado con éxito. El cumplimiento promedio del ciclo fue guardado en el historial.");
    } catch (error) {
        console.error("Error al archivar y reiniciar:", error);
        setError("Hubo un error al archivar el ciclo. Revisa la configuración de Supabase.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const appContextValue = {
    audits: completedAudits,
    snapshots: historicalSnapshots,
    questions,
    areas,
    refreshData: fetchMainData,
  };

  const renderContent = () => {
    const mainContentError = error || (activeView !== 'areas' ? moduleError : null);

    if ((isLoading && activeView === 'areas') || (isModuleLoading && activeView !== 'areas')) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <SpinnerIcon className="h-12 w-12 text-indigo-500 animate-spin" />
          <p className="text-slate-400">Cargando datos...</p>
        </div>
      );
    }

    if (mainContentError) {
      return (
        <div className="text-center py-10 px-6 bg-red-900/20 border border-red-500/30 rounded-lg max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-red-300">Error de Configuración o Conexión</h3>
          <p className="mt-2 text-red-400">{mainContentError}</p>
          <div className="mt-4 text-sm text-left bg-slate-800/50 p-4 rounded-md border border-slate-700">
            <p className="font-semibold text-slate-300">Acciones Recomendadas:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-400">
                <li>Verifica tu conexión a internet.</li>
                <li>Abre <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">services/supabaseClient.ts</code> y asegúrate de que tus credenciales son correctas.</li>
                <li>Asegúrate de haber creado las tablas necesarias en Supabase para el módulo actual.</li>
                <li>Revisa las políticas de seguridad (RLS) en tu dashboard de Supabase para asegurarte de que permitan el acceso público.</li>
            </ol>
          </div>
        </div>
      );
    }

    if (activeView === 'extintores') {
      return extinguisherData ? <ExtinguishersScreen 
        areas={extinguisherData.areas}
        allExtinguishers={extinguisherData.extinguishers}
        inspectedIds={extinguisherData.inspectedIds}
        refreshData={fetchExtinguisherData}
      /> : null;
    }

    if (activeView === 'botiquines') {
      return firstAidKitData ? <FirstAidKitsScreen 
        areas={firstAidKitData.areas}
        allKits={firstAidKitData.kits}
        refreshData={fetchFirstAidKitData}
      /> : null;
    }
    
    switch (currentScreen) {
      case 'summary':
        return <SummaryDashboardScreen 
          onStartNewAudit={handleStartAuditProcess} 
          onArchiveAndReset={handleArchiveAndReset}
        />;
      case 'welcome':
        return <AuditWelcomeScreen onFormSubmit={handleFormSubmit} onBack={handleBackToSummary} initialData={currentAudit?.auditData} />;
      case 'questions':
        return currentAudit ? <AuditQuestionsScreen initialAnswers={currentAnswers} onFinish={handleQuestionsComplete} onBack={handleBackToWelcome} /> : null;
      case 'dashboard':
        const lastAudit = completedAudits[completedAudits.length - 1];
        return lastAudit ? <DashboardScreen audit={lastAudit} onReturnToSummary={handleBackToSummary} onBack={handleBackToQuestions} /> : null;
      default:
        return <SummaryDashboardScreen 
          onStartNewAudit={handleStartAuditProcess} 
          onArchiveAndReset={handleArchiveAndReset}
        />;
    }
  };

  return (
    <AppProvider value={appContextValue}>
      <div className="bg-black min-h-screen text-slate-200 font-sans flex">
        <Sidebar activeView={activeView} setActiveView={handleViewChange} />
        <main className="flex-1 overflow-y-auto">
           <div className="container mx-auto px-4 py-8 sm:py-12">
            {renderContent()}
          </div>
        </main>
      </div>
    </AppProvider>
  );
};

export default App;