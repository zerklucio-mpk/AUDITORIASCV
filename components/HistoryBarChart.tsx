import React from 'react';

interface HistoryBarChartProps {
  data: { name: string; value: number }[]; // name is date, value is compliance %
  title?: string;
  forExport?: boolean;
}

const HistoryBarChart: React.FC<HistoryBarChartProps> = ({ data, title, forExport = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col">
        {title && <h3 className="text-xl font-semibold mb-4 text-white text-center">{title}</h3>}
        <p className="text-slate-400 text-center py-10">No hay datos para mostrar.</p>
      </div>
    );
  }

  const chartData = data.slice(-30); // Show up to last 30 entries for better visibility
  const yAxisLabels = ['100%', '75%', '50%', '25%', '0%'];

  const labelClasses = forExport 
    ? "text-xs text-slate-400 text-center whitespace-nowrap"
    : "text-xs text-slate-400 text-center transform -rotate-45 whitespace-nowrap";

  return (
    <div className="flex flex-col">
      {title && <h3 className="text-xl font-semibold mb-4 text-white text-center">{title}</h3>}
      <div className="flex w-full">
        {/* Y-Axis Labels */}
        <div className="flex flex-col justify-between text-xs text-slate-400 pr-2 py-1 text-right" style={{ height: '300px' }}>
          {yAxisLabels.map(label => <span key={label}>{label}</span>)}
        </div>
        {/* Chart + X-Axis Labels wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chart Area */}
          <div className="flex-1 border-l border-b border-slate-700 relative" style={{ height: '300px' }}>
            {/* Grid Lines */}
            <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between">
              {yAxisLabels.map((label, index) => (
                <div key={label} className={index !== yAxisLabels.length - 1 ? "border-t border-slate-700/60" : ""}></div>
              ))}
            </div>
            {/* Bars */}
            <div className="flex items-end h-full px-2 gap-2 overflow-x-auto relative">
              {chartData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full" style={{ minWidth: '40px' }}>
                  <div className="text-xs font-semibold text-white mb-1">{item.value.toFixed(0)}%</div>
                  <div
                    className={`w-full rounded-sm bg-indigo-500 ${forExport ? '' : 'hover:bg-indigo-400 transition-all duration-300'}`}
                    style={{ height: `${item.value}%` }}
                    title={`${item.name}: ${item.value.toFixed(1)}%`}
                  ></div>
                </div>
              ))}
            </div>
          </div>
          {/* X-Axis Labels Container */}
          <div className="flex h-12 px-2 gap-2 overflow-x-auto relative border-l border-transparent">
            {chartData.map((item, index) => (
              <div key={index} className="flex-1 flex justify-center pt-1" style={{ minWidth: '40px' }}>
                <div className={labelClasses}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryBarChart;