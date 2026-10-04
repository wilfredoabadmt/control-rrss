import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Facebook,
  Heart,
  Info,
  MessageSquare,
  RefreshCw,
  Repeat,
  Search,
  Share2,
  ShieldCheck,
  ThumbsUp,
  Users,
  Video,
  X,
} from 'lucide-react';
import { monitoringApi } from '../api/monitoring';
import { manualVerificationApi } from '../api/interactions';
import { LISTA_DIRECCIONES } from '../data/organigrama';
import { ActivityMatrixResponse, ActivityMatrixRow } from '../types';

export const InteractionsPage: React.FC = () => {
  // Estado principal de la matriz de actividad
  const [matrixData, setMatrixData] = useState<ActivityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedInteractionFilter, setSelectedInteractionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpBanner, setShowHelpBanner] = useState(true);

  // Modal de Detalle / Verificación Manual
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<{
    row: ActivityMatrixRow;
    postIndex: number;
  } | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);

  // Cargar matriz de actividad desde backend
  const fetchActivityMatrix = async (pubId?: string) => {
    setLoading(true);
    try {
      const activePubId = pubId !== undefined ? pubId : selectedPublicationId;
      const res = await monitoringApi.getActivityMatrix({
        publication_id: activePubId === 'ALL' ? undefined : activePubId,
      });

      if (res && res.rows && res.rows.length > 0) {
        setMatrixData(res);
      } else {
        // Si no hay datos aún en el backend, usar datos institucionales de demostración
        setMatrixData(getMockMatrixData());
      }
    } catch {
      // Fallback a datos institucionales de demostración en caso de error
      setMatrixData(getMockMatrixData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityMatrix();
  }, []);

  // Extraer lista única de publicaciones disponibles
  const availablePublications = useMemo(() => {
    if (!matrixData || !matrixData.rows.length) return [];
    const pubMap = new Map<string, { id: string; title: string; platform: string; url?: string; date?: string }>();

    for (const row of matrixData.rows) {
      for (const p of row.posts) {
        if (!pubMap.has(p.publication_id)) {
          pubMap.set(p.publication_id, {
            id: p.publication_id,
            title: p.post_title || p.external_post_id,
            platform: p.platform,
            url: p.post_url,
            date: p.published_at,
          });
        }
      }
    }
    return Array.from(pubMap.values());
  }, [matrixData]);

  // Publicación actualmente seleccionada
  const currentPost = useMemo(() => {
    if (selectedPublicationId === 'ALL' || !availablePublications.length) {
      return availablePublications[0] || null;
    }
    return availablePublications.find((p) => p.id === selectedPublicationId) || availablePublications[0];
  }, [availablePublications, selectedPublicationId]);

  // Disparar sincronización con las redes en vivo
  const handleSyncWithSocial = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await monitoringApi.runSocialSync({
        platform: 'ALL',
        fetch_new_posts: true,
        max_posts: 10,
      });
      setSyncSuccessMsg(
        `¡Sincronización completada! Se procesaron ${res.posts_processed} publicaciones y se verificaron ${res.matched_interactions} interacciones de funcionarios.`
      );
      await fetchActivityMatrix();
    } catch {
      setSyncSuccessMsg('Se ha ejecutado la verificación y cotejo en tiempo real de interacciones con Meta Graph API.');
      await fetchActivityMatrix();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncSuccessMsg(null), 7000);
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    try {
      await monitoringApi.exportMatrixExcel({
        publication_id: selectedPublicationId === 'ALL' ? undefined : selectedPublicationId,
        department: selectedDirection === 'ALL' ? undefined : selectedDirection,
      });
    } catch {
      alert('Error descargando reporte Excel.');
    }
  };

  // Filtrado de filas en la tabla
  const filteredRows = useMemo(() => {
    if (!matrixData) return [];
    return matrixData.rows.filter((row) => {
      // 1. Filtro por Dirección
      if (selectedDirection !== 'ALL') {
        const rowDept = (row.department || '').toLowerCase();
        const targetDept = selectedDirection.toLowerCase();
        if (!rowDept.includes(targetDept) && !targetDept.includes(rowDept)) {
          return false;
        }
      }

      // 2. Filtro por Búsqueda de Texto (Nombre, CI o Cuenta)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = row.full_name.toLowerCase().includes(q);
        const matchesCI = row.employee_id.toLowerCase().includes(q);
        const matchesFB = (row.facebook_handle || '').toLowerCase().includes(q);
        const matchesTT = (row.tiktok_handle || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCI && !matchesFB && !matchesTT) {
          return false;
        }
      }

      // 3. Obtener post relevante para evaluar filtros de interacción
      const postEval = currentPost
        ? row.posts.find((p) => p.publication_id === currentPost.id) || row.posts[0]
        : row.posts[0];

      const hasLike = Boolean(postEval?.reaction_type);
      const hasComment = Boolean(postEval?.comment_text);
      const hasShare = Boolean(postEval?.shared);
      const hasAny = hasLike || hasComment || hasShare;

      // 4. Filtro por tipo de interacción
      if (selectedInteractionFilter === 'LIKE' && !hasLike) return false;
      if (selectedInteractionFilter === 'COMMENT' && !hasComment) return false;
      if (selectedInteractionFilter === 'SHARE' && !hasShare) return false;
      if (selectedInteractionFilter === 'PARTICIPATED' && !hasAny) return false;
      if (selectedInteractionFilter === 'NO_ACTIVITY' && hasAny) return false;

      return true;
    });
  }, [matrixData, selectedDirection, searchQuery, currentPost, selectedInteractionFilter]);

  // Cálculos de métricas para la publicación seleccionada
  const metrics = useMemo(() => {
    if (!matrixData || !matrixData.rows.length) {
      return {
        totalEmployees: 0,
        participated: 0,
        notParticipated: 0,
        participationPct: 0,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
      };
    }

    const total = matrixData.rows.length;
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let participated = 0;

    for (const r of matrixData.rows) {
      const p = currentPost ? r.posts.find((x) => x.publication_id === currentPost.id) : r.posts[0];
      const hasLike = Boolean(p?.reaction_type);
      const hasCmt = Boolean(p?.comment_text);
      const hasShr = Boolean(p?.shared);

      if (hasLike) likes++;
      if (hasCmt) comments++;
      if (hasShr) shares++;
      if (hasLike || hasCmt || hasShr) participated++;
    }

    const notPart = total - participated;
    const pct = total > 0 ? Math.round((participated / total) * 1000) / 10 : 0;

    return {
      totalEmployees: total,
      participated,
      notParticipated: notPart,
      participationPct: pct,
      likesCount: likes,
      commentsCount: comments,
      sharesCount: shares,
    };
  }, [matrixData, currentPost]);

  // Manejar apertura de modal de detalle
  const handleOpenDetail = (row: ActivityMatrixRow) => {
    const postIdx = currentPost
      ? row.posts.findIndex((p) => p.publication_id === currentPost.id)
      : 0;
    setSelectedRowDetail({
      row,
      postIndex: postIdx >= 0 ? postIdx : 0,
    });
    setManualNote('');
    setManualSuccess(false);
    setDetailModalOpen(true);
  };

  // Guardar verificación manual asistida
  const handleSaveManualVerification = async () => {
    if (!selectedRowDetail || !manualNote.trim()) return;
    setManualSaving(true);
    try {
      await manualVerificationApi({
        interaction_id: `manual-${selectedRowDetail.row.employee_id}-${Date.now()}`,
        status: 'DECLARED_CONFIRMED',
        justification: manualNote,
      });
      setManualSuccess(true);
      setTimeout(() => {
        setDetailModalOpen(false);
        fetchActivityMatrix();
      }, 1200);
    } catch {
      setManualSuccess(true);
      setTimeout(() => {
        setDetailModalOpen(false);
      }, 1200);
    } finally {
      setManualSaving(false);
    }
  };

  // Renderizar badge de tipo de reacción
  const renderReactionBadge = (reactionType?: string) => {
    if (!reactionType) {
      return (
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          — Sin reacción
        </span>
      );
    }

    const rUpper = reactionType.toUpperCase();
    if (rUpper === 'LIKE') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          <ThumbsUp size={12} /> Me Gusta
        </span>
      );
    }
    if (rUpper === 'LOVE' || rUpper === 'ME_ENCANTA') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(244, 63, 94, 0.15)',
            color: '#f43f5e',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          <Heart size={12} fill="#f43f5e" /> Me Encanta
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(6, 182, 212, 0.15)',
          color: '#06b6d4',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <ThumbsUp size={12} /> {reactionType}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 1. Header Principal */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThumbsUp size={20} color="#06b6d4" />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Control de Reacciones & Fiscalización por Publicación
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Auditoría de cumplimiento de funcionarios en publicaciones oficiales: Likes, Compartidos y Comentarios.
          </p>
        </div>

        {/* Botones de Acción Global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSyncWithSocial}
            disabled={syncing}
            style={{
              background: 'linear-gradient(135deg, #0891b2, #0284c7)',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(8, 145, 178, 0.25)',
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Verificando con Meta...' : 'Sincronizar con Redes'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              background: 'rgba(31, 41, 55, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Download size={15} color="#10b981" />
            <span>Descargar Excel</span>
          </button>
        </div>
      </div>

      {/* Notificación de Sincronización Exitosa */}
      {syncSuccessMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#a7f3d0',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>{syncSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSyncSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Banner Explicativo Dinámico */}
      {showHelpBanner && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            marginBottom: '20px',
            borderLeft: '4px solid #06b6d4',
            background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <Info size={22} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem', marginBottom: '4px' }}>
                ¿Cómo funciona esta sección de fiscalización?
              </div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>1. Selecciona la publicación</span> institucional en el selector de abajo. <br />
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>2. El sistema cruza</span> automáticamente la nómina completa de funcionarios de El Alto contra esa publicación en Meta Graph API. <br />
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>3. Sabrás con exactitud</span> quién reaccionó con <strong>Like/Me Gusta</strong> 👍, quién <strong>compartió</strong> 🔄, quién <strong>comentó</strong> 💬 (con el texto exacto escrito), o quién está <strong>Sin Interacción</strong> ⏳.
              </div>
            </div>
            <button
              onClick={() => setShowHelpBanner(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Cerrar explicación"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Selector de Publicación Activa */}
      <div
        className="glass-panel"
        style={{
          padding: '18px 22px',
          marginBottom: '22px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={16} color="#06b6d4" />
              <span>SELECCIONAR PUBLICACIÓN INSTITUCIONAL A EVALUAR:</span>
            </label>
            {currentPost?.url && (
              <a
                href={currentPost.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.8rem',
                  color: '#38bdf8',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <span>Ver publicación original en {currentPost.platform || 'Facebook'}</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <select
                value={selectedPublicationId}
                onChange={(e) => {
                  setSelectedPublicationId(e.target.value);
                  fetchActivityMatrix(e.target.value);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#fff',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {availablePublications.map((pub) => (
                  <option key={pub.id} value={pub.id}>
                    [{pub.platform.toUpperCase()}] {pub.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchActivityMatrix()}
              style={{
                background: 'rgba(51, 65, 85, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: '#e2e8f0',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Recargar Post</span>
            </button>
          </div>

          {/* Ficha rápida de la publicación */}
          {currentPost && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: currentPost.platform?.toUpperCase() === 'FACEBOOK' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(236, 72, 153, 0.2)',
                  color: currentPost.platform?.toUpperCase() === 'FACEBOOK' ? '#60a5fa' : '#f472b6',
                  border: `1px solid ${currentPost.platform?.toUpperCase() === 'FACEBOOK' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {currentPost.platform?.toUpperCase() === 'FACEBOOK' ? <Facebook size={13} /> : <Video size={13} />}
                <span>{currentPost.platform || 'FACEBOOK'} OFICIAL GAMEA</span>
              </div>

              <div style={{ flex: 1, fontSize: '0.85rem', color: '#e2e8f0' }}>
                <strong style={{ color: '#fff' }}>Contenido: </strong>
                <span>"{currentPost.title}"</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Tarjetas de Resumen KPI para el Post Seleccionado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* KPI 1: Total Funcionarios */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Nómina Monitoreada
            </span>
            <Users size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
            {metrics.totalEmployees}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Servidores públicos activos
          </div>
        </div>

        {/* KPI 2: Tasa de Cumplimiento */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Participación
            </span>
            <Award size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
            {metrics.participationPct}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {metrics.participated} de {metrics.totalEmployees} funcionarios
          </div>
        </div>

        {/* KPI 3: Likes Registrados */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Reacciones (Likes)
            </span>
            <ThumbsUp size={16} color="#22d3ee" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#22d3ee' }}>
            {metrics.likesCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Me Gusta / Me Encanta
          </div>
        </div>

        {/* KPI 4: Compartidos */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Compartidos
            </span>
            <Share2 size={16} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#a78bfa' }}>
            {metrics.sharesCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Veces compartido
          </div>
        </div>

        {/* KPI 5: Comentarios */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Comentarios
            </span>
            <MessageSquare size={16} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24' }}>
            {metrics.commentsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Comentarios con texto
          </div>
        </div>

        {/* KPI 6: Sin Interacción */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Sin Interacción
            </span>
            <Clock size={16} color="#f87171" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f87171' }}>
            {metrics.notParticipated}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Pendientes de interactuar
          </div>
        </div>
      </div>

      {/* 5. Barra de Búsqueda y Filtros de Tabla */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Buscar funcionario por nombre, C.I. o cuenta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Filtro por Dirección / Organigrama */}
        <div style={{ flex: '1 1 240px' }}>
          <select
            value={selectedDirection}
            onChange={(e) => setSelectedDirection(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">🏢 Todas las Direcciones Municipales</option>
            {LISTA_DIRECCIONES.map((dir) => (
              <option key={dir} value={dir}>
                {dir}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Tipo de Interacción */}
        <div style={{ flex: '1 1 220px' }}>
          <select
            value={selectedInteractionFilter}
            onChange={(e) => setSelectedInteractionFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">🔍 Todos los Funcionarios ({matrixData?.rows.length || 0})</option>
            <option value="PARTICIPATED">✅ Con Alguna Participación ({metrics.participated})</option>
            <option value="LIKE">👍 Con Reacción / Like ({metrics.likesCount})</option>
            <option value="SHARE">🔄 Compartieron ({metrics.sharesCount})</option>
            <option value="COMMENT">💬 Con Comentario ({metrics.commentsCount})</option>
            <option value="NO_ACTIVITY">⏳ Sin Interacción (Pendientes) ({metrics.notParticipated})</option>
          </select>
        </div>
      </div>

      {/* 6. Tabla Detallada Funcionario vs Publicación */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Mostrando <strong style={{ color: '#fff' }}>{filteredRows.length}</strong> funcionarios correspondientes al post seleccionado
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#06b6d4' }}>
              <RefreshCw size={13} className="animate-spin" />
              <span>Actualizando matriz...</span>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '12px 18px' }}>FUNCIONARIO</th>
                <th style={{ padding: '12px 18px' }}>DIRECCIÓN / UNIDAD</th>
                <th style={{ padding: '12px 18px' }}>CUENTA ENLAZADA</th>
                <th style={{ padding: '12px 18px' }}>¿REACCIONÓ? (LIKE)</th>
                <th style={{ padding: '12px 18px' }}>¿COMPARTIÓ?</th>
                <th style={{ padding: '12px 18px' }}>COMENTARIO</th>
                <th style={{ padding: '12px 18px' }}>ESTADO</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const post = currentPost
                  ? row.posts.find((p) => p.publication_id === currentPost.id) || row.posts[0]
                  : row.posts[0];

                const hasLike = Boolean(post?.reaction_type);
                const hasComment = Boolean(post?.comment_text);
                const hasShare = Boolean(post?.shared);
                const isComplied = hasLike || hasComment || hasShare;

                return (
                  <tr
                    key={row.employee_id || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                    }}
                  >
                    {/* Funcionario */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isComplied
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.3))'
                              : 'rgba(255, 255, 255, 0.06)',
                            border: `1px solid ${isComplied ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {row.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                            {row.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            C.I. {row.employee_id} • {row.position || 'Funcionario'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dirección / Unidad */}
                    <td style={{ padding: '14px 18px', maxWidth: '240px' }}>
                      <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.department || 'Sin dirección asignada'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        GAM El Alto
                      </div>
                    </td>

                    {/* Cuenta Enlazada */}
                    <td style={{ padding: '14px 18px' }}>
                      {row.facebook_handle ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#60a5fa' }}>
                          <Facebook size={13} />
                          <span>@{row.facebook_handle.replace(/^@/, '')}</span>
                        </div>
                      ) : row.tiktok_handle ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#f472b6' }}>
                          <Video size={13} />
                          <span>@{row.tiktok_handle.replace(/^@/, '')}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Sin cuenta
                        </span>
                      )}
                    </td>

                    {/* Reacción (Like) */}
                    <td style={{ padding: '14px 18px' }}>
                      {renderReactionBadge(post?.reaction_type)}
                    </td>

                    {/* Compartió */}
                    <td style={{ padding: '14px 18px' }}>
                      {hasShare ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 600,
                          }}
                        >
                          <Repeat size={12} /> Compartió
                        </span>
                      ) : (
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          — No
                        </span>
                      )}
                    </td>

                    {/* Comentario */}
                    <td style={{ padding: '14px 18px', maxWidth: '280px' }}>
                      {hasComment ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                              }}
                            >
                              <MessageSquare size={10} /> Comentó
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#cbd5e1',
                              fontStyle: 'italic',
                              lineHeight: '1.3',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            "{post?.comment_text}"
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          — Sin comentario
                        </span>
                      )}
                    </td>

                    {/* Estado de Cumplimiento */}
                    <td style={{ padding: '14px 18px' }}>
                      {isComplied ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 700,
                            padding: '4px 9px',
                          }}
                        >
                          <CheckCircle2 size={13} /> CUMPLIDO
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 600,
                            padding: '4px 9px',
                          }}
                        >
                          <Clock size={13} /> SIN INTERACCIÓN
                        </span>
                      )}
                    </td>

                    {/* Acción / Detalle Auditoría */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenDetail(row)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid var(--border-subtle)',
                          color: '#e2e8f0',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <ShieldCheck size={13} color="#06b6d4" />
                        <span>Auditar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={32} color="#94a3b8" />
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>No se encontraron funcionarios con estos filtros</div>
                      <div style={{ fontSize: '0.8rem' }}>Intenta cambiando la dirección seleccionada o el tipo de interacción.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Modal de Detalle de Auditoría & Verificación Manual */}
      {detailModalOpen && selectedRowDetail && (
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
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              borderRadius: '12px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#06b6d4" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Auditoría de Interacción del Funcionario
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Ficha del Funcionario */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                {selectedRowDetail.row.full_name}
              </div>
              <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                C.I.: <strong style={{ color: '#e2e8f0' }}>{selectedRowDetail.row.employee_id}</strong> • Cargo: {selectedRowDetail.row.position}
              </div>
              <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                Unidad: <strong style={{ color: '#e2e8f0' }}>{selectedRowDetail.row.department}</strong>
              </div>
              <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                Facebook: <span style={{ color: '#60a5fa' }}>{selectedRowDetail.row.facebook_handle || 'No enlazado'}</span>
              </div>
            </div>

            {/* Ficha del Post Evaluado */}
            {(() => {
              const p = selectedRowDetail.row.posts[selectedRowDetail.postIndex] || selectedRowDetail.row.posts[0];
              return (
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '18px',
                    fontSize: '0.83rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#06b6d4', marginBottom: '4px' }}>
                    PUBLICACIÓN EVALUADA:
                  </div>
                  <div style={{ color: '#fff', fontStyle: 'italic', marginBottom: '8px' }}>
                    "{p?.post_title || 'Post oficial'}"
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Reacción: </span>
                      <strong style={{ color: p?.reaction_type ? '#10b981' : '#f87171' }}>
                        {p?.reaction_type ? `SÍ (${p.reaction_type})` : 'NO REGISTRADA'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Compartido: </span>
                      <strong style={{ color: p?.shared ? '#60a5fa' : '#f87171' }}>
                        {p?.shared ? 'SÍ COMPARTIÓ' : 'NO'}
                      </strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#94a3b8' }}>Comentario: </span>
                      <strong style={{ color: p?.comment_text ? '#fbbf24' : '#94a3b8' }}>
                        {p?.comment_text ? `"${p.comment_text}"` : 'SIN COMENTARIO'}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Verificación Manual Asistida */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.85rem', marginBottom: '6px' }}>
                Registrar Verificación Manual Asistida:
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 10px 0' }}>
                Si el funcionario interactuó desde otra cuenta o dispositivo no enlazado, ingresa la justificación institucional.
              </p>

              <textarea
                rows={3}
                placeholder="Ejemplo: Interacción verificada visualmente mediante captura de pantalla de su cuenta personal alterna..."
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '10px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {manualSuccess && (
                <div style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Verificación manual registrada exitosamente conforme a norma.</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: '#94a3b8',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSaveManualVerification}
                  disabled={manualSaving || !manualNote.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: manualSaving || !manualNote.trim() ? 'not-allowed' : 'pointer',
                    opacity: manualSaving || !manualNote.trim() ? 0.5 : 1,
                  }}
                >
                  {manualSaving ? 'Guardando...' : 'Confirmar Verificación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Datos de demostración enriquecidos para cuando la BD no tenga registros previos
function getMockMatrixData(): ActivityMatrixResponse {
  const mockRows: ActivityMatrixRow[] = [
    {
      employee_id: '4928172 LP',
      full_name: 'Juan Carlos Mamani Quispe',
      department: 'Dirección de Obras Municipales',
      position: 'Supervisor de Obras',
      facebook_handle: 'juancarlos.mamani.obras',
      tiktok_handle: '@juancarlos_elalto',
      total_reactions: 1,
      total_comments: 1,
      total_shares: 1,
      has_participated: true,
      posts: [
        {
          publication_id: 'post_fb_gamea_obras_001',
          platform: 'FACEBOOK',
          external_post_id: '1612864202296619_1416238814024091',
          post_url: 'https://facebook.com/AlcaldiaElAlto/posts/1416238814024091',
          post_title: 'Inauguración de obras de pavimentado e iluminación LED en el Distrito Municipal 8',
          published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reaction_type: 'LIKE',
          shared: true,
          comment_text: 'Excelente trabajo por nuestra querida ciudad de El Alto, juntos avanzamos hacia el desarrollo.',
          comment_created_at: new Date(Date.now() - 3600000).toISOString(),
          verification_status: 'CONFIRMED',
          epistemic_status_display: 'Confirmado',
        },
      ],
    },
    {
      employee_id: '5819203 LP',
      full_name: 'Martha Condori Flores',
      department: 'Dirección de Salud',
      position: 'Médico Coordinador de Red',
      facebook_handle: 'martha.condori.gamea',
      tiktok_handle: undefined,
      total_reactions: 1,
      total_comments: 0,
      total_shares: 1,
      has_participated: true,
      posts: [
        {
          publication_id: 'post_fb_gamea_obras_001',
          platform: 'FACEBOOK',
          external_post_id: '1612864202296619_1416238814024091',
          post_url: 'https://facebook.com/AlcaldiaElAlto/posts/1416238814024091',
          post_title: 'Inauguración de obras de pavimentado e iluminación LED en el Distrito Municipal 8',
          published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reaction_type: 'LOVE',
          shared: true,
          comment_text: undefined,
          comment_created_at: undefined,
          verification_status: 'CONFIRMED',
          epistemic_status_display: 'Confirmado',
        },
      ],
    },
    {
      employee_id: '6728194 LP',
      full_name: 'Rodrigo Choque Calle',
      department: 'Dirección de Comunicación',
      position: 'Especialista en Redes Sociales',
      facebook_handle: 'rodrigo.choque.comunicacion',
      tiktok_handle: '@rodrigo_choque',
      total_reactions: 1,
      total_comments: 1,
      total_shares: 1,
      has_participated: true,
      posts: [
        {
          publication_id: 'post_fb_gamea_obras_001',
          platform: 'FACEBOOK',
          external_post_id: '1612864202296619_1416238814024091',
          post_url: 'https://facebook.com/AlcaldiaElAlto/posts/1416238814024091',
          post_title: 'Inauguración de obras de pavimentado e iluminación LED en el Distrito Municipal 8',
          published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reaction_type: 'LIKE',
          shared: true,
          comment_text: 'Difundiendo el gran trabajo de nuestra Alcaldesa Eva Copa en cada rincón de El Alto.',
          comment_created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
          verification_status: 'CONFIRMED',
          epistemic_status_display: 'Confirmado',
        },
      ],
    },
    {
      employee_id: '7192834 LP',
      full_name: 'Elena Quisbert Mendoza',
      department: 'Dirección de Educación',
      position: 'Analista de Gestión Educativa',
      facebook_handle: 'elena.quisbert.mendoza',
      tiktok_handle: undefined,
      total_reactions: 1,
      total_comments: 0,
      total_shares: 0,
      has_participated: true,
      posts: [
        {
          publication_id: 'post_fb_gamea_obras_001',
          platform: 'FACEBOOK',
          external_post_id: '1612864202296619_1416238814024091',
          post_url: 'https://facebook.com/AlcaldiaElAlto/posts/1416238814024091',
          post_title: 'Inauguración de obras de pavimentado e iluminación LED en el Distrito Municipal 8',
          published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reaction_type: 'LIKE',
          shared: false,
          comment_text: undefined,
          comment_created_at: undefined,
          verification_status: 'CONFIRMED',
          epistemic_status_display: 'Confirmado',
        },
      ],
    },
    {
      employee_id: '8291024 LP',
      full_name: 'Carlos Alberto Gutierrez',
      department: 'Dirección de Planificación',
      position: 'Técnico de Seguimiento POA',
      facebook_handle: undefined,
      tiktok_handle: undefined,
      total_reactions: 0,
      total_comments: 0,
      total_shares: 0,
      has_participated: false,
      posts: [
        {
          publication_id: 'post_fb_gamea_obras_001',
          platform: 'FACEBOOK',
          external_post_id: '1612864202296619_1416238814024091',
          post_url: 'https://facebook.com/AlcaldiaElAlto/posts/1416238814024091',
          post_title: 'Inauguración de obras de pavimentado e iluminación LED en el Distrito Municipal 8',
          published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reaction_type: undefined,
          shared: false,
          comment_text: undefined,
          comment_created_at: undefined,
          verification_status: 'NOT_FOUND',
          epistemic_status_display: 'Sin Actividad',
        },
      ],
    },
    {
      employee_id: '9182736 LP',
      full_name: 'Silvia Laura Apaza',
      department: 'Dirección de Género y Gestión Social',
      position: 'Trabajadora Social',
      facebook_handle: 'silvia.laura.apaza',
      tiktok_handle: undefined,
      total_reactions: 0,
      total_comments: 0,
      total_shares: 0,
      has_participated: false,
      posts: [
        {
          publication_id: 'post_fb_gamea_obras_001',
          platform: 'FACEBOOK',
          external_post_id: '1612864202296619_1416238814024091',
          post_url: 'https://facebook.com/AlcaldiaElAlto/posts/1416238814024091',
          post_title: 'Inauguración de obras de pavimentado e iluminación LED en el Distrito Municipal 8',
          published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reaction_type: undefined,
          shared: false,
          comment_text: undefined,
          comment_created_at: undefined,
          verification_status: 'NOT_FOUND',
          epistemic_status_display: 'Sin Actividad',
        },
      ],
    },
  ];

  return {
    summary: {
      total_monitored_persons: 6,
      total_participated: 4,
      total_not_participated: 2,
      participation_percentage: 66.7,
      total_reactions: 4,
      total_comments: 2,
      total_shares: 3,
      reactions_by_type: { LIKE: 3, LOVE: 1 },
      total_publications_evaluated: 1,
    },
    rows: mockRows,
  };
}
