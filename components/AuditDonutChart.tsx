// FIX: Implemented the AuditDonutChart component.
import React from 'react';

interface AuditDonutChartProps {
  data: {
    'Sí': number;
    'No': number;
    'N/A': number;
  };
}

const colors = {
  'Sí': '#22c55e', // green-500
  'No': '#ef4444', // red-500
  'N/A': '#eab308', // yellow-500
};

const AuditDonutChart: React.FC<AuditDonutChartProps> = ({ data }) => {
  const total = data['Sí'] + data['No'] + data['N/A'];
  if (total === 0) {
    return <div className="text-center text-slate-400">No hay datos para mostrar.</div>;
  }

  const totalForCompliance = data['Sí'] + data['No'];
  const compliancePercentage = totalForCompliance > 0 ? (data['Sí'] / totalForCompliance) * 100 : 0;

  const percentages = {
    'Sí': (data['Sí'] / total) * 100,
    'No': (data['No'] / total) * 100,
    'N/A': (data['N/A'] / total) * 100,
  };

  const circumference = 2 * Math.PI * 45; // r = 45
  let offset = 0;

  const segments = (['Sí', 'No', 'N/A'] as const).map(key => {
    const strokeDasharray = `${(percentages[key] / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -offset;
    offset += (percentages[key] / 100) * circumference;
    
    return {
      key,
      color: colors[key],
      strokeDasharray,
      strokeDashoffset,
      percentage: percentages[key]
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          {segments.map(segment => (
            <circle
              key={segment.key}
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke={segment.color}
              strokeWidth="10"
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-green-400">{compliancePercentage.toFixed(0)}%</span>
            <span className="text-xs text-slate-400">Cumplimiento</span>
        </div>
      </div>
      <div className="mt-4 flex gap-4">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></span>
            <span className="text-sm text-slate-300">{s.key} ({data[s.key]})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditDonutChart;
