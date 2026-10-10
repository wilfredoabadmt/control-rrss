import React, { useState } from 'react';
import { TimelinePoint } from '../../api/analytics';

interface TimelineChartProps {
  data: TimelinePoint[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="text-sm">No se registran publicaciones en la serie temporal para el rango actual.</span>
      </div>
    );
  }

  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const viewBoxWidth = 600;
  const innerWidth = viewBoxWidth - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.reactions, d.comments + d.reactions)));

  // Calcular coordenadas para cada punto
  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2);
    const yReactions = paddingY + innerHeight - (d.reactions / maxVal) * innerHeight;
    return { ...d, x, y: yReactions };
  });

  // Generar path SVG para la línea y área de reacciones
  const linePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingY + innerHeight} L ${points[0].x} ${
          paddingY + innerHeight
        } Z`
      : '';

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Reacciones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
            <span className="text-slate-300">Comentarios</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">Evolución Diaria</span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Líneas de guía horizontal */}
          {[0, 0.5, 1].map((pct, idx) => {
            const yLine = paddingY + innerHeight * (1 - pct);
            const valLabel = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={yLine}
                  x2={paddingX + innerWidth}
                  y2={yLine}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth={0.8}
                  opacity={0.5}
                />
                <text
                  x={paddingX - 8}
                  y={yLine + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Área sombreada */}
          {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

          {/* Línea de tendencia */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowLine)"
            />
          )}

          {/* Puntos y zonas de detección de hover */}
          {points.map((p, idx) => (
            <g key={p.date || idx}>
              {/* Círculo visible */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === idx ? 5 : 3.5}
                fill={hoverIndex === idx ? '#38bdf8' : '#06b6d4'}
                stroke="#0f172a"
                strokeWidth={2}
                className="transition-all duration-150"
              />

              {/* Zona sensible transparente */}
              <rect
                x={p.x - 15}
                y={paddingY}
                width={30}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            </g>
          ))}

          {/* Línea vertical guía de hover activo */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={paddingY + innerHeight}
              stroke="#06b6d4"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              opacity={0.8}
            />
          )}

          {/* Fechas en el eje X */}
          {points.map((p, idx) => {
            // Mostrar solo algunas fechas si son muchas
            if (points.length > 8 && idx % Math.ceil(points.length / 6) !== 0 && idx !== points.length - 1) {
              return null;
            }
            return (
              <text
                key={`label-${idx}`}
                x={p.x}
                y={paddingY + innerHeight + 16}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
              >
                {p.date ? p.date.substring(5) : ''}
              </text>
            );
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none px-3 py-2 rounded-lg bg-slate-950/95 border border-cyan-500/40 text-white text-xs shadow-2xl backdrop-blur-md"
            style={{
              left: `${(activePoint.x / viewBoxWidth) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 text-[11px]">
              {activePoint.date}
            </div>
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-cyan-400 font-medium">Reacciones:</span>
                <span className="font-bold text-white">{activePoint.reactions}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-pink-400 font-medium">Comentarios:</span>
                <span className="font-bold text-white">{activePoint.comments}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
