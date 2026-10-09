import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Download, CheckCircle2, XCircle } from 'lucide-react';
import { ActivityMatrixResponse, fetchActivityMatrixApi, exportActivityMatrixExcelApi } from '../api/monitoring';

export const MatrixPage: React.FC = () => {
  const [data, setData] = useState<ActivityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchActivityMatrixApi({ search, max_posts: 15 });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportActivityMatrixExcelApi({ search });
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  // Extraer la lista única de posts para crear las columnas
  const allPostsMap = new Map<string, any>();
  if (data?.rows) {
    data.rows.forEach(row => {
      row.posts.forEach(post => {
        if (!allPostsMap.has(post.publication_id)) {
          allPostsMap.set(post.publication_id, post);
        }
      });
    });
  }
  // Ordenar por fecha descendente
  const uniquePosts = Array.from(allPostsMap.values()).sort((a, b) => {
    if (!a.published_at) return 1;
    if (!b.published_at) return -1;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
            Dashboard: Matriz de Control General
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Cruce general de reacciones de los usuarios vs las últimas publicaciones enviadas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.7 : 1,
            }}
          >
            <Download size={16} />
            {exporting ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
          <button
            onClick={loadData}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refrescar Matriz
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
            }}
          >
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar funcionario por nombre o C.I..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.95rem',
                padding: '12px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando matriz...</div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '12px', minWidth: '250px', position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                    FUNCIONARIO
                  </th>
                  <th style={{ padding: '12px', minWidth: '150px' }}>DIRECCIÓN</th>
                  {uniquePosts.map((post) => (
                    <th key={post.publication_id} style={{ padding: '12px', minWidth: '130px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                          {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'N/A'}
                        </span>
                        <div style={{ maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={post.post_title}>
                          {post.post_title}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: '12px', textAlign: 'center' }}>TOTAL LIKE</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row, idx) => (
                  <tr
                    key={row.employee_id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#13192b' : '#0f1423', zIndex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{row.full_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>C.I. {row.employee_id}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{row.department || 'N/A'}</div>
                    </td>
                    
                    {uniquePosts.map((postCol) => {
                      const userPostData = row.posts.find(p => p.publication_id === postCol.publication_id);
                      const isComplied = userPostData && (userPostData.reaction_type || userPostData.shared || userPostData.comment_text || userPostData.verification_status === 'CONFIRMED' || userPostData.verification_status === 'DECLARED_CONFIRMED');
                      
                      return (
                        <td key={postCol.publication_id} style={{ padding: '12px', textAlign: 'center' }}>
                          {isComplied ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={18} color="#10b981" />
                                {userPostData.reaction_type && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>{userPostData.reaction_type}</span>}
                            </div>
                          ) : (
                            <XCircle size={18} color="#ef4444" style={{ opacity: 0.5 }} />
                          )}
                        </td>
                      );
                    })}

                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#3b82f6' }}>
                      {row.total_reactions}
                    </td>
                  </tr>
                ))}
                {(!data?.rows || data.rows.length === 0) && (
                  <tr>
                    <td colSpan={uniquePosts.length + 3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No se encontraron datos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
