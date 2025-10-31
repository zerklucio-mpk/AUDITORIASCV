import React, { useMemo } from 'react';
import { CompletedAudit, AnswerData } from '../types';
import VerticalGroupedBarChart from './VerticalGroupedBarChart';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface Props {
  audits: CompletedAudit[];
  questions: string[];
  onBack: () => void;
  chartRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const QuestionAnalysisScreen: React.FC<Props> = ({ audits, questions, onBack, chartRefs }) => {

  const questionData = useMemo(() => {
    const stats: { [area: string]: { 'Sí': number; 'No': number; 'N/A': number } }[] = questions.map(() => ({}));
    
    audits.forEach(audit => {
        const area = audit.auditData.area;
        Object.entries(audit.answers).forEach(([questionIndexStr, answerData]: [string, AnswerData]) => {
            const questionIndex = parseInt(questionIndexStr, 10);
            if (!stats[questionIndex]) return;

            if (!stats[questionIndex][area]) {
                stats[questionIndex][area] = { 'Sí': 0, 'No': 0, 'N/A': 0 };
            }

            const answer = answerData.answer;
            if (answer) {
                stats[questionIndex][area][answer]++;
            }
        });
    });

    return questions.map((question, index) => ({
      question: `${index + 1}. ${question}`,
      dataByArea: Object.entries(stats[index]).map(([name, counts]) => ({ name, ...counts })),
    }));
  }, [audits, questions]);

  return (
    <div className="mx-auto w-full max-w-5xl">
        <div className="relative mb-8 text-center">
            <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                <ArrowLeftIcon className="h-4 w-4" />
                Volver
            </button>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Análisis por Pregunta</h2>
            <p className="mt-2 text-lg leading-8 text-slate-400">
                Rendimiento detallado de cada punto a través de las áreas.
            </p>
        </div>
        
        <div className="space-y-8">
            {questionData.map((data, index) => (
                <div key={index} ref={el => { if (chartRefs) chartRefs.current[index] = el; }} className="bg-slate-900 border border-slate-800 rounded-xl p-6 pb-8 shadow-lg">
                    <VerticalGroupedBarChart data={data.dataByArea} title={data.question} />
                </div>
            ))}
        </div>
    </div>
  );
};

export default QuestionAnalysisScreen;
