import React from 'react';
import { CompletedAudit, AnswerData } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface Props {
  audits: CompletedAudit[];
  onBack: () => void;
}

const HistoryScreen: React.FC<Props> = ({ audits, onBack }) => {
    
  return (
    <div className="mx-auto w-full max-w-5xl">
        <div className="relative mb-8 text-center">
            <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                <ArrowLeftIcon className="h-4 w-4" />
                Volver
            </button>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Detalle de Auditorías del Ciclo</h2>
            <p className="mt-2 text-lg leading-8 text-slate-400">
                Un registro completo de todas las auditorías realizadas en el ciclo actual.
            </p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-white">Detalle de Auditorías (Ciclo Actual)</h3>
            <div className="max-h-96 overflow-y-auto">
              {audits.length > 0 ? (
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-300 uppercase bg-slate-800 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha</th>
                            <th scope="col" className="px-6 py-3">Área</th>
                            <th scope="col" className="px-6 py-3">Auditor</th>
                            <th scope="col" className="px-6 py-3">Cumplimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...audits].reverse().map((audit, index) => {
                             // FIX: Explicitly type 'a' as AnswerData to resolve TypeScript error.
                             const total = Object.values(audit.answers).filter((a: AnswerData) => a.answer === 'Sí' || a.answer === 'No').length;
                             // FIX: Explicitly type 'a' as AnswerData to resolve TypeScript error.
                             const yes = Object.values(audit.answers).filter((a: AnswerData) => a.answer === 'Sí').length;
                             const compliance = total > 0 ? (yes / total * 100) : 0;
                             return (
                                <tr key={index} className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="px-6 py-4">{audit.auditData.fecha}</td>
                                    <td className="px-6 py-4">{audit.auditData.area}</td>
                                    <td className="px-6 py-4">{audit.auditData.nombreAuditor}</td>
                                    <td className="px-6 py-4 font-semibold text-white">{compliance.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
              ) : (
                <p className="text-center text-slate-400 py-8">No hay auditorías en el ciclo actual.</p>
              )}
            </div>
        </div>
    </div>
  );
};

export default HistoryScreen;
