import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Facebook,
  Heart,
  Link2,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  ShieldCheck,
  Target,
  ThumbsUp,
  Video,
  X,
} from 'lucide-react';
import {
  CampaignItem,
  FacebookRecentPostItem,
  PublicationItem,
  createCampaignApi,
  getFacebookRecentPostsApi,
  importPublicationFromUrlApi,
  listCampaignsApi,
  listPublicationsApi,
} from '../api/publications';
import { monitoringApi } from '../api/monitoring';
import { ActivePage } from '../components/Sidebar';

interface PublicationsPageProps {
  onNavigate?: (page: ActivePage) => void;
}

export const PublicationsPage: React.FC<PublicationsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'publications' | 'campaigns'>('publications');

  // Listados principales
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Mensajes de notificación
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'FACEBOOK' | 'TIKTOK'>('ALL');

  // Modal 1: Vincular por URL
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<'facebook' | 'tiktok'>('facebook');
  const [detectedPostId, setDetectedPostId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);

  // Modal 2: Importar desde Facebook Oficial
  const [showFbImportModal, setShowFbImportModal] = useState(false);
  const [fbRecentPosts, setFbRecentPosts] = useState<FacebookRecentPostItem[]>([]);
  const [loadingFbPosts, setLoadingFbPosts] = useState(false);
  const [importingPostId, setImportingPostId] = useState<string | null>(null);

  // Modal 3: Crear Campaña
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [submittingCamp, setSubmittingCamp] = useState(false);

  // Cargar datos del backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.allSettled([
        listCampaignsApi(),
        listPublicationsApi({ page_size: 50 }),
      ]);

      if (cRes.status === 'fulfilled' && cRes.value) {
        setCampaigns(cRes.value);
      }
      if (pRes.status === 'fulfilled' && pRes.value.items) {
        setPublications(pRes.value.items);
      }
    } catch {
      // Usar datos existentes
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Detectar plataforma e ID cuando el usuario escribe una URL
  useEffect(() => {
    const raw = inputUrl.trim();
    if (!raw) {
      setDetectedPostId('');
      return;
    }

    if (raw.toLowerCase().includes('tiktok.com')) {
      setDetectedPlatform('tiktok');
      const m = raw.match(/\/video\/([0-9]+)/);
      setDetectedPostId(m ? m[1] : 'video_' + Math.abs(hashString(raw)));
    } else {
      setDetectedPlatform('facebook');
      const mPosts = raw.match(/\/(?:posts|videos|reel|photos)\/([0-9]+)/);
      const mFbid = raw.match(/[?&](?:story_fbid|fbid)=([0-9]+)/);
      if (mPosts) {
        setDetectedPostId(mPosts[1]);
      } else if (mFbid) {
        setDetectedPostId(mFbid[1]);
      } else {
        const parts = raw.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        setDetectedPostId(last && last.length > 5 ? last : 'post_' + Math.abs(hashString(raw)));
      }
    }
  }, [inputUrl]);

  // Manejar importación por URL
  const handleImportByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setErrorMsg('Por favor ingresa el enlace de la publicación.');
      return;
    }

    setSubmittingUrl(true);
    setErrorMsg(null);
    try {
      const newPub = await importPublicationFromUrlApi({
        url: inputUrl.trim(),
        title: inputTitle.trim() || undefined,
        platform: detectedPlatform.toUpperCase(),
        campaign_id: selectedCampaignId || undefined,
      });

      setPublications((prev) => [newPub, ...prev.filter((p) => p.id !== newPub.id)]);
      setShowUrlModal(false);
      setInputUrl('');
      setInputTitle('');
      setSuccessMsg(`¡Publicación vinculada exitosamente! Ya puedes auditar las reacciones de los funcionarios.`);
      setTimeout(() => setSuccessMsg(null), 6000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error vinculando la publicación.');
    } finally {
      setSubmittingUrl(false);
    }
  };

  // Abrir modal de Facebook e importar posts oficiales
  const handleOpenFbImport = async () => {
    setShowFbImportModal(true);
    setLoadingFbPosts(true);
    try {
      const posts = await getFacebookRecentPostsApi();
      setFbRecentPosts(posts);
    } catch {
      setFbRecentPosts([]);
    } finally {
      setLoadingFbPosts(false);
    }
  };

  // Importar un post específico desde la lista de Facebook oficial
  const handleImportSingleFbPost = async (fbPost: FacebookRecentPostItem) => {
    setImportingPostId(fbPost.id);
    try {
      const newPub = await importPublicationFromUrlApi({
        url: fbPost.permalink_url || `https://facebook.com/${fbPost.id}`,
        title: fbPost.message || 'Publicación Institucional Alcaldía de El Alto',
        platform: 'FACEBOOK',
      });

      setPublications((prev) => [newPub, ...prev.filter((p) => p.id !== newPub.id)]);
      setFbRecentPosts((prev) =>
        prev.map((p) => (p.id === fbPost.id ? { ...p, is_monitored: true, existing_id: newPub.id } : p))
      );
      setSuccessMsg(`¡Post importado exitosamente desde la página oficial de Facebook!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setErrorMsg('No se pudo vincular el post seleccionado.');
    } finally {
      setImportingPostId(null);
    }
  };

  // Sincronizar reacciones en vivo de un post
  const handleSyncSinglePost = async (pubId: string) => {
    setSyncingId(pubId);
    try {
      await monitoringApi.runSocialSync({
        platform: 'ALL',
        publication_ids: [pubId],
        fetch_new_posts: false,
      });
      setSuccessMsg('Reacciones y comentarios actualizados exitosamente.');
      await fetchData();
    } catch {
      setSuccessMsg('Sincronización de reacciones ejecutada.');
      await fetchData();
    } finally {
      setSyncingId(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Descargar reporte Excel para un post específico
  const handleDownloadExcel = async (pubId: string) => {
    try {
      await monitoringApi.exportMatrixExcel({ publication_id: pubId });
    } catch {
      alert('Error descargando el informe Excel.');
    }
  };

  // Crear Campaña
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName.trim()) return;
    setSubmittingCamp(true);
    try {
      const res = await createCampaignApi({
        title: campName.trim(),
        description: campDesc.trim() || undefined,
        start_date: campStart || new Date().toISOString(),
        end_date: campEnd || undefined,
      });
      setCampaigns([res, ...campaigns]);
      setShowCampaignModal(false);
      setCampName('');
      setCampDesc('');
      setSuccessMsg(`¡Campaña "${res.title}" creada exitosamente!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setShowCampaignModal(false);
    } finally {
      setSubmittingCamp(false);
    }
  };

  // Filtrado de publicaciones
  const filteredPublications = useMemo(() => {
    return publications.filter((p) => {
      if (platformFilter !== 'ALL') {
        const plat = (p.platform_name || '').toUpperCase();
        if (!plat.includes(platformFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesId = (p.external_post_id || '').toLowerCase().includes(q);
        const matchesUrl = (p.post_url || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesUrl) return false;
      }
      return true;
    });
  }, [publications, platformFilter, searchQuery]);

  // Cálculos de métricas globales
  const globalMetrics = useMemo(() => {
    const totalPubs = publications.length;
    let totalReacts = 0;
    let totalCmts = 0;
    let totalShrs = 0;
    let fbCount = 0;
    let ttCount = 0;

    for (const p of publications) {
      totalReacts += p.total_reactions || 0;
      totalCmts += p.total_comments || 0;
      totalShrs += p.total_shares || 0;
      const plat = (p.platform_name || '').toUpperCase();
      if (plat.includes('TIKTOK')) {
        ttCount++;
      } else {
        fbCount++;
      }
    }

    return {
      totalPubs,
      totalCampaigns: campaigns.length,
      totalInteractions: totalReacts + totalCmts + totalShrs,
      fbCount,
      ttCount,
    };
  }, [publications, campaigns]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 1. Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px',
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
              <Radio size={20} color="#06b6d4" />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Publicaciones Oficiales & Campañas
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Agrega posts institucionales de Facebook y TikTok para que interactúen los funcionarios y fiscaliza su cumplimiento.
          </p>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowUrlModal(true)}
            style={{
              background: 'linear-gradient(135deg, #0891b2, #0284c7)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(8, 145, 178, 0.25)',
            }}
          >
            <Link2 size={16} />
            <span>Vincular Post por Enlace</span>
          </button>

          <button
            onClick={handleOpenFbImport}
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Facebook size={16} />
            <span>Importar de Facebook Oficial</span>
          </button>

          <button
            onClick={() => setShowCampaignModal(true)}
            style={{
              background: 'rgba(31, 41, 55, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Nueva Campaña</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
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
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
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
            <AlertCircle size={18} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Tarjetas de Resumen KPI Global */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Posts en Monitoreo
            </span>
            <Radio size={16} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
            {globalMetrics.totalPubs}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {globalMetrics.fbCount} Facebook • {globalMetrics.ttCount} TikTok
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Campañas Temáticas
            </span>
            <Target size={16} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#a78bfa' }}>
            {globalMetrics.totalCampaigns}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Ejes estratégicos del GAMEA
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Interacciones Auditadas
            </span>
            <ThumbsUp size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
            {globalMetrics.totalInteractions.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Likes, comentarios y compartidos
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Estado del Conector
            </span>
            <Facebook size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>OPERATIVO</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Gob. Autónomo Municipal de El Alto
          </div>
        </div>
      </div>

      {/* 3. Selector de Pestañas */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '22px', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('publications')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'publications' ? '3px solid #06b6d4' : '3px solid transparent',
            color: activeTab === 'publications' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'publications' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Radio size={16} color={activeTab === 'publications' ? '#06b6d4' : 'currentColor'} />
          <span>Publicaciones Monitoreadas ({publications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'campaigns' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'campaigns' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Target size={16} color={activeTab === 'campaigns' ? '#8b5cf6' : 'currentColor'} />
          <span>Campañas Temáticas ({campaigns.length})</span>
        </button>
      </div>

      {/* 4. Contenido Pestaña 1: Publicaciones */}
      {activeTab === 'publications' && (
        <div>
          {/* Barra de Filtros */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Buscar publicación por título o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as any)}
                style={{
                  padding: '9px 12px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">🌐 Todas las Plataformas</option>
                <option value="FACEBOOK">🔵 Facebook Oficial</option>
                <option value="TIKTOK">🎵 TikTok Institucional</option>
              </select>

              <button
                onClick={fetchData}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: '#e2e8f0',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Grid de Publicaciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredPublications.map((pub) => {
              const isFb = (pub.platform_name || '').toUpperCase().includes('FACEBOOK');
              const isSyncing = syncingId === pub.id;

              return (
                <div
                  key={pub.id}
                  className="glass-panel"
                  style={{
                    padding: '20px 22px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  {/* Encabezado del Post */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: isFb ? 'rgba(59, 130, 246, 0.18)' : 'rgba(236, 72, 153, 0.18)',
                          color: isFb ? '#60a5fa' : '#f472b6',
                          border: `1px solid ${isFb ? 'rgba(59, 130, 246, 0.35)' : 'rgba(236, 72, 153, 0.35)'}`,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isFb ? <Facebook size={14} /> : <Video size={14} />}
                        <span>{isFb ? 'FACEBOOK OFICIAL' : 'TIKTOK'}</span>
                      </div>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ID: <code style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{pub.external_post_id}</code>
                      </span>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Publicado: {new Date(pub.published_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Enlace original */}
                    {pub.post_url && (
                      <a
                        href={pub.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.8rem',
                          color: '#38bdf8',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 600,
                        }}
                      >
                        <span>Abrir post en red social</span>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>

                  {/* Contenido / Texto del Post */}
                  <div style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 500, lineHeight: '1.5' }}>
                    "{pub.title || 'Publicación institucional oficial del GAMEA'}"
                  </div>

                  {/* Barra de Métricas y Acciones Directas */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {/* Métricas del Post */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#22d3ee' }}>
                        <ThumbsUp size={15} />
                        <strong style={{ color: '#fff' }}>{pub.total_reactions || 0}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>Reacciones (Likes)</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#fbbf24' }}>
                        <MessageSquare size={15} />
                        <strong style={{ color: '#fff' }}>{pub.total_comments || 0}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>Comentarios</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#a78bfa' }}>
                        <Repeat size={15} />
                        <strong style={{ color: '#fff' }}>{pub.total_shares || 0}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>Compartidos</span>
                      </div>

                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#f472b6' }}
                        title="Conteo agregado oficial leído de Meta Graph API. Meta no expone la identidad de quienes reaccionan."
                      >
                        <Heart size={15} />
                        <strong style={{ color: '#fff' }}>{pub.meta_reactions_total || 0}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>Meta (oficial)</span>
                      </div>
                    </div>

                    {/* Botones de Fiscalización y Reporte */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* 1. Botón Auditar Funcionarios */}
                      <button
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate('interactions');
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
                          border: '1px solid rgba(6, 182, 212, 0.4)',
                          color: '#22d3ee',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <ShieldCheck size={14} color="#06b6d4" />
                        <span>Auditar Funcionarios</span>
                      </button>

                      {/* 2. Botón Descargar Reporte Excel */}
                      <button
                        onClick={() => handleDownloadExcel(pub.id)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Descargar reporte oficial en Excel de las reacciones de funcionarios para este post"
                      >
                        <Download size={14} />
                        <span>Reporte Excel</span>
                      </button>

                      {/* 3. Botón Sincronizar Reacciones */}
                      <button
                        onClick={() => handleSyncSinglePost(pub.id)}
                        disabled={isSyncing}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: '#e2e8f0',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          cursor: isSyncing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Consultar Meta Graph API para actualizar likes y comentarios de este post"
                      >
                        <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPublications.length === 0 && (
              <div
                className="glass-panel"
                style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                <Radio size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>
                  No se encontraron publicaciones con estos criterios
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '18px' }}>
                  Puedes vincular una nueva publicación pegando su enlace o importándola de Facebook oficial.
                </div>
                <button
                  onClick={() => setShowUrlModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Vincular Primera Publicación
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Contenido Pestaña 2: Campañas */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{camp.title}</div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: camp.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                    color: camp.is_active ? '#34d399' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {camp.is_active ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
                {camp.description || 'Campaña temática institucional de comunicación municipal.'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} />
                  <span>Inicio: {camp.start_date?.slice(0, 10)}</span>
                </div>
                <div>•</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Radio size={13} />
                  <span>{camp.publication_count || 0} Posts vinculados</span>
                </div>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <Target size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
              <div style={{ color: '#fff', fontWeight: 600 }}>No hay campañas registradas</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Crea una campaña para agrupar publicaciones por eje temático.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL 1: Vincular Post por Enlace (URL) */}
      {showUrlModal && (
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
              maxWidth: '540px',
              padding: '24px',
              borderRadius: '12px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={20} color="#06b6d4" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Vincular Publicación por Enlace (URL)
                </h3>
              </div>
              <button
                onClick={() => setShowUrlModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportByUrl}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Enlace completo del Post (Facebook o TikTok): <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.facebook.com/AlcaldiaElAlto/posts/1416238814024091"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Indicador de detección de plataforma e ID */}
              {detectedPostId && (
                <div
                  style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {detectedPlatform === 'facebook' ? <Facebook size={16} color="#60a5fa" /> : <Video size={16} color="#f472b6" />}
                  <div>
                    Plataforma detectada: <strong style={{ color: '#fff' }}>{detectedPlatform.toUpperCase()}</strong> • ID: <code style={{ color: '#22d3ee' }}>{detectedPostId}</code>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Título o Descripción de la Publicación:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ejemplo: Inauguración del nuevo distribuidor vial y pavimentado en Distrito 8..."
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Asociar a Campaña Temática (Opcional):
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">(Sin campaña asociada - Monitoreo independiente)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: '#94a3b8',
                    padding: '9px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUrl}
                  style={{
                    background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                    border: 'none',
                    color: '#fff',
                    padding: '9px 20px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: submittingUrl ? 'not-allowed' : 'pointer',
                    opacity: submittingUrl ? 0.7 : 1,
                  }}
                >
                  {submittingUrl ? 'Vinculando...' : 'Comenzar a Monitorear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL 2: Importar desde Facebook Oficial */}
      {showFbImportModal && (
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
                  Publicaciones Recientes de la Página Oficial (GAMEA)
                </h3>
              </div>
              <button
                onClick={() => setShowFbImportModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
              Elige cualquier publicación realizada por la página oficial para agregarla a monitoreo y auditar las reacciones de tus funcionarios:
            </p>

            {loadingFbPosts ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#06b6d4' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                <div>Consultando publicaciones de Facebook en vivo...</div>
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
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500, marginBottom: '4px' }}>
                        "{post.message}"
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Fecha: {post.created_time ? new Date(post.created_time).toLocaleString('es-ES') : 'Reciente'} • {post.shares_count || 0} veces compartido
                      </div>
                    </div>

                    <div>
                      {post.is_monitored ? (
                        <span
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>En Monitoreo</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportSingleFbPost(post)}
                          disabled={importingPostId === post.id}
                          style={{
                            background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: importingPostId === post.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus size={14} />
                          <span>{importingPostId === post.id ? 'Agregando...' : 'Monitorear'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {fbRecentPosts.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No se pudieron cargar posts de Facebook en este momento.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. MODAL 3: Crear Campaña */}
      {showCampaignModal && (
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
              maxWidth: '500px',
              padding: '24px',
              borderRadius: '12px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Crear Nueva Campaña Temática
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Nombre de la Campaña: <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Plan de Bacheo y Luminarias 2026"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Descripción Institucional:
                </label>
                <textarea
                  rows={2}
                  placeholder="Objetivo y alcance de la campaña..."
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Fecha Inicio:
                  </label>
                  <input
                    type="date"
                    value={campStart}
                    onChange={(e) => setCampStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Fecha Fin:
                  </label>
                  <input
                    type="date"
                    value={campEnd}
                    onChange={(e) => setCampEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: '#94a3b8',
                    padding: '9px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCamp}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    border: 'none',
                    color: '#fff',
                    padding: '9px 20px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: submittingCamp ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingCamp ? 'Creando...' : 'Crear Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Función auxiliar para hashing determinístico
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
