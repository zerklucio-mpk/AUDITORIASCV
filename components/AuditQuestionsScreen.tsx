import React, { useState, useMemo } from 'react';
import { Answers, Answer } from '../types';
import { useAppContext } from '../context/AppContext';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import CameraIcon from './icons/CameraIcon';
import XCircleIcon from './icons/XCircleIcon';


interface Props {
  initialAnswers: Answers;
  onFinish: (answers: Answers) => void;
  onBack: () => void;
}

const AuditQuestionsScreen: React.FC<Props> = ({ initialAnswers, onFinish, onBack }) => {
  const { questions } = useAppContext();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  
  const questionTexts = useMemo(() => questions.map(q => q.text), [questions]);

  const handleAnswerChange = (questionIndex: number, answer: Answer) => {
    setAnswers(prev => {
      const newAnswerData = { ...prev[questionIndex], answer };
      if (answer !== 'No') {
        delete newAnswerData.photo;
      }
      return {
        ...prev,
        [questionIndex]: newAnswerData,
      };
    });
  };
  
  const handleObservationChange = (questionIndex: number, observation: string) => {
    setAnswers(prev => ({
        ...prev,
        [questionIndex]: { answer: prev[questionIndex]?.answer || null, observation },
    }));
  };

  const handlePhotoChange = (questionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          setAnswers(prev => ({
              ...prev,
              [questionIndex]: { ...prev[questionIndex], answer: 'No', photo: reader.result as string },
          }));
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleRemovePhoto = (questionIndex: number) => {
      setAnswers(prev => {
          const updatedAnswer = { ...prev[questionIndex] };
          delete updatedAnswer.photo;
          return {
              ...prev,
              [questionIndex]: updatedAnswer
          };
      });
  };

  const isComplete = () => {
    return questionTexts.every((_, index) => answers[index] && answers[index].answer !== null);
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
        {questionTexts.map((question, index) => (
          <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <p className="font-medium text-slate-200 mb-4">{`${index + 1}. ${question}`}</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
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
                <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 w-full sm:w-auto ${
                    answers[index]?.answer === 'No'
                    ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}>
                    <CameraIcon className="h-5 w-5" />
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(index, e)}
                        disabled={answers[index]?.answer !== 'No'}
                    />
                </label>
            </div>
            {answers[index]?.photo && (
              <div className="mt-4 relative w-32 h-32">
                  <img src={answers[index]?.photo as string} alt="Previsualización" className="rounded-md object-cover w-full h-full" />
                  <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute -top-2 -right-2 bg-slate-800 rounded-full text-red-500 hover:text-red-400"
                      title="Eliminar foto"
                  >
                      <XCircleIcon className="h-6 w-6" />
                  </button>
              </div>
            )}
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
