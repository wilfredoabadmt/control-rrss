import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronRight, Search, Users } from 'lucide-react';
import { DirectionRankingItem } from '../../api/analytics';

interface BarChartDirectionProps {
  data: DirectionRankingItem[];
  selectedDirection?: string | null;
  onSelectDirection?: (direction: string | null) => void;
  rankingDimension?: 'SECRETARIA' | 'DIRECCION' | 'UNIDAD' | 'FUNCIONARIO';
  rankingTitle?: string;
  onSelectUnit?: (unit: string | null) => void;
  onSelectEmployee?: (employeeName: string) => void;
}

type SortField = 'rate' | 'reactions' | 'staff' | 'name';

export const BarChartDirection: React.FC<BarChartDirectionProps> = ({
  data,
  selectedDirection,
  onSelectDirection,
  rankingDimension = 'DIRECCION',
  rankingTitle: _rankingTitle,
  onSelectUnit,
  onSelectEmployee,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('rate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Etiqueta adaptativa según nivel jerárquico
  const dimensionLabel = useMemo(() => {
    switch (rankingDimension) {
      case 'FUNCIONARIO':
        return 'Servidor Público / Cargo';
      case 'UNIDAD':
        return 'Unidad Operativa Dependiente';
      case 'SECRETARIA':
        return 'Secretaría / Despacho Matriz';
      default:
        return 'Dirección / Subalcaldía';
    }
  }, [rankingDimension]);

  // Filtrado y ordenamiento interactivo
  const sortedAndFilteredData = useMemo(() => {
    if (!data) return [];
    let list = [...data];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter((item) => item.direction.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'rate') {
        diff = a.participation_rate - b.participation_rate;
        if (diff === 0) diff = a.total_reactions - b.total_reactions;
      } else if (sortBy === 'reactions') {
        diff = a.total_reactions - b.total_reactions;
        if (diff === 0) diff = a.participation_rate - b.participation_rate;
      } else if (sortBy === 'staff') {
        diff = a.total_employees - b.total_employees;
      } else if (sortBy === 'name') {
        return sortAsc
          ? a.direction.localeCompare(b.direction)
          : b.direction.localeCompare(a.direction);
      }
      return sortAsc ? diff : -diff;
    });

    return list;
  }, [data, searchFilter, sortBy, sortAsc]);

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
        <Users size={32} style={{ color: 'var(--primary-500)', opacity: 0.6, marginBottom: '10px' }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
          Sin registros en el ámbito seleccionado
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
          No se detectaron funcionarios ni dependencias subordinadas bajo los filtros actuales.
        </span>
      </div>
    );
  }

  const maxRate = Math.max(100, ...data.map((d) => d.participation_rate));

  const handleItemClick = (name: string) => {
    if (rankingDimension === 'UNIDAD' && onSelectUnit) {
      onSelectUnit(name);
    } else if (rankingDimension === 'FUNCIONARIO' && onSelectEmployee) {
      onSelectEmployee(name);
    } else if (onSelectDirection) {
      onSelectDirection(selectedDirection === name ? null : name);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Controles de ordenamiento interactivo y búsqueda rápida */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Selector de ordenamiento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpDown size={12} /> Orden:
          </span>
          <button
            onClick={() => {
              if (sortBy === 'rate') setSortAsc(!sortAsc);
              else { setSortBy('rate'); setSortAsc(false); }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: sortBy === 'rate' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid transparent',
              background: sortBy === 'rate' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: sortBy === 'rate' ? '#22d3ee' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            % Tasa {sortBy === 'rate' && (sortAsc ? '↑' : '↓')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'reactions') setSortAsc(!sortAsc);
              else { setSortBy('reactions'); setSortAsc(false); }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: sortBy === 'reactions' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
              background: sortBy === 'reactions' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: sortBy === 'reactions' ? '#60a5fa' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Reacciones {sortBy === 'reactions' && (sortAsc ? '↑' : '↓')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'staff') setSortAsc(!sortAsc);
              else { setSortBy('staff'); setSortAsc(false); }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: sortBy === 'staff' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              background: sortBy === 'staff' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: sortBy === 'staff' ? '#34d399' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Personal {sortBy === 'staff' && (sortAsc ? '↑' : '↓')}
          </button>
        </div>

        {/* Buscador dentro del ranking si hay más de 4 elementos */}
        {data.length > 4 && (
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder={`Filtrar ${dimensionLabel.toLowerCase()}...`}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                padding: '4px 8px 4px 24px',
                fontSize: '0.72rem',
                outline: 'none',
                width: 170,
              }}
            />
          </div>
        )}
      </div>

      {/* Cabecera de la tabla de barras */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          paddingBottom: '6px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          {dimensionLabel} ({sortedAndFilteredData.length})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <span style={{ fontWeight: 600 }}>Participación</span>
          <span style={{ fontWeight: 600 }}>Tasa %</span>
        </div>
      </div>

      {/* Lista de barras animadas */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '360px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        {sortedAndFilteredData.map((item, index) => {
          const isSelected = selectedDirection === item.direction;
          const isHovered = hoveredIndex === index;
          const widthPct = Math.min(100, Math.max(3, (item.participation_rate / maxRate) * 100));

          // Podio (Top 1, 2, 3) con medallas estilizadas
          const rankPos = index + 1;
          let rankBadge = (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '22px',
                height: '20px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              #{rankPos}
            </span>
          );
          if (rankPos === 1) {
            rankBadge = (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '24px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(251, 191, 36, 0.25) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#fbbf24',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)',
                }}
              >
                🥇 1
              </span>
            );
          } else if (rankPos === 2) {
            rankBadge = (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '24px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.25) 0%, rgba(203, 213, 225, 0.25) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.5)',
                  color: '#e2e8f0',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                }}
              >
                🥈 2
              </span>
            );
          } else if (rankPos === 3) {
            rankBadge = (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '24px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(180, 83, 9, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%)',
                  border: '1px solid rgba(180, 83, 9, 0.5)',
                  color: '#f59e0b',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                }}
              >
                🥉 3
              </span>
            );
          }

          // Gradientes de barra según rendimiento
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
            barGradient = 'linear-gradient(90deg, #334155 0%, #475569 100%)';
            badgeBg = 'rgba(71, 85, 105, 0.2)';
            badgeColor = '#94a3b8';
            badgeBorder = 'rgba(71, 85, 105, 0.4)';
          }

          return (
            <div
              key={item.direction || index}
              onClick={() => handleItemClick(item.direction)}
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
                  ? '1px solid rgba(6, 182, 212, 0.8)'
                  : isHovered
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(15, 23, 42, 0.8) 100%)'
                  : isHovered
                  ? 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(15, 23, 42, 0.7) 100%)'
                  : 'rgba(17, 24, 39, 0.55)',
                boxShadow: isSelected
                  ? '0 0 20px rgba(6, 182, 212, 0.3)'
                  : isHovered
                  ? '0 4px 15px rgba(0, 0, 0, 0.4)'
                  : 'none',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHovered ? 'translateY(-1px)' : 'none',
              }}
            >
              {/* Fila superior con Nombre, Podio y Métricas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {rankBadge}
                  <span
                    style={{
                      fontWeight: isSelected ? 700 : 600,
                      color: isSelected ? '#38bdf8' : '#f8fafc',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.direction}
                  >
                    {item.direction}
                  </span>
                  {rankingDimension !== 'FUNCIONARIO' && (
                    <ChevronRight size={13} style={{ color: 'var(--text-faint)', opacity: isHovered ? 1 : 0.4, transition: 'opacity 0.2s' }} />
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, marginLeft: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <strong style={{ color: '#ffffff' }}>{item.participating_employees}</strong>
                    {rankingDimension === 'FUNCIONARIO' ? ' acción' : ` / ${item.total_employees} func.`}
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
                      minWidth: '54px',
                      justifyContent: 'center',
                    }}
                  >
                    {item.participation_rate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso interactiva con animación CSS suave */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(11, 15, 25, 0.85)',
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
                    boxShadow: isHovered || isSelected ? `0 0 10px ${badgeColor}66` : 'none',
                    transition: 'width 0.65s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
                  }}
                />
              </div>

              {/* Tooltip contextual en hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-38px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 30,
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(6, 182, 212, 0.6)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#fff',
                    fontSize: '0.74rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#22d3ee', fontWeight: 700 }}>
                    👍 {item.total_reactions} reacciones registradas
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    • Haz clic para {isSelected ? 'quitar filtro' : `filtrar por ${dimensionLabel.toLowerCase()}`}
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

export default BarChartDirection;
