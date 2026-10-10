import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Share2,
  ThumbsUp,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  analyticsApi,
  AnalyticsFilters,
  AnalyticsOverviewResponse,
  AnalyticsEmployeesPageResponse,
} from '../api/analytics';
import { BarChartDirection } from '../components/charts/BarChartDirection';
import { DonutChartReactions } from '../components/charts/DonutChartReactions';
import { TimelineChart } from '../components/charts/TimelineChart';
import { PlatformComparisonBar } from '../components/charts/PlatformComparisonBar';

export const AnalyticsDashboardPage: React.FC = () => {
  // Estados de datos
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [employeesData, setEmployeesData] = useState<AnalyticsEmployeesPageResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtros
  const [daysPreset, setDaysPreset] = useState<number | null>(30);
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [participationFilter, setParticipationFilter] = useState<'ALL' | 'PARTICIPATED' | 'NO_REACTION'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Cargar Overview
  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      setError(null);
      const filters: AnalyticsFilters = {
        days: daysPreset,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
      };
      const res = await analyticsApi.getOverview(filters);
      setOverview(res);
    } catch (err: any) {
      console.error('Error al cargar analítica de reacciones:', err);
      setError('No se pudo cargar el resumen analítico. Verifique la conexión con el servidor.');
    } finally {
      setLoadingOverview(false);
    }
  }, [daysPreset, selectedDirection, selectedPlatform]);

  // Cargar Tabla de Funcionarios
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const filters: AnalyticsFilters = {
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
        search: searchTerm.trim() || undefined,
        participation_status: participationFilter,
        page: currentPage,
        page_size: pageSize,
      };
      const res = await analyticsApi.getEmployees(filters);
      setEmployeesData(res);
    } catch (err: any) {
      console.error('Error al cargar tabla de funcionarios:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [selectedDirection, selectedPlatform, searchTerm, participationFilter, currentPage]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Manejador de exportación a Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const blob = await analyticsApi.exportExcel({
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `GAMEA_Analitica_Reacciones_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error al exportar reporte Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Restablecer filtros
  const handleResetFilters = () => {
    setDaysPreset(null);
    setSelectedDirection('ALL');
    setSelectedPlatform('ALL');
    setSearchTerm('');
    setParticipationFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    daysPreset !== null ||
    selectedDirection !== 'ALL' ||
    selectedPlatform !== 'ALL' ||
    searchTerm.trim() !== '' ||
    participationFilter !== 'ALL';

  return (
    <div className="analytics-container">
      {/* 1. Header Ejecutivo */}
      <div className="analytics-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-500)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            <BarChart3 size={16} />
            <span>Fiscalización Institucional de Redes Sociales</span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: '4px 0' }}>
            Analítica de Reacciones y Acompañamiento
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Métricas cruzadas, índice de participación por dirección y taxonomía de interacciones oficiales del GAMEA.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              fetchOverview();
              fetchEmployees();
            }}
            disabled={loadingOverview}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(31, 41, 55, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} className={loadingOverview ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Download size={14} />
            <span>{exportingExcel ? 'Generando Excel...' : 'Exportar Excel Oficial'}</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros Interactivos */}
      <div className="analytics-filter-bar">
        {/* Presets de Ventana Temporal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="analytics-btn-group">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} />
              Ventana:
            </span>
            {[
              { label: '7 días', val: 7 },
              { label: '15 días', val: 15 },
              { label: '30 días', val: 30 },
              { label: 'Histórico', val: null },
            ].map((p) => {
              const active = daysPreset === p.val;
              return (
                <button
                  key={p.label}
                  onClick={() => setDaysPreset(p.val)}
                  className={`analytics-tab-btn ${active ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Filtro por Dirección */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Dirección:</span>
            <select
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value);
                setCurrentPage(1);
              }}
              className="analytics-select"
              style={{ maxWidth: '240px' }}
            >
              <option value="ALL">Todas las Direcciones</option>
              {overview?.available_directions?.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Plataforma */}
          <div className="analytics-btn-group">
            {[
              { id: 'ALL', label: 'Todas las Redes' },
              { id: 'FACEBOOK', label: 'Facebook' },
              { id: 'TIKTOK', label: 'TikTok' },
            ].map((plat) => {
              const active = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  onClick={() => {
                    setSelectedPlatform(plat.id);
                    setCurrentPage(1);
                  }}
                  className={`analytics-tab-btn ${active ? 'active' : ''}`}
                >
                  {plat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón Reset si hay filtros aplicados */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={12} />
            <span>Limpiar Filtros</span>
          </button>
        )}
      </div>

      {/* Alerta de Error si ocurre */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', color: '#fca5a5', fontSize: '0.82rem' }}>
          <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Tarjetas KPI Métricas Clave */}
      {overview && (
        <div className="analytics-kpi-grid">
          {/* KPI 1: Funcionarios Observables */}
          <div className="analytics-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Funcionarios en Alcance</span>
              <Users size={16} color="var(--primary-500)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
              {overview.kpis.total_employees}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--primary-500)' }}>{overview.kpis.observable_employees}</strong> con redes vinculadas
            </div>
          </div>

          {/* KPI 2: Total Reacciones */}
          <div className="analytics-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Total Reacciones</span>
              <ThumbsUp size={16} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
              {overview.kpis.total_reactions.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Promedio: <strong style={{ color: '#60a5fa' }}>{overview.kpis.average_reactions_per_post}</strong> por publicación
            </div>
          </div>

          {/* KPI 3: Tasa de Participación */}
          <div className="analytics-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Tasa de Participación</span>
              <TrendingUp size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
              {overview.kpis.participation_rate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: '#34d399' }}>{overview.kpis.participating_employees}</strong> funcionarios interactuaron
            </div>
          </div>

          {/* KPI 4: Publicaciones Auditadas */}
          <div className="analytics-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Posts Auditados</span>
              <Layers size={16} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
              {overview.kpis.total_publications}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Evaluados en la ventana activa
            </div>
          </div>

          {/* KPI 5: Comentarios y Compartidos */}
          <div className="analytics-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Otros Acompañamientos</span>
              <MessageSquare size={16} color="#ec4899" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
              {(overview.kpis.total_comments + overview.kpis.total_shares).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
              <span>{overview.kpis.total_comments} coment.</span>
              <span>•</span>
              <span>{overview.kpis.total_shares} comp.</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Grilla de Gráficos Estadísticos Interactivos (2x2) */}
      {overview && (
        <div className="analytics-charts-grid">
          {/* Gráfico 1: Ranking por Dirección */}
          <div className="analytics-chart-card">
            <div className="analytics-card-header">
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <BarChart3 size={18} color="var(--primary-500)" />
                  Ranking de Participación por Dirección
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Tasa de acompañamiento y volumen de reacciones por unidad municipal.
                </p>
              </div>
              {selectedDirection !== 'ALL' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--primary-500)', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                  Filtro activo
                </span>
              )}
            </div>
            <BarChartDirection
              data={overview.direction_rankings}
              selectedDirection={selectedDirection !== 'ALL' ? selectedDirection : null}
              onSelectDirection={(dir) => {
                setSelectedDirection(dir || 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Gráfico 2: Desglose Taxonómico de Reacciones (Donut) */}
          <div className="analytics-chart-card">
            <div className="analytics-card-header">
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <ThumbsUp size={18} color="#3b82f6" />
                  Taxonomía y Tipos de Reacciones
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Proporción de Me gusta, Me encanta, Comentarios y Compartidos.
                </p>
              </div>
            </div>
            <DonutChartReactions
              data={overview.reactions_breakdown}
              totalCount={overview.kpis.total_reactions}
            />
          </div>

          {/* Gráfico 3: Serie Temporal Diaria */}
          <div className="analytics-chart-card">
            <div className="analytics-card-header">
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <TrendingUp size={18} color="#10b981" />
                  Actividad Cronológica y Tendencia
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Evolución diaria de interacciones en el rango seleccionado.
                </p>
              </div>
            </div>
            <TimelineChart data={overview.timeline_series} />
          </div>

          {/* Gráfico 4: Comparativa de Plataformas */}
          <div className="analytics-chart-card">
            <div className="analytics-card-header">
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Share2 size={18} color="#ec4899" />
                  Comparativa Bilateral de Plataformas
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Volumen y distribución entre Facebook y TikTok.
                </p>
              </div>
              {selectedPlatform !== 'ALL' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                  {selectedPlatform}
                </span>
              )}
            </div>
            <PlatformComparisonBar
              comparison={overview.platform_comparison}
              selectedPlatform={selectedPlatform !== 'ALL' ? selectedPlatform : null}
              onSelectPlatform={(plat) => {
                setSelectedPlatform(plat || 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* 5. Tabla Detallada de Fiscalización por Funcionario */}
      <div className="analytics-table-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Users size={20} color="var(--primary-500)" />
              Detalle Analítico por Funcionario Municipal
            </h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Auditoría nominal con enlaces de perfil, conteo de reacciones y porcentaje de cumplimiento.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Input de Búsqueda */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por Nombre o C.I...."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  background: 'rgba(11, 15, 25, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 12px 7px 32px',
                  fontSize: '0.8rem',
                  color: '#ffffff',
                  outline: 'none',
                  width: '210px',
                }}
              />
            </div>

            {/* Toggle de Estado de Participación */}
            <div className="analytics-btn-group">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'PARTICIPATED', label: 'Con Reacción' },
                { id: 'NO_REACTION', label: 'Sin Reacción' },
              ].map((st) => {
                const active = participationFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setParticipationFilter(st.id as any);
                      setCurrentPage(1);
                    }}
                    className={`analytics-tab-btn ${active ? 'active' : ''}`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabla Responsiva */}
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Funcionario</th>
                <th>Dependencia / Cargo</th>
                <th>Cuentas RRSS</th>
                <th style={{ textAlign: 'center' }}>Reacciones</th>
                <th style={{ textAlign: 'center' }}>Cobertura</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loadingEmployees ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--primary-500)' }} />
                    <div>Cargando detalle de funcionarios...</div>
                  </td>
                </tr>
              ) : employeesData?.items && employeesData.items.length > 0 ? (
                employeesData.items.map((emp) => (
                  <tr key={emp.employee_id}>
                    {/* Funcionario */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{emp.full_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ fontFamily: 'monospace', background: 'rgba(11, 15, 25, 0.8)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          C.I. {emp.document_number}
                        </span>
                      </div>
                    </td>

                    {/* Dependencia / Cargo */}
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.direction}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.position}
                      </div>
                    </td>

                    {/* Cuentas RRSS */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {emp.facebook_account ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#60a5fa', fontFamily: 'monospace' }}>
                            <strong style={{ color: '#1877F2' }}>f</strong> {emp.facebook_account}
                          </span>
                        ) : null}
                        {emp.tiktok_account ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f472b6', fontFamily: 'monospace' }}>
                            <span>♪</span> {emp.tiktok_account}
                          </span>
                        ) : null}
                        {!emp.facebook_account && !emp.tiktok_account && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Sin cuentas vinculadas
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reacciones */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                        {emp.total_reactions}
                      </span>
                      {emp.total_comments > 0 && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--primary-500)' }}>
                          +{emp.total_comments} coment.
                        </div>
                      )}
                    </td>

                    {/* Cobertura */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9' }}>
                        {emp.participation_rate.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {emp.participated_posts_count} / {emp.total_available_posts} posts
                      </div>
                    </td>

                    {/* Estado */}
                    <td style={{ textAlign: 'center' }}>
                      {emp.has_participated ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Activo
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(100, 116, 139, 0.15)',
                            color: '#94a3b8',
                            border: '1px solid rgba(100, 116, 139, 0.25)',
                          }}
                        >
                          <XCircle size={12} />
                          Sin Reacción
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron funcionarios coincidentes con los criterios actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {employeesData && employeesData.total_pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>
              Mostrando página <strong style={{ color: '#fff' }}>{employeesData.page}</strong> de{' '}
              <strong style={{ color: '#fff' }}>{employeesData.total_pages}</strong> ({employeesData.total} funcionarios)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(11, 15, 25, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-main)',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.3 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(11, 15, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.12)', fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>
                {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(employeesData.total_pages, p + 1))}
                disabled={currentPage >= employeesData.total_pages}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(11, 15, 25, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-main)',
                  cursor: currentPage >= employeesData.total_pages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= employeesData.total_pages ? 0.3 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
