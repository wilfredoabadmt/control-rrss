import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  FileText,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { analyticsApi, AnalyticsOverviewResponse, DirectionRankingItem } from '../api/analytics';

export const MaeExecutiveDashboardPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAuthorized = hasRole([UserRole.MAE, UserRole.SUPER_ADMIN]);

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [daysWindow, setDaysWindow] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  // Estado para el modal de emisión de Memorando de Gabinete
  const [selectedMemoArea, setSelectedMemoArea] = useState<DirectionRankingItem | null>(null);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getOverview({ days: daysWindow });
      setData(res);
    } catch (err: any) {
      console.error('Error al cargar datos estratégicos MAE:', err);
      setError('No se pudieron cargar las métricas ejecutivas. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [daysWindow, isAuthorized]);

  // Clasificación de Secretarías y Direcciones según el Semáforo de Decisión de Gabinete
  const { topRanked, midRanked, lowRanked, sortedRankings } = useMemo(() => {
    if (!data || !data.direction_rankings) {
      return { topRanked: [], midRanked: [], lowRanked: [], sortedRankings: [] };
    }

    const sorted = [...data.direction_rankings].sort((a, b) => b.participation_rate - a.participation_rate);
    const top = sorted.filter((d) => d.participation_rate >= 75);
    const mid = sorted.filter((d) => d.participation_rate >= 45 && d.participation_rate < 75);
    const low = sorted.filter((d) => d.participation_rate < 45);

    return { topRanked: top, midRanked: mid, lowRanked: low, sortedRankings: sorted };
  }, [data]);

  // Si no está autorizado (no es MAE ni SUPER_ADMIN)
  if (!isAuthorized) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div
          className="glass-panel"
          style={{
            padding: '48px 32px',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f43f5e',
              marginBottom: '20px',
            }}
          >
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
            Acceso Reservado Exclusivamente a la MAE
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto' }}>
            Este módulo estratégico contiene información confidencial de gabinete y toma de decisiones de la Máxima Autoridad
            Ejecutiva del Gobierno Autónomo Municipal de El Alto. Su usuario actual no cuenta con las credenciales requeridas.
          </p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const overallRate = kpis?.participation_rate ?? 0;

  // Diagnóstico ejecutivo automático
  const rateStatus =
    overallRate >= 75
      ? { label: 'Compromiso Sólido', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
      : overallRate >= 50
      ? { label: 'Atención Preventiva de Gabinete', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
      : { label: 'Alerta Crítica: Convocatoria Urgente', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };

  const handleCopyMemo = () => {
    if (!selectedMemoArea) return;
    const memoText = `GOBIERNO AUTÓNOMO MUNICIPAL DE EL ALTO
DESPACHO DE LA MÁXIMA AUTORIDAD EJECUTIVA (MAE)
COMUNICADO OFICIAL DE GABINETE Nº ${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}

A: Dirección / Secretaría: ${selectedMemoArea.direction}
DE: Despacho de la Máxima Autoridad Ejecutiva
ASUNTO: Instrucción de Fortalecimiento al Respaldo y Difusión de Campañas Institucionales Oficiales
FECHA: ${new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}

Señor(a) Director(a) / Secretario(a):
Mediante el Sistema de Monitoreo y Analítica Municipal, se ha constatado que el nivel de respaldo y participación de su personal dependiente en las publicaciones y campañas institucionales se sitúa actualmente en un ${selectedMemoArea.participation_rate.toFixed(1)}% (${selectedMemoArea.participating_employees} de ${selectedMemoArea.total_employees} servidores públicos registrados).

Habiéndose definido institucionalmente un umbral mínimo de compromiso del 80%, se le INSTRUYE convocar de forma inmediata a todo el personal bajo su dependencia a fin de respaldar activamente las campañas de difusión oficial de las obras y servicios del municipio alteño.

Agradeciendo su atención y compromiso con la gestión municipal, le saluda atentamente,

Despacho de la Máxima Autoridad Ejecutiva
Gobierno Autónomo Municipal de El Alto`;

    navigator.clipboard.writeText(memoText);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* =========================================================================
          ENCABEZADO DE GABINETE MAE
          ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderLeft: '5px solid #f59e0b',
          borderRadius: '16px',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.25)',
                flexShrink: 0,
              }}
            >
              <Crown size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Despacho de la Máxima Autoridad Ejecutiva
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                  Acceso Restringido: MAE &amp; Super Admin
                </span>
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
                Tablero de Decisiones Estratégicas MAE
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                Supervisión ejecutiva del compromiso institucional y respuesta de las Secretarías Municipales en redes
              </p>
            </div>
          </div>

          {/* Controles de Selección de Rango y Actualización */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {[
                { label: '7 días', val: 7 },
                { label: '15 días', val: 15 },
                { label: '30 días', val: 30 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setDaysWindow(opt.val)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    background: daysWindow === opt.val ? '#f59e0b' : 'transparent',
                    color: daysWindow === opt.val ? '#0f172a' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Actualizar métricas"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            borderLeft: '4px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fca5a5',
          }}
        >
          <AlertTriangle size={20} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          TARJETAS DE IMPACTO ESTRATÉGICO PARA DECISIÓN (KPIs DE GABINETE)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* KPI 1: Tasa Global de Cumplimiento */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            position: 'relative',
            border: `1px solid ${rateStatus.color}40`,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Compromiso Global de Personal
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, color: rateStatus.color, letterSpacing: '-0.03em' }}>
                  {overallRate.toFixed(1)}%
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>de la nómina</span>
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: rateStatus.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: rateStatus.color,
              }}
            >
              <TrendingUp size={22} />
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                background: rateStatus.bg,
                color: rateStatus.color,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              Diagnóstico: {rateStatus.label}
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(overallRate, 100)}%`, height: '100%', background: rateStatus.color, borderRadius: '3px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
              <span>0% Crítico</span>
              <span>Meta Institucional: 80%</span>
              <span>100% Total</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Personal Comprometido */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Servidores que Respaldaron
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.03em' }}>
                  {kpis?.participating_employees?.toLocaleString() ?? 0}
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  / {kpis?.total_employees?.toLocaleString() ?? 0} registrados
                </span>
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Users size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '16px', lineHeight: 1.5 }}>
            Total de funcionarios que registraron al menos una reacción o comentario en el período evaluado.
          </p>
        </div>

        {/* KPI 3: Publicaciones Evaluadas */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Publicaciones Oficiales Evaluadas
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.03em' }}>
                  {kpis?.total_publications?.toLocaleString() ?? 0}
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>campañas</span>
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(167, 139, 250, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <FileText size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '16px', lineHeight: 1.5 }}>
            Campañas prioritarias del municipio activas en Facebook y TikTok para fiscalización institucional.
          </p>
        </div>

        {/* KPI 4: Apoyo Institucional vs Ciudadanía */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Comentarios: Personal vs Ciudadanía
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.03em' }}>
                  {kpis?.total_employee_comments ?? 0}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  personal / {kpis?.total_citizen_comments ?? 0} ciudadanos
                </span>
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <MessageSquare size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '16px', lineHeight: 1.5 }}>
            Muestra el equilibrio entre el respaldo orgánico vecinal alteño y el apoyo directo del equipo de trabajo municipal.
          </p>
        </div>
      </div>

      {/* =========================================================================
          SEMÁFORO DE GABINETE: 3 NIVELES ESTRATÉGICOS DE DECISIÓN
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* BLOQUE VERDE: Secretarías Destacadas */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderTop: '4px solid #10b981',
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Alto Compromiso (≥ 75%)
              </h3>
            </div>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
              {topRanked.length} Áreas
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Dependencias que cumplen a cabalidad con la meta institucional.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topRanked.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                Ninguna secretaría ha alcanzado aún el 75% en esta ventana de tiempo.
              </div>
            ) : (
              topRanked.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.direction}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                      {item.participating_employees} de {item.total_employees} cumplieron
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>
                      {item.participation_rate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BLOQUE AMARILLO: En Seguimiento Preventivo */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderTop: '4px solid #f59e0b',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                En Seguimiento (45% - 74%)
              </h3>
            </div>
            <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
              {midRanked.length} Áreas
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Dependencias con apoyo intermedio que requieren mayor coordinación interna.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {midRanked.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                No hay áreas en rango medio en este período.
              </div>
            ) : (
              midRanked.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.direction}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                      {item.participating_employees} de {item.total_employees} cumplieron
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fbbf24' }}>
                      {item.participation_rate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BLOQUE ROJO: Secretarías en Alerta Crítica (Para Toma de Decisiones) */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderTop: '4px solid #ef4444',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Secretarías Rezagadas (&lt; 45%) — Acción Requerida
              </h3>
            </div>
            <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
              {lowRanked.length} Áreas
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Dependencias con bajo respaldo donde la MAE debe instruir llamada de atención institucional.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lowRanked.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#10b981', fontSize: '0.85rem' }}>
                🎉 ¡Excelente! No existen secretarías en estado crítico en este período.
              </div>
            ) : (
              lowRanked.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ minWidth: '180px', flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.direction}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '2px' }}>
                      Solo {item.participating_employees} de {item.total_employees} cumplieron ({item.participation_rate.toFixed(1)}%)
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedMemoArea(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '5px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Emitir comunicado oficial de gabinete para este despacho"
                  >
                    <Send size={13} />
                    <span>Instruir Notificación</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABLA GENERAL DE TODAS LAS SECRETARÍAS / DIRECCIONES PARA GABINETE
          ========================================================================= */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Ranking Completo de Cumplimiento Institucional
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Nivel de respaldo ordenado de mayor a menor para presentación en la reunión de gabinete semanal
            </p>
          </div>

          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              color: '#fbbf24',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            <span>Imprimir Resumen de Gabinete</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <th style={{ padding: '12px 14px' }}>#</th>
                <th style={{ padding: '12px 14px' }}>SECRETARÍA / DIRECCIÓN</th>
                <th style={{ padding: '12px 14px' }}>PERSONAL TOTAL</th>
                <th style={{ padding: '12px 14px' }}>PARTICIPANTES</th>
                <th style={{ padding: '12px 14px' }}>% CUMPLIMIENTO</th>
                <th style={{ padding: '12px 14px' }}>ESTADO DE GABINETE</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACCIÓN DE DECISIÓN</th>
              </tr>
            </thead>
            <tbody>
              {sortedRankings.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-faint)' }}>
                    {loading ? 'Cargando indicadores de gabinete...' : 'No hay registros en el período seleccionado.'}
                  </td>
                </tr>
              ) : (
                sortedRankings.map((rk, idx) => {
                  const isTop = rk.participation_rate >= 75;
                  const isLow = rk.participation_rate < 45;
                  const statusLabel = isTop ? '🟢 Cumplido' : isLow ? '🔴 Rezagado' : '🟡 Regular';
                  const badgeColor = isTop ? '#10b981' : isLow ? '#ef4444' : '#f59e0b';

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: isLow ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: 'var(--text-faint)', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff' }}>
                        {rk.direction}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                        {rk.total_employees} servidores
                      </td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: 600 }}>
                        {rk.participating_employees}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: badgeColor, minWidth: '45px' }}>
                            {rk.participation_rate.toFixed(1)}%
                          </span>
                          <div style={{ width: '80px', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(rk.participation_rate, 100)}%`, height: '100%', background: badgeColor }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: badgeColor }}>
                        {statusLabel}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isLow ? (
                          <button
                            onClick={() => setSelectedMemoArea(rk)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              borderRadius: '6px',
                              color: '#f87171',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              cursor: 'pointer',
                            }}
                          >
                            Instruir Llamada
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Conforme</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL DE NOTIFICACIÓN DE GABINETE (INSTRUCCIÓN DE LA MAE)
          ========================================================================= */}
      {selectedMemoArea && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(5, 8, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedMemoArea(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Crown size={22} color="#fbbf24" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Instrucción Formal de Despacho MAE
                </h3>
              </div>
              <button
                onClick={() => setSelectedMemoArea(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Plantilla formal lista para remitir a la Secretaría o Dirección correspondiente para exigir el cumplimiento institucional:
            </p>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                lineHeight: 1.6,
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {`GOBIERNO AUTÓNOMO MUNICIPAL DE EL ALTO
DESPACHO DE LA MÁXIMA AUTORIDAD EJECUTIVA (MAE)
COMUNICADO OFICIAL DE GABINETE Nº ${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}

A: Dirección / Secretaría: ${selectedMemoArea.direction}
DE: Despacho de la Máxima Autoridad Ejecutiva
ASUNTO: Instrucción de Fortalecimiento al Respaldo y Difusión de Campañas Institucionales Oficiales
FECHA: ${new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}

Señor(a) Director(a) / Secretario(a):
Mediante el Sistema de Monitoreo y Analítica Municipal, se ha constatado que el nivel de respaldo y participación de su personal dependiente en las publicaciones y campañas institucionales se sitúa actualmente en un ${selectedMemoArea.participation_rate.toFixed(1)}% (${selectedMemoArea.participating_employees} de ${selectedMemoArea.total_employees} servidores públicos registrados).

Habiéndose definido institucionalmente un umbral mínimo de compromiso del 80%, se le INSTRUYE convocar de forma inmediata a todo el personal bajo su dependencia a fin de respaldar activamente las campañas de difusión oficial de las obras y servicios del municipio alteño.

Agradeciendo su atención y compromiso con la gestión municipal, le saluda atentamente,

Despacho de la Máxima Autoridad Ejecutiva
Gobierno Autónomo Municipal de El Alto`}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setSelectedMemoArea(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>

              <button
                onClick={handleCopyMemo}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#0f172a',
                  fontWeight: 800,
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                }}
              >
                {copiedMemo ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                <span>{copiedMemo ? '¡Copiado al Portapapeles!' : 'Copiar Comunicado Oficial'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
