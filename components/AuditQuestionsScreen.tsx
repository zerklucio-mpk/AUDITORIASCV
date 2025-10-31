import React, { useState } from 'react';
// FIX: Corrected import path for types.
import { Answers, Answer } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface Props {
  questions: string[];
  initialAnswers: Answers;
  onFinish: (answers: Answers) => void;
  onBack: () => void;
}

const AuditQuestionsScreen: React.FC<Props> = ({ questions, initialAnswers, onFinish, onBack }) => {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);

  const handleAnswerChange = (questionIndex: number, answer: Answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: { ...prev[questionIndex], answer },
    }));
  };
  
  const handleObservationChange = (questionIndex: number, observation: string) => {
    setAnswers(prev => ({
        ...prev,
        [questionIndex]: { answer: prev[questionIndex]?.answer || null, observation },
    }));
  };

  const isComplete = () => {
    return questions.every((_, index) => answers[index] && answers[index].answer !== null);
  };

  const handleSubmit = () => {
    if (isComplete()) {
      onFinish(answers);
    } else {
      alert("Por favor, responde todas las preguntas antes de finalizar.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="relative mb-8 text-center">
        <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
        </button>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Cuestionario</h2>
      </div>
      
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <p className="font-medium text-slate-200 mb-4">{`${index + 1}. ${question}`}</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex gap-2 flex-shrink-0">
                    {(['Sí', 'No', 'N/A'] as Answer[]).map(option => (
                        <button
                        key={option}
                        onClick={() => handleAnswerChange(index, option)}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 w-[70px] ${
                            answers[index]?.answer === option
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        >
                        {option}
                        </button>
                    ))}
                </div>
                <textarea
                    value={answers[index]?.observation || ''}
                    onChange={(e) => handleObservationChange(index, e.target.value)}
                    placeholder="Añadir observación (opcional)..."
                    className="block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors duration-200 flex-1"
                    rows={1}
                ></textarea>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isComplete()}
          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Finalizar Auditoría
        </button>
      </div>
    </div>
  );
};

export default AuditQuestionsScreen;