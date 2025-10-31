import React from 'react';
import { StatsByArea } from '../types';

interface AreaBarChartProps {
  data: StatsByArea[];
  title: string;
  forExport?: boolean;
}

// Paleta de colores para las barras
const barColors = [
  '#4f46e5', // indigo-600
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#0ea5e9', // sky-500
];

const AreaBarChart: React.FC<AreaBarChartProps> = ({ data, title, forExport = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col ${forExport ? 'p-6 bg-slate-900' : ''}`}>
        <h3 className="text-xl font-semibold mb-4 text-white text-center">{title}</h3>
        <p className="text-slate-400 text-center py-10">No hay datos para mostrar.</p>
      </div>
    );
  }

  const chartData = data.map(item => {
    const total = item['Sí'] + item['No'];
    const compliance = total > 0 ? (item['Sí'] / total) * 100 : 0;
    return { name: item.name, value: compliance };
  });

  const yAxisLabels = ['100%', '75%', '50%', '25%', '0%'];

  return (
    <div className={`flex flex-col ${forExport ? 'p-6 bg-slate-900' : ''}`}>
      <h3 className="text-xl font-semibold mb-4 text-white text-center">{title}</h3>
      <div className="flex w-full">
        {/* Y-Axis Labels */}
        <div className="flex flex-col justify-between text-xs text-slate-400 pr-2 pb-12 text-right" style={{ height: '300px' }}>
            {yAxisLabels.map(label => <span key={label}>{label}</span>)}
        </div>
        {/* Chart + X-Axis Labels wrapper */}
        <div className="flex-1 flex flex-col">
            <div className="flex-1 border-l border-b border-slate-700 relative" style={{ height: '300px' }}>
              {/* Grid Lines */}
              <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between">
                  {yAxisLabels.map((label, index) => (
                      <div key={label} className={index !== yAxisLabels.length - 1 ? "border-t border-slate-700/60" : ""}></div>
                  ))}
              </div>
              {/* Bars */}
              <div className="flex justify-around items-end h-full px-4 gap-4 relative">
                {chartData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="text-xs font-semibold text-white mb-1">{item.value.toFixed(1)}%</div>
                    <div
                      className={`w-full rounded-sm ${forExport ? '' : 'transition-all duration-500'}`}
                      style={{
                        height: `${item.value}%`,
                        backgroundColor: barColors[index % barColors.length],
                      }}
                      title={`${item.name}: ${item.value.toFixed(1)}%`}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
            {/* X-Axis Labels */}
            <div className="flex justify-around items-start h-12 px-4 gap-4 border-l border-transparent pt-1">
                {chartData.map((item, index) => (
                    <div key={index} className="flex-1">
                        <div className="text-xs text-slate-400 text-center break-words w-full">{item.name}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AreaBarChart;