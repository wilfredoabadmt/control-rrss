import React, { useState } from 'react';
import { DirectionRankingItem } from '../../api/analytics';

interface BarChartDirectionProps {
  data: DirectionRankingItem[];
  selectedDirection?: string | null;
  onSelectDirection?: (direction: string | null) => void;
}

export const BarChartDirection: React.FC<BarChartDirectionProps> = ({
  data,
  selectedDirection,
  onSelectDirection,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <span className="text-sm">No se encontraron datos para las direcciones evaluadas.</span>
      </div>
    );
  }

  // Máximo porcentaje para escala relativa (mínimo 100 para porcentaje estándar)
  const maxRate = Math.max(100, ...data.map((d) => d.participation_rate));

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
        <span>Dirección / Secretaría</span>
        <div className="flex items-center gap-6">
          <span>Participación</span>
          <span>% Tasa</span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
        {data.map((item, index) => {
          const isSelected = selectedDirection === item.direction;
          const isHovered = hoveredIndex === index;
          const widthPct = Math.min(100, Math.max(4, (item.participation_rate / maxRate) * 100));

          // Color dinámico según desempeño
          let barGradient = 'from-blue-600 to-cyan-400';
          let badgeColor = 'text-cyan-300 bg-cyan-950/40 border-cyan-800/40';
          if (item.participation_rate >= 70) {
            barGradient = 'from-emerald-600 to-teal-400';
            badgeColor = 'text-emerald-300 bg-emerald-950/40 border-emerald-800/40';
          } else if (item.participation_rate >= 40) {
            barGradient = 'from-sky-600 to-blue-400';
            badgeColor = 'text-sky-300 bg-sky-950/40 border-sky-800/40';
          } else if (item.participation_rate > 0) {
            barGradient = 'from-amber-600 to-orange-400';
            badgeColor = 'text-amber-300 bg-amber-950/40 border-amber-800/40';
          } else {
            barGradient = 'from-slate-600 to-slate-500';
            badgeColor = 'text-slate-400 bg-slate-900 border-slate-800';
          }

          return (
            <div
              key={item.direction || index}
              onClick={() => {
                if (onSelectDirection) {
                  onSelectDirection(isSelected ? null : item.direction);
                }
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`group relative p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                  : isHovered
                  ? 'bg-slate-800/60 border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span
                  className={`font-medium truncate max-w-[280px] ${
                    isSelected ? 'text-cyan-300 font-semibold' : 'text-slate-200'
                  }`}
                  title={item.direction}
                >
                  {item.direction}
                </span>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">
                    <strong className="text-slate-200">{item.participating_employees}</strong> /{' '}
                    {item.total_employees} func.
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}
                  >
                    {item.participation_rate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso interactiva */}
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              {/* Tooltip emergente al pasar el mouse */}
              {isHovered && (
                <div className="absolute left-1/2 -top-12 -translate-x-1/2 z-20 px-3 py-1.5 rounded-md bg-slate-950 border border-cyan-500/30 text-white text-[11px] shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-cyan-400 font-medium">
                    {item.total_reactions} reacciones registradas
                  </span>
                  <span className="text-slate-400">
                    • Clic para {isSelected ? 'quitar filtro' : 'filtrar por esta dirección'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
