import React, { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  name: string;
  icon?: React.ReactNode;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, id, name, icon, error, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium leading-6 text-slate-300">
        {label}
      </label>
      <div className="relative mt-2">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          {...props}
          className={`block w-full rounded-md border-0 py-2.5 bg-slate-800 text-white shadow-sm ring-1 ring-inset ${
            error
              ? 'ring-red-500 text-red-400 placeholder:text-red-500'
              : 'ring-slate-700 placeholder:text-slate-500 focus:ring-indigo-500'
          } focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-colors duration-200 ${
            icon ? 'pl-10' : 'px-3'
          }`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;