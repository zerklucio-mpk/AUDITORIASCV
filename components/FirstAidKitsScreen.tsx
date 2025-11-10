import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FirstAidKitArea, FirstAidKit, FirstAidKitAnswers, FirstAidKitAnswer } from '../types';
import { 
  addFirstAidKitArea, 
  deleteFirstAidKitArea, 
  addFirstAidKit, 
  deleteFirstAidKit, 
  deleteAllFirstAidKits,
  uploadPhoto
} from '../services/supabaseClient';
import { generateFirstAidKitReportPdf, generateFirstAidKitReportXlsx } from '../services/reportService';
import SpinnerIcon from './icons/SpinnerIcon';
import Dropdown from './Dropdown';
import ChevronDownIcon from './icons/ChevronDownIcon';
import TrashIcon from './icons/TrashIcon';
import CameraIcon from './icons/CameraIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

const inspectionQuestions = [
  "¿Se encuentra libre de obstáculos?",
  "¿Cuenta con su señalización?",
  "¿Presenta daños el botiquín?",
  "¿Cuenta con todos los materiales?",
  "¿Cuenta con checklist?"
];

interface Props {
  areas: FirstAidKitArea[];
  allKits: FirstAidKit[];
  refreshData: () => Promise<void>;
}

const FirstAidKitsScreen: React.FC<Props> = ({ areas, allKits, refreshData }) => {
  const [newArea, setNewArea] = useState('');
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSavingKit, setIsSavingKit] = useState(false);
  
  const [kitLocation, setKitLocation] = useState('');
  const [kitAnswers, setKitAnswers] = useState<FirstAidKitAnswers>({});

  const [viewingKit, setViewingKit] = useState<FirstAidKit | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const [kitToDelete, setKitToDelete] = useState<FirstAidKit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [areaToDelete, setAreaToDelete] = useState<FirstAidKitArea | null>(null);
  const [isDeletingArea, setIsDeletingArea] = useState(false);
  const [deleteAreaError, setDeleteAreaError] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);


  useEffect(() => {
    if (selectedAreaId && !areas.some(a => a.id === selectedAreaId)) {
      setSelectedAreaId(null);
    }
  }, [areas, selectedAreaId]);

  const handleAddArea = async () => {
    const trimmedArea = newArea.trim();
    if (!trimmedArea) return;
    if (areas.some(a => a.name.toLowerCase() === trimmedArea.toLowerCase())) {
      alert('Esa área ya existe.');
      return;
    }
    setIsAddingArea(true);
    setError(null);
    try {
      await addFirstAidKitArea(trimmedArea);
      setNewArea('');
      await refreshData();
    } catch (e: any) {
      setError('No se pudo añadir el área.');
      console.error(e);
    } finally {
      setIsAddingArea(false);
    }
  };
  
  const handleInitiateAreaDelete = (area: FirstAidKitArea, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteAreaError(null);
    setAreaToDelete(area);
  };

  const handleConfirmAreaDelete = async () => {
    if (!areaToDelete) return;

    setIsDeletingArea(true);
    setDeleteAreaError(null);
    try {
      await deleteFirstAidKitArea(areaToDelete.id);
      await refreshData();
      setAreaToDelete(null);
    } catch (e: any) {
      setDeleteAreaError(e.message || "Ocurrió un error inesperado al eliminar el área.");
      console.error(e);
    } finally {
      setIsDeletingArea(false);
    }
  };

  const handleRequestReport = async (type: 'pdf' | 'xlsx') => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      if (type === 'pdf') {
        await generateFirstAidKitReportPdf(areas, allKits);
      } else {
        await generateFirstAidKitReportXlsx(areas, allKits);
      }
    } catch (error) {
      console.error(`Error al generar el reporte ${type}:`, error);
      alert(`Hubo un error al generar el reporte.`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleAreaSelect = (areaId: string) => {
    if (selectedAreaId !== areaId) {
        setIsRegistering(false);
        setViewingKit(null);
    }
    setSelectedAreaId(prevId => (prevId === areaId ? null : areaId));
  };
  
  const resetForm = () => {
    setKitLocation('');
    setKitAnswers({});
  };

  const handleSaveKit = async () => {
    if (!selectedAreaId || !kitLocation.trim()) {
      alert("La ubicación es un campo requerido.");
      return;
    }
    setIsSavingKit(true);
    setError(null);
    try {
      await addFirstAidKit({
        area_id: selectedAreaId,
        location: kitLocation,
        inspection_data: kitAnswers
      });
      await refreshData();
      setIsRegistering(false);
      resetForm();
    } catch (e: any) {
      setError("Error al guardar el botiquín.");
      console.error(e);
    } finally {
      setIsSavingKit(false);
    }
  };
  
  const handleInitiateDelete = (kit: FirstAidKit) => {
    setDeleteError(null);
    setKitToDelete(kit);
  };
  
  const handleConfirmDelete = async () => {
    if (!kitToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
        await deleteFirstAidKit(kitToDelete.id);
        await refreshData();
        setKitToDelete(null); // Close modal on success
    } catch (e: any) {
        setDeleteError(e.message || "Ocurrió un error inesperado durante la eliminación.");
        console.error(e);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleInitiateReset = () => {
    setResetError(null);
    setIsResetConfirming(true);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setResetError(null);
    try {
      await deleteAllFirstAidKits();
      await refreshData();
      setIsResetConfirming(false);
    } catch (e: any) {
      setResetError(e.message || "Ocurrió un error inesperado durante el reinicio.");
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };


  const handleAnswerChange = (qIndex: number, answer: FirstAidKitAnswer) => {
    setKitAnswers(prev => ({ ...prev, [qIndex]: { ...prev[qIndex], answer } }));
  };

  const handleObservationChange = (qIndex: number, observation: string) => {
    setKitAnswers(prev => ({ ...prev, [qIndex]: { ...prev[qIndex], answer: prev[qIndex]?.answer || null, observation } }));
  };

  const handlePhotoChange = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingPhoto(qIndex);
    setUploadError(null);
    try {
      const photoUrl = await uploadPhoto(file);
      setKitAnswers(prev => ({ ...prev, [qIndex]: { ...prev[qIndex], answer: prev[qIndex]?.answer || null, photo: photoUrl } }));
    } catch (error) {
        console.error("Error uploading photo:", error);
        setUploadError("No se pudo subir la foto.");
    } finally {
        setIsUploadingPhoto(null);
    }
    e.target.value = '';
  };
  
  const handleRemovePhoto = (qIndex: number) => {
    setKitAnswers(prev => {
      const updatedAnswer = { ...prev[qIndex] };
      delete updatedAnswer.photo;
      return { ...prev, [qIndex]: updatedAnswer };
    });
  };

  const isResetEnabled = useMemo(() => {
    if (areas.length === 0 || allKits.length === 0) return false;
    const registeredAreaIds = new Set(allKits.map(kit => kit.area_id));
    return areas.every(area => registeredAreaIds.has(area.id));
  }, [areas, allKits]);


  const renderAreaList = () => {
    if (areas.length === 0 && !error) return <div className="flex items-center justify-center h-full text-center text-slate-500"><p>No hay áreas. Usa el formulario de abajo para empezar.</p></div>;
    return (
      <ul className="space-y-2">
        {areas.map(area => (
          <li key={area.id} className="group flex items-center gap-2">
             <button
              onClick={() => handleAreaSelect(area.id)}
              className={`flex-grow text-left p-3 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${selectedAreaId === area.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
              {area.name}
            </button>
            <button
              onClick={(e) => handleInitiateAreaDelete(area, e)}
              className="p-2 text-slate-500 rounded-full hover:bg-red-900/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title={`Eliminar área ${area.name}`}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const selectedArea = useMemo(() => areas.find(a => a.id === selectedAreaId), [areas, selectedAreaId]);
  const currentKits = useMemo(() => selectedAreaId ? allKits.filter(k => k.area_id === selectedAreaId) : [], [selectedAreaId, allKits]);

  const renderRegistrationForm = () => (
    <div className="w-full space-y-4 animate-fade-in">
        <div>
            <label htmlFor="location" className="block text-sm font-medium leading-6 text-slate-300">Ubicación del Botiquín</label>
            <input type="text" name="location" id="location" value={kitLocation} onChange={(e) => setKitLocation(e.target.value)} className="mt-1 block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm" placeholder="Ej. Pared junto a recepción"/>
        </div>
        
        {uploadError && <div className="text-center text-red-400 bg-red-900/20 p-2 rounded-md text-sm">{uploadError}</div>}

        <div className="space-y-4 pt-4 border-t border-slate-700">
          {inspectionQuestions.map((q, index) => (
             <div key={index} className="bg-slate-800/50 p-3 rounded-lg">
                <p className="font-medium text-slate-300 mb-3">{`${index + 1}. ${q}`}</p>
                 <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex gap-2 flex-shrink-0">
                        {(['Sí', 'No', 'N/A'] as FirstAidKitAnswer[]).map(option => (
                            <button
                            key={option}
                            onClick={() => handleAnswerChange(index, option)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 w-[60px] ${kitAnswers[index]?.answer === option ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >{option}</button>
                        ))}
                    </div>
                    <textarea value={kitAnswers[index]?.observation || ''} onChange={(e) => handleObservationChange(index, e.target.value)} placeholder="Observación..." className="block w-full rounded-md border-0 py-1.5 px-2 bg-slate-700 text-white shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-sm" rows={1}></textarea>
                    <label className="relative flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-500 cursor-pointer">
                        {isUploadingPhoto === index ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : <CameraIcon className="h-4 w-4" />}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoChange(index, e)} disabled={isUploadingPhoto !== null} />
                    </label>
                </div>
                 {kitAnswers[index]?.photo && (
                  <div className="mt-3 relative w-24 h-24">
                      <img src={kitAnswers[index]?.photo as string} alt="Evidencia" className="rounded-md object-cover w-full h-full" />
                      <button onClick={() => handleRemovePhoto(index)} className="absolute -top-2 -right-2 bg-slate-800 rounded-full text-red-500 hover:text-red-400" title="Eliminar foto">
                          <XCircleIcon className="h-6 w-6" />
                      </button>
                  </div>
                )}
            </div>
          ))}
        </div>
        <div className="flex gap-4 pt-4 border-t border-slate-700">
            <button onClick={() => { setIsRegistering(false); resetForm(); }} className="flex-1 rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 transition-colors">Cancelar</button>
            <button onClick={handleSaveKit} disabled={isSavingKit} className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:bg-indigo-400">
              {isSavingKit ? <SpinnerIcon className="h-5 w-5 animate-spin mx-auto"/> : 'Guardar Botiquín'}
            </button>
        </div>
    </div>
  );

  const renderKitDetails = () => {
    if (!viewingKit) return null;
    return (
        <div className="w-full space-y-4 animate-fade-in">
            <div className="relative text-center">
                <button onClick={() => setViewingKit(null)} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver a la lista
                </button>
                <h4 className="text-lg font-semibold text-white">Detalles del Botiquín</h4>
            </div>
            <p className="text-center text-slate-300">Ubicación: <span className="font-bold text-white">{viewingKit.location}</span></p>

            <div className="space-y-4 pt-4 border-t border-slate-700">
                <h5 className="font-semibold text-slate-200">Resultados de la Inspección de Registro</h5>
                {inspectionQuestions.map((q, index) => {
                    const answerData = viewingKit.inspection_data[index];
                    return (
                        <div key={index} className="bg-slate-800/50 p-3 rounded-lg text-sm">
                            <p className="font-medium text-slate-300 mb-2">{`${index + 1}. ${q}`}</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <p className="text-slate-400">Respuesta:</p>
                                    <p className="font-bold text-white">{answerData?.answer || 'Sin respuesta'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-slate-400">Observación:</p>
                                    <p className="text-white italic">{answerData?.observation || 'Ninguna'}</p>
                                </div>
                            </div>
                            {answerData?.photo && (
                                <div className="mt-3">
                                    <p className="text-slate-400 mb-1">Evidencia:</p>
                                    <img 
                                        src={answerData.photo} 
                                        alt="Evidencia" 
                                        className="rounded-md object-cover w-32 h-32 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setViewingImage(answerData.photo as string)}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };


  return (
    <>
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Gestión de Botiquines</h2>
          <p className="mt-2 text-lg leading-8 text-slate-400">Administra las áreas y el contenido de los botiquines.</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <button
                onClick={handleInitiateReset}
                disabled={!isResetEnabled || isResetting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                title={!isResetEnabled ? 'Se debe registrar al menos un botiquín en cada área para poder reiniciar.' : 'Reiniciar todas las inspecciones'}
            >
                {isResetting ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Reiniciar Inspecciones'}
            </button>
            <Dropdown
                trigger={<button disabled={areas.length === 0 || isGeneratingReport} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors disabled:bg-slate-800 disabled:cursor-not-allowed"> {isGeneratingReport ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Exportar'} {!isGeneratingReport && <ChevronDownIcon className="h-5 w-5"/>} </button>}
                items={[{ label: 'Exportar PDF', onClick: () => handleRequestReport('pdf') }, { label: 'Exportar Excel (.xlsx)', onClick: () => handleRequestReport('xlsx') }]}
            />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-white">AREAS DE BOTIQUINES</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 min-h-[350px]">{renderAreaList()}</div>
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 min-h-[350px] flex flex-col">
            {!selectedArea ? <div className="flex-1 flex items-center justify-center"><p className="text-slate-500 text-center px-4">Selecciona un área para ver sus botiquines.</p></div> : 
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-slate-300">Botiquines en: <span className="text-white">{selectedArea.name}</span></h4>
                  {!isRegistering && !viewingKit && <button onClick={() => setIsRegistering(true)} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500">Registrar botiquín</button>}
                </div>
                {isRegistering ? renderRegistrationForm() : 
                 viewingKit ? renderKitDetails() : (
                  <div className="space-y-3 mt-4">
                    {currentKits.length === 0 ? <p className="text-slate-500 text-center py-8">No hay botiquines registrados.</p> :
                      (currentKits.map(kit => (
                        <div key={kit.id} className="bg-slate-800/50 p-3 rounded-md text-sm flex justify-between items-center">
                            <div>
                                <p className="font-bold text-white">{kit.location}</p>
                                <span className="text-xs text-slate-400">Registrado: {new Date(kit.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setViewingKit(kit)} className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors">
                                    Ver Detalles
                                </button>
                                <button 
                                  onClick={() => handleInitiateDelete(kit)} 
                                  className="p-1.5 text-red-500 hover:text-red-400 rounded-full hover:bg-slate-700 transition-colors" 
                                  title="Eliminar botiquín"
                                  disabled={isDeleting}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                      )))
                    }
                  </div>
                )}
              </div>
            }
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-center text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p>}
        <div className="mt-8 pt-6 border-t border-slate-800">
           <h4 className="text-lg font-semibold text-slate-300 mb-3">Añadir Nueva Área para Botiquín</h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="text" value={newArea} onChange={(e) => setNewArea(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddArea()} placeholder="Nombre de la nueva área" className="block w-full rounded-md border-0 py-2.5 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors duration-200 px-3 flex-grow" disabled={isAddingArea} />
            <button onClick={handleAddArea} className="w-full sm:w-36 flex justify-center items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={isAddingArea || !newArea.trim()}>
              {isAddingArea ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Añadir Área'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {kitToDelete && !deleteError && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
              </div>
              <div className="mt-0 text-left">
                <h3 className="text-lg font-semibold leading-6 text-white">Confirmar Eliminación</h3>
                <div className="mt-2">
                  <p className="text-sm text-slate-400">
                    ¿Estás seguro de que quieres eliminar el botiquín ubicado en <strong className="text-white">{kitToDelete.location}</strong>? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-xl">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:bg-red-800 disabled:cursor-not-allowed"
            >
              {isDeleting ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Eliminar'}
            </button>
            <button
              type="button"
              onClick={() => setKitToDelete(null)}
              disabled={isDeleting}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 sm:mt-0 sm:w-auto disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    
    {areaToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <div className="mt-0 text-left">
                  <h3 className="text-lg font-semibold leading-6 text-white">Eliminar Área</h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-400">
                      ¿Estás seguro de que quieres eliminar el área <strong className="text-white">{areaToDelete.name}</strong>?
                    </p>
                     <p className="mt-2 text-sm text-yellow-400">
                      Atención: Se eliminarán permanentemente todos los botiquines registrados en esta área.
                    </p>
                    {deleteAreaError && (
                      <pre className="mt-2 text-xs text-red-300 bg-slate-800 p-2 rounded-md whitespace-pre-wrap">{deleteAreaError}</pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-xl">
              <button
                type="button"
                onClick={handleConfirmAreaDelete}
                disabled={isDeletingArea}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:bg-red-800"
              >
                {isDeletingArea ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Confirmar Eliminación'}
              </button>
              <button
                type="button"
                onClick={() => setAreaToDelete(null)}
                disabled={isDeletingArea}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 sm:mt-0 sm:w-auto disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}


    {deleteError && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-4">
               <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                  <XCircleIcon className="h-7 w-7 text-red-400"/>
              </div>
              <div className="mt-0 text-left">
                <h3 className="text-lg font-semibold leading-6 text-red-300">Error al Eliminar</h3>
                <div className="mt-2">
                  <p className="text-sm text-slate-400">
                    No se pudo completar la eliminación. Este es el error específico:
                  </p>
                  <pre className="mt-2 text-xs text-red-300 bg-slate-800 p-2 rounded-md whitespace-pre-wrap">{deleteError}</pre>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 px-4 py-3 text-right sm:px-6 rounded-b-xl">
            <button
              type="button"
              onClick={() => { setDeleteError(null); setKitToDelete(null); }}
              className="inline-flex justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}

    {isResetConfirming && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-900/50 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
              </div>
              <div className="mt-0 text-left">
                <h3 className="text-lg font-semibold leading-6 text-white">Confirmar Reinicio</h3>
                <div className="mt-2">
                  <p className="text-sm text-slate-400">
                    ¿Estás seguro de que quieres reiniciar las inspecciones? Se eliminarán todos los registros de botiquines y deberás volver a registrarlos. Esta acción no se puede deshacer.
                  </p>
                  {resetError && (
                    <div className="mt-3 text-xs text-red-300 bg-slate-800 p-2 rounded-md whitespace-pre-wrap">
                      <strong>Error:</strong> {resetError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-xl">
            <button
              type="button"
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto disabled:bg-green-800 disabled:cursor-not-allowed"
            >
              {isResetting ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Confirmar Reinicio'}
            </button>
            <button
              type="button"
              onClick={() => setIsResetConfirming(false)}
              disabled={isResetting}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 sm:mt-0 sm:w-auto disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}


    {viewingImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh]">
                <img src={viewingImage} alt="Evidencia en tamaño completo" className="rounded-lg object-contain max-h-[90vh]" />
                <button onClick={() => setViewingImage(null)} className="absolute -top-3 -right-3 bg-slate-700 rounded-full text-white text-2xl h-8 w-8 flex items-center justify-center leading-none hover:bg-slate-600 transition-colors">&times;</button>
            </div>
        </div>
      )}
    </>
  );
};

export default FirstAidKitsScreen;