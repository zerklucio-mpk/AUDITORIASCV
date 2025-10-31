import React, { useState, useEffect } from 'react';
import { FormData, Answers, CompletedAudit, HistorySnapshot } from './types';
import AuditWelcomeScreen from './components/AuditWelcomeScreen';
import AuditQuestionsScreen from './components/AuditQuestionsScreen';
import DashboardScreen from './components/DashboardScreen';
import SummaryDashboardScreen from './components/SummaryDashboardScreen';

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
    const relevantAnswers = Object.values(answers).filter(a => a.answer === 'Sí' || a.answer === 'No');
    if (relevantAnswers.length === 0) return 100;
    const yesCount = relevantAnswers.filter(a => a.answer === 'Sí').length;
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

  useEffect(() => {
    try {
      const storedAudits = localStorage.getItem('completedAudits');
      if (storedAudits) {
        setCompletedAudits(JSON.parse(storedAudits));
      }
      const storedSnapshots = localStorage.getItem('historicalSnapshots');
      if (storedSnapshots) {
        setHistoricalSnapshots(JSON.parse(storedSnapshots));
      }
    } catch (error) {
        console.error("Fallo al leer los datos del localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('completedAudits', JSON.stringify(completedAudits));
    } catch (error) {
        console.error("Fallo al guardar las auditorías en el localStorage", error);
    }
  }, [completedAudits]);

  useEffect(() => {
    try {
        localStorage.setItem('historicalSnapshots', JSON.stringify(historicalSnapshots));
    } catch (error) {
        console.error("Fallo al guardar el histórico en el localStorage", error);
    }
  }, [historicalSnapshots]);
  
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
  
  const handleQuestionsComplete = (answers: Answers) => {
    if (currentAudit) {
      const completedAudit: CompletedAudit = { ...currentAudit, answers };
      setCompletedAudits(prev => [...prev, completedAudit]);
      setCurrentAudit(completedAudit);
      setCurrentAnswers(answers);
      setCurrentScreen('dashboard');
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

  const handleArchiveAndReset = () => {
    if (completedAudits.length === 0) {
        alert("No hay auditorías para archivar.");
        return;
    }
    
    const averageCompliance = calculateAverageCompliance(completedAudits);
    const newSnapshot: HistorySnapshot = {
        name: new Date().toISOString().split('T')[0],
        value: averageCompliance,
    };

    setHistoricalSnapshots(prev => [...prev, newSnapshot]);
    setCompletedAudits([]);
    alert("Ciclo archivado y reiniciado con éxito. El cumplimiento promedio del ciclo fue guardado en el historial.");
  };

  const renderScreen = () => {
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
        // This case should not be reached with proper state management, but as a safeguard, we return the summary screen.
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
        {renderScreen()}
      </main>
    </div>
  );
};

export default App;
