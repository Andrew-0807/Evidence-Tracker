import React from 'react';

const DailySalesChart = ({ dailyData, selectedMonth }) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">No daily data</h3>
          <p className="mt-1 text-sm text-slate-500">No sales data available for this month.</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...dailyData.map(d => d.value));
  const minValue = Math.min(...dailyData.map(d => d.value));
  const avgValue = dailyData.reduce((sum, d) => sum + d.value, 0) / dailyData.length;

  // Chart dimensions
  const width = 600;
  const height = 300;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Calculate positions
  const xScale = chartWidth / (dailyData.length - 1 || 1);
  const yScale = chartHeight / (maxValue - minValue || 1);

  // Generate SVG path for line chart
  const generatePath = () => {
    if (dailyData.length === 0) return '';
    
    return dailyData.map((point, index) => {
      const x = padding + (index * xScale);
      const y = padding + chartHeight - ((point.value - minValue) * yScale);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Generate X-axis labels
  const generateXLabels = () => {
    return dailyData.map((point, index) => {
      const x = padding + (index * xScale);
      const date = new Date(point.date);
      const day = date.getDate();
      return (
        <text
          key={index}
          x={x}
          y={height - padding + 20}
          textAnchor="middle"
          className="text-xs fill-slate-600"
        >
          {day}
        </text>
      );
    });
  };

  // Generate Y-axis labels
  const generateYLabels = () => {
    const steps = 5;
    const labels = [];
    
    for (let i = 0; i <= steps; i++) {
      const value = minValue + (maxValue - minValue) * (i / steps);
      const y = padding + chartHeight - (i * chartHeight / steps);
      labels.push(
        <text
          key={i}
          x={padding - 10}
          y={y + 4}
          textAnchor="end"
          className="text-xs fill-slate-600"
        >
          {value.toFixed(0)}
        </text>
      );
    }
    return labels;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Daily Sales Trend - {selectedMonth}
              </h3>
              <p className="text-sm text-slate-600">
                {dailyData.length} days • Avg: {avgValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* X-axis */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* Chart line */}
          <path
            d={generatePath()}
            stroke="#6366f1"
            strokeWidth="2"
            fill="none"
            className="transition-all duration-300"
          />

          {/* Data points */}
          {dailyData.map((point, index) => {
            const x = padding + (index * xScale);
            const y = padding + chartHeight - ((point.value - minValue) * yScale);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#6366f1"
                className="hover:r-5 transition-all duration-200 cursor-pointer"
              >
                <title>{`${point.date}: ${point.value.toFixed(2)}`}</title>
              </circle>
            );
          })}

          {/* Axis labels */}
          {generateXLabels()}
          {generateYLabels()}

          {/* Axis titles */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-sm font-medium fill-slate-700"
          >
            Day of Month
          </text>
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-sm font-medium fill-slate-700"
          >
            Daily Sales
          </text>
        </svg>

        {/* Statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {Math.max(...dailyData.map(d => d.value)).toFixed(2)}
            </div>
            <div className="text-sm text-slate-600">Highest</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.min(...dailyData.map(d => d.value)).toFixed(2)}
            </div>
            <div className="text-sm text-slate-600">Lowest</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {avgValue.toFixed(2)}
            </div>
            <div className="text-sm text-slate-600">Average</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {dailyData.length}
            </div>
            <div className="text-sm text-slate-600">Days</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySalesChart;