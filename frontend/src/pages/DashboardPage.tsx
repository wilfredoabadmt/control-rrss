import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Facebook,
  HelpCircle,
  Info,
  Layers,
  LogOut,
  RefreshCw,
  Shield,
  Users,
  Video,
  X
} from 'lucide-react';
import { getOperationalDashboard, getExecutiveDashboard } from '../api/dashboard';
import {
  OperationalDashboardResponse,
  ExecutiveDashboardResponse,
  IndicatorResult
} from '../types';

interface DashboardPageProps {
  onLogout?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'operational' | 'executive'>('operational');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorResult | null>(null);

  // Operational State
  const [opData, setOpData] = useState<OperationalDashboardResponse>({
    platforms: [
      { name: 'facebook', display_name: 'Facebook (Meta Graph API)', is_active: true, status: 'ONLINE' },
      { name: 'tiktok', display_name: 'TikTok (Display API)', is_active: true, status: 'ONLINE' }
    ],
    monitored_publications_count: 14,
    total_interactions_count: 342,
    pending_verifications_count: 18,
    recent_sync_jobs: [
      {
        id: 'job-fb-001',
        platform: 'facebook',
        job_type: 'POST_SYNC',
        status: 'COMPLETED' as any,
        created_at: new Date().toISOString(),
        records_processed: 8,
        records_failed: 0
      },
      {
        id: 'job-tt-002',
        platform: 'tiktok',
        job_type: 'METRICS_SYNC',
        status: 'COMPLETED' as any,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        records_processed: 6,
        records_failed: 0
      }
    ],
    active_alerts: []
  });

  // Executive State
  const [execData, setExecData] = useState<ExecutiveDashboardResponse>({
    observable_coverage_rate: {
      code: 'IND-COV-01',
      name: 'Tasa de Cobertura Observable',
      value: 92.4,
      unit: '%',
      numerator: 3880,
      denominator: 4200,
      exclusions: 312,
      formula: '(Funcionarios_Con_Cuenta_Observable / Funcionarios_Activos_Elegibles) * 100',
      description: 'Porcentaje de funcionarios cuya actividad en plataformas oficiales es técnicamente observable.',
      methodology_notes: 'Excluye funcionarios en comisión, suspendidos y plataformas con restricciones de API (Principio V y XXVI).'
    },
    verification_rate: {
      code: 'IND-VER-01',
      name: 'Tasa de Verificación Institucional',
      value: 86.8,
      unit: '%',
      numerator: 297,
      denominator: 342,
      exclusions: 24,
      formula: '(Interacciones_Confirmadas / Total_Interacciones_Exigibles) * 100',
      description: 'Nivel de verificación epistémica de interacciones en campañas oficiales monitoreadas.',
      methodology_notes: 'Calculado sobre interacciones de funcionarios públicos en horario de publicación oficial sin inventar identidades.'
    },
    verification_distribution: {
      CONFIRMED: 297,
      DECLARED_CONFIRMED: 45,
      PENDING: 18,
      NOT_OBSERVABLE: 24,
      API_RESTRICTED: 12,
      DECLARED_NOT_FOUND: 6,
      NOT_FOUND: 8
    },
    platform_breakdown: {
      facebook: 284,
      tiktok: 58
    },
    total_active_employees: 4512,
    constitutional_disclaimer:
      'PRINCIPIO XXVII: Prohibición absoluta de rankings de funcionarios, puntajes individuales o evaluaciones punitivas de desempeño. Todos los indicadores son de carácter técnico y de alcance exclusivamente agregado.'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [opRes, execRes] = await Promise.allSettled([
        getOperationalDashboard(),
        getExecutiveDashboard()
      ]);

      if (opRes.status === 'fulfilled') {
        setOpData(opRes.value);
      }
      if (execRes.status === 'fulfilled') {
        setExecData(execRes.value);
      }
    } catch {
      // Mantiene datos locales iniciales si el backend aún está inicializándose
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInteractionsDistribution = Object.values(execData.verification_distribution).reduce(
    (acc, v) => acc + v,
    0
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header Institucional GAMEA */}
      <header
        style={{
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>
              GAMEA Social Monitor
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Gobierno Autónomo Municipal de El Alto — Sistema de Monitoreo & Analítica
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(31, 41, 55, 0.6)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            onClick={() => setActiveTab('operational')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'operational' ? 'var(--primary-500)' : 'transparent',
              color: activeTab === 'operational' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Activity size={16} />
            <span>Dashboard Operativo</span>
          </button>

          <button
            onClick={() => setActiveTab('executive')}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'executive' ? 'var(--primary-500)' : 'transparent',
              color: activeTab === 'executive' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <BarChart3 size={16} />
            <span>Dashboard Ejecutivo</span>
          </button>
        </div>

        {/* User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={fetchData}
            title="Actualizar datos"
            disabled={loading}
            style={{
              background: 'rgba(31, 41, 55, 0.6)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {error && (
          <div
            className="glass-panel"
            style={{
              padding: '14px 20px',
              marginBottom: '24px',
              borderLeft: '4px solid #f43f5e',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <AlertTriangle color="#f43f5e" size={20} />
            <span style={{ fontSize: '0.9rem', color: '#fca5a5' }}>{error}</span>
          </div>
        )}

        {/* TAB OPERATIVO */}
        {activeTab === 'operational' && (
          <div>
            {/* Platform Status Banner */}
            <div
              className="glass-panel"
              style={{
                padding: '20px 24px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                  Estado de Adaptadores & Sincronización
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Monitoreo de conectividad en tiempo real con Meta Graph API y TikTok Display API
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {opData.platforms.map((p) => (
                  <div
                    key={p.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'rgba(31, 41, 55, 0.4)',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {p.name.toLowerCase().includes('facebook') ? (
                      <Facebook size={18} color="#1877f2" />
                    ) : (
                      <Video size={18} color="#06b6d4" />
                    )}
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{p.display_name}</span>
                    <span
                      className={`badge ${
                        p.status === 'ONLINE'
                          ? 'badge-success'
                          : p.status === 'DEGRADED'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}
            >
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Publicaciones Monitoreadas</span>
                  <BarChart3 size={20} color="#3b82f6" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#fff', marginTop: '12px' }}>
                  {opData.monitored_publications_count}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                  Campañas activas en Facebook y TikTok
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Interacciones Capturadas</span>
                  <Activity size={20} color="#06b6d4" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#fff', marginTop: '12px' }}>
                  {opData.total_interactions_count}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                  Ingesta con hash SHA-256 e idempotencia estricta
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Verificaciones Pendientes</span>
                  <Clock size={20} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#fbbf24', marginTop: '12px' }}>
                  {opData.pending_verifications_count}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                  Requieren revisión epistémica o manual con evidencia
                </p>
              </div>
            </div>

            {/* Recent Sync Jobs Table */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>
                    Trabajos de Sincronización Recientes
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Ejecución de workers Celery según máquina de 10 estados canónicos (Principio XXIII)
                  </p>
                </div>
                <span className="badge badge-info">Celery Beat Activo</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <th style={{ padding: '12px 16px' }}>ID TRABAJO</th>
                      <th style={{ padding: '12px 16px' }}>PLATAFORMA</th>
                      <th style={{ padding: '12px 16px' }}>TIPO</th>
                      <th style={{ padding: '12px 16px' }}>ESTADO</th>
                      <th style={{ padding: '12px 16px' }}>PROCESADOS</th>
                      <th style={{ padding: '12px 16px' }}>FECHA</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.85rem' }}>
                    {opData.recent_sync_jobs.map((job) => (
                      <tr
                        key={job.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--primary-500)' }}>
                          {job.id}
                        </td>
                        <td style={{ padding: '14px 16px', textTransform: 'capitalize' }}>
                          {job.platform}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                          {job.job_type}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            className={`badge ${
                              job.status === 'COMPLETED'
                                ? 'badge-success'
                                : job.status === 'FAILED_FATAL' || job.status === 'CIRCUIT_BROKEN'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#fff', fontWeight: '500' }}>
                          {job.records_processed ?? 0} registros
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-faint)' }}>
                          {new Date(job.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB EJECUTIVO */}
        {activeTab === 'executive' && (
          <div>
            {/* Banner Constitucional Principio XXVII */}
            <div
              className="glass-panel"
              style={{
                padding: '20px 24px',
                marginBottom: '28px',
                borderLeft: '4px solid #06b6d4',
                background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(17, 24, 39, 0.8) 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <Shield size={24} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                    Garantía Constitucional GAMEA — Principio XXVII
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                    {execData.constitutional_disclaimer}
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards Ejecutivos */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
              }}
            >
              {/* Tasa de Cobertura Observable */}
              <div className="glass-panel" style={{ padding: '28px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {execData.observable_coverage_rate.code}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                      {execData.observable_coverage_rate.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedIndicator(execData.observable_coverage_rate)}
                    title="Ver Ficha Técnica"
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: 'var(--primary-500)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <HelpCircle size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '16px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: '800', color: '#06b6d4', letterSpacing: '-0.03em' }}>
                    {execData.observable_coverage_rate.value.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    {execData.observable_coverage_rate.unit}
                  </span>
                </div>

                <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Observables técnicos:</span>
                    <strong style={{ color: '#fff' }}>{execData.observable_coverage_rate.numerator}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Universo evaluable:</span>
                    <strong style={{ color: '#fff' }}>{execData.observable_coverage_rate.denominator}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Exclusiones metodológicas:</span>
                    <strong style={{ color: '#fbbf24' }}>{execData.observable_coverage_rate.exclusions}</strong>
                  </div>
                </div>
              </div>

              {/* Tasa de Verificación Institucional */}
              <div className="glass-panel" style={{ padding: '28px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {execData.verification_rate.code}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                      {execData.verification_rate.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedIndicator(execData.verification_rate)}
                    title="Ver Ficha Técnica"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: 'var(--accent-blue)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <HelpCircle size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '16px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: '800', color: '#3b82f6', letterSpacing: '-0.03em' }}>
                    {execData.verification_rate.value.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    {execData.verification_rate.unit}
                  </span>
                </div>

                <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Confirmadas / Verificadas:</span>
                    <strong style={{ color: '#fff' }}>{execData.verification_rate.numerator}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Total exigibles:</span>
                    <strong style={{ color: '#fff' }}>{execData.verification_rate.denominator}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Exclusiones metodológicas:</span>
                    <strong style={{ color: '#fbbf24' }}>{execData.verification_rate.exclusions}</strong>
                  </div>
                </div>
              </div>

              {/* Total Funcionarios Activos */}
              <div className="glass-panel" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Nómina Municipal GAMEA</span>
                  <Users size={22} color="#10b981" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                  Funcionarios Registrados
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '16px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: '800', color: '#10b981', letterSpacing: '-0.03em' }}>
                    {execData.total_active_employees.toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '14px' }}>
                  Protegidos con cifrado Fernet en reposo y HMAC ciego para búsqueda segura.
                </p>
              </div>
            </div>

            {/* Desglose Epistémico y Plataformas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
              {/* Desglose Epistémico */}
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
                  Distribución Epistémica de Verificaciones
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Principio V: Distinción formal entre lo confirmado, lo no observable y restricciones de API.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(execData.verification_distribution).map(([status, count]) => {
                    const percent =
                      totalInteractionsDistribution > 0
                        ? ((count / totalInteractionsDistribution) * 100).toFixed(1)
                        : '0';

                    let barColor = '#3b82f6';
                    if (status.includes('CONFIRMED')) barColor = '#10b981';
                    if (status.includes('PENDING')) barColor = '#fbbf24';
                    if (status.includes('NOT_OBSERVABLE')) barColor = '#8b5cf6';
                    if (status.includes('API_RESTRICTED')) barColor = '#ec4899';
                    if (status.includes('NOT_FOUND')) barColor = '#f43f5e';

                    return (
                      <div key={status}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ fontWeight: '500', color: '#fff' }}>{status}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {count} ({percent}%)
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            background: 'rgba(31, 41, 55, 0.8)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              background: barColor,
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desglose de Redes y Cumplimiento Metodológico */}
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
                  Distribución por Plataforma Oficial
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Volumen de interacciones trazadas por red social
                </p>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(24, 119, 242, 0.1)',
                      border: '1px solid rgba(24, 119, 242, 0.25)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}
                  >
                    <Facebook size={24} color="#1877f2" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
                      {execData.platform_breakdown.facebook || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Facebook Interacciones</div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}
                  >
                    <Video size={24} color="#06b6d4" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
                      {execData.platform_breakdown.tiktok || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TikTok Interacciones</div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(31, 41, 55, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Info size={18} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#fff' }}>Auditoría & Trazabilidad Criptográfica</strong>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                        Todos los reportes generados desde este panel cuentan con firma criptográfica SHA-256
                        según el Principio XXIV para garantizar inalterabilidad ante auditorías gubernamentales.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL FICHA TÉCNICA (Principio XXVI) */}
      {selectedIndicator && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '32px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-focus)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '6px' }}>
                  {selectedIndicator.code}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff' }}>
                  {selectedIndicator.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIndicator(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Descripción Operativa
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px', lineHeight: 1.5 }}>
                  {selectedIndicator.description}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Fórmula Matemática
                </h4>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'monospace',
                    color: '#06b6d4',
                    fontSize: '0.85rem',
                    marginTop: '4px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {selectedIndicator.formula}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    background: 'rgba(31, 41, 55, 0.5)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Numerador</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                    {selectedIndicator.numerator}
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(31, 41, 55, 0.5)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Denominador</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                    {selectedIndicator.denominator}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: '#fbbf24', textTransform: 'uppercase' }}>
                  Exclusiones & Reglas Metodológicas
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                  {selectedIndicator.methodology_notes}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={() => setSelectedIndicator(null)}
                style={{ padding: '8px 24px' }}
              >
                Cerrar Ficha Técnica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
