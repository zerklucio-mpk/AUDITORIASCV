import React, { useState, useEffect } from 'react';
import { FormData, Answers, CompletedAudit, HistorySnapshot, AnswerData } from './types';
import { getAudits, addAudit, getSnapshots, addSnapshot, deleteAllAudits } from './services/supabaseClient';
import AuditWelcomeScreen from './components/AuditWelcomeScreen';
import AuditQuestionsScreen from './components/AuditQuestionsScreen';
import DashboardScreen from './components/DashboardScreen';
import SummaryDashboardScreen from './components/SummaryDashboardScreen';
import SpinnerIcon from './components/icons/SpinnerIcon';

export type Screen = 'summary' | 'welcome' | 'questions' | 'dashboard';

export const AUDIT_QUESTIONS = [
    "¿Todas las posiciones de almacenamiento se encuentran identificadas con localizadores?",
    "¿Todos los espacios entre tarimas se encuentran libres de objetos y/o desperdicios?",
    "¿Todas las posiciones de almacenamiento libres, se encuentran sin ningún tipo de objeto y/o desperdicio dentro de los mismos?",
    "¿Se encuentra señalizada y especificada la estiba máxima?",
    "¿El pasillo peatonal se encuentra libre de obstáculos?",
    "¿Todas las tarimas que tienen producto se encuentran identificadas con su bitácora de ubicación?",
    "¿Se respetan las zonas de trabajo delimitadas?",
    "¿Los extintores se encuentran libres de obstáculos?",
    "¿Las puertas de emergencia se encuentran libres de obstáculos?",
    "¿Los señalamientos de seguridad son visibles y legibles?",
    "¿Los patines cuentan con formato de inspección?",
    "¿Todas las lamparas funcionan correctamente?",
    "¿Los apagadores y conexiones se encuentran en optimas condicionas y con tapa?",
    "¿El botiquín de primeros auxilios se encuentra completo y al día?",
    "¿Las zonas designadas de desperdicio se encuentran sin exceso de los mismos?",
    "¿La zona cuenta con presencia de animales domésticos?",
    "¿La zona se encuentra sin presencia de plagas?",
    "¿Los colaboradores portan su equipo de protección personal al momento de realizar sus actividades?",
    "¿Los elementos químicos poseen sus hojas de seguridad?",
    "¿El montacargas cuenta con un lugar designado?",
    "¿El montacargas cuenta con su checklist?",
    "¿Los patines cuentan con un espacio designado?",
    "¿Las tarimas visibles, se encuentran en optimas condiciones?",
    "¿Las rampas, barandales y racks se encuentran en buen estado?",
    "¿Los suelos se encuentran limpios sin presencia de derrames o materiales innecesarios?"
];

export const AUDIT_AREAS = [
    "Reacondicionado", "Devoluciones", "Empaque TV", "Empaque Retail", 
    "Planta Alta", "Alto Valor", "Mensajería y Distribución", 
    "Almacén F", "Maquila", "Recibo"
];

const calculateCompliance = (answers: Answers): number => {
    const relevantAnswers = Object.values(answers).filter((a: AnswerData) => a.answer === 'Sí' || a.answer === 'No');
    if (relevantAnswers.length === 0) return 100;
    const yesCount = relevantAnswers.filter((a: AnswerData) => a.answer === 'Sí').length;
    return (yesCount / relevantAnswers.length) * 100;
};

const calculateAverageCompliance = (audits: CompletedAudit[]): number => {
    if (audits.length === 0) return 0;
    const totalCompliance = audits.reduce((sum, audit) => sum + calculateCompliance(audit.answers), 0);
    return totalCompliance / audits.length;
};


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('summary');
  const [completedAudits, setCompletedAudits] = useState<CompletedAudit[]>([]);
  const [historicalSnapshots, setHistoricalSnapshots] = useState<HistorySnapshot[]>([]);
  const [currentAudit, setCurrentAudit] = useState<CompletedAudit | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Answers>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            setError(null);
            setIsLoading(true);
            const [audits, snapshots] = await Promise.all([getAudits(), getSnapshots()]);
            setCompletedAudits(audits);
            setHistoricalSnapshots(snapshots);
        } catch (error) {
            console.error("Fallo al leer los datos de Supabase", error);
            setError("No se pudieron cargar los datos. Por favor, configura la conexión.");
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []);
  
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
      const completedAudit: CompletedAudit = { ...currentAudit, answers };
      try {
        setIsLoading(true);
        await addAudit(completedAudit);
        setCompletedAudits(prev => [...prev, completedAudit]);
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
        
        setHistoricalSnapshots(prev => [...prev, newSnapshot]);
        setCompletedAudits([]);
        alert("Ciclo archivado y reiniciado con éxito. El cumplimiento promedio del ciclo fue guardado en el historial.");
    } catch (error) {
        console.error("Error al archivar y reiniciar:", error);
        setError("Hubo un error al archivar el ciclo. Revisa la configuración de Supabase.");
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <SpinnerIcon className="h-12 w-12 text-indigo-500 animate-spin" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 px-6 bg-red-900/20 border border-red-500/30 rounded-lg max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-red-300">Error de Configuración</h3>
          <p className="mt-2 text-red-400">{error}</p>
          <div className="mt-4 text-sm text-left bg-slate-800/50 p-4 rounded-md border border-slate-700">
            <p className="font-semibold text-slate-300">Acción Requerida:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-400">
                <li>Abre el archivo <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">services/supabaseClient.ts</code>.</li>
                <li>Reemplaza los valores de <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">SUPABASE_URL</code> y <code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs">SUPABASE_ANON_KEY</code> con tus credenciales.</li>
                <li>Guarda el archivo. La aplicación se conectará automáticamente.</li>
            </ol>
          </div>
        </div>
      );
    }
    
    switch (currentScreen) {
      case 'summary':
        return <SummaryDashboardScreen 
          audits={completedAudits} 
          onStartNewAudit={handleStartAuditProcess} 
          questions={AUDIT_QUESTIONS} 
          auditableAreas={AUDIT_AREAS} 
          historicalSnapshots={historicalSnapshots}
          onArchiveAndReset={handleArchiveAndReset}
        />;
      case 'welcome':
        return <AuditWelcomeScreen onFormSubmit={handleFormSubmit} onBack={handleBackToSummary} initialData={currentAudit?.auditData} areaOptions={AUDIT_AREAS} />;
      case 'questions':
        return currentAudit ? <AuditQuestionsScreen questions={AUDIT_QUESTIONS} initialAnswers={currentAnswers} onFinish={handleQuestionsComplete} onBack={handleBackToWelcome} /> : null;
      case 'dashboard':
        return currentAudit ? <DashboardScreen audit={currentAudit} questions={AUDIT_QUESTIONS} onReturnToSummary={handleBackToSummary} onBack={handleBackToQuestions} /> : null;
      default:
        return <SummaryDashboardScreen 
          audits={completedAudits} 
          onStartNewAudit={handleStartAuditProcess} 
          questions={AUDIT_QUESTIONS} 
          auditableAreas={AUDIT_AREAS} 
          historicalSnapshots={historicalSnapshots}
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
        {renderContent()}
      </main>
    </div>
  );
};

export default App;