import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Facebook,
  Plus,
  Radio,
  RefreshCw,
  Target,
  Video,
  X
} from 'lucide-react';
import {
  CampaignItem,
  PublicationItem,
  createCampaignApi,
  listCampaignsApi,
  listPublicationsApi
} from '../api/publications';

export const PublicationsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: 'camp-001',
      name: 'Plan de Bacheo y Pavimentación 2026',
      description: 'Difusión de obras de infraestructura vial y mejoramiento urbano en los 14 distritos.',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      is_active: true,
      publication_count: 8,
      targets: [
        {
          id: 'tgt-01',
          target_percentage: 85.0,
          description: 'Cobertura mínima de interacciones institucionales exigidas',
        },
      ],
    },
    {
      id: 'camp-002',
      name: 'Seguridad Ciudadana y Cámaras de Vigilancia',
      description: 'Campañas de prevención ciudadana y despliegue tecnológico policial-municipal.',
      start_date: '2026-02-15',
      end_date: '2026-05-30',
      is_active: true,
      publication_count: 6,
      targets: [
        {
          id: 'tgt-02',
          target_percentage: 80.0,
          description: 'Monitoreo de réplicas en TikTok institucional',
        },
      ],
    },
  ]);

  const [publications, setPublications] = useState<PublicationItem[]>([
    {
      id: 'pub-001',
      platform_name: 'facebook',
      external_post_id: '1029384756102938',
      title: 'Inauguración de pavimentado en Av. 6 de Marzo con presencia vecinal',
      post_url: 'https://facebook.com/gamea_oficial/posts/1029384756102938',
      published_at: new Date(Date.now() - 86400000).toISOString(),
      is_monitored: true,
      total_reactions: 1420,
      total_comments: 284,
      total_shares: 95,
    },
    {
      id: 'pub-002',
      platform_name: 'tiktok',
      external_post_id: '729182736451234',
      title: 'Resumen en video del nuevo puente distribuido en Río Seco',
      post_url: 'https://tiktok.com/@gamea_oficial/video/729182736451234',
      published_at: new Date(Date.now() - 172800000).toISOString(),
      is_monitored: true,
      total_reactions: 8900,
      total_comments: 420,
      total_shares: 1200,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // Form State
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.allSettled([
        listCampaignsApi(),
        listPublicationsApi(),
      ]);
      if (cRes.status === 'fulfilled' && cRes.value.length > 0) {
        setCampaigns(cRes.value);
      }
      if (pRes.status === 'fulfilled' && pRes.value.items.length > 0) {
        setPublications(pRes.value.items);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createCampaignApi({
        name: campName,
        description: campDesc,
        start_date: campStart || new Date().toISOString(),
        end_date: campEnd || undefined,
      });
      setCampaigns([res, ...campaigns]);
      setShowCampaignModal(false);
      setCampName('');
      setCampDesc('');
    } catch {
      // Fallback mock insert
      const newCamp: CampaignItem = {
        id: `camp-${Date.now()}`,
        name: campName,
        description: campDesc,
        start_date: campStart || new Date().toISOString().split('T')[0],
        end_date: campEnd || undefined,
        is_active: true,
        publication_count: 0,
      };
      setCampaigns([newCamp, ...campaigns]);
      setShowCampaignModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
            Campañas Oficiales & Publicaciones
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supervisión institucional de publicaciones y metas de alcance en Facebook y TikTok
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchData} title="Refrescar" style={{
            background: 'rgba(31, 41, 55, 0.6)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCampaignModal(true)} className="btn-primary">
            <Plus size={16} />
            <span>Crear Campaña</span>
          </button>
        </div>
      </div>

      {/* Campañas Activas Grid */}
      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>
        Campañas de Monitoreo Prioritarias
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
          marginBottom: '36px',
        }}
      >
        {campaigns.map((camp) => (
          <div key={camp.id} className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className={`badge ${camp.is_active ? 'badge-success' : 'badge-warning'}`}>
                {camp.is_active ? 'CAMPAÑA ACTIVA' : 'FINALIZADA'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                {camp.start_date} {camp.end_date ? `al ${camp.end_date}` : ''}
              </span>
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginTop: '12px' }}>
              {camp.name}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
              {camp.description || 'Sin descripción adicional.'}
            </p>

            <div
              style={{
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="#06b6d4" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meta Exigida:</span>
                <strong style={{ color: '#fff', fontSize: '0.85rem' }}>
                  {camp.targets?.[0]?.target_percentage || 80}%
                </strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary-500)', fontWeight: '600' }}>
                {camp.publication_count || 0} publicaciones vinculadas
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Publicaciones Monitoreadas */}
      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>
        Publicaciones Institucionales Registradas
      </h3>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '14px 20px' }}>RED SOCIAL</th>
                <th style={{ padding: '14px 20px' }}>ID / PUBLICACIÓN</th>
                <th style={{ padding: '14px 20px' }}>MÉTRICAS CAPTURADAS</th>
                <th style={{ padding: '14px 20px' }}>FECHA PUBLICADA</th>
                <th style={{ padding: '14px 20px' }}>ESTADO</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>ENLACE</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {publications.map((pub) => (
                <tr key={pub.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {pub.platform_name.toLowerCase().includes('facebook') ? (
                        <Facebook size={18} color="#1877f2" />
                      ) : (
                        <Video size={18} color="#06b6d4" />
                      )}
                      <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{pub.platform_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', maxWidth: '360px' }}>
                    <div style={{ fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pub.title || 'Publicación Institucional GAMEA'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                      ID: {pub.external_post_id}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                      <span>👍 {pub.total_reactions ?? 0}</span>
                      <span>💬 {pub.total_comments ?? 0}</span>
                      <span>🔄 {pub.total_shares ?? 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {new Date(pub.published_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-success">MONITOREANDO</span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {pub.post_url ? (
                      <a
                        href={pub.post_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--primary-500)',
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                        }}
                      >
                        <span>Abrir</span>
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>N/D</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR CAMPAÑA */}
      {showCampaignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '32px',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio color="#06b6d4" size={22} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                  Nueva Campaña de Monitoreo
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label className="form-label">Nombre de la Campaña</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ej. Censo y Obras El Alto 2026"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción Operativa</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Objetivos comunicacionales y unidades participantes..."
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Inicio</label>
                  <input
                    type="date"
                    className="form-input"
                    value={campStart}
                    onChange={(e) => setCampStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Cierre (Opcional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={campEnd}
                    onChange={(e) => setCampEnd(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Crear Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
