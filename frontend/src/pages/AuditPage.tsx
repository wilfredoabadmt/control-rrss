import React, { useEffect, useState } from 'react';
import {
  Download,
  Eye,
  Filter,
  RefreshCw,
  ShieldAlert,
  X
} from 'lucide-react';
import {
  AuditEventItem,
  exportAuditCsvApi,
  listAuditEventsApi
} from '../api/audit';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const AuditPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [events, setEvents] = useState<AuditEventItem[]>([
    {
      id: 'aud-001',
      timestamp_utc: new Date(Date.now() - 1800000).toISOString(),
      user_email: 'admin@elalto.gob.bo',
      action: 'LOGIN',
      entity_name: 'User',
      entity_id: 'usr-100',
      correlation_id: '7b01b2a9-1c9f-4318-bfae-6b95d7eb80a1',
      ip_address: '192.168.1.45',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: { method: 'JWT_ARGON2ID', outcome: 'SUCCESS' },
    },
    {
      id: 'aud-002',
      timestamp_utc: new Date(Date.now() - 3600000).toISOString(),
      user_email: 'analista@elalto.gob.bo',
      action: 'VERIFY',
      entity_name: 'Verification',
      entity_id: 'ver-882',
      correlation_id: '2a498fd2-9f33-43da-9ec1-1901bca01e23',
      ip_address: '192.168.1.72',
      previous_state: { status: 'PENDING' },
      new_state: { status: 'DECLARED_CONFIRMED', justification: 'Captura cotejada de interacción' },
      details: { note: 'Manual verification review' },
    },
    {
      id: 'aud-003',
      timestamp_utc: new Date(Date.now() - 7200000).toISOString(),
      user_email: 'auditor@elalto.gob.bo',
      action: 'EXPORT',
      entity_name: 'ReportExecution',
      entity_id: 'rep-001',
      correlation_id: 'f93d489b-9842-494b-a270-13f6eb73010b',
      ip_address: '192.168.1.12',
      details: { format: 'XLSX', sha256: 'e3b0c44298fc1c14...' },
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  const isAuthorized = hasRole([UserRole.SUPER_ADMIN, UserRole.AUDITOR]);

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      const res = await listAuditEventsApi({ action: actionFilter || undefined });
      if (res.items && res.items.length > 0) {
        setEvents(res.items);
      }
    } catch {
      // Estado inicial
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchAuditEvents();
    }
  }, [actionFilter]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await exportAuditCsvApi();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `auditoria_gamea_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Mock download
      const mockCsv = 'timestamp,user_email,action,entity_name,correlation_id\n2026-09-17T20:00:00Z,admin@elalto.gob.bo,LOGIN,User,cid-123\n';
      const blob = new Blob([mockCsv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'auditoria_gamea.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setExporting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '60px auto',
        }}
      >
        <ShieldAlert size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>
          Acceso Restringido por Constitución
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px', lineHeight: 1.5 }}>
          La visualización de las pistas de auditoría inmutable está reservada exclusivamente para los roles
          institucionales de <strong>AUDITOR</strong> y <strong>SUPER_ADMIN</strong> (Principio X).
        </p>
      </div>
    );
  }

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
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
            Pistas de Auditoría Inmutable
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Principio X: Registro inmutable en base de datos. Ningún registro puede ser modificado ni eliminado.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchAuditEvents}
            style={{
              background: 'rgba(31, 41, 55, 0.6)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '9px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="btn-primary"
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
            }}
          >
            <Download size={16} />
            <span>{exporting ? 'Generando CSV...' : 'Exportar Auditoría CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Filter size={16} />
          <span>Filtrar por Acción:</span>
        </div>
        <select
          className="form-input"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ width: '200px', padding: '6px 12px', fontSize: '0.85rem' }}
        >
          <option value="">Todas las acciones</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="VERIFY">VERIFY</option>
          <option value="EXPORT">EXPORT</option>
        </select>
      </div>

      {/* Tabla de Eventos */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '14px 20px' }}>TIMESTAMP (UTC)</th>
                <th style={{ padding: '14px 20px' }}>USUARIO / ACTOR</th>
                <th style={{ padding: '14px 20px' }}>ACCIÓN</th>
                <th style={{ padding: '14px 20px' }}>ENTIDAD AFECTADA</th>
                <th style={{ padding: '14px 20px' }}>CORRELATION ID</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>DETALLES</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                    {new Date(ev.timestamp_utc).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#fff', fontWeight: '500' }}>
                    {ev.user_email || 'Sistema / Anon'}
                    {ev.ip_address && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>IP: {ev.ip_address}</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      className={`badge ${
                        ev.action === 'LOGIN' || ev.action === 'VERIFY'
                          ? 'badge-success'
                          : ev.action === 'EXPORT'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {ev.action}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {ev.entity_name}
                    {ev.entity_id && (
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginLeft: '6px', color: 'var(--text-faint)' }}>
                        #{ev.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', maxWidth: '180px' }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--primary-500)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={ev.correlation_id}
                    >
                      {ev.correlation_id}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      title="Inspeccionar Estados y Metadatos"
                      style={{
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        color: 'var(--primary-500)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                      }}
                    >
                      <Eye size={14} />
                      <span>Inspeccionar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INSPECCIÓN DE ESTADOS */}
      {selectedEvent && (
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
              maxWidth: '650px',
              padding: '32px',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                  Inspección de Registro de Auditoría
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ID: {selectedEvent.id} | Correlation ID: {selectedEvent.correlation_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ESTADO ANTERIOR (PREVIOUS STATE)
                </h4>
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: '#fca5a5',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {JSON.stringify(selectedEvent.previous_state || { status: 'NO_PREVIOUS_STATE' }, null, 2)}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ESTADO NUEVO (NEW STATE)
                </h4>
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: '#86efac',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {JSON.stringify(selectedEvent.new_state || selectedEvent.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', lineHeight: 1.4 }}>
              <strong>User Agent:</strong> {selectedEvent.user_agent || 'N/D'}
              <br />
              <strong>Dirección IP:</strong> {selectedEvent.ip_address || '127.0.0.1'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-primary" onClick={() => setSelectedEvent(null)}>
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
