import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-900/30 border-blue-500/30',
  green: 'bg-green-900/30 border-green-500/30',
  yellow: 'bg-yellow-900/30 border-yellow-500/30',
  red: 'bg-red-900/30 border-red-500/30',
};

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color }) => {
  const classes = colorClasses[color];

  return (
    <div className={`rounded-lg ${classes} p-5 shadow-lg border`}>
      <dl>
        <dt className="truncate text-sm font-medium text-slate-400">{title}</dt>
        <dd className="mt-1 text-2xl font-bold tracking-tight text-slate-100">{value}</dd>
      </dl>
    </div>
  );
};

export default SummaryCard;