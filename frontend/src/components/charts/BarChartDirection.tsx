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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '0.85rem' }}>No se encontraron datos para las direcciones evaluadas.</span>
      </div>
    );
  }

  const maxRate = Math.max(100, ...data.map((d) => d.participation_rate));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Dirección / Dependencia</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>Participación</span>
          <span>Tasa %</span>
        </div>
      </div>

      {/* Lista de barras */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
        {data.map((item, index) => {
          const isSelected = selectedDirection === item.direction;
          const isHovered = hoveredIndex === index;
          const widthPct = Math.min(100, Math.max(4, (item.participation_rate / maxRate) * 100));

          // Colores temáticos institucionales
          let barGradient = 'linear-gradient(90deg, #0284c7 0%, #06b6d4 100%)';
          let badgeBg = 'rgba(6, 182, 212, 0.15)';
          let badgeColor = '#22d3ee';
          let badgeBorder = 'rgba(6, 182, 212, 0.35)';

          if (item.participation_rate >= 70) {
            barGradient = 'linear-gradient(90deg, #059669 0%, #10b981 100%)';
            badgeBg = 'rgba(16, 185, 129, 0.15)';
            badgeColor = '#34d399';
            badgeBorder = 'rgba(16, 185, 129, 0.35)';
          } else if (item.participation_rate >= 40) {
            barGradient = 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)';
            badgeBg = 'rgba(59, 130, 246, 0.15)';
            badgeColor = '#60a5fa';
            badgeBorder = 'rgba(59, 130, 246, 0.35)';
          } else if (item.participation_rate > 0) {
            barGradient = 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)';
            badgeBg = 'rgba(245, 158, 11, 0.15)';
            badgeColor = '#fbbf24';
            badgeBorder = 'rgba(245, 158, 11, 0.35)';
          } else {
            barGradient = 'linear-gradient(90deg, #475569 0%, #64748b 100%)';
            badgeBg = 'rgba(100, 116, 139, 0.15)';
            badgeColor = '#94a3b8';
            badgeBorder = 'rgba(100, 116, 139, 0.35)';
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
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? '1px solid rgba(6, 182, 212, 0.7)'
                  : isHovered
                  ? '1px solid rgba(255, 255, 255, 0.18)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                background: isSelected
                  ? 'rgba(6, 182, 212, 0.12)'
                  : isHovered
                  ? 'rgba(31, 41, 55, 0.7)'
                  : 'rgba(17, 24, 39, 0.5)',
                boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span
                  style={{
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? 'var(--primary-500)' : '#f1f5f9',
                    maxWidth: '260px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.direction}
                >
                  {item.direction}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <strong style={{ color: '#fff' }}>{item.participating_employees}</strong> / {item.total_employees} func.
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeBorder}`,
                      minWidth: '52px',
                      justifyContent: 'center',
                    }}
                  >
                    {item.participation_rate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(11, 15, 25, 0.8)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '1px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPct}%`,
                    background: barGradient,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Tooltip en hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-36px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    background: '#090d16',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#fff',
                    fontSize: '0.75rem',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.8)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: 'var(--primary-500)', fontWeight: 600 }}>
                    {item.total_reactions} reacciones acumuladas
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
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
