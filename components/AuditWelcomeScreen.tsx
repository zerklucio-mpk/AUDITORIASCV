import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for types.
import { FormData, FormErrors } from '../types';
import FormField from './FormField';
import CalendarIcon from './icons/CalendarIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface Props {
    onFormSubmit: (data: FormData) => void;
    onBack: () => void;
    initialData?: FormData | null;
    areaOptions: string[];
}

const AuditWelcomeScreen: React.FC<Props> = ({ onFormSubmit, onBack, initialData, areaOptions }) => {
  const [formData, setFormData] = useState<FormData>({
    nombreAuditor: '',
    area: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  
  useEffect(() => {
    if(initialData){
      setFormData(initialData);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.nombreAuditor.trim()) newErrors.nombreAuditor = 'El nombre del auditor es requerido.';
    if (!formData.area) newErrors.area = 'El área a auditar es requerida.';
    if (!formData.fecha) newErrors.fecha = 'La fecha es requerida.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onFormSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 relative">
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors duration-200 z-10">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver
        </button>
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Iniciar Auditoría</h2>
            <p className="mt-2 text-md leading-8 text-slate-400">
                Completa los datos para comenzar.
            </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
                label="Nombre del Auditor"
                id="nombreAuditor"
                name="nombreAuditor"
                type="text"
                value={formData.nombreAuditor}
                onChange={handleChange}
                error={errors.nombreAuditor}
                required
                placeholder="Ej. Juan Pérez"
            />
            <div>
              <label htmlFor="area" className="block text-sm font-medium leading-6 text-slate-300">
                Área a Auditar
              </label>
              <div className="relative mt-2">
                <select
                  id="area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  className={`block w-full appearance-none rounded-md border-0 py-2.5 pl-3 pr-10 bg-slate-800 text-white shadow-sm ring-1 ring-inset ${
                    errors.area ? 'ring-red-500' : 'ring-slate-700 focus:ring-indigo-500'
                  } focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-colors duration-200`}
                >
                  <option value="" disabled>Selecciona un área</option>
                  {areaOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDownIcon className="h-5 w-5 text-slate-500" />
                </div>
              </div>
              {errors.area && <p className="mt-2 text-sm text-red-500">{errors.area}</p>}
            </div>
            <FormField
                label="Fecha de Auditoría"
                id="fecha"
                name="fecha"
                type="date"
                value={formData.fecha}
                onChange={handleChange}
                error={errors.fecha}
                icon={<CalendarIcon className="h-5 w-5 text-slate-500" />}
                required
            />
            <div>
                <button
                    type="submit"
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200"
                >
                    Siguiente
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AuditWelcomeScreen;