import React, { useState } from 'react';
import { ReactionTypeCount } from '../../api/analytics';
import { useAnimatedNumber } from '../../utils/useAnimatedNumber';

interface DonutChartReactionsProps {
  data: ReactionTypeCount[];
  totalCount: number;
  onSelectReactionType?: (type: string | null) => void;
  selectedReactionType?: string | null;
}

export const DonutChartReactions: React.FC<DonutChartReactionsProps> = ({
  data,
  totalCount,
  onSelectReactionType,
  selectedReactionType,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<ReactionTypeCount | null>(null);

  const animatedTotal = useAnimatedNumber(totalCount, 600);
  const activeSegment = hoveredSegment || (selectedReactionType ? data.find((d) => d.type === selectedReactionType) || null : null);
  const animatedActiveCount = useAnimatedNumber(activeSegment ? activeSegment.count : totalCount, 400);
  const displayCount = activeSegment ? animatedActiveCount : animatedTotal;

  const nonZeroData = data.filter((d) => d.count > 0);
  const hasData = totalCount > 0 && nonZeroData.length > 0;
  const items = hasData ? nonZeroData : data;
  const safeTotal = totalCount > 0 ? totalCount : 1;

  const size = 230;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        width: '100%',
      }}
    >
      {/* Visual Donut SVG */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {/* Círculo de fondo tenue */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Arcos interactivos con animación */}
          {hasData ? (
            items.map((item, idx) => {
              const pct = item.count / safeTotal;
              const strokeDasharray = `${pct * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += pct;

              const isHovered = activeSegment?.type === item.type;
              const isSelected = selectedReactionType === item.type;

              return (
                <circle
                  key={item.type || idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color || '#3b82f6'}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    filter: isHovered || isSelected ? `drop-shadow(0 0 12px ${item.color})` : 'none',
                  }}
                  onMouseEnter={() => setHoveredSegment(item)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => {
                    if (onSelectReactionType) {
                      onSelectReactionType(selectedReactionType === item.type ? null : item.type);
                    }
                  }}
                />
              );
            })
          ) : (
            /* Guía vacía elegante cuando no hay datos */
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(6, 182, 212, 0.2)"
              strokeWidth={strokeWidth}
              strokeDasharray="6 6"
              style={{ animation: 'spin 40s linear infinite' }}
            />
          )}
        </svg>

        {/* Centro del Donut */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
            padding: '12px',
          }}
        >
          <span
            style={{
              fontSize: '1.95rem',
              fontWeight: 900,
              color: activeSegment?.color || '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              transition: 'color 0.25s',
            }}
          >
            {displayCount.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: '4px',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activeSegment ? activeSegment.label : 'Reacciones'}
          </span>
          {activeSegment ? (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                marginTop: '4px',
                color: activeSegment.color,
                border: `1px solid ${activeSegment.color}50`,
                background: `${activeSegment.color}20`,
                boxShadow: `0 0 10px ${activeSegment.color}30`,
              }}
            >
              {activeSegment.percentage.toFixed(1)}%
            </span>
          ) : (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: '2px' }}>
              {totalCount > 0 ? 'Total acumulado' : 'Sin actividad'}
            </span>
          )}
        </div>
      </div>

      {/* Lista interactiva de etiquetas / Desglose */}
      <div
        style={{
          flex: 1,
          minWidth: '220px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {data.map((item) => {
          const isHovered = activeSegment?.type === item.type;
          const isSelected = selectedReactionType === item.type;

          return (
            <div
              key={item.type}
              onMouseEnter={() => setHoveredSegment(item)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => {
                if (onSelectReactionType) {
                  onSelectReactionType(isSelected ? null : item.type);
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? `1px solid ${item.color}`
                  : isHovered
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                background: isSelected
                  ? `${item.color}20`
                  : isHovered
                  ? 'rgba(31, 41, 55, 0.8)'
                  : 'rgba(17, 24, 39, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'scale(1.02)' : 'none',
                boxShadow: isSelected ? `0 0 12px ${item.color}30` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor: item.color,
                    boxShadow: `0 0 6px ${item.color}80`,
                  }}
                />
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: isHovered || isSelected ? '#fff' : 'var(--text-main)',
                    fontWeight: isHovered || isSelected ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '6px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                  {item.count.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {item.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutChartReactions;
