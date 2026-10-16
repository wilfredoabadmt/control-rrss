import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Layers,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  analyticsApi,
  AnalyticsFilters,
  AnalyticsOverviewResponse,
  AnalyticsEmployeesPageResponse,
  PostCommentsPageResponse,
  CommentFilters,
  EmployeeAnalyticsItem,
} from '../api/analytics';
import { listPublicationsApi, PublicationItem } from '../api/publications';
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
  // Pestaña activa principal
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');

  // Estados de datos generales
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [employeesData, setEmployeesData] = useState<AnalyticsEmployeesPageResponse | null>(null);
  const [publicationsList, setPublicationsList] = useState<PublicationItem[]>([]);
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
  const [selectedPublication, setSelectedPublication] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [participationFilter, setParticipationFilter] = useState<
    'ALL' | 'PARTICIPATED' | 'WITH_REACTION' | 'WITH_COMMENT' | 'WITH_BOTH' | 'NO_REACTION' | 'NO_ACTIVITY'
  >('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Estados específicos para Auditoría de Comentarios (Pestaña 2)
  const [commentsData, setCommentsData] = useState<PostCommentsPageResponse | null>(null);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [commentSearchTerm, setCommentSearchTerm] = useState<string>('');
  const [commentAuthorType, setCommentAuthorType] = useState<'ALL' | 'EMPLOYEES_ONLY' | 'CITIZENS_ONLY'>('ALL');
  const [commentsPage, setCommentsPage] = useState<number>(1);
  const commentsPageSize = 15;

  // Modal para inspeccionar comentarios de un funcionario individual
  const [modalEmployee, setModalEmployee] = useState<EmployeeAnalyticsItem | null>(null);

  // Direcciones disponibles en cascada según la Secretaría seleccionada
  const availableDirectionsList = useMemo(() => {
    return getDireccionesBySecretaria(selectedSecretaria);
  }, [selectedSecretaria]);

  // Unidades disponibles en cascada según la Dirección seleccionada
  const availableUnitsList = useMemo(() => {
    return getUnidadesByDireccion(selectedSecretaria, selectedDirection);
  }, [selectedSecretaria, selectedDirection]);

  // Cargar lista de publicaciones monitoreadas para filtros
  const fetchPublications = useCallback(async () => {
    try {
      const res = await listPublicationsApi({ page: 1, page_size: 100 });
      setPublicationsList(res.items || []);
    } catch (err) {
      console.warn('No se pudo precargar la lista de publicaciones para filtro:', err);
    }
  }, []);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  // Cargar Overview de Analítica
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
        publication_id: selectedPublication !== 'ALL' ? selectedPublication : undefined,
      };
      const res = await analyticsApi.getOverview(filters);
      setOverview(res);
    } catch (err: any) {
      console.error('Error al cargar analítica de reacciones:', err);
      setError('No se pudo cargar el resumen analítico. Verifique la conexión con el servidor.');
    } finally {
      setLoadingOverview(false);
    }
  }, [daysPreset, selectedSecretaria, selectedDirection, selectedUnit, selectedPlatform, selectedPublication]);

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
        publication_id: selectedPublication !== 'ALL' ? selectedPublication : undefined,
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
  }, [
    daysPreset,
    selectedSecretaria,
    selectedDirection,
    selectedUnit,
    selectedPlatform,
    selectedPublication,
    searchTerm,
    participationFilter,
    currentPage,
  ]);

  // Cargar Auditoría de Comentarios
  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const filters: CommentFilters = {
        publication_id: selectedPublication !== 'ALL' ? selectedPublication : undefined,
        author_type: commentAuthorType,
        secretaria: selectedSecretaria !== 'ALL' ? selectedSecretaria : undefined,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
        search: commentSearchTerm.trim() || undefined,
        page: commentsPage,
        page_size: commentsPageSize,
      };
      const res = await analyticsApi.getComments(filters);
      setCommentsData(res);
    } catch (err: any) {
      console.error('Error al cargar comentarios auditados:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [
    selectedPublication,
    commentAuthorType,
    selectedSecretaria,
    selectedDirection,
    selectedUnit,
    commentSearchTerm,
    commentsPage,
  ]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'comments') {
      fetchComments();
    }
  }, [activeTab, fetchComments]);

  // Manejador de exportación a Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const blob = await analyticsApi.exportExcel({
        secretaria: selectedSecretaria !== 'ALL' ? selectedSecretaria : undefined,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
        publication_id: selectedPublication !== 'ALL' ? selectedPublication : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `GAMEA_Analitica_Reacciones_Comentarios_${ts}.xlsx`;
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
      if (activeTab === 'comments') fetchComments();
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
    setSelectedPublication('ALL');
    setSearchTerm('');
    setParticipationFilter('ALL');
    setCurrentPage(1);
    setCommentSearchTerm('');
    setCommentAuthorType('ALL');
    setCommentsPage(1);
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
    selectedPublication !== 'ALL' ||
    searchTerm.trim() !== '' ||
    participationFilter !== 'ALL' ||
    commentSearchTerm.trim() !== '' ||
    commentAuthorType !== 'ALL';

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--primary-500)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            <BarChart3 size={16} />
            <span>Fiscalización Institucional de Redes Sociales — GAMEA SDD</span>
          </div>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: '4px 0',
            }}
          >
            Analítica de Reacciones, Comentarios y Acompañamiento
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Conteo y auditoría automatizada de comentarios, identificación epistémica de autores (funcionarios vs. ciudadanos) y cruce con reacciones oficiales.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              fetchOverview();
              fetchEmployees();
              if (activeTab === 'comments') fetchComments();
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

      {/* Navegación por Pestañas Principales (Métricas vs. Auditoría de Comentarios) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            background: activeTab === 'overview' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'overview' ? 'rgba(6, 182, 212, 0.4)' : 'transparent',
            borderBottomColor: activeTab === 'overview' ? '#0b0f19' : 'transparent',
            color: activeTab === 'overview' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <BarChart3 size={16} />
          <span>Métricas & Padrón de Acompañamiento</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px 10px 0 0',
            background: activeTab === 'comments' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === 'comments' ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
            borderBottomColor: activeTab === 'comments' ? '#0b0f19' : 'transparent',
            color: activeTab === 'comments' ? '#34d399' : 'var(--text-muted)',
            fontWeight: activeTab === 'comments' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <MessageSquare size={16} />
          <span>Auditoría de Comentarios & Quiénes Comentaron</span>
          {overview?.kpis?.total_comments ? (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                fontWeight: 700,
              }}
            >
              {overview.kpis.total_comments}
            </span>
          ) : null}
        </button>
      </div>

      {/* 2. Barra de Filtros Jerárquicos en Cascada */}
      <div className="analytics-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
        {/* Fila Superior: Presets de Ventana Temporal y Redes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Presets de Ventana Temporal */}
          <div className="analytics-btn-group">
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
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
              className={`analytics-tab-btn ${selectedPlatform === 'facebook' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('facebook')}
              style={{ color: selectedPlatform === 'facebook' ? '#60a5fa' : undefined }}
            >
              Facebook
            </button>
            <button
              className={`analytics-tab-btn ${selectedPlatform === 'tiktok' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('tiktok')}
              style={{ color: selectedPlatform === 'tiktok' ? '#f472b6' : undefined }}
            >
              TikTok
            </button>
          </div>

          {/* Selector de Publicación Evaluada */}
          {publicationsList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                className="analytics-select"
                value={selectedPublication}
                onChange={(e) => {
                  setSelectedPublication(e.target.value);
                  setCurrentPage(1);
                  setCommentsPage(1);
                }}
                style={{ minWidth: 220, maxWidth: 300 }}
              >
                <option value="ALL">📌 Todos los Posts Evaluados ({publicationsList.length})</option>
                {publicationsList.map((pub) => {
                  const title = pub.title || pub.post_url || `Post ${pub.id.slice(0, 8)}`;
                  const truncated = title.length > 40 ? title.slice(0, 40) + '...' : title;
                  return (
                    <option key={pub.id} value={pub.id}>
                      [{pub.platform_name.toUpperCase()}] {truncated}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Botón de limpiar filtros si hay alguno activo */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
              <span>Restablecer Filtros</span>
            </button>
          )}
        </div>

        {/* Fila Inferior: Desplegables de Cascada Jerárquica */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Nivel 1: Secretaría Municipal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Filter size={13} color="var(--primary-500)" />
              1. Secretaría Municipal / Entidad
            </label>
            <select
              className="analytics-select"
              value={selectedSecretaria}
              onChange={(e) => {
                setSelectedSecretaria(e.target.value);
                setSelectedDirection('ALL');
                setSelectedUnit('ALL');
                setCurrentPage(1);
              }}
            >
              <option value="ALL">🏛️ Todas las Secretarías y Despacho</option>
              {LISTA_SECRETARIAS.map((sec) => (
                <option key={sec} value={sec}>
                  🏛️ {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 2: Dirección o Subalcaldía */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Layers size={13} color="var(--accent-purple)" />
              2. Dirección o Subalcaldía Dependiente
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
                  ? '📁 Todas las Direcciones y Subalcaldías'
                  : selectedSecretaria.toLowerCase().includes('subalcal')
                  ? '🏘️ Todas las Subalcaldías'
                  : `📁 Todas las Direcciones de ${selectedSecretaria}`}
              </option>
              {availableDirectionsList.map((dir) => (
                <option key={dir} value={dir}>
                  {dir.toLowerCase().includes('subalcal') ? '🏘️' : '📁'} {dir}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel 3: Unidad Operativa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
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
                  ? '📋 Seleccione Secretaría, Subalcaldía o Dirección'
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
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '14px 18px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* 3. Tarjetas KPIs Principales con Desglose de Comentarios y Participación Integral */}
      <div
        className="analytics-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI 1: Funcionarios Totales */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Funcionarios Padrón
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_employees : '—'}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            {overview ? `${overview.kpis.observable_employees} con redes vinculadas` : 'Cargando...'}
          </div>
        </div>

        {/* KPI 2: Total Reacciones */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Reacciones
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <ThumbsUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_reactions.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            Promedio: {overview ? `${overview.kpis.average_reactions_per_post} por post` : '—'}
          </div>
        </div>

        {/* KPI 3: Total Comentarios (Con Desglose Funcionario vs Ciudadano) */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Comentarios
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <MessageSquare size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_comments.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#6ee7b7', fontWeight: 600 }}>
              🏢 {overview?.kpis?.total_employee_comments ?? 0} func.
            </span>
            <span>•</span>
            <span style={{ color: '#94a3b8' }}>
              👥 {overview?.kpis?.total_citizen_comments ?? 0} ciud.
            </span>
          </div>
        </div>

        {/* KPI 4: Participación Integral (Reaccionó + Comentó) */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Participación Integral
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Sparkles size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.2 }}>
            {overview ? (overview.kpis.employees_with_both ?? 0) : '—'}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            Reaccionaron y comentaron simultáneamente
          </div>
        </div>

        {/* KPI 5: Tasa de Participación */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tasa Acompañamiento
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {overview ? `${overview.kpis.participation_rate}%` : '—'}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            {overview ? `${overview.kpis.participating_employees} funcionarios activos` : '—'}
          </div>
        </div>

        {/* KPI 6: Posts Auditados */}
        <div className="analytics-kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Posts Auditados
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {overview ? overview.kpis.total_publications : '—'}
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '4px' }}>
            Evaluadas en la ventana
          </div>
        </div>
      </div>

      {/* CONTENIDO CONDICIONAL SEGÚN PESTAÑA ACTIVA */}
      {activeTab === 'overview' ? (
        <>
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
              <TimelineChart data={overview ? overview.timeline_series : []} />
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Padrón de Funcionarios y Registro de Acompañamiento
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {employeesData
                    ? `${employeesData.total} funcionarios encontrados bajo los filtros actuales`
                    : 'Cargando padrón...'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Buscador en Vivo */}
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-faint)',
                    }}
                  />
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

                {/* Filtro de Participación Ampliado */}
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
                    className={`analytics-tab-btn ${participationFilter === 'WITH_REACTION' ? 'active' : ''}`}
                    onClick={() => {
                      setParticipationFilter('WITH_REACTION');
                      setCurrentPage(1);
                    }}
                  >
                    Con Reacción
                  </button>
                  <button
                    className={`analytics-tab-btn ${participationFilter === 'WITH_COMMENT' ? 'active' : ''}`}
                    onClick={() => {
                      setParticipationFilter('WITH_COMMENT');
                      setCurrentPage(1);
                    }}
                  >
                    Con Comentario
                  </button>
                  <button
                    className={`analytics-tab-btn ${participationFilter === 'WITH_BOTH' ? 'active' : ''}`}
                    onClick={() => {
                      setParticipationFilter('WITH_BOTH');
                      setCurrentPage(1);
                    }}
                    title="Funcionarios con Participación Integral (reaccionaron y comentaron)"
                  >
                    Ambos ⭐
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
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th style={{ width: '56px', textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>N°</th>
                    <th>Funcionario / CI</th>
                    <th>Secretaría / Dirección</th>
                    <th>Unidad Asignada</th>
                    <th>Cuentas Vinculadas</th>
                    <th style={{ textAlign: 'center' }}>Reacciones</th>
                    <th style={{ textAlign: 'center' }}>Comentarios</th>
                    <th style={{ textAlign: 'center' }}>Posts Auditados</th>
                    <th style={{ textAlign: 'center' }}>Tasa Acompañamiento</th>
                    <th style={{ textAlign: 'center' }}>Estado Integral</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
                          <span
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              color: emp.total_reactions > 0 ? '#38bdf8' : 'var(--text-faint)',
                            }}
                          >
                            {emp.total_reactions}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {emp.total_comments > 0 ? (
                            <button
                              onClick={() => setModalEmployee(emp)}
                              title="Ver comentarios emitidos por este funcionario"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#34d399',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              <MessageCircle size={12} />
                              <span>{emp.total_comments}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                            {emp.participated_posts_count} / {emp.total_available_posts}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <div style={{ width: 55, height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(emp.participation_rate, 100)}%`,
                                  height: '100%',
                                  background:
                                    emp.participation_rate >= 50
                                      ? '#10b981'
                                      : emp.participation_rate > 0
                                      ? '#f59e0b'
                                      : '#ef4444',
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
                          {emp.has_both ? (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.5)',
                                color: '#fbbf24',
                                fontSize: '0.72rem',
                                padding: '3px 8px',
                                gap: '4px',
                              }}
                            >
                              <Sparkles size={11} />
                              Integral
                            </span>
                          ) : emp.has_participated ? (
                            <span className="badge badge-success" style={{ gap: '4px', fontSize: '0.72rem', padding: '3px 8px' }}>
                              <CheckCircle2 size={11} />
                              Reaccionó
                            </span>
                          ) : emp.has_commented ? (
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.5)',
                                color: '#34d399',
                                fontSize: '0.72rem',
                                padding: '3px 8px',
                                gap: '4px',
                              }}
                            >
                              <MessageSquare size={11} />
                              Comentó
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ gap: '4px', fontSize: '0.72rem', padding: '3px 8px' }}>
                              <XCircle size={11} />
                              Sin Acción
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No se encontraron funcionarios que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {employeesData && employeesData.total_pages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
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
        </>
      ) : (
        /* PESTAÑA 2: AUDITORÍA DE COMENTARIOS & QUIÉNES COMENTARON */
        <div className="analytics-table-container">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#34d399',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '2px',
                }}
              >
                <UserCheck size={16} />
                <span>Auditoría Epistémica de Autores de Comentarios</span>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Comentarios y Quiénes Comentaron los Posts Evaluados
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Extracción automatizada, discriminación entre funcionarios GAMEA confirmados y comentarios ciudadanos, y cruce con reacciones del mismo post.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Buscador de Comentarios */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-faint)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar autor o texto del comentario..."
                  value={commentSearchTerm}
                  onChange={(e) => {
                    setCommentSearchTerm(e.target.value);
                    setCommentsPage(1);
                  }}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-main)',
                    padding: '7px 12px 7px 32px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    minWidth: 260,
                  }}
                />
              </div>

              {/* Filtro por Tipo de Autor */}
              <div className="analytics-btn-group">
                <button
                  className={`analytics-tab-btn ${commentAuthorType === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    setCommentAuthorType('ALL');
                    setCommentsPage(1);
                  }}
                >
                  Todos ({commentsData?.total ?? 0})
                </button>
                <button
                  className={`analytics-tab-btn ${commentAuthorType === 'EMPLOYEES_ONLY' ? 'active' : ''}`}
                  onClick={() => {
                    setCommentAuthorType('EMPLOYEES_ONLY');
                    setCommentsPage(1);
                  }}
                  style={{ color: commentAuthorType === 'EMPLOYEES_ONLY' ? '#34d399' : undefined }}
                >
                  🏢 Solo Funcionarios ({commentsData?.total_employee_comments ?? 0})
                </button>
                <button
                  className={`analytics-tab-btn ${commentAuthorType === 'CITIZENS_ONLY' ? 'active' : ''}`}
                  onClick={() => {
                    setCommentAuthorType('CITIZENS_ONLY');
                    setCommentsPage(1);
                  }}
                  style={{ color: commentAuthorType === 'CITIZENS_ONLY' ? '#94a3b8' : undefined }}
                >
                  👥 Solo Ciudadanos ({commentsData?.total_citizen_comments ?? 0})
                </button>
              </div>
            </div>
          </div>

          {/* Feed de Comentarios Auditados */}
          {loadingComments ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Cargando y cotejando comentarios con el padrón...</p>
            </div>
          ) : commentsData && commentsData.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {commentsData.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(17, 24, 39, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Encabezado del Comentario: Autor, Estado Epistémico, Timestamp y Cruce con Reacción */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {item.author.is_employee ? (
                          <>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.5)',
                                color: '#34d399',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={12} />
                              FUNCIONARIO CONFIRMADO (GAMEA)
                            </span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                              {item.author.full_name || item.author.author_name}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: 'rgba(148, 163, 184, 0.15)',
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                color: '#cbd5e1',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <Users size={12} />
                              COMENTARIO CIUDADANO
                            </span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>
                              {item.author.author_name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Metadatos institucionales del autor funcionario */}
                      {item.author.is_employee && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginTop: '3px',
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {item.author.secretaria && <span>🏛️ {item.author.secretaria}</span>}
                          {item.author.direction && <span>📁 {item.author.direction}</span>}
                          {item.author.unit && <span>📄 {item.author.unit}</span>}
                          {item.author.position && <span>💼 {item.author.position}</span>}
                          {item.author.document_number && <span>🪪 ID: {item.author.document_number}</span>}
                        </div>
                      )}
                    </div>

                    {/* Cruce con Reacción y Fecha */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {item.associated_reaction ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          <Sparkles size={12} />
                          Reaccionó ({item.associated_reaction}) + Comentó
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                          }}
                        >
                          Solo Comentario
                        </span>
                      )}

                      <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('es-BO', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Fecha no registrada'}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo del Comentario con estilo de globo de cita */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderLeft: item.author.is_employee
                        ? '3px solid #10b981'
                        : '3px solid rgba(148, 163, 184, 0.4)',
                      padding: '10px 14px',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '0.85rem',
                      color: '#f9fafb',
                      lineHeight: 1.5,
                      fontStyle: 'normal',
                      margin: '8px 0',
                    }}
                  >
                    "{item.content_text}"
                  </div>

                  {/* Pie: Referencia a la publicación oficial evaluada */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: 'var(--text-faint)',
                      paddingTop: '6px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={12} />
                      Post Evaluado: <strong style={{ color: '#cbd5e1' }}>{item.post_title || 'Publicación Institucional'}</strong>
                    </span>
                    {item.post_url && (
                      <a
                        href={item.post_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#38bdf8',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        <span>Ver en Red Social</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
              <h3 style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '6px' }}>
                No se encontraron comentarios para los filtros aplicados
              </h3>
              <p style={{ fontSize: '0.8rem', maxWidth: 450, margin: '0 auto' }}>
                Ajuste la ventana de días, seleccione otra publicación o verifique que el webhook/sincronización de Meta esté recibiendo eventos de comentarios.
              </p>
            </div>
          )}

          {/* Paginación de Comentarios */}
          {commentsData && commentsData.total_pages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '20px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Página {commentsData.page} de {commentsData.total_pages} ({commentsData.total} comentarios)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
                  disabled={commentsPage <= 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    cursor: commentsPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: commentsPage <= 1 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <button
                  onClick={() => setCommentsPage((p) => Math.min(commentsData.total_pages, p + 1))}
                  disabled={commentsPage >= commentsData.total_pages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    cursor: commentsPage >= commentsData.total_pages ? 'not-allowed' : 'pointer',
                    opacity: commentsPage >= commentsData.total_pages ? 0.5 : 1,
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
      )}

      {/* MODAL: HISTORIAL DE COMENTARIOS DE UN FUNCIONARIO INDIVIDUAL */}
      {modalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setModalEmployee(null)}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '2px',
                  }}
                >
                  <MessageSquare size={14} />
                  <span>Auditoría de Comentarios por Funcionario</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {modalEmployee.full_name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {modalEmployee.direction} • {modalEmployee.position} (ID: {modalEmployee.document_number})
                </p>
              </div>

              <button
                onClick={() => setModalEmployee(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Resumen */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Comentarios Emitidos
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
                  {modalEmployee.total_comments}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Reacciones Emitidas
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>
                  {modalEmployee.total_reactions}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Participación Integral
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
                  {modalEmployee.has_both ? 'Sí ⭐' : 'No'}
                </div>
              </div>
            </div>

            {/* Lista de Comentarios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modalEmployee.comments && modalEmployee.comments.length > 0 ? (
                modalEmployee.comments.map((c, i) => (
                  <div
                    key={c.interaction_id || i}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: 'var(--text-faint)',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{c.post_title}</span>
                      {c.created_at && (
                        <span>
                          {new Date(c.created_at).toLocaleString('es-BO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderLeft: '3px solid #10b981',
                        padding: '8px 12px',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.85rem',
                        color: '#f9fafb',
                        fontStyle: 'normal',
                      }}
                    >
                      "{c.comment_text}"
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        fontSize: '0.72rem',
                      }}
                    >
                      {c.associated_reaction ? (
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                          ❤️ Reaccionó con {c.associated_reaction} en este post
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>Sin reacción en este post</span>
                      )}

                      {c.post_url && (
                        <a
                          href={c.post_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#38bdf8',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Ver post</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>
                  No se registraron comentarios individuales para este funcionario en la ventana de evaluación seleccionada.
                </p>
              )}
            </div>

            {/* Botón de Cierre */}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setModalEmployee(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboardPage;
