import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  ThumbsUp,
  Trash2,
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
import {
  LISTA_SECRETARIAS,
  getDireccionesBySecretaria,
  getUnidadesByDireccion,
  findSecretariaForDireccion,
} from '../data/organigrama';

export const AnalyticsDashboardPage: React.FC = () => {
  // Estados de datos
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [employeesData, setEmployeesData] = useState<AnalyticsEmployeesPageResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [purgingData, setPurgingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Estados de filtros jerárquicos (Nivel 1 -> Nivel 2 -> Nivel 3)
  const [daysPreset, setDaysPreset] = useState<number | null>(30);
  const [selectedSecretaria, setSelectedSecretaria] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [participationFilter, setParticipationFilter] = useState<'ALL' | 'PARTICIPATED' | 'NO_REACTION'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Direcciones disponibles en cascada según la Secretaría seleccionada
  const availableDirectionsList = useMemo(() => {
    return getDireccionesBySecretaria(selectedSecretaria);
  }, [selectedSecretaria]);

  // Unidades disponibles en cascada según la Dirección seleccionada
  const availableUnitsList = useMemo(() => {
    return getUnidadesByDireccion(selectedSecretaria, selectedDirection);
  }, [selectedSecretaria, selectedDirection]);

  // Cargar Overview
  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      setError(null);
      const filters: AnalyticsFilters = {
        days: daysPreset,
        secretaria: selectedSecretaria !== 'ALL' ? selectedSecretaria : undefined,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
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
  }, [daysPreset, selectedSecretaria, selectedDirection, selectedUnit, selectedPlatform]);

  // Cargar Tabla de Funcionarios
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const filters: AnalyticsFilters = {
        days: daysPreset,
        secretaria: selectedSecretaria !== 'ALL' ? selectedSecretaria : undefined,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
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
  }, [daysPreset, selectedSecretaria, selectedDirection, selectedUnit, selectedPlatform, searchTerm, participationFilter, currentPage]);

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
        secretaria: selectedSecretaria !== 'ALL' ? selectedSecretaria : undefined,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
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

  // Manejador de depuración de datos de prueba
  const handlePurgeTestData = async () => {
    const ok = window.confirm(
      '⚠️ ¿Está seguro de depurar los datos de prueba?\n\n' +
      'Esta acción eliminará todas las interacciones y verificaciones de prueba/simulación acumuladas, ' +
      'dejando las métricas en 0 para que los operadores institucionales registren datos 100% verdaderos.'
    );
    if (!ok) return;

    try {
      setPurgingData(true);
      const res = await analyticsApi.resetTestData();
      setSuccessNotice(
        `✅ ${res.message || 'Datos de prueba eliminados correctamente.'} Se eliminaron ${res.interactions_deleted || 0} interacciones de prueba.`
      );
      setTimeout(() => setSuccessNotice(null), 7000);
      fetchOverview();
      fetchEmployees();
    } catch (err: any) {
      console.error('Error al purgar datos de prueba:', err);
      alert('Error al purgar datos de prueba: ' + (err.message || 'Verifique permisos de administrador.'));
    } finally {
      setPurgingData(false);
    }
  };

  // Restablecer filtros
  const handleResetFilters = () => {
    setDaysPreset(30);
    setSelectedSecretaria('ALL');
    setSelectedDirection('ALL');
    setSelectedUnit('ALL');
    setSelectedPlatform('ALL');
    setSearchTerm('');
    setParticipationFilter('ALL');
    setCurrentPage(1);
  };

  // Click en una barra de dirección en el gráfico
  const handleBarDirectionClick = (dirName: string | null) => {
    if (!dirName) {
      setSelectedDirection('ALL');
      return;
    }
    const parentSec = findSecretariaForDireccion(dirName);
    if (parentSec) {
      setSelectedSecretaria(parentSec);
    }
    setSelectedDirection(dirName);
    setSelectedUnit('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    daysPreset !== 30 ||
    selectedSecretaria !== 'ALL' ||
    selectedDirection !== 'ALL' ||
    selectedUnit !== 'ALL' ||
    selectedPlatform !== 'ALL' ||
    searchTerm.trim() !== '' ||
    participationFilter !== 'ALL';

  return (
    <div className="analytics-container">
      {/* Notificación de éxito al purgar */}
      {successNotice && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
            Métricas cruzadas, filtros jerárquicos por secretaría, dirección y unidad, y taxonomía de interacciones oficiales del GAMEA.
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

          <button
            onClick={handlePurgeTestData}
            disabled={purgingData}
            title="Eliminar interacciones y verificaciones de prueba para iniciar en blanco"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Trash2 size={14} />
            <span>{purgingData ? 'Limpiando...' : 'Limpiar Datos de Prueba'}</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros Jerárquicos en Cascada */}
      <div className="analytics-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
        {/* Fila Superior: Presets de Ventana Temporal y Redes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Presets de Ventana Temporal */}
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
            ].map((p) => (
              <button
                key={p.label}
                className={`analytics-tab-btn ${daysPreset === p.val ? 'active' : ''}`}
                onClick={() => setDaysPreset(p.val)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Toggle de Red Social */}
          <div className="analytics-btn-group">
            <button
              className={`analytics-tab-btn ${selectedPlatform === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('ALL')}
            >
              Todas las Redes
            </button>
            <button
              className={`analytics-tab-btn ${selectedPlatform === 'FACEBOOK' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('FACEBOOK')}
            >
              Facebook
            </button>
            <button
              className={`analytics-tab-btn ${selectedPlatform === 'TIKTOK' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('TIKTOK')}
            >
              TikTok
            </button>
          </div>

          {/* Botón de limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={12} />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* Fila Inferior: Filtros Jerárquicos en Cascada (Secretaría -> Dirección -> Unidad) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', width: '100%', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {/* Nivel 1: Secretaría Municipal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={13} color="var(--primary-500)" />
              1. Secretaría Municipal / Despacho
            </label>
            <select
              className="analytics-select"
              value={selectedSecretaria}
              onChange={(e) => {
                const sec = e.target.value;
                setSelectedSecretaria(sec);
                setSelectedDirection('ALL');
                setSelectedUnit('ALL');
                setCurrentPage(1);
              }}
            >
              <option value="ALL">🏛️ Todas las Secretarías Municipales</option>
              {LISTA_SECRETARIAS.map((sec) => (
                <option key={sec} value={sec}>
                  🏢 {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 2: Dirección Dependiente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Filter size={13} color={selectedSecretaria !== 'ALL' ? '#10b981' : 'var(--text-faint)'} />
              2. Dirección a su Cargo
            </label>
            <select
              className="analytics-select"
              value={selectedDirection}
              onChange={(e) => {
                const dir = e.target.value;
                setSelectedDirection(dir);
                setSelectedUnit('ALL');
                if (dir !== 'ALL' && selectedSecretaria === 'ALL') {
                  const sec = findSecretariaForDireccion(dir);
                  if (sec) setSelectedSecretaria(sec);
                }
                setCurrentPage(1);
              }}
            >
              <option value="ALL">
                {selectedSecretaria === 'ALL'
                  ? '📁 Todas las Direcciones'
                  : `📁 Todas las Direcciones de ${selectedSecretaria}`}
              </option>
              {availableDirectionsList.map((dir) => (
                <option key={dir} value={dir}>
                  📁 {dir}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 3: Unidad Organizacional a su Cargo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={13} color={selectedDirection !== 'ALL' ? '#3b82f6' : 'var(--text-faint)'} />
              3. Unidad Operativa a su Cargo
            </label>
            <select
              className="analytics-select"
              value={selectedUnit}
              disabled={selectedDirection === 'ALL' && selectedSecretaria === 'ALL'}
              style={{
                opacity: selectedDirection === 'ALL' && selectedSecretaria === 'ALL' ? 0.5 : 1,
                cursor: selectedDirection === 'ALL' && selectedSecretaria === 'ALL' ? 'not-allowed' : 'pointer',
              }}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">
                {selectedDirection === 'ALL' && selectedSecretaria === 'ALL'
                  ? '📋 Seleccione Secretaría o Dirección'
                  : '📋 Todas las Unidades Operativas'}
              </option>
              {availableUnitsList.map((u) => (
                <option key={u} value={u}>
                  📄 {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 18px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* 3. Tarjetas KPIs Principales */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Funcionarios Totales */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Funcionarios Totales
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_employees : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            {overview ? `${overview.kpis.observable_employees} con cuentas vinculadas` : 'Cargando...'}
          </div>
        </div>

        {/* KPI 2: Total Reacciones */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Reacciones
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <ThumbsUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_reactions.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            Promedio: {overview ? `${overview.kpis.average_reactions_per_post} por post` : '—'}
          </div>
        </div>

        {/* KPI 3: Tasa de Participación */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tasa Participación
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {overview ? `${overview.kpis.participation_rate}%` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            {overview ? `${overview.kpis.participating_employees} funcionarios activos` : '—'}
          </div>
        </div>

        {/* KPI 4: Publicaciones Evaluadas */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Posts Auditados
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_publications : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            Evaluadas en la ventana
          </div>
        </div>

        {/* KPI 5: Otros Acompañamientos */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Otros Acompañamientos
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <MessageSquare size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {overview ? (overview.kpis.total_comments + overview.kpis.total_shares).toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            {overview ? `${overview.kpis.total_comments} coment. • ${overview.kpis.total_shares} comp.` : '—'}
          </div>
        </div>
      </div>

      {/* 4. Grilla de Gráficos Estadísticos */}
      <div className="analytics-charts-grid">
        {/* Gráfico 1: Ranking por Dirección */}
        <div className="analytics-chart-card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Ranking de Participación por Dirección
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Tasa de acompañamiento y volumen de reacciones por unidad municipal (haz clic para filtrar).
              </p>
            </div>
          </div>
          <BarChartDirection
            data={overview ? overview.direction_rankings : []}
            selectedDirection={selectedDirection !== 'ALL' ? selectedDirection : null}
            onSelectDirection={handleBarDirectionClick}
          />
        </div>

        {/* Gráfico 2: Taxonomía de Reacciones (Donut) */}
        <div className="analytics-chart-card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Taxonomía y Tipos de Reacciones
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Distribución porcentual de reacciones institucionales y comentarios.
              </p>
            </div>
          </div>
          <DonutChartReactions
            data={overview ? overview.reactions_breakdown : []}
            totalCount={overview ? overview.kpis.total_reactions : 0}
          />
        </div>

        {/* Gráfico 3: Línea de Tendencia Temporal */}
        <div className="analytics-chart-card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Tendencia Cronológica de Acompañamiento
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Evolución diaria de interacciones en el período seleccionado.
              </p>
            </div>
          </div>
          <TimelineChart
            data={overview ? overview.timeline_series : []}
          />
        </div>

        {/* Gráfico 4: Comparativa Bilateral Facebook vs TikTok */}
        <div className="analytics-chart-card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Distribución Bilateral por Red Social
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Comparativa proporcional entre canales oficiales de Facebook y TikTok.
              </p>
            </div>
          </div>
          <PlatformComparisonBar
            comparison={
              overview?.platform_comparison || {
                facebook: { total_reactions: 0, percentage: 50, total_comments: 0, total_shares: 0 },
                tiktok: { total_reactions: 0, percentage: 50, total_comments: 0, total_shares: 0 },
              }
            }
            selectedPlatform={selectedPlatform !== 'ALL' ? selectedPlatform : null}
            onSelectPlatform={(plat) => {
              setSelectedPlatform(plat || 'ALL');
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* 5. Tabla Detallada de Fiscalización por Funcionario */}
      <div className="analytics-table-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Padrón de Funcionarios y Registro de Acompañamiento
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {employeesData ? `${employeesData.total} funcionarios encontrados bajo los filtros actuales` : 'Cargando padrón...'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Buscador en Vivo */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                type="text"
                placeholder="Buscar por nombre o CI..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  padding: '7px 12px 7px 32px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  minWidth: 220,
                }}
              />
            </div>

            {/* Filtro de Participación */}
            <div className="analytics-btn-group">
              <button
                className={`analytics-tab-btn ${participationFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => {
                  setParticipationFilter('ALL');
                  setCurrentPage(1);
                }}
              >
                Todos
              </button>
              <button
                className={`analytics-tab-btn ${participationFilter === 'PARTICIPATED' ? 'active' : ''}`}
                onClick={() => {
                  setParticipationFilter('PARTICIPATED');
                  setCurrentPage(1);
                }}
              >
                Con Reacción
              </button>
              <button
                className={`analytics-tab-btn ${participationFilter === 'NO_REACTION' ? 'active' : ''}`}
                onClick={() => {
                  setParticipationFilter('NO_REACTION');
                  setCurrentPage(1);
                }}
              >
                Sin Reacción
              </button>
            </div>
          </div>
        </div>

        {/* Tabla Responsiva */}
        <div style={{ overflowX: 'auto' }}>
          <table className="analytics-table">
            <thead>
              <tr>
                <th style={{ width: '56px', textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>N°</th>
                <th>Funcionario / CI</th>
                <th>Secretaría / Dirección</th>
                <th>Unidad Asignada</th>
                <th>Cuentas Vinculadas</th>
                <th style={{ textAlign: 'center' }}>Total Reacciones</th>
                <th style={{ textAlign: 'center' }}>Posts Auditados</th>
                <th style={{ textAlign: 'center' }}>Tasa Acompañamiento</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loadingEmployees ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Cargando registros de funcionarios...</p>
                  </td>
                </tr>
              ) : employeesData && employeesData.items.length > 0 ? (
                employeesData.items.map((emp, idx) => (
                  <tr key={emp.employee_id}>
                    <td style={{ width: '56px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '28px',
                          height: '24px',
                          padding: '0 6px',
                          borderRadius: '12px',
                          background: 'rgba(6, 182, 212, 0.12)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#38bdf8',
                        }}
                      >
                        {(currentPage - 1) * pageSize + idx + 1}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{emp.full_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>CI / ID: {emp.document_number}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{emp.direction}</div>
                      {emp.secretaria && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🏛️ {emp.secretaria}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ color: '#cbd5e1' }}>{emp.unit || 'No asignada'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{emp.position}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {emp.facebook_account ? (
                          <span style={{ fontSize: '0.72rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                            FB: @{emp.facebook_account}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>FB: No vinculada</span>
                        )}
                        {emp.tiktok_account ? (
                          <span style={{ fontSize: '0.72rem', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899' }} />
                            TT: @{emp.tiktok_account}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>TT: No vinculada</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: emp.total_reactions > 0 ? '#38bdf8' : 'var(--text-faint)' }}>
                        {emp.total_reactions}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {emp.participated_posts_count} / {emp.total_available_posts}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(emp.participation_rate, 100)}%`,
                              height: '100%',
                              background: emp.participation_rate >= 50 ? '#10b981' : emp.participation_rate > 0 ? '#f59e0b' : '#ef4444',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>
                          {emp.participation_rate}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {emp.has_participated ? (
                        <span className="badge badge-success" style={{ gap: '4px' }}>
                          <CheckCircle2 size={12} />
                          Activo
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ gap: '4px' }}>
                          <XCircle size={12} />
                          Sin Acción
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No se encontraron funcionarios que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {employeesData && employeesData.total_pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Página {employeesData.page} de {employeesData.total_pages} ({employeesData.total} funcionarios)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(employeesData.total_pages, p + 1))}
                disabled={currentPage >= employeesData.total_pages}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  cursor: currentPage >= employeesData.total_pages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= employeesData.total_pages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AnalyticsDashboardPage;
