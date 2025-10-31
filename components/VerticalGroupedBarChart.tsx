import React from 'react';

interface ChartData {
  name: string; // Area name
  'Sí': number;
  'No': number;
  'N/A': number;
}

interface VerticalGroupedBarChartProps {
  data: ChartData[];
  title: string;
}

const colors = {
  'Sí': '#22c55e', // green-500
  'No': '#ef4444', // red-500
  'N/A': '#eab308', // yellow-500
};

const VerticalGroupedBarChart: React.FC<VerticalGroupedBarChartProps> = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col">
        <h4 className="font-semibold text-slate-200 mb-4 text-center">{title}</h4>
        <p className="text-slate-400 text-sm text-center py-4">No hay datos de auditoría para esta pregunta.</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap(d => [d['Sí'], d['No'], d['N/A']]), 1);
  const yAxisLabelsCount = 5;
  const yAxisLabels = Array.from({ length: yAxisLabelsCount }, (_, i) => {
    const value = (maxValue / (yAxisLabelsCount - 1)) * i;
    return Math.ceil(value);
  }).reverse();

  return (
    <div className="flex flex-col">
      <h4 className="font-semibold text-slate-200 mb-4 text-center">{title}</h4>
      <div className="flex justify-center gap-4 mb-4">
        {Object.entries(colors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
            <span className="text-xs text-slate-300">{key}</span>
          </div>
        ))}
      </div>
      <div className="flex w-full">
        {/* Y-Axis Labels */}
        <div className="flex flex-col justify-between text-xs text-slate-400 pr-2 py-1 text-right" style={{ height: '250px' }}>
          {yAxisLabels.map(label => <span key={label}>{label}</span>)}
        </div>
        {/* Chart + X-Axis Labels Wrapper */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 border-l border-b border-slate-700 relative" style={{ height: '250px' }}>
            {/* Grid Lines */}
            <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between">
              {yAxisLabels.map((label, index) => (
                <div key={label} className={index !== yAxisLabels.length - 1 ? "border-t border-slate-700/60" : ""}></div>
              ))}
            </div>
            {/* Bars */}
            <div className="flex justify-around items-end h-full px-2 gap-2 relative">
              {data.map((item, index) => (
                <div key={index} className="flex-1 flex justify-center items-end h-full w-full gap-1">
                  {(['Sí', 'No', 'N/A'] as const).map(key => (
                    <div
                      key={key}
                      className="w-1/3 rounded-sm transition-all duration-500"
                      style={{
                        height: `${(item[key] / maxValue) * 100}%`,
                        backgroundColor: colors[key],
                      }}
                      title={`${item.name} - ${key}: ${item[key]}`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* X-Axis Labels */}
          <div className="flex justify-around items-start h-auto px-2 gap-2 border-l border-transparent">
            {data.map((item, index) => (
              <div key={index} className="flex-1">
                <div className="text-xs text-slate-400 mt-2 text-center break-words w-full">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerticalGroupedBarChart;