import React from 'react';
import { CheckCircle2, MessageSquare, XCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useAnimatedNumber } from '../../utils/useAnimatedNumber';

interface ComplianceGaugeProps {
  totalEmployees: number;
  participatingEmployees: number;
  participationRate: number;
  employeesWithBoth?: number;
  employeesWithComments?: number;
  activeFilter?: string;
  onFilterChange?: (filterStatus: 'ALL' | 'WITH_REACTION' | 'WITH_COMMENT' | 'WITH_BOTH' | 'NO_REACTION') => void;
}

export const ComplianceGauge: React.FC<ComplianceGaugeProps> = ({
  totalEmployees,
  participatingEmployees,
  participationRate,
  employeesWithBoth = 0,
  employeesWithComments = 0,
  activeFilter = 'ALL',
  onFilterChange,
}) => {
  const animatedRate = useAnimatedNumber(participationRate, 650, 1);
  const animatedTotal = useAnimatedNumber(totalEmployees, 600);
  const animatedActive = useAnimatedNumber(participatingEmployees, 600);
  const animatedBoth = useAnimatedNumber(employeesWithBoth, 600);
  const animatedComments = useAnimatedNumber(employeesWithComments, 600);

  const nonParticipating = Math.max(0, totalEmployees - participatingEmployees);
  const animatedInactive = useAnimatedNumber(nonParticipating, 600);

  // Semáforo de salud institucional
  let healthLabel = 'Monitoreo Inicial';
  let healthColor = '#94a3b8';
  let healthBg = 'rgba(148, 163, 184, 0.15)';
  let healthBorder = 'rgba(148, 163, 184, 0.3)';

  if (participationRate >= 70) {
    healthLabel = 'Excelente Desempeño y Acompañamiento';
    healthColor = '#34d399';
    healthBg = 'rgba(16, 185, 129, 0.15)';
    healthBorder = 'rgba(16, 185, 129, 0.35)';
  } else if (participationRate >= 40) {
    healthLabel = 'Acompañamiento Oportuno Moderado';
    healthColor = '#38bdf8';
    healthBg = 'rgba(6, 182, 212, 0.15)';
    healthBorder = 'rgba(6, 182, 212, 0.35)';
  } else if (participationRate > 0) {
    healthLabel = 'Nivel de Acompañamiento en Desarrollo';
    healthColor = '#fbbf24';
    healthBg = 'rgba(245, 158, 11, 0.15)';
    healthBorder = 'rgba(245, 158, 11, 0.35)';
  } else {
    healthLabel = 'Sin Acompañamiento Registrado';
    healthColor = '#f87171';
    healthBg = 'rgba(239, 68, 68, 0.15)';
    healthBorder = 'rgba(239, 68, 68, 0.35)';
  }

  const safeTotal = totalEmployees > 0 ? totalEmployees : 1;
  const pctActive = (participatingEmployees / safeTotal) * 100;
  const pctBoth = (employeesWithBoth / safeTotal) * 100;
  const pctInactive = (nonParticipating / safeTotal) * 100;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'var(--shadow-card)',
        backdropFilter: 'var(--glass-blur)',
      }}
    >
      {/* Cabecera del Semáforo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--primary-500)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
              Semáforo Institucional de Cumplimiento y Acompañamiento
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Diagnóstico instantáneo de operatividad para directores y supervisores municipales.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            Padrón: <strong style={{ color: '#ffffff' }}>{animatedTotal}</strong> servidores
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: healthBg,
              color: healthColor,
              border: `1px solid ${healthBorder}`,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: healthColor, boxShadow: `0 0 6px ${healthColor}` }} />
            {healthLabel} ({animatedRate}%)
          </span>
        </div>
      </div>

      {/* Barra de progreso segmentada */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            width: '100%',
            height: '12px',
            background: 'rgba(11, 15, 25, 0.9)',
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex',
            padding: '1px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Segmento Ambos (Integral) */}
          <div
            style={{
              height: '100%',
              width: `${pctBoth}%`,
              background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
              borderTopLeftRadius: '9999px',
              borderBottomLeftRadius: '9999px',
              transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Participación Integral: ${employeesWithBoth} (${pctBoth.toFixed(1)}%)`}
          />
          {/* Segmento Reaccionaron (pero no comentaron) */}
          <div
            style={{
              height: '100%',
              width: `${Math.max(0, pctActive - pctBoth)}%`,
              background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
              transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Con Reacción Oficial: ${participatingEmployees - employeesWithBoth}`}
          />
          {/* Segmento Sin Acción */}
          <div
            style={{
              height: '100%',
              width: `${pctInactive}%`,
              background: 'linear-gradient(90deg, #334155 0%, #475569 100%)',
              borderTopRightRadius: '9999px',
              borderBottomRightRadius: '9999px',
              transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Sin Acción: ${nonParticipating} (${pctInactive.toFixed(1)}%)`}
          />
        </div>
      </div>

      {/* Tarjetas interactivas de desglose con clic para filtrar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {/* Tarjeta 1: Integral */}
        <div
          onClick={() => onFilterChange && onFilterChange(activeFilter === 'WITH_BOTH' ? 'ALL' : 'WITH_BOTH')}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeFilter === 'WITH_BOTH' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.5)',
            border: activeFilter === 'WITH_BOTH' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.74rem', fontWeight: 700 }}>
              <Sparkles size={13} />
              <span>Integral (⭐)</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Reaccionó + Comentó
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
            {animatedBoth}
          </div>
        </div>

        {/* Tarjeta 2: Con Reacción */}
        <div
          onClick={() => onFilterChange && onFilterChange(activeFilter === 'WITH_REACTION' ? 'ALL' : 'WITH_REACTION')}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeFilter === 'WITH_REACTION' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.5)',
            border: activeFilter === 'WITH_REACTION' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.74rem', fontWeight: 700 }}>
              <CheckCircle2 size={13} />
              <span>Con Reacción</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Reacciones verificadas
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
            {animatedActive}
          </div>
        </div>

        {/* Tarjeta 2.5: Con Comentario */}
        <div
          onClick={() => onFilterChange && onFilterChange(activeFilter === 'WITH_COMMENT' ? 'ALL' : 'WITH_COMMENT')}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeFilter === 'WITH_COMMENT' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
            border: activeFilter === 'WITH_COMMENT' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.74rem', fontWeight: 700 }}>
              <MessageSquare size={13} />
              <span>Con Comentario</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Comentarios del área
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
            {animatedComments}
          </div>
        </div>

        {/* Tarjeta 3: Sin Reacción / Pendiente */}
        <div
          onClick={() => onFilterChange && onFilterChange(activeFilter === 'NO_REACTION' ? 'ALL' : 'NO_REACTION')}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeFilter === 'NO_REACTION' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.5)',
            border: activeFilter === 'NO_REACTION' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.74rem', fontWeight: 700 }}>
              <XCircle size={13} />
              <span>Sin Acción</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Pendientes de actividad
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>
            {animatedInactive}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceGauge;
