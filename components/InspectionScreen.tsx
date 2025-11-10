import React, { useState } from 'react';
import { Extinguisher, InspectionAnswers, InspectionAnswer } from '../types';
import { uploadPhoto } from '../services/supabaseClient';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import CameraIcon from './icons/CameraIcon';
import XCircleIcon from './icons/XCircleIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface Props {
  extinguisher: Extinguisher;
  onBack: () => void;
  onSave: (updatedExtinguisher: Extinguisher, answers: InspectionAnswers) => Promise<void>;
}

const inspectionQuestions = [
  "¿El extintor cuenta con presión?",
  "¿El extintor cuenta con manguera, boquilla y cono?",
  "¿El extintor cuenta con manómetro?",
  "¿El extintor se encuentra en buen estado?",
  "¿La señalización se encuentra visible?",
  "¿El extintor cuenta con su sello y pasador de seguridad?",
  "¿El extintor se encuentra libre de obstáculos?"
];

const extinguisherTypes = ['PQS', 'AGUA', 'Co2', 'HFC-236-FA'];
const extinguisherCapacities = ['2kg', '2.5kg', '4.5kg', '6kg', '50kg'];

const InspectionScreen: React.FC<Props> = ({ extinguisher, onBack, onSave }) => {
  const [answers, setAnswers] = useState<InspectionAnswers>({});
  const [editableDetails, setEditableDetails] = useState(extinguisher);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleAnswerChange = (questionIndex: number, answer: InspectionAnswer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: { ...prev[questionIndex], answer },
    }));
  };
  
  const handleObservationChange = (questionIndex: number, observation: string) => {
    setAnswers(prev => ({
        ...prev,
        [questionIndex]: { ...prev[questionIndex], answer: prev[questionIndex]?.answer || null, observation },
    }));
  };

  const handlePhotoChange = async (questionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingPhoto(questionIndex);
      setUploadError(null);
      try {
          const photoUrl = await uploadPhoto(file);
          setAnswers(prev => ({
              ...prev,
              [questionIndex]: { ...prev[questionIndex], answer: prev[questionIndex]?.answer || null, photo: photoUrl },
          }));
      } catch (error) {
          console.error("Error uploading photo:", error);
          setUploadError("No se pudo subir la foto. Inténtalo de nuevo.");
      } finally {
          setIsUploadingPhoto(null);
      }
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

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(editableDetails, answers);
    } catch (e: any) {
      setError(e.message || "Ocurrió un error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="relative mb-8 text-center">
        <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
        </button>
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Inspección de Extintor</h2>
            <div className="mt-3 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                  <label htmlFor="location" className="block text-sm font-medium leading-6 text-slate-300">Ubicación</label>
                  <input type="text" name="location" id="location" value={editableDetails.location} onChange={handleDetailChange} className="mt-1 block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                  <label htmlFor="series" className="block text-sm font-medium leading-6 text-slate-300">Serie</label>
                  <input type="text" name="series" id="series" value={editableDetails.series} onChange={handleDetailChange} className="mt-1 block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm" />
              </div>
               <div>
                <label htmlFor="type" className="block text-sm font-medium leading-6 text-slate-300">Tipo</label>
                <div className="relative mt-1">
                  <select id="type" name="type" value={editableDetails.type} onChange={handleDetailChange} className="block w-full appearance-none rounded-md border-0 py-2 pl-3 pr-10 bg-slate-800 text-white ring-1 ring-inset ring-slate-700 focus:ring-indigo-500 focus:ring-2 sm:text-sm">
                    {extinguisherTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><ChevronDownIcon className="h-5 w-5 text-slate-500" /></div>
                </div>
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium leading-6 text-slate-300">Cantidad</label>
                <div className="relative mt-1">
                  <select id="capacity" name="capacity" value={editableDetails.capacity} onChange={handleDetailChange} className="block w-full appearance-none rounded-md border-0 py-2 pl-3 pr-10 bg-slate-800 text-white ring-1 ring-inset ring-slate-700 focus:ring-indigo-500 focus:ring-2 sm:text-sm">
                    {extinguisherCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><ChevronDownIcon className="h-5 w-5 text-slate-500" /></div>
                </div>
              </div>
            </div>
        </div>
      </div>

      {uploadError && <div className="mb-4 text-center text-red-400 bg-red-900/20 p-3 rounded-md">{uploadError}</div>}
      
      <div className="space-y-6">
        {inspectionQuestions.map((question, index) => (
          <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <p className="font-medium text-slate-200 mb-4">{`${index + 1}. ${question}`}</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex gap-2 flex-shrink-0">
                    {(['Sí', 'No', 'N/A'] as InspectionAnswer[]).map(option => (
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
                <label className="relative flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-500 cursor-pointer">
                    {isUploadingPhoto === index ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <CameraIcon className="h-5 w-5" />}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(index, e)}
                        disabled={isUploadingPhoto !== null}
                    />
                </label>
            </div>
            {answers[index]?.photo && (
              <div className="mt-4 relative w-32 h-32">
                  <img src={answers[index]?.photo as string} alt="Evidencia" className="rounded-md object-cover w-full h-full" />
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
      
      {error && (
        <p className="mt-4 text-sm text-center text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p>
      )}

      <div className="mt-10 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex w-52 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors duration-200 disabled:bg-green-400"
        >
          {isSaving ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <><CheckCircleIcon className="h-5 w-5" /> Finalizar Inspección</>}
        </button>
      </div>
    </div>
  );
};

export default InspectionScreen;