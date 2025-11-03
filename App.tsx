import React, { useState, useEffect, useCallback } from 'react';
import { FormData, Answers, CompletedAudit, HistorySnapshot, Question, Area } from './types';
import { getAudits, addAudit, getSnapshots, addSnapshot, deleteAllAudits, getQuestions, getAreas } from './services/supabaseClient';
import { calculateAverageCompliance } from './services/utils';
import { AppProvider } from './context/AppContext';
import AuditWelcomeScreen from './components/AuditWelcomeScreen';
import AuditQuestionsScreen from './components/AuditQuestionsScreen';
import DashboardScreen from './components/DashboardScreen';
import SummaryDashboardScreen from './components/SummaryDashboardScreen';
import SpinnerIcon from './components/icons/SpinnerIcon';

export type Screen = 'summary' | 'welcome' | 'questions' | 'dashboard';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('summary');
  const [completedAudits, setCompletedAudits] = useState<CompletedAudit[]>([]);
  const [historicalSnapshots, setHistoricalSnapshots] = useState<HistorySnapshot[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [currentAudit, setCurrentAudit] = useState<Omit<CompletedAudit, 'id'> | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Answers>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    if ((currentScreen === 'questions' || currentScreen === 'dashboard') && !currentAudit) {
      console.warn('Estado inconsistente detectado: Faltan datos de auditoría. Volviendo al resumen.');
      setCurrentScreen('summary');
    }
  }, [currentScreen, currentAudit]);


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
        await fetchData();
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
        
        await fetchData(); // Recargar todo para reflejar el estado vacío
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
    refreshData: fetchData,
  };

  const renderContent = () => {
    if (isLoading && !error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <SpinnerIcon className="h-12 w-12 text-indigo-500 animate-spin" />
          <p className="text-slate-400">Cargando datos...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 px-6 bg-red-900/20 border border-red-500/30 rounded-lg max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-red-300">Error de Configuración o Conexión</h3>
          <p className="mt-2 text-red-400">{error}</p>
          <div className="mt-4 text-sm text-left bg-slate-800/50 p-4 rounded-md border border-slate-700">
            <p className="font-semibold text-slate-300">Acciones Recomendadas:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-400">
                <li>Verifica tu conexión a internet.</li>
                <li>Abre <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">services/supabaseClient.ts</code> y asegúrate de que tus credenciales son correctas.</li>
                <li>Asegúrate de haber creado las tablas <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">audits</code>, <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">snapshots</code>, <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">questions</code>, y <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">areas</code> en Supabase.</li>
                <li>Revisa las políticas de seguridad (RLS) en tu dashboard de Supabase para asegurarte de que permitan el acceso público.</li>
            </ol>
          </div>
        </div>
      );
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
    <div className="bg-black min-h-screen text-slate-200 font-sans">
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-center text-white">Suave y Facil S.A. de C.V.</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <AppProvider value={appContextValue}>
          {renderContent()}
        </AppProvider>
      </main>
    </div>
  );
};

export default App;
