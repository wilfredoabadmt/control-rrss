import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  CheckSquare,
  Edit3,
  ExternalLink,
  Facebook,
  FileSpreadsheet,
  Filter,
  Layers,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Square,
  ThumbsUp,
  Upload,
  UserCheck,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';

import { monitoringApi } from '../api/monitoring';
import { FacebookRecentPostItem, getFacebookRecentPostsApi } from '../api/publications';
import { LISTA_DIRECCIONES, ORGANIGRAMA_GAMEA } from '../data/organigrama';
import {
  ActivityMatrixResponse,
  ConnectorConfigItem,
  ConnectorsDiagnosticResponse,
  MonitoredPerson,
  RunSyncResponse,
  TestConnectionResponse,
} from '../types';

// Ícono SVG estilizado de TikTok
const TikTokIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// Cargos normalizados oficiales del Gobierno Autónomo Municipal de El Alto
export const CARGOS_GAMEA = [
  'Especialista en Redes Sociales',
  'Community Manager',
  'Responsable de Medios Digitales',
  'Diseñador Gráfico & Contenido',
  'Periodista / Redactor Institucional',
  'Jefe de Unidad',
  'Director / Directora Municipal',
  'Secretario / Secretaria Municipal',
  'Técnico de Monitoreo & Comunicación',
  'Servidor Público',
  'Apoyo Administrativo',
  'Personal Técnico Especializado',
];

export const MonitoringHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'audience' | 'connectors'>('matrix');

  // Estados de datos
  const [matrixData, setMatrixData] = useState<ActivityMatrixResponse | null>(null);
  const [audienceList, setAudienceList] = useState<MonitoredPerson[]>([]);
  const [connectorConfigs, setConnectorConfigs] = useState<ConnectorConfigItem[]>([]);
  const [diagResponse, setDiagResponse] = useState<ConnectorsDiagnosticResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<RunSyncResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros de la Matriz
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterParticipation, setFilterParticipation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [showAddPersonModal, setShowAddPersonModal] = useState<boolean>(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  // Selección Interactiva de Publicaciones Oficiales
  const [syncModalTab, setSyncModalTab] = useState<'select' | 'quick'>('select');
  const [fbRecentPosts, setFbRecentPosts] = useState<FacebookRecentPostItem[]>([]);
  const [loadingFbPosts, setLoadingFbPosts] = useState<boolean>(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [syncMaxPosts, setSyncMaxPosts] = useState<number>(15);

  // Formulario de Adición de Persona (Estructura Organigrama GAMEA 2026)
  const [newPersonCi, setNewPersonCi] = useState<string>('');
  const [newPersonFirstName, setNewPersonFirstName] = useState<string>('');
  const [newPersonLastName, setNewPersonLastName] = useState<string>('');
  const [newPersonDirection, setNewPersonDirection] = useState<string>(LISTA_DIRECCIONES[1] || 'Dirección de Comunicación');
  const [newPersonUnit, setNewPersonUnit] = useState<string>('Unidad de Prensa');
  const [newPersonPosition, setNewPersonPosition] = useState<string>('Especialista en Redes Sociales');
  const [newPersonCustomPosition, setNewPersonCustomPosition] = useState<string>('');
  const [newPersonFacebook, setNewPersonFacebook] = useState<string>('');
  const [newPersonTiktok, setNewPersonTiktok] = useState<string>('');

  // Formulario de Edición de Persona (Modificaciones en Monitoreo)
  const [showEditPersonModal, setShowEditPersonModal] = useState<boolean>(false);
  const [editingPersonCi, setEditingPersonCi] = useState<string>('');
  const [editingPersonFirstName, setEditingPersonFirstName] = useState<string>('');
  const [editingPersonLastName, setEditingPersonLastName] = useState<string>('');
  const [editingPersonDirection, setEditingPersonDirection] = useState<string>('');
  const [editingPersonUnit, setEditingPersonUnit] = useState<string>('');
  const [editingPersonPosition, setEditingPersonPosition] = useState<string>('');
  const [editingPersonCustomPosition, setEditingPersonCustomPosition] = useState<string>('');
  const [editingPersonFacebook, setEditingPersonFacebook] = useState<string>('');
  const [editingPersonTiktok, setEditingPersonTiktok] = useState<string>('');

  // Formulario de Importación Masiva
  const [bulkCsvText, setBulkCsvText] = useState<string>('');
  const [bulkDelimiter, setBulkDelimiter] = useState<string>(',');

  // Estado de Prueba de Conexión
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Carga de Datos
  // ---------------------------------------------------------------------------

  const fetchMatrix = async () => {
    try {
      setErrorMessage(null);
      const data = await monitoringApi.getActivityMatrix({
        platform: filterPlatform !== 'ALL' ? filterPlatform : undefined,
        department: filterDepartment !== 'ALL' ? filterDepartment : undefined,
        participation_status: filterParticipation !== 'ALL' ? filterParticipation : undefined,
        search: searchQuery.trim() ? searchQuery.trim() : undefined,
      });
      setMatrixData(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('No se pudo cargar la matriz de actividades.');
    }
  };

  const fetchAudience = async () => {
    try {
      const data = await monitoringApi.getAudience();
      setAudienceList(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchConfigs = async () => {
    try {
      const configs = await monitoringApi.getConnectorConfigs();
      setConnectorConfigs(configs);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const diag = await monitoringApi.getConnectorsDiagnostics();
      setDiagResponse(diag);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchMatrix(), fetchAudience(), fetchConfigs(), fetchDiagnostics()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [filterPlatform, filterDepartment, filterParticipation, searchQuery]);

  // ---------------------------------------------------------------------------
  // Acciones de Monitoreo & Sincronización
  // ---------------------------------------------------------------------------

  const handleOpenSyncModal = async () => {
    setShowSyncModal(true);
    setLoadingFbPosts(true);
    try {
      const posts = await getFacebookRecentPostsApi();
      setFbRecentPosts(posts || []);
      if (posts && posts.length > 0) {
        setSelectedPostIds(posts.map((p) => p.id));
      }
    } catch (err) {
      console.error('Error al cargar posts oficiales de Facebook:', err);
      setFbRecentPosts([]);
    } finally {
      setLoadingFbPosts(false);
    }
  };

  const handleToggleSelectPost = (postId: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleSelectAllPosts = () => {
    if (selectedPostIds.length === fbRecentPosts.length) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(fbRecentPosts.map((p) => p.id));
    }
  };

  const handleRunSync = async (platform: string, maxPosts: number, publicationIds?: string[]) => {
    try {
      setIsSyncing(true);
      setErrorMessage(null);
      const res = await monitoringApi.runSocialSync({
        platform,
        max_posts: maxPosts,
        fetch_new_posts: true,
        publication_ids: publicationIds && publicationIds.length > 0 ? publicationIds : undefined,
      });
      setSyncResult(res);
      if (res.status === 'FAILED') {
        setErrorMessage(res.details || 'La sincronización no pudo completarse. Revise la conexión con la red social.');
      } else {
        setSuccessMessage('Extracción y cruce de interacciones completado exitosamente.');
      }
      await fetchMatrix();
      await fetchAudience();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message || 'Error al ejecutar la extracción y cruce de datos.';
      setErrorMessage(detail);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await monitoringApi.exportMatrixExcel({
        platform: filterPlatform !== 'ALL' ? filterPlatform : undefined,
        department: filterDepartment !== 'ALL' ? filterDepartment : undefined,
      });
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message || 'Error al generar el informe en Excel.';
      setErrorMessage(detail);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddPersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonCi.trim() || !newPersonFirstName.trim() || !newPersonLastName.trim()) {
      setErrorMessage('C.I., Nombres y Apellidos son obligatorios.');
      return;
    }

    const finalDepartment = newPersonUnit || newPersonDirection;
    const finalPosition =
      newPersonPosition === 'OTRO'
        ? newPersonCustomPosition.trim() || 'Servidor Público'
        : newPersonPosition;

    try {
      await monitoringApi.addMonitoredPerson({
        ci: newPersonCi.trim(),
        first_name: newPersonFirstName.trim(),
        last_name: newPersonLastName.trim(),
        department: finalDepartment,
        position: finalPosition,
        facebook_account: newPersonFacebook.trim(),
        tiktok_account: newPersonTiktok.trim(),
      });
      setShowAddPersonModal(false);
      setSuccessMessage(
        `Persona ${newPersonFirstName} ${newPersonLastName} registrada correctamente en ${finalDepartment}.`
      );
      // Limpiar formulario
      setNewPersonCi('');
      setNewPersonFirstName('');
      setNewPersonLastName('');
      setNewPersonFacebook('');
      setNewPersonTiktok('');
      await fetchAudience();
      await fetchMatrix();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Error al adicionar la persona al monitoreo.');
    }
  };

  const handleOpenEditPerson = (person: MonitoredPerson) => {
    setEditingPersonCi(person.ci);
    setEditingPersonFirstName(person.first_name);
    setEditingPersonLastName(person.last_name);

    // Resolver Dirección y Unidad desde el Organigrama Oficial
    let foundDir = '';
    let foundUnit = person.department || '';
    for (const [dir, units] of Object.entries(ORGANIGRAMA_GAMEA)) {
      if (
        units.some((u) => u.toLowerCase() === foundUnit.toLowerCase()) ||
        dir.toLowerCase() === foundUnit.toLowerCase()
      ) {
        foundDir = dir;
        const matchingUnit = units.find((u) => u.toLowerCase() === foundUnit.toLowerCase());
        if (matchingUnit) foundUnit = matchingUnit;
        break;
      }
    }
    if (!foundDir) {
      foundDir = LISTA_DIRECCIONES[1] || 'Dirección de Comunicación';
    }
    setEditingPersonDirection(foundDir);
    setEditingPersonUnit(foundUnit || ORGANIGRAMA_GAMEA[foundDir]?.[0] || '');

    // Resolver Cargo
    const isStandardPos = CARGOS_GAMEA.includes(person.position);
    if (isStandardPos) {
      setEditingPersonPosition(person.position);
      setEditingPersonCustomPosition('');
    } else {
      setEditingPersonPosition('OTRO');
      setEditingPersonCustomPosition(person.position || '');
    }

    setEditingPersonFacebook(person.facebook_account || '');
    setEditingPersonTiktok(person.tiktok_account || '');
    setShowEditPersonModal(true);
  };

  const handleEditPersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDepartment = editingPersonUnit || editingPersonDirection;
    const finalPosition =
      editingPersonPosition === 'OTRO'
        ? editingPersonCustomPosition.trim() || 'Servidor Público'
        : editingPersonPosition;

    try {
      await monitoringApi.addMonitoredPerson({
        ci: editingPersonCi.trim(),
        first_name: editingPersonFirstName.trim(),
        last_name: editingPersonLastName.trim(),
        department: finalDepartment,
        position: finalPosition,
        facebook_account: editingPersonFacebook.trim(),
        tiktok_account: editingPersonTiktok.trim(),
      });
      setShowEditPersonModal(false);
      setSuccessMessage(
        `Datos de ${editingPersonFirstName} ${editingPersonLastName} actualizados exitosamente en el Centro de Monitoreo.`
      );
      await fetchAudience();
      await fetchMatrix();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Error al actualizar la persona.');
    }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) {
      setErrorMessage('Ingrese los datos en formato CSV o JSON.');
      return;
    }

    try {
      const res = await monitoringApi.bulkImportAudience({
        raw_text: bulkCsvText,
        delimiter: bulkDelimiter,
      });
      setShowBulkImportModal(false);
      setBulkCsvText('');
      setSuccessMessage(
        `Importación completada: ${res.created_count} creados, ${res.updated_count} actualizados, ${res.failed_count} fallidos.`
      );
      await fetchAudience();
      await fetchMatrix();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message || 'Error al realizar la importación masiva.';
      setErrorMessage(detail);
    }
  };

  const handleTestConnection = async (platformName: string) => {
    try {
      setTestingPlatform(platformName);
      setTestResult(null);
      const cfg = connectorConfigs.find((c) => c.platform_name === platformName);
      const res = await monitoringApi.testConnection({
        platform_name: platformName,
        target_account_id: cfg?.target_account_id,
        extraction_mode: cfg?.extraction_mode,
        access_token: cfg?.access_token || undefined,
        api_secret: cfg?.api_secret || undefined,
      });
      setTestResult(res);
      await fetchDiagnostics();
      await fetchConfigs();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message || 'No se pudo conectar con el endpoint de prueba.';
      setTestResult({
        platform_name: platformName,
        success: false,
        status: 'ERROR',
        message: detail,
      });
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleUpdateConfigs = async () => {
    try {
      await monitoringApi.updateConnectorConfigs(connectorConfigs);
      setSuccessMessage('Parámetros de conectores guardados con éxito.');
      await fetchConfigs();
      await fetchDiagnostics();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Error al guardar la configuración de los conectores.');
    }
  };

  // Departamentos únicos para el filtro
  const departments = Array.from(
    new Set(audienceList.map((a) => a.department).filter(Boolean))
  ).sort();

  return (
    <div style={{ padding: '28px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* --------------------------------------------------------------------- */}
      {/* Encabezado Institucional y Acciones Principales                       */}
      {/* --------------------------------------------------------------------- */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(17, 24, 39, 0.8) 100%)',
          borderLeft: '4px solid var(--primary-500)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#22d3ee',
                fontWeight: 700,
              }}
            >
              MÓDULO DE FISCALIZACIÓN Y AUDITORÍA DIGITAL (SDD)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Normativa Constitucional GAMEA v1.0
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Centro de Monitoreo & Matriz de Actividad (Facebook & TikTok)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Auditoría de cumplimiento, ingesta automatizada de reacciones y fiscalización de audiencia en publicaciones institucionales.
          </p>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenSyncModal}
            className="btn-primary"
            style={{
              padding: '10px 18px',
              fontSize: '0.88rem',
              background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
            }}
          >
            <Play size={16} fill="currentColor" />
            <span>Ejecutar Scrapeo & Monitoreo</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>{isExporting ? 'Generando Excel...' : 'Exportar Informe Oficial (.xlsx)'}</span>
          </button>

          <button
            onClick={() => setShowAddPersonModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Añadir Persona</span>
          </button>

          <button
            onClick={() => setShowBulkImportModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            <span>Importar CSV</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {syncResult && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            borderLeft: '4px solid #06b6d4',
            background: 'rgba(6, 182, 212, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22d3ee', fontWeight: 700, fontSize: '0.9rem' }}>
              <Zap size={16} /> Resumen de Ejecución de Monitoreo ({syncResult.status})
            </div>
            <button onClick={() => setSyncResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.84rem' }}>{syncResult.details}</p>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Posts procesados: <strong style={{ color: '#fff' }}>{syncResult.posts_processed}</strong></span>
            <span>Interacciones extraídas: <strong style={{ color: '#fff' }}>{syncResult.interactions_extracted}</strong></span>
            <span>Cruces confirmados: <strong style={{ color: '#10b981' }}>{syncResult.matched_interactions}</strong></span>
            <span>Tiempo: <strong style={{ color: '#22d3ee' }}>{syncResult.execution_time_seconds}s</strong></span>
          </div>
        </div>
      )}


      {/* --------------------------------------------------------------------- */}
      {/* Barra Superior de KPIs Ejecutivos                                     */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Audiencia Monitoreada</span>
            <Users size={20} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '10px' }}>
            {matrixData?.summary.total_monitored_persons ?? audienceList.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Servidores públicos y personas en lista activa
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>% Participación Global</span>
            <UserCheck size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '10px' }}>
            {matrixData?.summary.participation_percentage ?? 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {matrixData?.summary.total_participated ?? 0} personas interactuaron en los posts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Reacciones Registradas</span>
            <ThumbsUp size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', marginTop: '10px' }}>
            {matrixData?.summary.total_reactions ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Likes, Loves y reacciones evaluadas
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Comentarios Oficiales</span>
            <MessageCircle size={20} color="#a855f7" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c084fc', marginTop: '10px' }}>
            {matrixData?.summary.total_comments ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Comentarios fiscalizados y trazados
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Sistema de Pestañas                                                   */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'matrix' ? '#22d3ee' : 'var(--text-muted)',
            borderBottom: activeTab === 'matrix' ? '3px solid #06b6d4' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={18} />
          <span>Matriz de Actividad & Reacciones</span>
        </button>

        <button
          onClick={() => setActiveTab('audience')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'audience' ? '#22d3ee' : 'var(--text-muted)',
            borderBottom: activeTab === 'audience' ? '3px solid #06b6d4' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={18} />
          <span>Lista de Audiencia Monitoreada ({audienceList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('connectors')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'connectors' ? '#22d3ee' : 'var(--text-muted)',
            borderBottom: activeTab === 'connectors' ? '3px solid #06b6d4' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Settings size={18} />
          <span>Conectores & Scraper (Facebook & TikTok)</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* PESTAÑA 1: Matriz de Actividad & Reacciones                          */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Barra de Filtros */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '14px',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Filter size={16} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Filtrar por:</span>
              </div>

              {/* Selector Plataforma */}
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                }}
              >
                <option value="ALL">Todas las Plataformas (FB & TikTok)</option>
                <option value="FACEBOOK">Facebook Meta</option>
                <option value="TIKTOK">TikTok</option>
              </select>

              {/* Selector Unidad */}
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                }}
              >
                <option value="ALL">Todas las Unidades Organizacionales</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Selector Participación */}
              <select
                value={filterParticipation}
                onChange={(e) => setFilterParticipation(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                }}
              >
                <option value="ALL">Todos los Estados de Actividad</option>
                <option value="PARTICIPATED">Solo quienes Participaron (SÍ)</option>
                <option value="NO_ACTIVITY">Solo quienes NO interactuaron (Pendientes)</option>
              </select>
            </div>

            {/* Buscador */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Buscar por Nombre, C.I. o Alias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                }}
              />
            </div>
          </div>

          {/* Tabla de Matriz */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, width: '260px' }}>
                      Persona Monitoreada
                    </th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, width: '200px' }}>
                      Cuentas Vinculadas
                    </th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, width: '320px' }}>
                      Publicación Institucional Evaluada
                    </th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, width: '140px' }}>
                      Reacción
                    </th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Comentario Registrado
                    </th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, width: '170px' }}>
                      Fidelidad Epistémica
                    </th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', width: '110px' }}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                        Cargando matriz de auditoría digital...
                      </td>
                    </tr>
                  ) : !matrixData?.rows || matrixData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <AlertCircle size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
                          No se encontraron registros de fiscalización
                        </div>
                        <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                          Ajuste los filtros o pulse "Ejecutar Scrapeo & Monitoreo" para procesar publicaciones e interacciones.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    matrixData.rows.map((row) => {
                      if (!row.posts || row.posts.length === 0) {
                        return (
                          <tr key={row.employee_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{row.full_name}</div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                C.I. {row.employee_id} • {row.department}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {row.facebook_handle && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#60a5fa' }}>
                                    <Facebook size={13} /> {row.facebook_handle}
                                  </span>
                                )}
                                {row.tiktok_handle && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#f43f5e' }}>
                                    <Video size={13} /> {row.tiktok_handle}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td colSpan={4} style={{ padding: '14px 18px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Sin publicaciones evaluadas en el rango de fechas seleccionado
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-faint)', fontSize: '0.75rem', fontWeight: 600 }}>
                                SIN DATOS
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      return row.posts.map((post, postIdx) => (
                        <tr
                          key={`${row.employee_id}-${post.publication_id}-${postIdx}`}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: postIdx === 0 && row.has_participated ? 'rgba(6, 182, 212, 0.02)' : 'transparent',
                          }}
                        >
                          {/* Columna Persona (solo en la primera publicación para no saturar visualmente) */}
                          <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                            {postIdx === 0 ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{row.full_name}</div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                  C.I. {row.employee_id}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#22d3ee', marginTop: '2px' }}>
                                  {row.department}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>↳ Idem</span>
                            )}
                          </td>

                          {/* Cuentas Vinculadas */}
                          <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                            {postIdx === 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {row.facebook_handle ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#60a5fa' }}>
                                    <Facebook size={13} /> {row.facebook_handle}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Sin Facebook</span>
                                )}
                                {row.tiktok_handle ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#f43f5e' }}>
                                    <Video size={13} /> {row.tiktok_handle}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Sin TikTok</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Publicación */}
                          <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                              {post.platform.toUpperCase() === 'FACEBOOK' ? (
                                <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 700 }}>
                                  FACEBOOK
                                </span>
                              ) : (
                                <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', fontSize: '0.7rem', fontWeight: 700 }}>
                                  TIKTOK
                                </span>
                              )}
                              {post.published_at && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {new Date(post.published_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 500 }}>
                              {post.post_title}
                            </div>
                            {post.post_url && (
                              <a
                                href={post.post_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#22d3ee', textDecoration: 'none', marginTop: '2px' }}
                              >
                                <span>Ver publicación</span> <ExternalLink size={10} />
                              </a>
                            )}
                          </td>

                          {/* Reacción */}
                          <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                            {post.reaction_type ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#60a5fa',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                }}
                              >
                                <ThumbsUp size={13} />
                                {post.reaction_type}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Sin reacción</span>
                            )}
                          </td>

                          {/* Comentario */}
                          <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                            {post.comment_text ? (
                              <div
                                style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#c084fc', fontSize: '0.72rem', fontWeight: 600 }}>
                                  <MessageCircle size={12} /> Comentario detectado
                                </div>
                                <div>"{post.comment_text}"</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>Sin comentario</span>
                            )}
                          </td>

                          {/* Fidelidad Epistémica */}
                          <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                            {post.verification_status === 'CONFIRMED' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                <CheckCircle size={13} /> DATO CONFIRMADO
                              </span>
                            ) : post.verification_status === 'OBSERVED' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fbbf24',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Activity size={13} /> DATO OBSERVADO
                              </span>
                            ) : post.platform.toUpperCase() === 'TIKTOK' && !post.reaction_type ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: '#c084fc',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Shield size={13} /> API RESTRICTED
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>NO DETECTADO</span>
                            )}
                          </td>

                          {/* Participó SÍ / NO */}
                          <td style={{ padding: '12px 18px', textAlign: 'center', verticalAlign: 'top' }}>
                            {post.reaction_type || post.comment_text ? (
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#34d399',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                }}
                              >
                                SÍ
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  color: '#f87171',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                NO
                              </span>
                            )}
                          </td>
                        </tr>
                      ));
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* PESTAÑA 2: Lista de Audiencia Monitoreada                             */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'audience' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Directorio de Personas en Fiscalización Digital
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Lista institucional de servidores públicos vinculados a cuentas de Facebook y TikTok para cruce automático.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddPersonModal(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                <Plus size={15} /> Añadir Persona
              </button>
              <button onClick={() => setShowBulkImportModal(true)} style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
                <Upload size={15} /> Importar Lista (CSV / JSON)
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>C.I. / Identificador</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Nombres y Apellidos</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Unidad Organizacional</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Cargo</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Cuenta Facebook</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Cuenta TikTok</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {audienceList.map((person) => (
                  <tr key={person.ci} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#22d3ee' }}>{person.ci}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: '#fff' }}>{person.full_name}</td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-main)' }}>{person.department}</td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>{person.position}</td>
                    <td style={{ padding: '12px 18px' }}>
                      {person.facebook_account ? (
                        <a
                          href={person.facebook_profile_url || `https://facebook.com/${person.facebook_account}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#60a5fa', textDecoration: 'none' }}
                        >
                          <Facebook size={14} /> {person.facebook_account}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {person.tiktok_account ? (
                        <a
                          href={person.tiktok_profile_url || `https://tiktok.com/${person.tiktok_account}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f43f5e', textDecoration: 'none' }}
                        >
                          <TikTokIcon size={14} color="#f43f5e" /> {person.tiktok_account}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                        {person.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenEditPerson(person)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        title="Modificar persona y estructura institucional"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* PESTAÑA 3: Conectores & Scraper Hub (Facebook & TikTok)               */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'connectors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            className="glass-panel"
            style={{
              padding: '20px 24px',
              borderLeft: '4px solid #8b5cf6',
              background: 'rgba(139, 92, 246, 0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                  Parámetros de Integración e Ingesta de Redes Sociales (Modo Oficial en Vivo)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Estado real de las APIs institucionales. Todas las conexiones se verifican directamente contra los servidores
                  de Meta y TikTok. Credenciales cifradas con <strong>AES-256 (Fernet)</strong>.
                </p>
              </div>
              <button
                onClick={fetchDiagnostics}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#c084fc',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                Actualizar Diagnóstico en Vivo
              </button>
            </div>
          </div>

          {/* Banner de Aviso Forense si el token de Facebook expiró */}
          {diagResponse?.connectors?.find((c) => c.platform_name === 'FACEBOOK')?.overall_status === 'TOKEN_EXPIRED' && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertCircle size={20} color="#fbbf24" />
                <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>
                  ESTADO EN VIVO: TOKEN DE META GRAPH API EXPIRADO
                </h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#fde68a', margin: '4px 0 10px 0' }}>
                Su Aplicación institucional <strong>Control RRSS</strong> (ID: 1408420487501330) se encuentra verificada y activa en Meta. Sin embargo, el token de acceso actual expiró (Código 190, subcódigo 463).
              </p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '6px', fontSize: '0.82rem', color: '#fff' }}>
                <strong>Guía Rápida para Obtener un Token de Fanpage Permanente:</strong>
                <ol style={{ paddingLeft: '20px', margin: '6px 0 0 0', lineHeight: '1.6' }}>
                  <li>Abra el <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>Graph API Explorer de Meta</a>.</li>
                  <li>En el selector <strong>Meta App</strong>, elija <strong>Control RRSS (1408420487501330)</strong>.</li>
                  <li>En el desplegable <strong>User or Page</strong>, seleccione su <strong>Página de Facebook</strong> (al seleccionar la página, Meta genera un token permanente que no caduca).</li>
                  <li>Asegúrese de marcar los permisos <code>pages_read_engagement</code> y <code>pages_read_user_content</code>.</li>
                  <li>Haga clic en <strong>Generate Access Token</strong>, copie el token y péguelo en el campo <em>Token de Acceso de Página</em> a continuación.</li>
                  <li>Haga clic en <strong>Guardar Parámetros</strong> y luego en <strong>Probar Conexión Facebook</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
            {/* Tarjeta Facebook */}
            {connectorConfigs
              .filter((c) => c.platform_name === 'FACEBOOK')
              .map((fbCfg, idx) => {
                const fbDiag = diagResponse?.connectors?.find((c) => c.platform_name === 'FACEBOOK');
                const isFbOnline = fbDiag?.overall_status === 'OPERATIONAL';
                const isFbExpired = fbDiag?.overall_status === 'TOKEN_EXPIRED';
                return (
                <div key={fbCfg.platform_name} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                        <Facebook size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Facebook Meta Graph Connector</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Página Oficial / Graph API v20.0</span>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: isFbOnline
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isFbExpired
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        color: isFbOnline ? '#34d399' : isFbExpired ? '#fbbf24' : '#f87171',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {fbDiag?.status_label || (fbCfg.is_active ? 'HABILITADO' : 'INACTIVO')}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ID de Página Oficial / Handle
                    </label>
                    <input
                      type="text"
                      value={fbCfg.target_account_id}
                      onChange={(e) => {
                        const copy = [...connectorConfigs];
                        copy[idx].target_account_id = e.target.value;
                        setConnectorConfigs(copy);
                      }}
                      placeholder="ej. 100064567891234 o @AlcaldiaElAlto"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Token de Acceso de Página (Page Access Token)
                    </label>
                    <input
                      type="password"
                      placeholder={fbCfg.has_token ? '•••••••••••••••••••••••••••••••• (Cifrado AES-256)' : 'Introduzca el token de Meta'}
                      onChange={(e) => {
                        const copy = [...connectorConfigs];
                        copy[idx].access_token = e.target.value;
                        setConnectorConfigs(copy);
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Modo de Extracción
                      </label>
                      <select
                        value={fbCfg.extraction_mode}
                        onChange={(e) => {
                          const copy = [...connectorConfigs];
                          copy[idx].extraction_mode = e.target.value;
                          setConnectorConfigs(copy);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                      >
                        <option value="OFFICIAL_API">API Oficial Meta (Graph API)</option>
                        <option value="HYBRID_SCRAPER">Ingesta Asistida / Híbrida</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Límite Publicaciones / Corrida
                      </label>
                      <input
                        type="number"
                        value={fbCfg.max_posts_per_sync}
                        onChange={(e) => {
                          const copy = [...connectorConfigs];
                          copy[idx].max_posts_per_sync = parseInt(e.target.value) || 10;
                          setConnectorConfigs(copy);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      onClick={() => handleTestConnection('FACEBOOK')}
                      disabled={testingPlatform === 'FACEBOOK'}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60a5fa',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Zap size={15} />
                      {testingPlatform === 'FACEBOOK' ? 'Comprobando...' : 'Probar Conexión Facebook'}
                    </button>

                    <button
                      onClick={handleUpdateConfigs}
                      className="btn-primary"
                      style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                    >
                      Guardar Parámetros
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Tarjeta TikTok */}
            {connectorConfigs
              .filter((c) => c.platform_name === 'TIKTOK')
              .map((ttCfg) => {
                const ttDiag = diagResponse?.connectors?.find((c) => c.platform_name === 'TIKTOK');
                const isTtConfigured = ttDiag?.overall_status === 'OPERATIONAL';
                return (
                <div key={ttCfg.platform_name} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}>
                        <Video size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>TikTok Display & Creator Connector</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Canal Oficial / Display API v2.0</span>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: isTtConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isTtConfigured ? '#34d399' : '#f87171',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {ttDiag?.status_label || (ttCfg.is_active ? 'HABILITADO' : 'INACTIVO')}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Handle de Cuenta Oficial de TikTok
                    </label>
                    <input
                      type="text"
                      value={ttCfg.target_account_id}
                      onChange={(e) => {
                        const copy = [...connectorConfigs];
                        const realIdx = connectorConfigs.findIndex((c) => c.platform_name === 'TIKTOK');
                        copy[realIdx].target_account_id = e.target.value;
                        setConnectorConfigs(copy);
                      }}
                      placeholder="ej. @alcaldia_elalto"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      TikTok Client Key / Bearer Token
                    </label>
                    <input
                      type="password"
                      placeholder={ttCfg.has_token ? '•••••••••••••••••••••••••••••••• (Cifrado AES-256)' : 'Introduzca el token o clave'}
                      onChange={(e) => {
                        const copy = [...connectorConfigs];
                        const realIdx = connectorConfigs.findIndex((c) => c.platform_name === 'TIKTOK');
                        copy[realIdx].access_token = e.target.value;
                        setConnectorConfigs(copy);
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Modo de Extracción
                      </label>
                      <select
                        value={ttCfg.extraction_mode}
                        onChange={(e) => {
                          const copy = [...connectorConfigs];
                          const realIdx = connectorConfigs.findIndex((c) => c.platform_name === 'TIKTOK');
                          copy[realIdx].extraction_mode = e.target.value;
                          setConnectorConfigs(copy);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                      >
                        <option value="OFFICIAL_API">API Oficial Display / Content</option>
                        <option value="HYBRID_SCRAPER">Ingesta Asistida / Híbrida</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Límite Videos / Corrida
                      </label>
                      <input
                        type="number"
                        value={ttCfg.max_posts_per_sync}
                        onChange={(e) => {
                          const copy = [...connectorConfigs];
                          const realIdx = connectorConfigs.findIndex((c) => c.platform_name === 'TIKTOK');
                          copy[realIdx].max_posts_per_sync = parseInt(e.target.value) || 10;
                          setConnectorConfigs(copy);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      onClick={() => handleTestConnection('TIKTOK')}
                      disabled={testingPlatform === 'TIKTOK'}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(244, 63, 94, 0.4)',
                        background: 'rgba(244, 63, 94, 0.1)',
                        color: '#fb7185',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Zap size={15} />
                      {testingPlatform === 'TIKTOK' ? 'Comprobando...' : 'Probar Conexión TikTok'}
                    </button>

                    <button
                      onClick={handleUpdateConfigs}
                      className="btn-primary"
                      style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                    >
                      Guardar Parámetros
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resultado de prueba de conexión */}
          {testResult && (
            <div
              className="glass-panel"
              style={{
                padding: '20px 24px',
                borderLeft: testResult.success
                  ? '4px solid #10b981'
                  : testResult.status === 'TOKEN_EXPIRED'
                  ? '4px solid #f59e0b'
                  : '4px solid #ef4444',
                background: testResult.success
                  ? 'rgba(16, 185, 129, 0.05)'
                  : testResult.status === 'TOKEN_EXPIRED'
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(239, 68, 68, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {testResult.success ? (
                  <CheckCircle size={20} color="#10b981" />
                ) : (
                  <AlertCircle size={20} color={testResult.status === 'TOKEN_EXPIRED' ? '#f59e0b' : '#ef4444'} />
                )}
                <h4
                  style={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: testResult.success
                      ? '#34d399'
                      : testResult.status === 'TOKEN_EXPIRED'
                      ? '#fbbf24'
                      : '#f87171',
                  }}
                >
                  Verificación de API: {testResult.platform_name} — {testResult.status}
                </h4>
                {testResult.account_info?.latency_ms !== undefined && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.1)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Latencia: {testResult.account_info.latency_ms} ms
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {testResult.message}
              </p>

              {testResult.account_info && (
                <div
                  style={{
                    marginTop: '4px',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  {testResult.account_info.application && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Aplicación Meta: </strong>
                      <span style={{ color: '#fff' }}>{testResult.account_info.application}</span>
                    </div>
                  )}
                  {testResult.account_info.token_type && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Tipo de Token: </strong>
                      <span style={{ color: '#38bdf8' }}>{testResult.account_info.token_type}</span>
                    </div>
                  )}
                  {testResult.account_info.expiration && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Vigencia: </strong>
                      <span style={{ color: '#34d399' }}>{testResult.account_info.expiration}</span>
                    </div>
                  )}
                  {testResult.account_info.permissions && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Permisos Activos: </strong>
                      <span style={{ color: '#c084fc' }}>
                        {Array.isArray(testResult.account_info.permissions)
                          ? testResult.account_info.permissions.join(', ')
                          : String(testResult.account_info.permissions)}
                      </span>
                    </div>
                  )}
                  {testResult.account_info.error_message && (
                    <div style={{ color: '#f87171' }}>
                      <strong>Detalle del Error: </strong>
                      <span>{testResult.account_info.error_message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Adicionar Persona a Monitorear                                */}
      {/* --------------------------------------------------------------------- */}
      {showAddPersonModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Adicionar Persona al Monitoreo</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Registro de C.I., datos y cuentas de redes sociales</span>
              </div>
              <button onClick={() => setShowAddPersonModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPersonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Cédula de Identidad (C.I.) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. 8492019 LP"
                  value={newPersonCi}
                  onChange={(e) => setNewPersonCi(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Ramiro"
                    value={newPersonFirstName}
                    onChange={(e) => setNewPersonFirstName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mamani Quispe"
                    value={newPersonLastName}
                    onChange={(e) => setNewPersonLastName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Dirección / Dependencia Superior (Desplegable Padre) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Dirección / Dependencia Superior *
                </label>
                <select
                  required
                  value={newPersonDirection}
                  onChange={(e) => {
                    const selDir = e.target.value;
                    setNewPersonDirection(selDir);
                    setNewPersonUnit(ORGANIGRAMA_GAMEA[selDir]?.[0] || '');
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="">-- Seleccionar Dirección / Dependencia --</option>
                  {LISTA_DIRECCIONES.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unidad Organizacional (Desplegable Hijo en Cascada) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Unidad Organizacional Oficial (Organigrama GAMEA 2026) *
                </label>
                <select
                  required
                  value={newPersonUnit}
                  onChange={(e) => setNewPersonUnit(e.target.value)}
                  disabled={!newPersonDirection}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    border: `1px solid ${newPersonUnit ? '#10b981' : 'var(--border-subtle)'}`,
                    color: !newPersonDirection ? 'var(--text-faint)' : '#fff',
                    fontSize: '0.85rem',
                    cursor: !newPersonDirection ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="">
                    {!newPersonDirection
                      ? '-- Primero seleccione una Dirección / Dependencia --'
                      : '-- Seleccione Unidad correspondiente --'}
                  </option>
                  {newPersonDirection &&
                    (ORGANIGRAMA_GAMEA[newPersonDirection] || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                </select>
              </div>

              {/* Cargo Institucional (Desplegable Normalizado) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Cargo Institucional *
                </label>
                <select
                  required
                  value={newPersonPosition}
                  onChange={(e) => setNewPersonPosition(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                >
                  {CARGOS_GAMEA.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                  <option value="OTRO">Otro cargo (especificar manualmente)...</option>
                </select>

                {newPersonPosition === 'OTRO' && (
                  <input
                    type="text"
                    required
                    placeholder="Escriba el cargo institucional exacto..."
                    value={newPersonCustomPosition}
                    onChange={(e) => setNewPersonCustomPosition(e.target.value)}
                    style={{ width: '100%', marginTop: '6px', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase' }}>
                  Perfiles en Redes Sociales para Cruce de Datos
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <Facebook size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Usuario Facebook
                  </label>
                  <input
                    type="text"
                    placeholder="ej. ramiro.mamani.elalto"
                    value={newPersonFacebook}
                    onChange={(e) => setNewPersonFacebook(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <TikTokIcon size={13} color="#f43f5e" /> Usuario TikTok
                  </label>
                  <input
                    type="text"
                    placeholder="ej. @ramiro_elalto"
                    value={newPersonTiktok}
                    onChange={(e) => setNewPersonTiktok(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPersonModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                  Guardar Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Modificar Persona Monitoreada                                 */}
      {/* --------------------------------------------------------------------- */}
      {showEditPersonModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={20} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Modificar Datos de Persona</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>C.I. {editingPersonCi} — Estructura Organigrama GAMEA 2026</span>
                </div>
              </div>
              <button onClick={() => setShowEditPersonModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditPersonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPersonFirstName}
                    onChange={(e) => setEditingPersonFirstName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPersonLastName}
                    onChange={(e) => setEditingPersonLastName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Dirección / Dependencia Superior */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Dirección / Dependencia Superior *
                </label>
                <select
                  required
                  value={editingPersonDirection}
                  onChange={(e) => {
                    const selDir = e.target.value;
                    setEditingPersonDirection(selDir);
                    setEditingPersonUnit(ORGANIGRAMA_GAMEA[selDir]?.[0] || '');
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="">-- Seleccionar Dirección / Dependencia --</option>
                  {LISTA_DIRECCIONES.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unidad Organizacional en cascada */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Unidad Organizacional Oficial (Organigrama GAMEA 2026) *
                </label>
                <select
                  required
                  value={editingPersonUnit}
                  onChange={(e) => setEditingPersonUnit(e.target.value)}
                  disabled={!editingPersonDirection}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    border: `1px solid ${editingPersonUnit ? '#10b981' : 'var(--border-subtle)'}`,
                    color: !editingPersonDirection ? 'var(--text-faint)' : '#fff',
                    fontSize: '0.85rem',
                    cursor: !editingPersonDirection ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="">-- Seleccione Unidad correspondiente --</option>
                  {editingPersonDirection &&
                    (ORGANIGRAMA_GAMEA[editingPersonDirection] || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                </select>
              </div>

              {/* Cargo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Cargo Institucional *
                </label>
                <select
                  required
                  value={editingPersonPosition}
                  onChange={(e) => setEditingPersonPosition(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                >
                  {CARGOS_GAMEA.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                  <option value="OTRO">Otro cargo (especificar)...</option>
                </select>

                {editingPersonPosition === 'OTRO' && (
                  <input
                    type="text"
                    required
                    placeholder="Escriba el cargo institucional..."
                    value={editingPersonCustomPosition}
                    onChange={(e) => setEditingPersonCustomPosition(e.target.value)}
                    style={{ width: '100%', marginTop: '6px', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                )}
              </div>

              {/* Redes Sociales */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase' }}>
                  Cuentas de Redes Sociales Vinculadas
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <Facebook size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Usuario Facebook
                  </label>
                  <input
                    type="text"
                    placeholder="ej. ramiro.mamani.elalto"
                    value={editingPersonFacebook}
                    onChange={(e) => setEditingPersonFacebook(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <TikTokIcon size={13} color="#f43f5e" /> Usuario TikTok
                  </label>
                  <input
                    type="text"
                    placeholder="ej. @ramiro_elalto"
                    value={editingPersonTiktok}
                    onChange={(e) => setEditingPersonTiktok(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditPersonModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                  Guardar Modificaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Importación Masiva (CSV / JSON)                                */}
      {/* --------------------------------------------------------------------- */}
      {showBulkImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              padding: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(15, 23, 42, 0.98)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Importación Masiva de Audiencia</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pegue un listado en formato CSV (delimitado por comas) o JSON</span>
              </div>
              <button onClick={() => setShowBulkImportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              <div>
                Formato esperado CSV: <code>CI, Nombres, Apellidos, Unidad, Cargo, Facebook, TikTok</code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Delimitador:</span>
                <select
                  value={bulkDelimiter}
                  onChange={(e) => setBulkDelimiter(e.target.value)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  <option value=",">Coma (,)</option>
                  <option value=";">Punto y coma (;)</option>
                  <option value="\t">Tabulación</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleBulkImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                rows={8}
                placeholder={`6123451, Sonia, Quisbert, Secretaría de Obras, Supervisora, sonia.quisbert, @sonia_obras\n7892341, Carlos, Choque, Dirección de Salud, Médico, carlos.choque, @carlos_tiktok`}
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontFamily: 'monospace',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                  Procesar e Importar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Ejecutar Monitoreo / Scrapeo Ahora                             */}
      {/* --------------------------------------------------------------------- */}
      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Ejecutar Monitoreo / Scrapeo con Selección de Posts            */}
      {/* --------------------------------------------------------------------- */}
      {showSyncModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '750px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Cabecera del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  Scrapeo & Fiscalización de Publicaciones
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Selecciona qué publicaciones oficiales evaluar o ejecuta el barrido automatizado
                </span>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pestañas de Modo */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
              <button
                onClick={() => setSyncModalTab('select')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: syncModalTab === 'select' ? 'rgba(6, 182, 212, 0.18)' : 'transparent',
                  color: syncModalTab === 'select' ? '#22d3ee' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Facebook size={16} />
                <span>Elegir Publicaciones de Facebook ({fbRecentPosts.length})</span>
              </button>

              <button
                onClick={() => setSyncModalTab('quick')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: syncModalTab === 'quick' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                  color: syncModalTab === 'quick' ? '#60a5fa' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Zap size={16} />
                <span>Monitoreo Rápido Automatizado</span>
              </button>
            </div>

            {/* Pestaña 1: Selección de Publicaciones de Facebook */}
            {syncModalTab === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={handleSelectAllPosts}
                      style={{
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {selectedPostIds.length === fbRecentPosts.length && fbRecentPosts.length > 0 ? (
                        <>
                          <CheckSquare size={14} color="#06b6d4" />
                          <span>Deseleccionar todos</span>
                        </>
                      ) : (
                        <>
                          <Square size={14} />
                          <span>Seleccionar todos</span>
                        </>
                      )}
                    </button>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedPostIds.length} de {fbRecentPosts.length} post(s) marcados para scrapeo
                    </span>
                  </div>

                  <button
                    onClick={handleOpenSyncModal}
                    disabled={loadingFbPosts}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#06b6d4',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={12} className={loadingFbPosts ? 'animate-spin' : ''} />
                    <span>Actualizar lista</span>
                  </button>
                </div>

                {loadingFbPosts ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#06b6d4' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                    <div style={{ fontSize: '0.85rem' }}>Consultando publicaciones recientes de la página oficial...</div>
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: '340px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingRight: '4px',
                    }}
                  >
                    {fbRecentPosts.map((post) => {
                      const isSelected = selectedPostIds.includes(post.id);
                      return (
                        <div
                          key={post.id}
                          onClick={() => handleToggleSelectPost(post.id)}
                          style={{
                            background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(30, 41, 59, 0.4)',
                            border: isSelected ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ marginTop: '2px' }}>
                            {isSelected ? (
                              <CheckSquare size={18} color="#06b6d4" />
                            ) : (
                              <Square size={18} color="var(--text-muted)" />
                            )}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>
                              {post.message ? (
                                post.message.length > 150 ? post.message.slice(0, 150) + '...' : post.message
                              ) : (
                                <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Publicación multimedia sin descripción</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              <span>
                                {post.created_time ? new Date(post.created_time).toLocaleString('es-ES') : 'Reciente'}
                              </span>
                              <span>•</span>
                              <span>{post.shares_count || 0} compartidos</span>
                              {post.permalink_url && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={post.permalink_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                                  >
                                    <span>Ver post</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {fbRecentPosts.length === 0 && (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se detectaron publicaciones recientes en la página oficial de Facebook conectada.
                      </div>
                    )}
                  </div>
                )}

                {/* Botón de Ejecución de Selección */}
                <button
                  onClick={() => {
                    setShowSyncModal(false);
                    handleRunSync('FACEBOOK', selectedPostIds.length, selectedPostIds);
                  }}
                  disabled={isSyncing || selectedPostIds.length === 0}
                  className="btn-primary"
                  style={{
                    padding: '12px',
                    fontSize: '0.9rem',
                    width: '100%',
                    opacity: selectedPostIds.length === 0 ? 0.6 : 1,
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>
                    Scrapear y Fiscalizar ({selectedPostIds.length} Publicaciones Seleccionadas)
                  </span>
                </button>
              </div>
            )}

            {/* Pestaña 2: Monitoreo Rápido Automatizado */}
            {syncModalTab === 'quick' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ color: 'var(--text-main)', fontSize: '0.86rem', lineHeight: '1.5' }}>
                  El motor ingiere automáticamente las últimas publicaciones oficiales desde Meta Graph API y TikTok, extrayendo reacciones, likes y comentarios para cruzarlos contra la base de datos PostgreSQL.
                </p>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Cantidad de publicaciones recientes a procesar:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[5, 10, 15, 20, 25].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setSyncMaxPosts(cnt)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: syncMaxPosts === cnt ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.1)',
                          background: syncMaxPosts === cnt ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                          color: syncMaxPosts === cnt ? '#22d3ee' : '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        {cnt} posts
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => {
                      setShowSyncModal(false);
                      handleRunSync('ALL', syncMaxPosts);
                    }}
                    disabled={isSyncing}
                    className="btn-primary"
                    style={{ padding: '12px', fontSize: '0.9rem', width: '100%' }}
                  >
                    <Zap size={16} />
                    <span>Monitorear Todo ({syncMaxPosts} Posts Facebook + TikTok)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSyncModal(false);
                      handleRunSync('FACEBOOK', syncMaxPosts);
                    }}
                    disabled={isSyncing}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#60a5fa',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Facebook size={16} />
                    <span>Solo Facebook ({syncMaxPosts} Posts Recientes)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSyncModal(false);
                      handleRunSync('TIKTOK', syncMaxPosts);
                    }}
                    disabled={isSyncing}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      background: 'rgba(244, 63, 94, 0.12)',
                      color: '#fb7185',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Video size={16} />
                    <span>Solo TikTok ({syncMaxPosts} Posts Recientes)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
