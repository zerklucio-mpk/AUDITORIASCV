import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ExtinguisherArea, Extinguisher, InspectionAnswers, InspectionRecord } from '../types';
import { 
  getExtinguisherAreas, 
  addExtinguisherArea, 
  getAllExtinguishers, 
  addExtinguisher, 
  deleteExtinguisher, 
  updateExtinguisher,
  addInspection,
  getExtinguisherInspections,
  deleteAllInspections
} from '../services/supabaseClient';
import { generateExtinguisherReportPdf, generateExtinguisherReportXlsx } from '../services/reportService';
import SpinnerIcon from './icons/SpinnerIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import TrashIcon from './icons/TrashIcon';
import InspectionScreen from './InspectionScreen';
// FIX: Import XCircleIcon to be used in the error modal.
import XCircleIcon from './icons/XCircleIcon';
import Dropdown from './Dropdown';

const extinguisherTypes = ['PQS', 'AGUA', 'Co2', 'HFC-236-FA'];
const extinguisherCapacities = ['2kg', '2.5kg', '4.5kg', '6kg', '50kg'];

const ExtinguishersScreen: React.FC = () => {
  const [newArea, setNewArea] = useState('');
  const [areas, setAreas] = useState<ExtinguisherArea[]>([]);
  const [allExtinguishers, setAllExtinguishers] = useState<Extinguisher[]>([]);
  const [allInspections, setAllInspections] = useState<InspectionRecord[]>([]);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSavingExtinguisher, setIsSavingExtinguisher] = useState(false);
  
  // States for deletion flow
  const [deletingExtinguisherId, setDeletingExtinguisherId] = useState<string | null>(null);
  const [extinguisherToDelete, setExtinguisherToDelete] = useState<Extinguisher | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // States for reset flow
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [inspectingExtinguisher, setInspectingExtinguisher] = useState<Extinguisher | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [extinguisherForm, setExtinguisherForm] = useState({
    location: '',
    series: '',
    type: extinguisherTypes[0],
    capacity: extinguisherCapacities[0],
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [fetchedAreas, fetchedExtinguishers, fetchedInspections] = await Promise.all([
        getExtinguisherAreas(),
        getAllExtinguishers(),
        getExtinguisherInspections()
      ]);
      setAreas(fetchedAreas);
      setAllExtinguishers(fetchedExtinguishers);
      setAllInspections(fetchedInspections);
    } catch (e: any) {
      setError('No se pudieron cargar los datos. Revisa la consola para más detalles.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddArea = async () => {
    const trimmedArea = newArea.trim();
    if (!trimmedArea) return;

    if (areas.some(a => a.name.toLowerCase() === trimmedArea.toLowerCase())) {
      alert('Esa área ya existe. Por favor, introduce un nombre diferente.');
      return;
    }

    try {
      setIsAddingArea(true);
      setError(null);
      await addExtinguisherArea(trimmedArea);
      setNewArea('');
      await fetchData(); // Refresh all data
    } catch (e: any) {
      setError('No se pudo añadir el área. Revisa la consola para más detalles.');
      console.error(e);
    } finally {
      setIsAddingArea(false);
    }
  };

  const handleAreaSelect = (areaId: string) => {
    if (selectedAreaId !== areaId) {
        setIsRegistering(false);
    }
    setSelectedAreaId(prevId => (prevId === areaId ? null : areaId));
  };
  
  const handleExtinguisherFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setExtinguisherForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveExtinguisher = async () => {
    if (!selectedAreaId || !extinguisherForm.location) {
        alert("La ubicación es un campo requerido.");
        return;
    }

    setIsSavingExtinguisher(true);
    setError(null);
    try {
        await addExtinguisher({ ...extinguisherForm, area_id: selectedAreaId });
        await fetchData(); // Refresh all data
        setIsRegistering(false);
        setExtinguisherForm({
            location: '',
            series: '',
            type: extinguisherTypes[0],
            capacity: extinguisherCapacities[0],
        });
    } catch (e) {
        setError("Error al guardar el extintor.");
        console.error(e);
    } finally {
        setIsSavingExtinguisher(false);
    }
  };
  
  const handleInitiateDelete = (extinguisher: Extinguisher) => {
    setDeleteError(null);
    setExtinguisherToDelete(extinguisher);
  };

  const handleConfirmDelete = async () => {
    if (!extinguisherToDelete) return;

    setDeletingExtinguisherId(extinguisherToDelete.id);
    setDeleteError(null);
    try {
        await deleteExtinguisher(extinguisherToDelete.id);
        await fetchData(); // Refresh all data
        setExtinguisherToDelete(null); // Close modal on success
    } catch (e: any) {
        setDeleteError(e.message || "Ocurrió un error inesperado durante la eliminación.");
        console.error(e);
    } finally {
        setDeletingExtinguisherId(null);
    }
  };
  
  const handleInspectExtinguisher = (extinguisher: Extinguisher) => {
    setInspectingExtinguisher(extinguisher);
  };

  const handleSaveInspection = async (updatedExtinguisher: Extinguisher, answers: InspectionAnswers) => {
    try {
      setError(null);
      
      const { id, created_at, area_id, ...detailsToUpdate } = updatedExtinguisher;
      await updateExtinguisher(id, detailsToUpdate);
      await addInspection(id, answers);
      
      await fetchData(); // Refresh all data
      setInspectingExtinguisher(null);

    } catch (e) {
      console.error("Error al guardar la inspección y los detalles:", e);
      throw e; 
    }
  };
  
  const handleRequestReport = async (type: 'pdf' | 'xlsx') => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      if (type === 'pdf') {
        await generateExtinguisherReportPdf(areas, allExtinguishers, allInspections);
      } else {
        await generateExtinguisherReportXlsx(areas, allExtinguishers, allInspections);
      }
    } catch (error) {
      console.error(`Error al generar el reporte ${type}:`, error);
      alert(`No se pudo generar el reporte. Por favor, revisa la consola para más detalles.`);
    } finally {
      setIsGeneratingReport(false);
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
      await deleteAllInspections();
      await fetchData();
      setIsResetConfirming(false);
    } catch (e: any) {
      setResetError(e.message || "Ocurrió un error inesperado durante el reinicio.");
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const inspectionStats = useMemo(() => {
    const stats: Record<string, { total: number, inspected: number }> = {};
    const inspectedIds = new Set(allInspections.map(i => i.extinguisher_id));

    for (const area of areas) {
        stats[area.id] = { total: 0, inspected: 0 };
    }

    for (const ext of allExtinguishers) {
        if (stats[ext.area_id]) {
            stats[ext.area_id].total++;
            if (inspectedIds.has(ext.id)) {
                stats[ext.area_id].inspected++;
            }
        }
    }
    return stats;
  }, [areas, allExtinguishers, allInspections]);

  const inspectedExtinguisherIds = useMemo(() => 
    new Set(allInspections.map(i => i.extinguisher_id)), 
    [allInspections]
  );
  
  const renderAreaList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <SpinnerIcon className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      );
    }
    
    if (areas.length === 0 && !error) {
      return (
        <div className="flex items-center justify-center h-full text-center text-slate-500">
          <p>No hay áreas añadidas. Utiliza el formulario de abajo para empezar.</p>
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {areas.map((area) => (
          <li key={area.id}>
             <button
              onClick={() => handleAreaSelect(area.id)}
              className={`w-full text-left p-3 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${
                selectedAreaId === area.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{area.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  selectedAreaId === area.id ? 'bg-indigo-400 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {inspectionStats[area.id]?.inspected || 0} / {inspectionStats[area.id]?.total || 0}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    );
  };
  
  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const currentExtinguishers = useMemo(() => 
    selectedAreaId ? allExtinguishers.filter(e => e.area_id === selectedAreaId) : [],
    [selectedAreaId, allExtinguishers]
  );

  if (inspectingExtinguisher) {
    return <InspectionScreen 
      extinguisher={inspectingExtinguisher} 
      onBack={() => setInspectingExtinguisher(null)} 
      onSave={handleSaveInspection}
    />;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Gestión de Extintores</h2>
              <p className="mt-2 text-lg leading-8 text-slate-400">
                Administra y audita los extintores de cada área.
              </p>
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <button
                  onClick={handleInitiateReset}
                  disabled={isResetting || allInspections.length === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                  {isResetting ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Reiniciar Inspecciones'}
              </button>
              <Dropdown
                trigger={
                  <button
                    disabled={isGeneratingReport || areas.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors disabled:bg-slate-800 disabled:cursor-not-allowed"
                  >
                    {isGeneratingReport ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Exportar Reporte'}
                    {!isGeneratingReport && <ChevronDownIcon className="h-5 w-5"/>}
                  </button>
                }
                items={[
                  { label: 'Exportar PDF', onClick: () => handleRequestReport('pdf') },
                  { label: 'Exportar Excel (.xlsx)', onClick: () => handleRequestReport('xlsx') },
                ]}
              />
            </div>
        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-white">AREAS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Columna Izquierda: Listado de Áreas */}
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 min-h-[350px]">
                {renderAreaList()}
            </div>
            
            {/* Columna Derecha: Extintores y Formulario */}
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 min-h-[350px] flex flex-col">
              {!selectedArea ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-slate-500 text-center px-4">
                      Selecciona un área de la lista para ver sus extintores.
                    </p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-slate-300">
                      Extintores en: <span className="text-white">{selectedArea.name}</span>
                    </h4>
                    {!isRegistering && (
                      <button onClick={() => setIsRegistering(true)} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors">
                        Registrar extintor
                      </button>
                    )}
                  </div>

                  {isRegistering ? (
                    <div className="w-full space-y-4 animate-fade-in">
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium leading-6 text-slate-300">Ubicación</label>
                            <input type="text" name="location" id="location" value={extinguisherForm.location} onChange={handleExtinguisherFormChange} className="mt-1 block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="series" className="block text-sm font-medium leading-6 text-slate-300">Serie</label>
                            <input type="text" name="series" id="series" value={extinguisherForm.series} onChange={handleExtinguisherFormChange} className="mt-1 block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                          <label htmlFor="type" className="block text-sm font-medium leading-6 text-slate-300">Tipo</label>
                          <div className="relative mt-1">
                            <select id="type" name="type" value={extinguisherForm.type} onChange={handleExtinguisherFormChange} className="block w-full appearance-none rounded-md border-0 py-2 pl-3 pr-10 bg-slate-800 text-white ring-1 ring-inset ring-slate-700 focus:ring-indigo-500 focus:ring-2 sm:text-sm">
                              {extinguisherTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><ChevronDownIcon className="h-5 w-5 text-slate-500" /></div>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="capacity" className="block text-sm font-medium leading-6 text-slate-300">Cantidad</label>
                          <div className="relative mt-1">
                            <select id="capacity" name="capacity" value={extinguisherForm.capacity} onChange={handleExtinguisherFormChange} className="block w-full appearance-none rounded-md border-0 py-2 pl-3 pr-10 bg-slate-800 text-white ring-1 ring-inset ring-slate-700 focus:ring-indigo-500 focus:ring-2 sm:text-sm">
                              {extinguisherCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><ChevronDownIcon className="h-5 w-5 text-slate-500" /></div>
                          </div>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={() => setIsRegistering(false)} className="flex-1 rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 transition-colors">Cancelar</button>
                            <button onClick={handleSaveExtinguisher} disabled={isSavingExtinguisher} className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:bg-indigo-400">
                              {isSavingExtinguisher ? <SpinnerIcon className="h-5 w-5 animate-spin mx-auto"/> : 'Guardar'}
                            </button>
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {isLoading ? (
                          <div className="flex items-center justify-center py-8"><SpinnerIcon className="h-8 w-8 animate-spin text-indigo-400" /></div>
                      ) : currentExtinguishers.length === 0 ? (
                          <p className="text-slate-500 text-center py-8">No hay extintores registrados en esta área.</p>
                      ) : (
                          currentExtinguishers.map(ext => (
                              <div key={ext.id} className="bg-slate-800/50 p-3 rounded-md text-sm flex justify-between items-center">
                                  <div>
                                      <p className="font-bold text-white">{ext.location}</p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
                                          <span>Serie: {ext.series || 'N/A'}</span>
                                          <span>{ext.type} - {ext.capacity}</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                      {inspectedExtinguisherIds.has(ext.id) ? (
                                          <button
                                              className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow-sm cursor-not-allowed"
                                              disabled
                                          >
                                              Inspeccionado
                                          </button>
                                      ) : (
                                          <button
                                            onClick={() => handleInspectExtinguisher(ext)}
                                            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
                                            title="Inspeccionar extintor"
                                          >
                                            Inspeccionar
                                          </button>
                                      )}
                                      <button
                                        onClick={() => handleInitiateDelete(ext)}
                                        disabled={deletingExtinguisherId !== null}
                                        className="p-1.5 text-red-500 hover:text-red-400 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50"
                                        title="Eliminar extintor"
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {error && (
              <p className="mt-4 text-sm text-center text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800">
             <h4 className="text-lg font-semibold text-slate-300 mb-3">Añadir Nueva Área</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddArea()}
                placeholder="Nombre de la nueva área"
                className="block w-full rounded-md border-0 py-2.5 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors duration-200 px-3 flex-grow"
                disabled={isAddingArea}
              />
              <button
                onClick={handleAddArea}
                className="w-full sm:w-36 flex justify-center items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                disabled={isAddingArea || !newArea.trim()}
              >
                {isAddingArea ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Añadir Área'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {extinguisherToDelete && !deleteError && (
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
                  <h3 className="text-lg font-semibold leading-6 text-white" id="modal-title">Confirmar Eliminación</h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-400">
                      ¿Estás seguro de que quieres eliminar el extintor ubicado en <strong className="text-white">{extinguisherToDelete.location}</strong>? Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-xl">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingExtinguisherId !== null}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:bg-red-800 disabled:cursor-not-allowed"
              >
                {deletingExtinguisherId === extinguisherToDelete.id ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setExtinguisherToDelete(null)}
                disabled={deletingExtinguisherId !== null}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 sm:mt-0 sm:w-auto disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                 <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircleIcon className="h-7 w-7 text-red-400"/>
                </div>
                <div className="mt-0 text-left">
                  <h3 className="text-lg font-semibold leading-6 text-red-300" id="modal-title">Error al Eliminar</h3>
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
                onClick={() => { setDeleteError(null); setExtinguisherToDelete(null); }}
                className="inline-flex justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
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
                  <h3 className="text-lg font-semibold leading-6 text-white" id="modal-title">Confirmar Reinicio</h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-400">
                      ¿Estás seguro de que quieres reiniciar todas las inspecciones? Se eliminarán todos los registros de inspección y el estado de todos los extintores volverá a "Pendiente". Esta acción no se puede deshacer.
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
    </>
  );
};

export default ExtinguishersScreen;