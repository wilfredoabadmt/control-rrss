import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronDown,
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
import { analyticsApi, PostCommentItem } from '../api/analytics';
import { ActivePage } from '../components/Sidebar';
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

interface InteractionsPageProps {
  onNavigate?: (page: ActivePage) => void;
}

export const InteractionsPage: React.FC<InteractionsPageProps> = ({ onNavigate }) => {
  // Estado principal de la matriz de actividad
  const [matrixData, setMatrixData] = useState<ActivityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Pestaña de vista activa: Nómina de Funcionarios vs Comentarios Extraídos de Meta
  const [activeViewTab, setActiveViewTab] = useState<'employees' | 'comments'>('employees');
  const [postComments, setPostComments] = useState<PostCommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsFilterType, setCommentsFilterType] = useState<'ALL' | 'EMPLOYEES' | 'CITIZENS'>('ALL');
  const [commentsSearchQuery, setCommentsSearchQuery] = useState('');

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

  // Selector elegante y compacto de publicaciones con búsqueda interactiva
  const [showPostSelectorDropdown, setShowPostSelectorDropdown] = useState(false);
  const [postSelectorSearch, setPostSelectorSearch] = useState('');
  const [postSelectorPlatform, setPostSelectorPlatform] = useState<'ALL' | 'FACEBOOK' | 'TIKTOK'>('ALL');
  const postSelectorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (postSelectorRef.current && !postSelectorRef.current.contains(e.target as Node)) {
        setShowPostSelectorDropdown(false);
      }
    };
    if (showPostSelectorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPostSelectorDropdown]);

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

  // Modal Pegar Reacciones de Facebook
  const [showPasteReactionsModal, setShowPasteReactionsModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteReactionType, setPasteReactionType] = useState('LIKE');
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);
  const [pasteResultDetails, setPasteResultDetails] = useState<{
    matched_count: number;
    unmatched_citizens_count: number;
    matched_employees: any[];
    unmatched_names: string[];
    ambiguous_names: string[];
  } | null>(null);

  // Modal Pegar Comentarios de Facebook
  const [showPasteCommentsModal, setShowPasteCommentsModal] = useState(false);
  const [pasteCommentsRawText, setPasteCommentsRawText] = useState('');
  const [pasteCommentsLoading, setPasteCommentsLoading] = useState(false);
  const [pasteCommentsError, setPasteCommentsError] = useState<string | null>(null);
  const [pasteCommentsSuccess, setPasteCommentsSuccess] = useState<string | null>(null);
  const [pasteCommentsResultDetails, setPasteCommentsResultDetails] = useState<{
    matched_count: number;
    unmatched_citizens_count: number;
    matched_employees: any[];
    citizen_comments: any[];
    ambiguous_names: string[];
  } | null>(null);


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

  // Cargar comentarios extraídos de Meta para la publicación seleccionada o global
  const fetchPostComments = async (pubId?: string) => {
    const activeTarget = pubId !== undefined ? pubId : selectedPublicationId;
    const targetId = activeTarget && activeTarget !== 'ALL' ? activeTarget : undefined;
    setLoadingComments(true);
    try {
      const res = await analyticsApi.getComments({
        publication_id: targetId,
        page_size: 100,
      });
      setPostComments(res.items || []);
    } catch (e) {
      console.error('Error al cargar comentarios:', e);
      setPostComments([]);
    } finally {
      setLoadingComments(false);
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

  // Sincronizar comentarios del post seleccionado
  useEffect(() => {
    if (selectedPublicationId && selectedPublicationId !== 'ALL') {
      fetchPostComments(selectedPublicationId);
    } else if (availablePublications.length > 0) {
      fetchPostComments(availablePublications[0].id);
    }
  }, [selectedPublicationId, availablePublications]);

  // Formateador limpio y conciso de títulos de publicaciones
  const formatPostTitleClean = (rawTitle: string, maxLen = 65): string => {
    if (!rawTitle) return '(Sin título)';
    let clean = rawTitle.replace(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g, '').trim();
    clean = clean.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) clean = rawTitle.trim();
    if (clean.length > maxLen) {
      const truncated = clean.slice(0, maxLen);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 35) {
        return truncated.slice(0, lastSpace).trim() + '...';
      }
      return truncated.trim() + '...';
    }
    return clean;
  };

  const formatDateShort = (rawDate?: string): string => {
    if (!rawDate) return '';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Filtrar publicaciones para el selector interactivo
  const filteredPublicationsForSelector = useMemo(() => {
    return availablePublications.filter((pub) => {
      if (postSelectorPlatform !== 'ALL') {
        if (pub.platform.toUpperCase() !== postSelectorPlatform) return false;
      }
      if (postSelectorSearch.trim()) {
        const q = postSelectorSearch.toLowerCase().trim();
        const matchesTitle = (pub.title || '').toLowerCase().includes(q);
        const matchesPlatform = (pub.platform || '').toLowerCase().includes(q);
        const matchesDate = (pub.date || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesPlatform && !matchesDate) return false;
      }
      return true;
    });
  }, [availablePublications, postSelectorPlatform, postSelectorSearch]);

  // Filtrado de comentarios por tipo y búsqueda
  const filteredComments = useMemo(() => {
    return postComments.filter((c) => {
      const isEmp = c.author?.is_employee;
      if (commentsFilterType === 'EMPLOYEES' && !isEmp) return false;
      if (commentsFilterType === 'CITIZENS' && isEmp) return false;
      if (commentsSearchQuery.trim()) {
        const q = commentsSearchQuery.toLowerCase();
        const matchesAuthor = c.author?.author_name?.toLowerCase().includes(q);
        const matchesText = c.content_text?.toLowerCase().includes(q);
        const matchesEmpName = c.author?.full_name?.toLowerCase().includes(q);
        if (!matchesAuthor && !matchesText && !matchesEmpName) return false;
      }
      return true;
    });
  }, [postComments, commentsFilterType, commentsSearchQuery]);

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
      const extraMsg = res.matched_interactions > 0
        ? `Se verificaron y confirmaron ${res.matched_interactions} interacciones de funcionarios.`
        : `Los comentarios extraídos (${res.interactions_extracted}) son de ciudadanos del público general (visibles en la pestaña Comentarios). Ningún funcionario ha comentado aún.`;
      setSyncSuccessMsg(
        `¡Sincronización con Meta Graph API exitosa! Publicaciones: ${res.posts_processed}. Comentarios extraídos: ${res.interactions_extracted}. ${extraMsg}`
      );
      await fetchActivityMatrix(activePubId);
      await fetchPostComments(activePubId);
    } catch (err: any) {
      const detailMsg = err.response?.data?.detail;
      setSyncSuccessMsg(detailMsg || 'Se ha ejecutado la verificación y cotejo en tiempo real de interacciones con Meta Graph API.');
      await fetchActivityMatrix();
      await fetchPostComments();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncSuccessMsg(null), 10000);
    }
  };

  // Abrir modal de importar/pegar reacciones
  const handleOpenPasteReactionsModal = () => {
    setShowPasteReactionsModal(true);
    setPasteRawText('');
    setPasteReactionType('LIKE');
    setPasteError(null);
    setPasteSuccess(null);
    setPasteResultDetails(null);
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
            .map((row: any) => row[0])
            .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
            .join('\n');
          
          setPasteRawText((prev) => prev ? prev + '\n' + names : names);
          setPasteSuccess(`Archivo ${file.name} cargado correctamente.`);
        } catch (err) {
          setPasteError('Error al procesar el archivo Excel. Asegúrate de que los nombres estén en la primera columna.');
        }
      } else {
        // Assume text/CSV
        if (typeof data === 'string') {
          const names = data.split(/\r?\n/).filter(line => line.trim().length > 0).join('\n');
          setPasteRawText((prev) => prev ? prev + '\n' + names : names);
          setPasteSuccess(`Archivo ${file.name} cargado correctamente.`);
        } else {
          // If it's ArrayBuffer but CSV, decode
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(data);
          const names = text.split(/\r?\n/).filter(line => line.trim().length > 0).join('\n');
          setPasteRawText((prev) => prev ? prev + '\n' + names : names);
          setPasteSuccess(`Archivo ${file.name} cargado correctamente.`);
        }
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const getReactionLabel = (type: string): string => {
    const labels: Record<string, string> = {
      LIKE: '👍 Me Gusta',
      LOVE: '❤️ Me Encanta',
      CARE: '🤗 Me Importa',
      HAHA: '😆 Me Divierte',
      WOW: '😮 Me Asombra',
      SAD: '😢 Me Entristece',
      ANGRY: '😡 Me Enoja',
    };
    return labels[type] || type;
  };

  const parsePastePreview = (text: string): string[] => {
    const noisePhrases = new Set([
      'todos', 'me gusta', 'me encanta', 'me importa', 'me divierte', 'me asombra', 'me entristece', 'me enoja',
      'agregar', 'agregar a amigos', 'enviar mensaje', 'seguir', 'siguiendo', 'amigos', 'amigo', 'amiga',
      'cancelar', 'cerrar', 'ver mas', 'ver más', 'responder', 'compartir', 'mutual friends', 'amigos en común',
      'foto del perfil de', 'reacciono', 'reaccionó', 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry',
    ]);

    const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const candidateLines: string[] = [];
    for (const line of rawLines) {
      const lineStr = line.trim();
      if (!lineStr) continue;
      if (lineStr.includes(',') && rawLines.length < 5) {
        for (const sub of lineStr.split(',')) {
          if (sub.trim()) candidateLines.push(sub.trim());
        }
      } else {
        candidateLines.push(lineStr);
      }
    }

    const cleaned: string[] = [];
    for (const line of candidateLines) {
      let lClean = line.trim();
      
      // Extraer nombre si viene en formato Markdown: [Mariela Mamani](https://...)
      const matchMd = lClean.match(/^\[([^\]]+)\]\(https?:\/\/[^\)]+\)$/);
      if (matchMd) {
        lClean = matchMd[1].trim();
      }
      
      const lLower = lClean.toLowerCase();
      if (!lClean || /^\d+$/.test(lClean)) continue;
      
      // Filtrar líneas de resumen/conteo
      if (/^(todos|me gusta|me encanta|me divierte|me importa|me asombra|me entristece|me enoja)\s+\d+$/.test(lLower)) continue;
      
      // Filtrar ruido
      if (noisePhrases.has(lLower)) continue;
      if (/\d+\s+amigos?\s+en\s+com/.test(lLower)) continue;
      if (lLower.startsWith('foto del perfil de ')) {
        lClean = lClean.slice(19).trim();
      }
      if (lClean.length < 3) continue;
      
      cleaned.push(lClean);
    }
    return cleaned;
  };

  // Enviar reacciones copiadas para cruce automático y persistencia en PostgreSQL
  const handleImportReactions = async () => {
    if (!pasteRawText.trim()) {
      setPasteError('Por favor pega la lista de nombres copiada de las reacciones de Facebook.');
      return;
    }
    const pubId = currentPost ? currentPost.id : (selectedPublicationId !== 'ALL' ? selectedPublicationId : null);
    if (!pubId) {
      setPasteError('Debes seleccionar una publicación institucional específica para registrar las reacciones.');
      return;
    }

    setPasteLoading(true);
    setPasteError(null);
    setPasteSuccess(null);
    setPasteResultDetails(null);

    try {
      const res = await monitoringApi.importReactionsBatch({
        publication_id: pubId,
        raw_text: pasteRawText,
        default_reaction_type: pasteReactionType,
        platform: 'FACEBOOK',
      });

      setPasteSuccess(res.message);
      setPasteResultDetails({
        matched_count: res.matched_count,
        unmatched_citizens_count: res.unmatched_citizens_count,
        matched_employees: res.matched_employees,
        unmatched_names: res.unmatched_names || [],
        ambiguous_names: res.ambiguous_names || [],
      });
      await fetchActivityMatrix(pubId);
    } catch (err: any) {
      setPasteError(err.response?.data?.detail || 'Error al procesar y guardar las reacciones en PostgreSQL.');
    } finally {
      setPasteLoading(false);
    }
  };

  // Abrir modal de importar/pegar comentarios
  const handleOpenPasteCommentsModal = () => {
    setShowPasteCommentsModal(true);
    setPasteCommentsRawText('');
    setPasteCommentsError(null);
    setPasteCommentsSuccess(null);
    setPasteCommentsResultDetails(null);
  };

  const parseCommentsPreview = (text: string): Array<{ author: string; comment: string }> => {
    const clean_raw = text.replace(/\xa0/g, ' ').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = clean_raw.split(/\n\s*Responder\s*(?:\n|$)/i);
    const parsed: Array<{ author: string; comment: string }> = [];
    for (const b of blocks) {
      const b_str = b.trim();
      if (!b_str) continue;
      const lines = b_str.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      const dot_idx = lines.findIndex((l) => ['·', '•', '-', '*'].includes(l));
      if (dot_idx !== -1) {
        const authorParts = lines.slice(0, dot_idx).filter((l) => !l.toLowerCase().startsWith('responder'));
        const author = authorParts.join(' ').trim();
        const commentParts = lines.slice(dot_idx + 1);
        const comment = commentParts.join(' ').trim();
        if (author) parsed.push({ author, comment });
      } else if (lines[0].includes(':') && lines[0].split(':', 1)[0].trim().length >= 3) {
        const [authorStr, ...restParts] = lines[0].split(':');
        const rest = lines.slice(1).join(' ').trim();
        const fullC = (restParts.join(':').trim() + ' ' + rest).trim();
        parsed.push({ author: authorStr.trim(), comment: fullC });
      } else {
        const author = lines[0];
        const comment = lines.slice(1).join(' ').trim();
        if (author && author.length >= 3) {
          parsed.push({ author, comment });
        }
      }
    }
    return parsed;
  };

  const handleImportComments = async () => {
    if (!pasteCommentsRawText.trim()) {
      setPasteCommentsError('Por favor pega los comentarios copiados de Facebook.');
      return;
    }
    const pubId = currentPost ? currentPost.id : (selectedPublicationId !== 'ALL' ? selectedPublicationId : null);
    if (!pubId) {
      setPasteCommentsError('Debes seleccionar una publicación institucional específica para registrar los comentarios.');
      return;
    }

    setPasteCommentsLoading(true);
    setPasteCommentsError(null);
    setPasteCommentsSuccess(null);
    setPasteCommentsResultDetails(null);

    try {
      const res = await monitoringApi.importCommentsBatch({
        publication_id: pubId,
        raw_text: pasteCommentsRawText,
        platform: 'FACEBOOK',
      });

      setPasteCommentsSuccess(res.message);
      setPasteCommentsResultDetails({
        matched_count: res.matched_count,
        unmatched_citizens_count: res.unmatched_citizens_count,
        matched_employees: res.matched_employees,
        citizen_comments: res.citizen_comments || [],
        ambiguous_names: res.ambiguous_names || [],
      });
      await fetchActivityMatrix(pubId);
      await fetchPostComments(pubId);
    } catch (err: any) {
      setPasteCommentsError(err.response?.data?.detail || 'Error al procesar y guardar los comentarios en PostgreSQL.');
    } finally {
      setPasteCommentsLoading(false);
    }
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
              Registro y Verificación de Reacciones
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Verificación del acompañamiento del personal municipal en publicaciones oficiales: Reacciones, Comentarios y Compartidos.
          </p>
        </div>

        {/* Botones de Acción Global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

          {onNavigate && (
            <button
              onClick={() => onNavigate('analytics')}
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.25))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                color: '#38bdf8',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
              }}
              title="Ir al Dashboard Estadístico y Auditoría de Comentarios"
            >
              <Award size={15} color="#38bdf8" />
              <span>Dashboard Analítica & Comentarios</span>
            </button>
          )}
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
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.94rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>¿Cómo funciona la fiscalización e interacción por publicación en GAMEA?</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ color: '#06b6d4', fontWeight: 700 }}>1. Selección de Publicación:</span> Elige la publicación institucional en el menú inferior para cargar su estado actual.
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>2. Comentarios Automáticos (Meta Graph API) 💬:</span> Pulsa el botón cyan <strong>"⚡ Sincronizar Post"</strong>. El sistema consulta en vivo los servidores de Meta, descarga todos los comentarios reales con su texto exacto y los coteja contra la nómina. Si un funcionario comentó, su fila mostrará su comentario exacto y cambiará a <strong style={{ color: '#34d399' }}>CUMPLIDO</strong>.
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ color: '#f472b6', fontWeight: 700 }}>3. Reacciones (Likes 👍 / Me Encanta ❤️):</span> Por normativas internacionales de privacidad de datos, Meta Graph API entrega el conteo global oficial (visible arriba) pero oculta la identidad de quién reacciona. Para identificar a los funcionarios entre esas reacciones, pulsa <strong style={{ color: '#f472b6' }}>"📥 Pegar Reacciones de Facebook"</strong> (copias los nombres del popup en Facebook y el sistema cruza los 40 funcionarios al instante).
                </div>
                <div>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>4. Estado Sin Interacción ⏳:</span> Todo funcionario que aún no haya registrado un comentario verificado ni una reacción confirmada permanecerá en rojo como <strong style={{ color: '#f87171' }}>"Sin Interacción"</strong> para fines de control de cumplimiento.
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
            {/* Selector de publicaciones estilizado, compacto y con buscador instantáneo */}
            <div ref={postSelectorRef} style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <div
                onClick={() => setShowPostSelectorDropdown((prev) => !prev)}
                title="Haz clic para desplegar y buscar entre las publicaciones institucionales"
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: showPostSelectorDropdown ? '1px solid #06b6d4' : '1px solid rgba(6, 182, 212, 0.4)',
                  boxShadow: showPostSelectorDropdown ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                  {selectedPublicationId === 'ALL' ? (
                    <>
                      <span
                        style={{
                          background: 'rgba(6, 182, 212, 0.2)',
                          color: '#38bdf8',
                          border: '1px solid rgba(6, 182, 212, 0.4)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        GLOBAL
                      </span>
                      <span style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📋 Todas las Publicaciones ({availablePublications.length})
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          background: currentPost?.platform?.toUpperCase() === 'TIKTOK' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(24, 119, 242, 0.2)',
                          color: currentPost?.platform?.toUpperCase() === 'TIKTOK' ? '#f472b6' : '#60a5fa',
                          border: currentPost?.platform?.toUpperCase() === 'TIKTOK' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(24, 119, 242, 0.4)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentPost?.platform?.toUpperCase() || 'POST'}
                      </span>
                      <span style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatPostTitleClean(currentPost?.title || '', 60)}
                      </span>
                      {currentPost?.date && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                          {formatDateShort(currentPost.date)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  color="#38bdf8"
                  style={{
                    transform: showPostSelectorDropdown ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Menú desplegable interactivo y filtrable */}
              {showPostSelectorDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: '100%',
                    minWidth: '360px',
                    maxWidth: '650px',
                    background: '#0b1329',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '10px',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 20px rgba(6, 182, 212, 0.15)',
                    zIndex: 1050,
                    padding: '12px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Buscador de posts */}
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <Search
                      size={14}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Buscar post por palabra clave o fecha..."
                      value={postSelectorSearch}
                      onChange={(e) => setPostSelectorSearch(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 32px',
                        background: 'rgba(30, 41, 59, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {postSelectorSearch && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostSelectorSearch('');
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filtro rápido por plataforma */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {(['ALL', 'FACEBOOK', 'TIKTOK'] as const).map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostSelectorPlatform(plat);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '5px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: postSelectorPlatform === plat ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: postSelectorPlatform === plat ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                          color: postSelectorPlatform === plat ? '#38bdf8' : '#94a3b8',
                        }}
                      >
                        {plat === 'ALL' ? `Todos (${availablePublications.length})` : plat}
                      </button>
                    ))}
                  </div>

                  {/* Lista scrolleable con diseño de tarjetas compactas */}
                  <div style={{ maxHeight: '310px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Opción Global: Todas las Publicaciones */}
                    <div
                      onClick={() => {
                        setSelectedPublicationId('ALL');
                        fetchActivityMatrix('ALL');
                        fetchPostComments('ALL');
                        setShowPostSelectorDropdown(false);
                        setPostSelectorSearch('');
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: selectedPublicationId === 'ALL' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                        border: selectedPublicationId === 'ALL' ? '1px solid #06b6d4' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPublicationId !== 'ALL') e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPublicationId !== 'ALL') e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem' }}>📋</span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
                            Todas las Publicaciones (Modo Consolidado)
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Visualiza el acompañamiento general en las {availablePublications.length} publicaciones
                          </div>
                        </div>
                      </div>
                      {selectedPublicationId === 'ALL' && <CheckCircle2 size={15} color="#06b6d4" />}
                    </div>

                    {/* Lista filtrada de publicaciones */}
                    {filteredPublicationsForSelector.map((pub) => {
                      const isSelected = selectedPublicationId === pub.id;
                      const shortTitle = formatPostTitleClean(pub.title, 65);
                      const formattedDate = formatDateShort(pub.date);
                      return (
                        <div
                          key={pub.id}
                          onClick={() => {
                            setSelectedPublicationId(pub.id);
                            fetchActivityMatrix(pub.id);
                            fetchPostComments(pub.id);
                            setShowPostSelectorDropdown(false);
                            setPostSelectorSearch('');
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: isSelected ? 'rgba(6, 182, 212, 0.18)' : 'transparent',
                            border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.04)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                            <span
                              style={{
                                background: pub.platform?.toUpperCase() === 'TIKTOK' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(24, 119, 242, 0.15)',
                                color: pub.platform?.toUpperCase() === 'TIKTOK' ? '#f472b6' : '#60a5fa',
                                border: pub.platform?.toUpperCase() === 'TIKTOK' ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(24, 119, 242, 0.3)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {pub.platform?.toUpperCase() === 'TIKTOK' ? 'TIKTOK' : 'FB'}
                            </span>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {shortTitle}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                {formattedDate && <span>📅 {formattedDate}</span>}
                                {typeof pub.metaReactions === 'number' && pub.metaReactions > 0 && (
                                  <span style={{ color: '#ec4899' }}>👍 {pub.metaReactions} reacciones</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={15} color="#06b6d4" style={{ flexShrink: 0 }} />}
                        </div>
                      );
                    })}

                    {filteredPublicationsForSelector.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                        No se encontraron publicaciones con "{postSelectorSearch}".
                      </div>
                    )}
                  </div>
                </div>
              )}
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

            {/* Botón Pegar Reacciones de Facebook */}
            <button
              onClick={handleOpenPasteReactionsModal}
              title="Pegar los nombres copiados del popup de reacciones de Facebook para cruzar automáticamente"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
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
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.25)',
              }}
            >
              <ThumbsUp size={16} />
              <span>📥 Pegar Reacciones de Facebook</span>
            </button>

            {/* Botón Pegar Comentarios de Facebook */}
            <button
              onClick={handleOpenPasteCommentsModal}
              title="Pegar los comentarios copiados de la publicación de Facebook para cruzar automáticamente los funcionarios"
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
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
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <MessageSquare size={16} />
              <span>📥 Pegar Comentarios de Facebook</span>
            </button>

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

      {/* Alerta Inteligente: Reacciones Oficiales Meta vs Identidades */}
      {currentPost && (currentPost.metaReactions ?? 0) > 0 && metrics.likesCount === 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            marginBottom: '20px',
            borderLeft: '4px solid #ec4899',
            background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            <ThumbsUp size={24} color="#f472b6" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem', marginBottom: '3px' }}>
                Meta Graph API detecta {currentPost.metaReactions} reacciones oficiales en Facebook para este post
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                Por políticas de privacidad de Meta, la API no expone los nombres de quienes dieron Me Gusta 👍. Para identificar qué funcionarios reaccionaron, pulsa el botón y pega la lista de nombres copiada desde Facebook.
              </div>
            </div>
          </div>
          <button
            onClick={handleOpenPasteReactionsModal}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
            }}
          >
            <ThumbsUp size={15} />
            <span>📥 Pegar Reacciones de Facebook Ahora</span>
          </button>
        </div>
      )}

      {/* Selector de Vista: Padrón de Funcionarios vs Comentarios de Facebook */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveViewTab('employees')}
          style={{
            padding: '11px 20px',
            borderRadius: '9px',
            border: activeViewTab === 'employees' ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.1)',
            background: activeViewTab === 'employees' ? 'rgba(6, 182, 212, 0.22)' : 'rgba(15, 23, 42, 0.65)',
            color: activeViewTab === 'employees' ? '#fff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={16} color={activeViewTab === 'employees' ? '#06b6d4' : '#94a3b8'} />
          <span>📋 Nómina de Funcionarios Fiscalizados ({filteredRows.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveViewTab('comments');
            fetchPostComments();
          }}
          style={{
            padding: '11px 20px',
            borderRadius: '9px',
            border: activeViewTab === 'comments' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
            background: activeViewTab === 'comments' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(15, 23, 42, 0.65)',
            color: activeViewTab === 'comments' ? '#fff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <MessageSquare size={16} color={activeViewTab === 'comments' ? '#fbbf24' : '#94a3b8'} />
          <span>💬 Comentarios Extraídos de Meta Graph API ({postComments.length})</span>
        </button>
      </div>

      {/* 5. Vista Condicional: Nómina de Funcionarios */}
      {activeViewTab === 'employees' && (
        <>
          {/* Barra de Búsqueda y Filtros de Tabla */}
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
    </>
  )}

  {/* 6. Vista Condicional: Comentarios de Meta Graph API */}
  {activeViewTab === 'comments' && (
    <div className="glass-panel" style={{ padding: '22px', overflow: 'hidden' }}>
      {/* Header de la pestaña de comentarios */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#fbbf24" />
            <span>Comentarios Extraídos de Meta Graph API ({filteredComments.length})</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            Comentarios reales extraídos en tiempo real desde Meta. El sistema identifica automáticamente si el autor pertenece al padrón municipal o es un ciudadano.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchPostComments()}
            disabled={loadingComments}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: '#e2e8f0',
              padding: '7px 12px',
              borderRadius: '7px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loadingComments ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={loadingComments ? 'animate-spin' : ''} />
            <span>Actualizar Comentarios</span>
          </button>

          <button
            onClick={handleOpenPasteCommentsModal}
            title="Pegar comentarios copiados de Facebook y cruzarlos con la nómina municipal"
            style={{
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#fff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            }}
          >
            <MessageSquare size={14} />
            <span>📥 Pegar Comentarios de Facebook</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('analytics')}
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                color: '#38bdf8',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Award size={14} />
              <span>Ver Auditoría Completa en Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros de Comentarios */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar en texto del comentario o autor..."
            value={commentsSearchQuery}
            onChange={(e) => setCommentsSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'EMPLOYEES', 'CITIZENS'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setCommentsFilterType(ft)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: commentsFilterType === ft ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                background: commentsFilterType === ft ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                color: commentsFilterType === ft ? '#fff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: commentsFilterType === ft ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {ft === 'ALL' && `Todos (${postComments.length})`}
              {ft === 'EMPLOYEES' && `🟢 Funcionarios (${postComments.filter(c => c.author?.is_employee).length})`}
              {ft === 'CITIZENS' && `🔵 Ciudadanos (${postComments.filter(c => !c.author?.is_employee).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Comentarios */}
      {loadingComments ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
          <div>Cargando comentarios desde la base de datos...</div>
        </div>
      ) : filteredComments.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <MessageSquare size={36} color="#fbbf24" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>
            {postComments.length === 0
              ? 'Aún no se han sincronizado comentarios para este post'
              : 'No hay comentarios que coincidan con los filtros'}
          </div>
          <div style={{ fontSize: '0.82rem', maxWidth: '480px', margin: '0 auto 14px auto', lineHeight: '1.4' }}>
            {postComments.length === 0
              ? 'Pulsa el botón "⚡ Sincronizar Post" en la barra superior para descargar todos los comentarios reales de Meta Graph API en segundos.'
              : 'Intenta limpiar el buscador o seleccionar "Todos".'}
          </div>
          {postComments.length === 0 && (
            <button
              onClick={handleSyncWithSocial}
              disabled={syncing}
              style={{
                background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                color: '#fff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>⚡ Sincronizar Post Ahora</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              style={{
                background: comment.author?.is_employee ? 'rgba(16, 185, 129, 0.06)' : 'rgba(30, 41, 59, 0.6)',
                border: comment.author?.is_employee ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: comment.author?.is_employee ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                      color: comment.author?.is_employee ? '#34d399' : '#60a5fa',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {comment.author?.author_name ? comment.author.author_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
                      {comment.author?.author_name || 'Usuario de Facebook'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {comment.created_at ? new Date(comment.created_at).toLocaleString('es-BO') : 'Fecha no registrada'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {comment.author?.is_employee ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          fontWeight: 700,
                          padding: '4px 10px',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        FUNCIONARIO CONFIRMADO (GAMEA)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600 }}>
                        {comment.author.full_name} {comment.author.document_number ? `(CI: ${comment.author.document_number})` : ''}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        fontWeight: 600,
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                      }}
                    >
                      🔵 COMENTARIO CIUDADANO (Público General)
                    </span>
                  )}

                  {comment.associated_reaction && (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(236, 72, 153, 0.15)',
                        color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        fontSize: '0.74rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ThumbsUp size={11} /> {comment.associated_reaction}
                    </span>
                  )}
                </div>
              </div>

              {/* Contexto del Post cuando se visualiza en modo global */}
              {comment.post_title && (
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Post:</span>
                  <span style={{ color: '#cbd5e1' }}>{comment.post_title}</span>
                  {comment.post_url && (
                    <a
                      href={comment.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38bdf8', textDecoration: 'none', marginLeft: '4px' }}
                    >
                      (Ver en Facebook ↗)
                    </a>
                  )}
                </div>
              )}

              {/* Texto exacto escrito */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: '#f1f5f9',
                  lineHeight: '1.45',
                  fontStyle: 'normal',
                }}
              >
                "{comment.content_text}"
              </div>

              {comment.author?.is_employee && (
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {comment.author.direction && (
                    <span>🏛️ Dirección: <strong style={{ color: '#cbd5e1' }}>{comment.author.direction}</strong></span>
                  )}
                  {comment.author.secretaria && (
                    <span>• Secretaría: <strong style={{ color: '#cbd5e1' }}>{comment.author.secretaria}</strong></span>
                  )}
                  {comment.author.position && (
                    <span>• Cargo: <strong style={{ color: '#cbd5e1' }}>{comment.author.position}</strong></span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )}

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

      {/* Modal para Pegar Reacciones de Facebook y Cruce Masivo */}
      {showPasteReactionsModal && (
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
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px rgba(236, 72, 153, 0.2)',
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
                      background: 'rgba(236, 72, 153, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ec4899',
                    }}
                  >
                    <ThumbsUp size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    📥 Ingesta y Cruce Masivo de Reacciones de Facebook
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  Meta Graph API v3.0+ restringe la entrega de identidades en Likes/Reacciones por políticas de privacidad.
                  Esta herramienta permite cruzar manualmente la lista de personas que reaccionaron contra el padrón municipal en PostgreSQL.
                </p>
              </div>
              <button
                onClick={() => setShowPasteReactionsModal(false)}
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

            {/* Publicación Objetivo */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#cbd5e1',
              }}
            >
              <strong style={{ color: '#38bdf8' }}>Publicación evaluada:</strong>{' '}
              {currentPost ? currentPost.title : 'Publicación seleccionada'}
            </div>

            {/* Instrucciones de Cómo Obtener los Nombres */}
            <details
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                lineHeight: 1.6,
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>📋 ¿Cómo obtener la lista de nombres desde Facebook?</span>
              </summary>
              <div style={{ marginTop: '10px', paddingLeft: '4px' }}>
                <div style={{ marginBottom: '8px', color: '#e2e8f0', fontWeight: 600 }}>
                  ⚠️ IMPORTANTE: El diálogo de reacciones de Facebook NO permite seleccionar/copiar texto directamente.
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                      Opción A: Herramientas de Desarrollador (Recomendada)
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem' }}>
                      <li>Abre la publicación en Facebook</li>
                      <li>Haz clic en el número de reacciones para abrir el modal</li>
                      <li>Presiona <kbd style={{ background: '#1e293b', padding: '1px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>F12</kbd> → pestaña <strong>Console</strong></li>
                      <li>Ejecuta este código y copia el resultado:</li>
                      <pre style={{ background: '#0b1220', borderRadius: '4px', padding: '8px', margin: '6px 0', overflow: 'auto', fontSize: '0.7rem', color: '#a7f3d0' }}>
{`// Copia y pega en la Consola del navegador:
const names = [...document.querySelectorAll('[role="dialog"] a[href*="/user/"]')].map(a => a.textContent.trim()).filter(Boolean);
copy(names.join('\\n'));
console.log('Nombres copiados:', names);`}
                      </pre>
                    </ol>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                      Opción B: Extensión "Copy Text from Image" / OCR
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem' }}>
                      <li>Haz captura de pantalla del modal de reacciones</li>
                      <li>Usa una extensión OCR (ej. "CopyFish", "Text Extractor")</li>
                      <li>Copia el texto y pégalo aquí</li>
                    </ol>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                      Opción C: Copia manual (solo nombres visibles)
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem' }}>
                      <li>Escribe los nombres uno por línea</li>
                      <li>El sistema filtra automáticamente botones de UI y ruido</li>
                    </ol>
                  </div>
                </div>
              </div>
            </details>

            {/* Selector de Reacción Predeterminada */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Tipo de Reacción a Asignar (se aplicará a todos los nombres detectados):
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'LIKE', label: '👍 Me Gusta', color: '#3b82f6' },
                  { id: 'LOVE', label: '❤️ Me Encanta', color: '#ec4899' },
                  { id: 'CARE', label: '🤗 Me Importa', color: '#f59e0b' },
                  { id: 'HAHA', label: '😆 Me Divierte', color: '#eab308' },
                  { id: 'WOW', label: '😮 Me Asombra', color: '#10b981' },
                  { id: 'SAD', label: '😢 Me Entristece', color: '#94a3b8' },
                  { id: 'ANGRY', label: '😡 Me Enoja', color: '#ef4444' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPasteReactionType(r.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: pasteReactionType === r.id ? `2px solid ${r.color}` : '1px solid var(--border-subtle)',
                      background: pasteReactionType === r.id ? `${r.color}25` : 'rgba(30, 41, 59, 0.5)',
                      color: pasteReactionType === r.id ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuadro de Texto para Pegar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Pegar Texto / Nombres Copiados de Facebook:
                </label>
                
                {/* File Upload Button */}
                <div>
                  <input
                    type="file"
                    accept=".txt,.csv,.xlsx,.xls"
                    id="file-upload-input"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="file-upload-input"
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      color: '#38bdf8',
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
                    title="Sube una lista de nombres desde un archivo CSV o Excel"
                  >
                    <Upload size={14} />
                    <span>Subir Excel / CSV</span>
                  </label>
                </div>
              </div>
              <textarea
                rows={7}
                placeholder={`Pega aquí los nombres (uno por línea o separados por comas). Ejemplos:

Juan Carlos Mamani Quispe
Rosa Apaza Mamani
Pedro Huanca Ticona

O formato Markdown de comentarios:
[María Lopez](https://facebook.com/maria.lopez)
[Carlos Perez](https://facebook.com/carlos.perez)

El motor limpia automáticamente: botones UI ('Agregar a amigos', 'Seguir'), líneas de resumen ('Me encanta 5'), números, y filtra ciudadanos externos.`}
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
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

            {/* Vista Previa de Nombres Detectados */}
            {pasteRawText.trim() && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                    Vista Previa: Nombres detectados ({parsePastePreview(pasteRawText).length})
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', background: 'rgba(30, 41, 59, 0.5)', padding: '2px 8px', borderRadius: '4px' }}>
                    Se asignará: {getReactionLabel(pasteReactionType)}
                  </span>
                </div>
                <div
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#cbd5e1',
                  }}
                >
                  {parsePastePreview(pasteRawText).map((name, idx) => (
                    <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {idx + 1}. {name}
                    </div>
                  ))}
                  {parsePastePreview(pasteRawText).length === 0 && (
                    <span style={{ color: '#64748b' }}>No se detectaron nombres válidos. Revisa el formato.</span>
                  )}
                </div>
              </div>
            )}

            {/* Mensajes de Alerta */}
            {pasteError && (
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
                <span>{pasteError}</span>
              </div>
            )}

            {pasteSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700 }}>{pasteSuccess}</div>
                  {pasteResultDetails && (
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#cbd5e1' }}>
                      Persistido en PostgreSQL: {pasteResultDetails.matched_count} funcionarios actualizados.
                      {pasteResultDetails.matched_employees.length > 0 && (
                        <div style={{ marginTop: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                          {pasteResultDetails.matched_employees.map((me, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-block',
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                margin: '2px 4px 2px 0',
                                fontSize: '0.72rem',
                              }}
                            >
                              ✓ {me.full_name} ({me.department})
                            </span>
                          ))}
                        </div>
                      )}
                      {pasteResultDetails.unmatched_names.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontWeight: 700, color: '#fbbf24' }}>
                            Sin coincidencia en la nómina ({pasteResultDetails.unmatched_names.length}): ciudadanos
                          </div>
                          <div style={{ maxHeight: '90px', overflowY: 'auto', marginTop: '3px' }}>
                            {pasteResultDetails.unmatched_names.map((name, idx) => (
                              <span
                                key={`unmatched-${idx}`}
                                style={{
                                  display: 'inline-block',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  margin: '2px 4px 2px 0',
                                  fontSize: '0.72rem',
                                  color: '#fbbf24',
                                }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {pasteResultDetails.ambiguous_names.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontWeight: 700, color: '#f87171' }}>
                            Ambiguos, requieren revisión manual ({pasteResultDetails.ambiguous_names.length}): coinciden
                            con más de un funcionario
                          </div>
                          <div style={{ maxHeight: '90px', overflowY: 'auto', marginTop: '3px' }}>
                            {pasteResultDetails.ambiguous_names.map((name, idx) => (
                              <span
                                key={`ambiguous-${idx}`}
                                style={{
                                  display: 'inline-block',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  margin: '2px 4px 2px 0',
                                  fontSize: '0.72rem',
                                  color: '#f87171',
                                }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botones del Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPasteReactionsModal(false)}
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
                onClick={handleImportReactions}
                disabled={pasteLoading || !pasteRawText.trim()}
                style={{
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 20px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: (pasteLoading || !pasteRawText.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (pasteLoading || !pasteRawText.trim()) ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
                }}
              >
                {pasteLoading && <RefreshCw size={14} className="animate-spin" />}
                <span>{pasteLoading ? 'Cruzando con Funcionarios...' : '⚡ Procesar y Guardar en PostgreSQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Pegar Comentarios de Facebook y Cruce Masivo */}
      {showPasteCommentsModal && (
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
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.2)',
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
                      background: 'rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <MessageSquare size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    📥 Ingesta y Cruce Masivo de Comentarios de Facebook
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  Pega el texto de los comentarios copiados directamente del post de Facebook. El sistema detecta
                  automáticamente nombres y apodos de funcionarios (ej. <em>Mark Patzi</em>, <em>Sanchez Armando</em>, <em>Chayito Ros AC.</em>),
                  extrae su comentario exacto y lo registra en PostgreSQL como <strong style={{ color: '#34d399' }}>CUMPLIDO</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowPasteCommentsModal(false)}
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

            {/* Publicación Objetivo */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#cbd5e1',
              }}
            >
              <strong style={{ color: '#38bdf8' }}>Publicación evaluada:</strong>{' '}
              {currentPost ? currentPost.title : 'Publicación seleccionada'}
            </div>

            {/* Instrucciones de Copiado */}
            <div
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>¿Cómo copiar los comentarios de Facebook?</span>
              </div>
              <div>
                En Facebook, selecciona el texto de los comentarios (incluyendo el autor y las líneas '·' y 'Responder'),
                cópialos con <kbd style={{ background: '#1e293b', padding: '1px 4px', borderRadius: '3px' }}>Ctrl + C</kbd> y
                pégalos directamente aquí. También admite el formato <code>Nombre: Comentario</code>.
              </div>
            </div>

            {/* Cuadro de Texto para Pegar */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Pegar Comentarios Copiados de Facebook:
              </label>
              <textarea
                rows={8}
                placeholder={`Pega aquí los comentarios copiados directamente. Ejemplo:

Mark Patzi
·
Excelente trabajo
Responder

Sanchez Armando
·
Y pa cuando a l@s que venden en las vitrinas en la misma feria...
Responder

Chayito Ros AC.
·
Wawitas de Dios
Responder`}
                value={pasteCommentsRawText}
                onChange={(e) => setPasteCommentsRawText(e.target.value)}
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

            {/* Vista Previa de Comentarios Detectados */}
            {pasteCommentsRawText.trim() && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                    Vista Previa: Bloques de Comentarios Detectados ({parseCommentsPreview(pasteCommentsRawText).length})
                  </label>
                </div>
                <div
                  style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#cbd5e1',
                  }}
                >
                  {parseCommentsPreview(pasteCommentsRawText).map((item, idx) => (
                    <div key={idx} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{idx + 1}. {item.author}:</span>{' '}
                      <span style={{ color: '#94a3b8' }}>"{item.comment || '(Sin texto)'}"</span>
                    </div>
                  ))}
                  {parseCommentsPreview(pasteCommentsRawText).length === 0 && (
                    <span style={{ color: '#64748b' }}>No se detectaron bloques de comentarios. Revisa el texto pegado.</span>
                  )}
                </div>
              </div>
            )}

            {/* Mensajes de Alerta */}
            {pasteCommentsError && (
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
                <span>{pasteCommentsError}</span>
              </div>
            )}

            {pasteCommentsSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700 }}>{pasteCommentsSuccess}</div>
                  {pasteCommentsResultDetails && (
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#cbd5e1' }}>
                      Persistido en PostgreSQL: {pasteCommentsResultDetails.matched_count} comentarios de funcionarios vinculados.
                      {pasteCommentsResultDetails.matched_employees.length > 0 && (
                        <div style={{ marginTop: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                          {pasteCommentsResultDetails.matched_employees.map((me, i) => (
                            <div
                              key={i}
                              style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                margin: '3px 0',
                                fontSize: '0.72rem',
                              }}
                            >
                              <strong style={{ color: '#34d399' }}>✓ {me.full_name} ({me.department}):</strong> "{me.comment_text}"
                            </div>
                          ))}
                        </div>
                      )}
                      {pasteCommentsResultDetails.unmatched_citizens_count > 0 && (
                        <div style={{ marginTop: '6px', color: '#94a3b8' }}>
                          🔵 {pasteCommentsResultDetails.unmatched_citizens_count} comentarios de ciudadanos externos registrados.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botones del Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPasteCommentsModal(false)}
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
                onClick={handleImportComments}
                disabled={pasteCommentsLoading || !pasteCommentsRawText.trim()}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 20px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: (pasteCommentsLoading || !pasteCommentsRawText.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (pasteCommentsLoading || !pasteCommentsRawText.trim()) ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                {pasteCommentsLoading && <RefreshCw size={14} className="animate-spin" />}
                <span>{pasteCommentsLoading ? 'Cruzando con Funcionarios...' : '⚡ Procesar y Guardar en PostgreSQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
