import React, { useState } from 'react';
import { TimelinePoint } from '../../api/analytics';

interface TimelineChartProps {
  data: TimelinePoint[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '0.85rem' }}>No se registran publicaciones en la serie temporal para el rango actual.</span>
      </div>
    );
  }

  const height = 210;
  const paddingX = 40;
  const paddingY = 25;
  const viewBoxWidth = 580;
  const innerWidth = viewBoxWidth - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.reactions, d.comments + d.reactions)));

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2);
    const yReactions = paddingY + innerHeight - (d.reactions / maxVal) * innerHeight;
    return { ...d, x, y: yReactions };
  });

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
    <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Leyenda */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Reacciones</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ec4899', display: 'inline-block' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Comentarios</span>
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evolución Diaria</span>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${height}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible', userSelect: 'none' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="timelineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <filter id="timelineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Líneas guía */}
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
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                  strokeWidth={0.8}
                />
                <text
                  x={paddingX - 8}
                  y={yLine + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="inherit"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Área sombreada */}
          {areaPath && <path d={areaPath} fill="url(#timelineAreaGradient)" />}

          {/* Línea de tendencia */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#timelineGlow)"
            />
          )}

          {/* Puntos y zonas de detección */}
          {points.map((p, idx) => (
            <g key={p.date || idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === idx ? 5 : 3.5}
                fill={hoverIndex === idx ? '#38bdf8' : '#06b6d4'}
                stroke="#0b0f19"
                strokeWidth={2}
                style={{ transition: 'all 0.15s ease' }}
              />
              <rect
                x={p.x - 16}
                y={paddingY}
                width={32}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(idx)}
              />
            </g>
          ))}

          {/* Línea vertical guía en hover */}
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

          {/* Etiquetas fecha en X */}
          {points.map((p, idx) => {
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
                fontFamily="inherit"
              >
                {p.date ? p.date.substring(5) : ''}
              </text>
            );
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {activePoint && (
          <div
            style={{
              position: 'absolute',
              zIndex: 30,
              pointerEvents: 'none',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(11, 15, 25, 0.95)',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              color: '#fff',
              fontSize: '0.75rem',
              boxShadow: '0 12px 25px rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              left: `${(activePoint.x / viewBoxWidth) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '4px', marginBottom: '6px', fontSize: '0.72rem' }}>
              {activePoint.date}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ color: '#22d3ee', fontWeight: 600 }}>Reacciones:</span>
                <span style={{ fontWeight: 700, color: '#fff' }}>{activePoint.reactions}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ color: '#f472b6', fontWeight: 600 }}>Comentarios:</span>
                <span style={{ fontWeight: 700, color: '#fff' }}>{activePoint.comments}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
