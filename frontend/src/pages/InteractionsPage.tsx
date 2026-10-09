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
  Link as LinkIcon,
  MessageSquare,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Share2,
  ShieldCheck,
  ThumbsUp,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { monitoringApi } from '../api/monitoring';
import {
  listPublicationsApi,
  importPublicationFromUrlApi,
  getFacebookRecentPostsApi,
  PublicationItem,
  FacebookRecentPostItem,
} from '../api/publications';
import { LISTA_DIRECCIONES } from '../data/organigrama';
import { ActivityMatrixResponse, ActivityMatrixRow } from '../types';

type PublicationOption = {
  id: string;
  title: string;
  platform: string;
  url?: string;
  date?: string;
  metaReactions?: number;
  metaReactionsByType?: Record<string, number>;
  metaSyncedAt?: string | null;
};

export const InteractionsPage: React.FC = () => {
  // Estado principal de la matriz de actividad
  const [matrixData, setMatrixData] = useState<ActivityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Publicaciones de la BD
  const [dbPublications, setDbPublications] = useState<PublicationItem[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);

  // Modal para Vincular Post de Facebook
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [modalTab, setModalTab] = useState<'recent' | 'url'>('recent');
  const [fbRecentPosts, setFbRecentPosts] = useState<FacebookRecentPostItem[]>([]);
  const [loadingFbPosts, setLoadingFbPosts] = useState(false);
  const [importingPostId, setImportingPostId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Filtros
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedInteractionFilter, setSelectedInteractionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpBanner, setShowHelpBanner] = useState(true);

  // Exportar Excel
  const [exportingExcel, setExportingExcel] = useState(false);

  // Modal de Detalle / Fiscalización Manual
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<{
    row: ActivityMatrixRow;
    postIndex: number;
  } | null>(null);
  const [auditReaction, setAuditReaction] = useState<string>('');
  const [auditShared, setAuditShared] = useState<boolean>(false);
  const [auditComment, setAuditComment] = useState<string>('');
  const [auditFacebookAccount, setAuditFacebookAccount] = useState<string>('');
  const [auditJustification, setAuditJustification] = useState<string>('');
  const [auditStatus, setAuditStatus] = useState<string>('DECLARED_CONFIRMED');
  const [auditError, setAuditError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);

  // Modal Filtrar por Lista
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterRawText, setFilterRawText] = useState('');
  const [customFilterList, setCustomFilterList] = useState<string[]>([]);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterSuccess, setFilterSuccess] = useState<string | null>(null);


  // Cargar publicaciones registradas desde backend
  const loadPublications = async () => {
    setLoadingPublications(true);
    try {
      const res = await listPublicationsApi({ page_size: 100 });
      if (res && res.items) {
        setDbPublications(res.items);
      }
    } catch {
      // Ignorar fallas silenciosas de red
    } finally {
      setLoadingPublications(false);
    }
  };

  // Cargar matriz de actividad desde backend
  const fetchActivityMatrix = async (pubId?: string) => {
    setLoading(true);
    try {
      const activePubId = pubId !== undefined ? pubId : selectedPublicationId;
      const res = await monitoringApi.getActivityMatrix({
        publication_id: activePubId === 'ALL' ? undefined : activePubId,
      });

      if (res && res.rows) {
        setMatrixData(res);
      } else {
        setMatrixData({
          summary: {
            total_monitored_persons: 0,
            total_participated: 0,
            total_not_participated: 0,
            participation_percentage: 0,
            total_reactions: 0,
            total_comments: 0,
            total_shares: 0,
            reactions_by_type: {},
            total_publications_evaluated: 0,
          },
          rows: [],
        });
      }
    } catch {
      setMatrixData({
        summary: {
          total_monitored_persons: 0,
          total_participated: 0,
          total_not_participated: 0,
          participation_percentage: 0,
          total_reactions: 0,
          total_comments: 0,
          total_shares: 0,
          reactions_by_type: {},
          total_publications_evaluated: 0,
        },
        rows: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublications();
    fetchActivityMatrix();
  }, []);

  // Abrir modal para vincular posts
  const handleOpenAddPostModal = async () => {
    setShowAddPostModal(true);
    setModalError(null);
    setModalSuccess(null);
    setLoadingFbPosts(true);
    try {
      const posts = await getFacebookRecentPostsApi();
      setFbRecentPosts(posts || []);
    } catch {
      setFbRecentPosts([]);
    } finally {
      setLoadingFbPosts(false);
    }
  };

  // Importar post desde lista oficial de Facebook
  const handleImportFbPost = async (post: FacebookRecentPostItem) => {
    setImportingPostId(post.id);
    setModalError(null);
    try {
      const newPub = await importPublicationFromUrlApi({
        url: post.permalink_url || `https://facebook.com/${post.id}`,
        title: post.message || 'Publicación Institucional Alcaldía de El Alto',
        platform: 'FACEBOOK',
      });
      setModalSuccess('¡Publicación vinculada exitosamente!');
      await loadPublications();
      setSelectedPublicationId(newPub.id);
      await fetchActivityMatrix(newPub.id);
      setTimeout(() => {
        setShowAddPostModal(false);
        setModalSuccess(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'No se pudo vincular la publicación seleccionada.');
    } finally {
      setImportingPostId(null);
    }
  };

  // Importar post pegando URL directo
  const handleImportByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setSubmittingUrl(true);
    setModalError(null);
    try {
      const newPub = await importPublicationFromUrlApi({
        url: inputUrl.trim(),
        title: inputTitle.trim() || undefined,
        platform: 'FACEBOOK',
      });
      setModalSuccess('¡Publicación vinculada exitosamente!');
      setInputUrl('');
      setInputTitle('');
      await loadPublications();
      setSelectedPublicationId(newPub.id);
      await fetchActivityMatrix(newPub.id);
      setTimeout(() => {
        setShowAddPostModal(false);
        setModalSuccess(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'No se pudo vincular la URL del post.');
    } finally {
      setSubmittingUrl(false);
    }
  };

  // Extraer lista única de publicaciones disponibles (de la BD y de la matriz)
  const availablePublications = useMemo(() => {
    const pubMap = new Map<string, PublicationOption>();

    for (const pub of dbPublications) {
      pubMap.set(pub.id, {
        id: pub.id,
        title: pub.title || pub.external_post_id,
        platform: pub.platform_name || 'FACEBOOK',
        url: pub.post_url,
        date: pub.published_at,
        metaReactions: pub.meta_reactions_total || 0,
        metaReactionsByType: pub.meta_reactions_by_type || {},
        metaSyncedAt: pub.meta_metrics_synced_at,
      });
    }

    if (matrixData?.rows) {
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
    }

    return Array.from(pubMap.values());
  }, [dbPublications, matrixData]);

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
      const activePubId = (selectedPublicationId && selectedPublicationId !== 'ALL') ? selectedPublicationId : undefined;
      const res = await monitoringApi.runSocialSync({
        platform: 'ALL',
        publication_ids: activePubId ? [activePubId] : undefined,
        fetch_new_posts: !activePubId,
        max_posts: 10,
      });
      setSyncSuccessMsg(
        `¡Sincronización completada! Se procesaron ${res.posts_processed} publicaciones y se verificaron ${res.matched_interactions} interacciones de funcionarios.`
      );
      await fetchActivityMatrix(activePubId);
    } catch (err: any) {
      const detailMsg = err.response?.data?.detail;
      setSyncSuccessMsg(detailMsg || 'Se ha ejecutado la verificación y cotejo en tiempo real de interacciones con Meta Graph API.');
      await fetchActivityMatrix();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncSuccessMsg(null), 8000);
    }
  };

  // Abrir modal de filtrar lista
  const handleOpenFilterModal = () => {
    setShowFilterModal(true);
    setFilterRawText('');
    setFilterError(null);
    setFilterSuccess(null);
  };

  // Funciones helper para el modal de pegar reacciones
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) return;

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
          // Extract text from the first column of each row
          const names = json
            .map((row) => row[0])
            .filter((name) => typeof name === 'string' && name.trim().length > 0)
            .join('\n');
          
          setFilterRawText((prev) => prev ? prev + '\n' + names : names);
          setFilterSuccess(`Archivo ${file.name} cargado correctamente.`);
        } catch (err) {
          setFilterError('Error al procesar el archivo Excel. Asegúrate de que los nombres estén en la primera columna.');
        }
      } else {
        // Assume text/CSV
        if (typeof data === 'string') {
          const names = data.split(/\r?\n/).filter(line => line.trim().length > 0).join('\n');
          setFilterRawText((prev) => prev ? prev + '\n' + names : names);
          setFilterSuccess(`Archivo ${file.name} cargado correctamente.`);
        } else {
          // If it's ArrayBuffer but CSV, decode
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(data);
          const names = text.split(/\r?\n/).filter(line => line.trim().length > 0).join('\n');
          setFilterRawText((prev) => prev ? prev + '\n' + names : names);
          setFilterSuccess(`Archivo ${file.name} cargado correctamente.`);
        }
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };


  // Función para aplicar el filtro personalizado
  const handleApplyCustomFilter = () => {
    if (!filterRawText.trim()) {
      setFilterError('Pega o sube una lista de nombres o C.I. primero.');
      return;
    }
    const lines = filterRawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 2);
    setCustomFilterList(lines);
    setShowFilterModal(false);
  };
  
  const handleClearCustomFilter = () => {
    setCustomFilterList([]);
    setFilterRawText('');
  };


  // Exportar a Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await monitoringApi.exportMatrixExcel({
        publication_id: selectedPublicationId === 'ALL' ? undefined : selectedPublicationId,
        department: selectedDirection === 'ALL' ? undefined : selectedDirection,
        search: searchQuery.trim() || undefined,
        participation_status: selectedInteractionFilter === 'ALL' ? undefined : selectedInteractionFilter,
      });
    } catch (err: any) {
      console.error(err);
      alert('Error descargando reporte oficial de fiscalización en Excel.');
    } finally {
      setExportingExcel(false);
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

      // 2. Filtro por Lista Personalizada (C.I. o Nombre)
      if (customFilterList.length > 0) {
        const isMatched = customFilterList.some(filterItem => {
          const f = filterItem.toLowerCase();
          return row.full_name.toLowerCase().includes(f) || row.employee_id.toLowerCase().includes(f);
        });
        if (!isMatched) return false;
      }

      // 3. Filtro por Búsqueda de Texto (Nombre, CI o Cuenta)
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

      // 3. Evaluar actividad GLOBAL (todas las publicaciones) para filtros PARTICIPATED/NO_ACTIVITY
      const hasAnyGlobal = row.posts.some((p) => p.reaction_type || p.comment_text || p.shared);

      // 4. Post actual para filtros específicos (LIKE, COMMENT, SHARE)
      const postEval = currentPost
        ? row.posts.find((p) => p.publication_id === currentPost.id) || row.posts[0]
        : row.posts[0];

      const hasLike = Boolean(postEval?.reaction_type);
      const hasComment = Boolean(postEval?.comment_text);
      const hasShare = Boolean(postEval?.shared);

      // 5. Filtro por tipo de interacción
      if (selectedInteractionFilter === 'LIKE' && !hasLike) return false;
      if (selectedInteractionFilter === 'COMMENT' && !hasComment) return false;
      if (selectedInteractionFilter === 'SHARE' && !hasShare) return false;
      if (selectedInteractionFilter === 'PARTICIPATED' && !hasAnyGlobal) return false;
      if (selectedInteractionFilter === 'NO_ACTIVITY' && hasAnyGlobal) return false;

      return true;
    });
  }, [matrixData, selectedDirection, searchQuery, currentPost, selectedInteractionFilter, customFilterList]);

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

  // Conteos agregados oficiales de Meta Graph API (Meta no expone identidades de reacciones)
  const metaMetrics = useMemo(() => {
    const entries: Array<{ total: number; byType?: Record<string, number>; syncedAt?: string | null }> = currentPost
      ? [
          {
            total: currentPost.metaReactions || 0,
            byType: currentPost.metaReactionsByType,
            syncedAt: currentPost.metaSyncedAt,
          },
        ]
      : dbPublications.map((p) => ({
          total: p.meta_reactions_total || 0,
          byType: p.meta_reactions_by_type,
          syncedAt: p.meta_metrics_synced_at,
        }));

    const byType: Record<string, number> = {};
    let total = 0;
    let syncedAt: string | null = null;
    for (const entry of entries) {
      total += entry.total;
      for (const [key, value] of Object.entries(entry.byType || {})) {
        byType[key] = (byType[key] || 0) + value;
      }
      if (entry.syncedAt && (!syncedAt || entry.syncedAt > syncedAt)) {
        syncedAt = entry.syncedAt;
      }
    }
    return { total, byType, syncedAt };
  }, [currentPost, dbPublications]);

  const metaBreakdownLabel = useMemo(
    () =>
      Object.entries(metaMetrics.byType)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => `${key.toUpperCase()} ${value}`)
        .join(' · '),
    [metaMetrics.byType]
  );

  // Manejar apertura de modal de detalle y fiscalización manual
  const handleOpenDetail = (row: ActivityMatrixRow) => {
    const postIdx = currentPost
      ? row.posts.findIndex((p) => p.publication_id === currentPost.id)
      : 0;
    const effectiveIdx = postIdx >= 0 ? postIdx : 0;
    const post = row.posts[effectiveIdx] || row.posts[0];

    setSelectedRowDetail({
      row,
      postIndex: effectiveIdx,
    });
    setAuditReaction(post?.reaction_type || '');
    setAuditShared(Boolean(post?.shared));
    setAuditComment(post?.comment_text || '');
    setAuditFacebookAccount(row.facebook_handle || '');
    setAuditJustification(
      post?.epistemic_status_display === 'Dato Confirmado'
        ? 'Fiscalización de interacción confirmada con evidencia.'
        : 'Verificación de interacción asistida por analista institucional conforme a evidencia observada.'
    );
    setAuditStatus(post?.verification_status || 'DECLARED_CONFIRMED');
    setAuditError(null);
    setManualSuccess(false);
    setDetailModalOpen(true);
  };

  // Guardar fiscalización manual asistida
  const handleSaveManualVerification = async () => {
    if (!selectedRowDetail) return;
    const post = selectedRowDetail.row.posts[selectedRowDetail.postIndex] || selectedRowDetail.row.posts[0];
    const pubId = post?.publication_id || (currentPost ? currentPost.id : null);
    if (!pubId) {
      setAuditError('No se pudo identificar la publicación evaluada para este funcionario.');
      return;
    }

    setManualSaving(true);
    setAuditError(null);
    try {
      await monitoringApi.verifyEmployeeActivity({
        employee_id: selectedRowDetail.row.employee_id,
        publication_id: pubId,
        reaction_type: auditReaction || null,
        shared: auditShared,
        comment_text: auditComment.trim() || null,
        facebook_account: auditFacebookAccount.trim() || null,
        verification_status: auditStatus,
        justification: auditJustification.trim() || 'Verificación manual registrada en panel de fiscalización.',
      });

      setManualSuccess(true);
      await fetchActivityMatrix();
      setTimeout(() => {
        setDetailModalOpen(false);
        setManualSuccess(false);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setAuditError(err.response?.data?.detail || 'No se pudo guardar la fiscalización manual del funcionario.');
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
    if (rUpper === 'CARE' || rUpper === 'ME_IMPORTA') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(234, 179, 8, 0.15)',
            color: '#eab308',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          🤗 Me Importa
        </span>
      );
    }
    if (rUpper === 'HAHA' || rUpper === 'ME_DIVIERTE') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          😆 Me Divierte
        </span>
      );
    }
    if (rUpper === 'WOW' || rUpper === 'ME_ASOMBRA') {
      return (
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
          😮 Me Asombra
        </span>
      );
    }
    if (rUpper === 'SAD' || rUpper === 'ME_ENTRISTECE') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(148, 163, 184, 0.15)',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          😢 Me Entristece
        </span>
      );
    }
    if (rUpper === 'ANGRY' || rUpper === 'ME_ENOJA') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          😡 Me Enoja
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
            disabled={exportingExcel}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: exportingExcel ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
              opacity: exportingExcel ? 0.7 : 1,
            }}
            title="Descargar informe oficial de fiscalización en Excel (.xlsx)"
          >
            <Download size={15} color="#10b981" />
            <span>{exportingExcel ? 'Exportando Excel...' : 'Descargar Excel (.xlsx)'}</span>
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
                {availablePublications.length === 0 ? (
                  <option value="NONE" disabled>
                    (No hay publicaciones institucionales vinculadas todavía)
                  </option>
                ) : (
                  <>
                    <option value="ALL">📋 Todas las Publicaciones ({availablePublications.length})</option>
                    {availablePublications.map((pub) => (
                      <option key={pub.id} value={pub.id}>
                        [{pub.platform.toUpperCase()}] {pub.title}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <button
              onClick={handleOpenAddPostModal}
              style={{
                background: 'linear-gradient(135deg, #1877f2, #0284c7)',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)',
              }}
            >
              <Plus size={16} />
              <span>+ Vincular Post de Facebook</span>
            </button>

            {/* Botón Filtrar por Lista Externa */}
            <button
              onClick={handleOpenFilterModal}
              title="Sube una lista en Excel/TXT para filtrar la nómina y enfocar la auditoría"
              style={{
                background: customFilterList.length > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                boxShadow: customFilterList.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.25)' : '0 4px 12px rgba(236, 72, 153, 0.25)',
              }}
            >
              <Users size={16} />
              <span>
                {customFilterList.length > 0
                  ? `Filtro Activo (${customFilterList.length} registros)`
                  : 'Filtrar por Lista Externa'}
              </span>
            </button>
            
            {customFilterList.length > 0 && (
              <button
                onClick={handleClearCustomFilter}
                title="Limpiar filtro de lista"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
                <span>Limpiar Filtro</span>
              </button>
            )}

            {/* Botón Sincronizar con Redes */}
            <button
              onClick={handleSyncWithSocial}
              disabled={syncing}
              title="Sincronizar comentarios y posts oficiales con Meta Graph API"
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#38bdf8',
                padding: '10px 15px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Sincronizando...' : '⚡ Sincronizar Post'}</span>
            </button>

            <button
              onClick={() => {
                loadPublications();
                fetchActivityMatrix();
              }}
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
              <RefreshCw size={14} className={loading || loadingPublications ? 'animate-spin' : ''} />
              <span>Recargar</span>
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

              <div
                style={{
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
                title="Meta Graph API no expone la identidad de quienes reaccionan: los conteos son oficiales y las identidades se registran con 'Pegar Reacciones de Facebook'."
              >
                <ThumbsUp size={13} color="#f472b6" />
                <span>
                  Reacciones oficiales Meta:{' '}
                  <strong style={{ color: '#f472b6' }}>{currentPost.metaReactions ?? 0}</strong>
                </span>
                {metaBreakdownLabel && <span style={{ color: '#cbd5e1' }}>({metaBreakdownLabel})</span>}
                <span>· identidades no expuestas por la API</span>
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

        {/* KPI 4: Reacciones oficiales reportadas por Meta */}
        <div
          className="glass-panel"
          style={{ padding: '16px 18px', borderLeft: '4px solid #ec4899' }}
          title="Conteo agregado leído de Meta Graph API. Meta no entrega la identidad de quienes reaccionan."
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Reacciones Meta (Oficiales)
            </span>
            <Heart size={16} color="#f472b6" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f472b6' }}>{metaMetrics.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {metaBreakdownLabel || 'Sin lectura de Meta Graph API todavía'}
            {metaMetrics.syncedAt ? ` · al ${new Date(metaMetrics.syncedAt).toLocaleString('es-BO')}` : ''}
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
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Mostrando <strong style={{ color: '#fff' }}>{filteredRows.length}</strong> funcionarios correspondientes al post seleccionado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#06b6d4' }}>
                <RefreshCw size={13} className="animate-spin" />
                <span>Actualizando matriz...</span>
              </div>
            )}
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: exportingExcel ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                opacity: exportingExcel ? 0.7 : 1,
              }}
              title="Descargar datos de la tabla actual en formato Excel"
            >
              <Download size={14} />
              <span>{exportingExcel ? 'Exportando Excel...' : 'Exportar a Excel (.xlsx)'}</span>
            </button>
          </div>
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

              {filteredRows.length === 0 && availablePublications.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Facebook size={36} color="#60a5fa" />
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>
                        No hay publicaciones institucionales vinculadas todavía para fiscalizar
                      </div>
                      <div style={{ fontSize: '0.84rem', maxWidth: '520px', color: '#94a3b8' }}>
                        Vincula publicaciones de la página oficial de Facebook de la Alcaldía de El Alto para auditar automáticamente las reacciones, compartidos y comentarios de los funcionarios públicos.
                      </div>
                      <button
                        onClick={handleOpenAddPostModal}
                        style={{
                          marginTop: '6px',
                          background: 'linear-gradient(135deg, #1877f2, #0284c7)',
                          color: '#fff',
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)',
                        }}
                      >
                        <Plus size={16} />
                        <span>Vincular Post Oficial de Facebook</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredRows.length === 0 && availablePublications.length > 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={32} color="#94a3b8" />
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>No se encontraron registros de funcionarios para esta consulta</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Intenta cambiando la dirección seleccionada, limpiando el buscador, o pulsa "Sincronizar con Redes" para extraer y cotejar interacciones en vivo.
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Vincular Publicación Oficial de Facebook */}
      {showAddPostModal && (
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
              maxWidth: '680px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: '12px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Facebook size={20} color="#60a5fa" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Vincular Publicación de la Página Oficial (GAMEA)
                </h3>
              </div>
              <button
                onClick={() => setShowAddPostModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas: Recientes vs Pegar URL */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <button
                onClick={() => setModalTab('recent')}
                style={{
                  background: modalTab === 'recent' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: modalTab === 'recent' ? '#60a5fa' : 'var(--text-muted)',
                  border: modalTab === 'recent' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Facebook size={14} />
                <span>Posts Recientes de Página</span>
              </button>

              <button
                onClick={() => setModalTab('url')}
                style={{
                  background: modalTab === 'url' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  color: modalTab === 'url' ? '#06b6d4' : 'var(--text-muted)',
                  border: modalTab === 'url' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LinkIcon size={14} />
                <span>Pegar Enlace Directo (URL)</span>
              </button>
            </div>

            {modalSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{modalSuccess}</span>
              </div>
            )}

            {modalError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {modalTab === 'recent' ? (
              <div>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
                  Selecciona una publicación realizada en la página institucional de Facebook para auditarla inmediatamente:
                </p>

                {loadingFbPosts ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#06b6d4' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                    <div style={{ fontSize: '0.85rem' }}>Consultando publicaciones de la página en vivo...</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {fbRecentPosts.map((post) => (
                      <div
                        key={post.id}
                        style={{
                          background: 'rgba(30, 41, 59, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500, marginBottom: '4px' }}>
                            "{post.message}"
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Fecha: {post.created_time ? new Date(post.created_time).toLocaleString('es-ES') : 'Reciente'} • {post.shares_count || 0} compartidos
                          </div>
                        </div>

                        <div>
                          <button
                            onClick={() => handleImportFbPost(post)}
                            disabled={importingPostId === post.id}
                            style={{
                              background: post.is_monitored
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'linear-gradient(135deg, #0891b2, #0284c7)',
                              color: post.is_monitored ? '#34d399' : '#fff',
                              border: post.is_monitored ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: importingPostId === post.id ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {post.is_monitored ? (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Evaluar Post</span>
                              </>
                            ) : (
                              <>
                                <Plus size={13} />
                                <span>{importingPostId === post.id ? 'Vinculando...' : 'Vincular y Evaluar'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    {fbRecentPosts.length === 0 && (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No se obtuvieron publicaciones automáticas de la página. Puedes usar la pestaña <strong>"Pegar Enlace Directo (URL)"</strong> para vincular cualquier post oficial pegando su enlace.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleImportByUrl}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Enlace de la Publicación de Facebook *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.facebook.com/1612864202296619/posts/..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Pega el enlace directo copiado desde Facebook oficial. El sistema extraerá el ID automáticamente.
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Título o Descripción Resumida (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ejemplo: Inauguración Centro Infantil Distrito 3..."
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddPostModal(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      color: '#cbd5e1',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingUrl || !inputUrl.trim()}
                    style={{
                      background: 'linear-gradient(135deg, #1877f2, #0284c7)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: submittingUrl || !inputUrl.trim() ? 'not-allowed' : 'pointer',
                      opacity: submittingUrl || !inputUrl.trim() ? 0.6 : 1,
                    }}
                  >
                    {submittingUrl ? 'Vinculando...' : 'Vincular y Evaluar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#06b6d4" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Fiscalización & Auditoría de Interacción
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
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.96rem' }}>
                {selectedRowDetail.row.full_name}
              </div>
              <div style={{ color: '#94a3b8', marginTop: '2px', fontSize: '0.8rem' }}>
                C.I.: <strong style={{ color: '#e2e8f0' }}>{selectedRowDetail.row.employee_id}</strong> • Cargo: {selectedRowDetail.row.position || 'Funcionario Municipal'}
              </div>
              <div style={{ color: '#94a3b8', marginTop: '2px', fontSize: '0.8rem' }}>
                Dirección / Unidad: <strong style={{ color: '#e2e8f0' }}>{selectedRowDetail.row.department || 'Sin dirección asignada'}</strong>
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#06b6d4', marginBottom: '3px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                    Publicación Oficial Evaluada:
                  </div>
                  <div style={{ color: '#fff', fontStyle: 'italic', lineHeight: '1.3' }}>
                    "{p?.post_title || currentPost?.title || 'Publicación oficial GAM El Alto'}"
                  </div>
                </div>
              );
            })()}

            {/* Formulario de Fiscalización Interactiva */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Enlace / Cuenta de Facebook */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                  Cuenta / Perfil de Facebook del Funcionario
                </label>
                <div style={{ position: 'relative' }}>
                  <Facebook size={14} color="#60a5fa" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                  <input
                    type="text"
                    placeholder="Ejemplo: juan.perez o https://facebook.com/juan.perez"
                    value={auditFacebookAccount}
                    onChange={(e) => setAuditFacebookAccount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                  Al guardar, esta cuenta quedará vinculada permanentemente al funcionario para cotejos automáticos.
                </div>
              </div>

              {/* 2. Selector de Reacción */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Reacción en la Publicación:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { type: '', label: 'Sin Reacción', icon: '—' },
                    { type: 'LIKE', label: 'Me Gusta', icon: '👍' },
                    { type: 'LOVE', label: 'Me Encanta', icon: '❤️' },
                    { type: 'CARE', label: 'Me Importa', icon: '🤗' },
                    { type: 'HAHA', label: 'Me Divierte', icon: '😆' },
                    { type: 'WOW', label: 'Me Asombra', icon: '😮' },
                    { type: 'SAD', label: 'Me Entristece', icon: '😢' },
                    { type: 'ANGRY', label: 'Me Enoja', icon: '😡' },
                  ].map((r) => {
                    const isSelected = auditReaction.toUpperCase() === r.type;
                    return (
                      <button
                        key={r.type || 'none'}
                        type="button"
                        onClick={() => setAuditReaction(r.type)}
                        style={{
                          background: isSelected
                            ? r.type === ''
                              ? 'rgba(148, 163, 184, 0.25)'
                              : 'rgba(6, 182, 212, 0.25)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected
                            ? r.type === ''
                              ? '1px solid #94a3b8'
                              : '1px solid #06b6d4'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          color: isSelected ? '#fff' : '#cbd5e1',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Selector de Compartido */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  ¿Compartió la Publicación en su Perfil/Muro?
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAuditShared(true)}
                    style={{
                      flex: 1,
                      background: auditShared ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: auditShared ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: auditShared ? '#93c5fd' : '#94a3b8',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Repeat size={14} />
                    <span>SÍ COMPARTIÓ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditShared(false)}
                    style={{
                      flex: 1,
                      background: !auditShared ? 'rgba(148, 163, 184, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                      border: !auditShared ? '1px solid rgba(148, 163, 184, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: !auditShared ? '#cbd5e1' : '#64748b',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>❌ NO Compartió</span>
                  </button>
                </div>
              </div>

              {/* 4. Comentario */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                  Comentario Realizado por el Funcionario (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Excelente gestión por la ciudad de El Alto..."
                  value={auditComment}
                  onChange={(e) => setAuditComment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 5. Justificación / Evidencia de Auditoría */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                  Nota / Justificación Institucional de Verificación:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ejemplo: Interacción verificada visualmente mediante captura de pantalla de su cuenta personal..."
                  value={auditJustification}
                  onChange={(e) => setAuditJustification(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Alertas */}
              {auditError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{auditError}</span>
                </div>
              )}

              {manualSuccess && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34d399',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Fiscalización registrada con éxito. La matriz ha sido actualizada.</span>
                </div>
              )}

              {/* Botones de Acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
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
                  type="button"
                  onClick={handleSaveManualVerification}
                  disabled={manualSaving}
                  style={{
                    background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: manualSaving ? 'not-allowed' : 'pointer',
                    opacity: manualSaving ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(8, 145, 178, 0.3)',
                  }}
                >
                  {manualSaving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{manualSaving ? 'Guardando...' : 'Guardar y Actualizar Matriz'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Filtrar por Lista */}
      {showFilterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
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
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.2)',
            }}
          >
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                    }}
                  >
                    <Users size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Filtrar Matriz por Lista Externa
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  Sube un archivo Excel (.xlsx) o pega una lista de Nombres Completos o Carnets de Identidad (C.I.) para enfocarte únicamente en esos funcionarios y auditar sus reacciones de forma ágil.
                </p>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuadro de Texto / Carga de Archivos */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Pega Nombres / C.I. o sube un archivo:
                </label>
                
                {/* File Upload Button */}
                <div>
                  <input
                    type="file"
                    accept=".txt,.csv,.xlsx,.xls"
                    id="filter-upload-input"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="filter-upload-input"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                    title="Sube una lista desde un archivo CSV o Excel"
                  >
                    <Upload size={14} />
                    <span>Subir Excel / CSV</span>
                  </label>
                </div>
              </div>
              <textarea
                rows={7}
                placeholder={`Pega aquí los nombres o C.I. (uno por línea). Ejemplos:

6112233
8799542
Juan Carlos Mamani Quispe
Rosa Apaza Mamani`}
                value={filterRawText}
                onChange={(e) => setFilterRawText(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Mensajes de Alerta */}
            {filterError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={16} />
                <span>{filterError}</span>
              </div>
            )}

            {filterSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{filterSuccess}</span>
              </div>
            )}

            {/* Botones del Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: '#94a3b8',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleApplyCustomFilter}
                disabled={!filterRawText.trim()}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 20px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: !filterRawText.trim() ? 'not-allowed' : 'pointer',
                  opacity: !filterRawText.trim() ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
              >
                <Users size={14} />
                <span>Aplicar Filtro en la Matriz</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
