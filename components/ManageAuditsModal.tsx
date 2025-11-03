import React, { useState, useEffect } from 'react';
import { CompletedAudit } from '../types';
import { useAppContext } from '../context/AppContext';
import SpinnerIcon from './icons/SpinnerIcon';

interface ManageAuditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (ids: string[]) => Promise<void>;
}

const ManageAuditsModal: React.FC<ManageAuditsModalProps> = ({ isOpen, onClose, onDelete }) => {
  const { audits } = useAppContext();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setIsDeleting(false);
      setIsConfirming(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === audits.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(audits.map(a => a.id)));
    }
  };

  const handleInitiateDelete = () => {
    if (selectedIds.size === 0) {
      alert('Por favor, selecciona al menos una auditoría para eliminar.');
      return;
    }
    setError(null);
    setIsConfirming(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(Array.from(selectedIds));
      onClose();
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error inesperado al intentar eliminar.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderContent = () => {
    if (isConfirming) {
      return (
        <div className="p-6 text-center">
          <h4 className="text-lg font-semibold text-white">Confirmar Eliminación</h4>
          <p className="mt-2 text-slate-400">
            ¿Estás seguro de que quieres eliminar permanentemente <strong>{selectedIds.size}</strong> auditoría(s)? Esta acción no se puede deshacer.
          </p>
          {error && <p className="mt-4 text-sm text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p>}
        </div>
      );
    }
    return (
      <div className="p-6 overflow-y-auto">
        {audits.length > 0 ? (
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-300 uppercase bg-slate-800">
              <tr>
                <th scope="col" className="p-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-600 rounded focus:ring-indigo-500"
                    checked={selectedIds.size === audits.length && audits.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-3">Fecha</th>
                <th scope="col" className="px-6 py-3">Área</th>
                <th scope="col" className="px-6 py-3">Auditor</th>
              </tr>
            </thead>
            <tbody>
              {[...audits].reverse().map(audit => (
                <tr key={audit.id} className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="w-4 p-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-600 rounded focus:ring-indigo-500"
                      checked={selectedIds.has(audit.id)}
                      onChange={() => handleSelect(audit.id)}
                    />
                  </td>
                  <td className="px-6 py-4">{audit.auditData.fecha}</td>
                  <td className="px-6 py-4">{audit.auditData.area}</td>
                  <td className="px-6 py-4">{audit.auditData.nombreAuditor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-slate-400 py-8">No hay auditorías para gestionar.</p>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    if (isConfirming) {
      return (
        <div className="p-4 border-t border-slate-800 flex justify-end items-center bg-slate-900/50 rounded-b-xl">
          <button onClick={() => setIsConfirming(false)} disabled={isDeleting} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors mr-2 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="flex items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 transition-colors disabled:bg-red-900 disabled:cursor-not-allowed w-44"
          >
            {isDeleting ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Confirmar Eliminación'}
          </button>
        </div>
      );
    }
    return (
      <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-b-xl">
        <span className="text-sm text-slate-400">{selectedIds.size} seleccionada(s)</span>
        <div>
          <button onClick={onClose} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors mr-2">
            Cerrar
          </button>
          <button
            onClick={handleInitiateDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 transition-colors disabled:bg-slate-800 disabled:cursor-not-allowed w-40"
          >
            Eliminar Seleccionadas
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Gestionar Auditorías del Ciclo</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        {renderContent()}
        {renderFooter()}
      </div>
    </div>
  );
};

export default ManageAuditsModal;
