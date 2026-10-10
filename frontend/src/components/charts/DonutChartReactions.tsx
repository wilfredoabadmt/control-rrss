import React, { useState } from 'react';
import { ReactionTypeCount } from '../../api/analytics';

interface DonutChartReactionsProps {
  data: ReactionTypeCount[];
  totalCount: number;
}

export const DonutChartReactions: React.FC<DonutChartReactionsProps> = ({ data, totalCount }) => {
  const [activeSegment, setActiveSegment] = useState<ReactionTypeCount | null>(null);

  // Filtrar tipos con conteo > 0 o mostrar al menos placeholder si está en cero
  const nonZeroData = data.filter((d) => d.count > 0);
  const items = nonZeroData.length > 0 ? nonZeroData : data;
  const safeTotal = totalCount > 0 ? totalCount : 1;

  // Parámetros de geometría del Donut SVG
  const size = 260;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
      {/* Visual Donut SVG */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          {/* Círculo de fondo tenue */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />

          {/* Arcos interactivos */}
          {items.map((item, idx) => {
            const pct = item.count / safeTotal;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += pct;

            const isHovered = activeSegment?.type === item.type;

            return (
              <circle
                key={item.type || idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color || '#3b82f6'}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                style={{
                  filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : 'none',
                }}
                onMouseEnter={() => setActiveSegment(item)}
                onMouseLeave={() => setActiveSegment(null)}
              />
            );
          })}
        </svg>

        {/* Centro del Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
          <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {(activeSegment ? activeSegment.count : totalCount).toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 max-w-[110px] truncate">
            {activeSegment ? activeSegment.label : 'Total Reacciones'}
          </span>
          {activeSegment && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 border"
              style={{
                color: activeSegment.color,
                borderColor: `${activeSegment.color}40`,
                backgroundColor: `${activeSegment.color}15`,
              }}
            >
              {activeSegment.percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Lista interactiva de etiquetas / Desglose */}
      <div className="flex-1 w-full grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
        {data.map((item) => {
          const isHovered = activeSegment?.type === item.type;

          return (
            <div
              key={item.type}
              onMouseEnter={() => setActiveSegment(item)}
              onMouseLeave={() => setActiveSegment(null)}
              className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                isHovered
                  ? 'bg-slate-800 border-slate-600 scale-[1.02]'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-300 truncate font-medium">
                  {item.label}
                </span>
              </div>

              <div className="text-right shrink-0 ml-2">
                <div className="text-xs font-bold text-white">{item.count.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{item.percentage.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
