import React, { useMemo, useState } from 'react';
import { TimelinePoint } from '../../api/analytics';
import { BarChart3, Calendar, LineChart, MessageSquare, ThumbsUp } from 'lucide-react';

interface TimelineChartProps {
  data: TimelinePoint[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'line' | 'bar'>('line');

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '44px 20px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
        }}
      >
        <Calendar size={32} style={{ color: 'var(--primary-500)', opacity: 0.6, marginBottom: '10px' }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
          Sin serie temporal registrada
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
          No se encontraron publicaciones oficiales dentro de la ventana de días seleccionada.
        </span>
      </div>
    );
  }

  const height = 220;
  const paddingX = 40;
  const paddingY = 25;
  const viewBoxWidth = 600;
  const innerWidth = viewBoxWidth - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.reactions, d.comments)));

  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2);
      const yReactions = paddingY + innerHeight - (d.reactions / maxVal) * innerHeight;
      const yComments = paddingY + innerHeight - (d.comments / maxVal) * innerHeight;
      return { ...d, x, yReactions, yComments };
    });
  }, [data, maxVal, innerWidth, innerHeight]);

  // Rutas SVG para Reacciones
  const reactionsLinePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yReactions}` : `${acc} L ${p.x} ${p.yReactions}`),
    ''
  );

  const reactionsAreaPath =
    points.length > 0
      ? `${reactionsLinePath} L ${points[points.length - 1].x} ${paddingY + innerHeight} L ${points[0].x} ${
          paddingY + innerHeight
        } Z`
      : '';

  // Rutas SVG para Comentarios
  const commentsLinePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yComments}` : `${acc} L ${p.x} ${p.yComments}`),
    ''
  );

  const commentsAreaPath =
    points.length > 0
      ? `${commentsLinePath} L ${points[points.length - 1].x} ${paddingY + innerHeight} L ${points[0].x} ${
          paddingY + innerHeight
        } Z`
      : '';

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Controles y Leyenda interactiva */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4', display: 'inline-block', boxShadow: '0 0 8px #06b6d480' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Reacciones</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ec4899', display: 'inline-block', boxShadow: '0 0 8px #ec489980' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Comentarios</span>
          </div>
        </div>

        {/* Toggle de Modo: Línea vs Barras */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setChartMode('line')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              border: 'none',
              background: chartMode === 'line' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              color: chartMode === 'line' ? '#22d3ee' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LineChart size={12} />
            <span>Curva</span>
          </button>
          <button
            onClick={() => setChartMode('bar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              border: 'none',
              background: chartMode === 'bar' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              color: chartMode === 'bar' ? '#22d3ee' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BarChart3 size={12} />
            <span>Barras</span>
          </button>
        </div>
      </div>

      {/* SVG del Gráfico Cronológico */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${height}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible', userSelect: 'none' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Gradiente Reacciones */}
            <linearGradient id="timelineReactionsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradiente Comentarios */}
            <linearGradient id="timelineCommentsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
            </linearGradient>

            <filter id="timelineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Líneas guía horizontales */}
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

          {chartMode === 'line' ? (
            <>
              {/* Áreas rellenas */}
              {reactionsAreaPath && <path d={reactionsAreaPath} fill="url(#timelineReactionsArea)" />}
              {commentsAreaPath && <path d={commentsAreaPath} fill="url(#timelineCommentsArea)" />}

              {/* Línea de Reacciones */}
              {reactionsLinePath && (
                <path
                  d={reactionsLinePath}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#timelineGlow)"
                />
              )}

              {/* Línea de Comentarios */}
              {commentsLinePath && (
                <path
                  d={commentsLinePath}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Puntos de Reacciones */}
              {points.map((pt, idx) => (
                <circle
                  key={`r-dot-${idx}`}
                  cx={pt.x}
                  cy={pt.yReactions}
                  r={hoverIndex === idx ? 5.5 : 3.5}
                  fill={hoverIndex === idx ? '#38bdf8' : '#06b6d4'}
                  stroke="#0b0f19"
                  strokeWidth={2}
                  style={{ transition: 'all 0.15s ease' }}
                />
              ))}

              {/* Puntos de Comentarios */}
              {points.map((pt, idx) => (
                <circle
                  key={`c-dot-${idx}`}
                  cx={pt.x}
                  cy={pt.yComments}
                  r={hoverIndex === idx ? 5 : 3}
                  fill={hoverIndex === idx ? '#f472b6' : '#ec4899'}
                  stroke="#0b0f19"
                  strokeWidth={1.5}
                  style={{ transition: 'all 0.15s ease' }}
                />
              ))}
            </>
          ) : (
            /* Modo Barras Diarias */
            points.map((pt, idx) => {
              const barWidth = Math.max(3, Math.min(14, (innerWidth / points.length) * 0.35));
              const rHeight = ((pt.reactions / maxVal) * innerHeight);
              const cHeight = ((pt.comments / maxVal) * innerHeight);
              return (
                <g key={`bar-group-${idx}`}>
                  {/* Barra Reacciones */}
                  <rect
                    x={pt.x - barWidth - 1}
                    y={paddingY + innerHeight - rHeight}
                    width={barWidth}
                    height={Math.max(2, rHeight)}
                    rx={2}
                    fill="#06b6d4"
                    opacity={hoverIndex === idx ? 1 : 0.8}
                  />
                  {/* Barra Comentarios */}
                  <rect
                    x={pt.x + 1}
                    y={paddingY + innerHeight - cHeight}
                    width={barWidth}
                    height={Math.max(2, cHeight)}
                    rx={2}
                    fill="#ec4899"
                    opacity={hoverIndex === idx ? 1 : 0.8}
                  />
                </g>
              );
            })
          )}

          {/* Áreas de captura de mouse invisibles sobre cada columna */}
          {points.map((pt, idx) => (
            <rect
              key={`hit-${idx}`}
              x={pt.x - 16}
              y={paddingY}
              width={32}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}

          {/* Línea guía vertical en hover */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={paddingY + innerHeight}
              stroke="#38bdf8"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              opacity={0.8}
            />
          )}

          {/* Etiquetas del eje X (Fechas) */}
          {points.map((pt, idx) => {
            if (points.length > 8 && idx % Math.ceil(points.length / 6) !== 0 && idx !== points.length - 1) {
              return null;
            }
            return (
              <text
                key={`label-${idx}`}
                x={pt.x}
                y={paddingY + innerHeight + 16}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="inherit"
              >
                {pt.date ? pt.date.substring(5) : ''}
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
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(11, 15, 25, 0.95)',
              border: '1px solid rgba(6, 182, 212, 0.6)',
              color: '#fff',
              fontSize: '0.75rem',
              boxShadow: '0 12px 25px rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              left: `${(activePoint.x / viewBoxWidth) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: '#cbd5e1',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '4px',
                marginBottom: '6px',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Calendar size={11} color="var(--primary-500)" />
              <span>{activePoint.date}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
                <span style={{ color: '#22d3ee', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ThumbsUp size={11} /> Reacciones:
                </span>
                <span style={{ fontWeight: 800, color: '#fff' }}>{activePoint.reactions}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
                <span style={{ color: '#f472b6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageSquare size={11} /> Comentarios:
                </span>
                <span style={{ fontWeight: 800, color: '#fff' }}>{activePoint.comments}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineChart;
