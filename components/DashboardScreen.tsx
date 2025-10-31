import React, { useMemo } from 'react';
import { CompletedAudit, AnswerData } from '../types';
import AuditDonutChart from './AuditDonutChart';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface Props {
  audit: CompletedAudit;
  questions: string[];
  onReturnToSummary: () => void;
  onBack: () => void;
}

const DashboardScreen: React.FC<Props> = ({ audit, questions, onReturnToSummary, onBack }) => {

  const stats = useMemo(() => {
    const counts = { 'Sí': 0, 'No': 0, 'N/A': 0 };
    // FIX: Explicitly type 'data' as AnswerData to resolve TypeScript error.
    Object.values(audit.answers).forEach((data: AnswerData) => {
      if (data.answer) {
        counts[data.answer]++;
      }
    });
    return counts;
  }, [audit.answers]);

  const improvementPoints = useMemo(() => {
    // FIX: Explicitly type the destructured 'data' as AnswerData to resolve TypeScript error.
    return Object.entries(audit.answers)
      .filter(([, data]: [string, AnswerData]) => data.answer === 'No')
      .map(([index]) => ({
        question: questions[parseInt(index, 10)],
        observation: audit.answers[parseInt(index, 10)]?.observation || 'Sin observación.',
      }));
  }, [audit.answers, questions]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="relative">
        <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver al Cuestionario
        </button>
        <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Resultados de la Auditoría</h2>
            <p className="mt-2 text-lg leading-8 text-slate-400">
                Área: {audit.auditData.area} - Auditor: {audit.auditData.nombreAuditor}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold mb-4 text-white">Cumplimiento General</h3>
            <AuditDonutChart data={stats} />
        </div>
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">Puntos a Mejorar ({improvementPoints.length})</h3>
            {improvementPoints.length > 0 ? (
                <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {improvementPoints.map((point, index) => (
                        <li key={index} className="text-sm border-l-4 border-red-500 pl-3">
                            <p className="font-semibold text-slate-200">{point.question}</p>
                            <p className="text-slate-400 italic">"{point.observation}"</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-400">¡Felicidades! No se encontraron puntos con respuesta "No".</p>
            )}
        </div>
      </div>
      
      <div className="flex justify-end mt-10">
        <button onClick={onReturnToSummary} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors">
            Volver al Resumen General
        </button>
      </div>
    </div>
  );
};

export default DashboardScreen;
