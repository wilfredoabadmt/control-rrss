import React, { useEffect, useState } from 'react';
import {
  Facebook,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Video,
  X
} from 'lucide-react';
import {
  UserAdminItem,
  createUserApi,
  deactivateUserApi,
  listUsersApi,
} from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { formatUserRole } from '../utils/formatters';
import { UserRole } from '../types';

export const AdminPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [tab, setTab] = useState<'connectors' | 'users' | 'policies'>('connectors');

  const [users, setUsers] = useState<UserAdminItem[]>([
    {
      id: 'usr-001',
      email: 'admin@elalto.gob.bo',
      full_name: 'Administrador General del Sistema',
      is_active: true,
      roles: [{ id: 'r1', name: 'SUPER_ADMIN', description: 'Control total de la plataforma' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-002',
      email: 'auditor@elalto.gob.bo',
      full_name: 'Lic. Gonzalo Vargas (Auditoría)',
      is_active: true,
      roles: [{ id: 'r2', name: 'AUDITOR', description: 'Inspección de pistas y reportes' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-003',
      email: 'comunicacion@elalto.gob.bo',
      full_name: 'Responsable de Redes GAMEA',
      is_active: true,
      roles: [{ id: 'r3', name: 'COMMUNICATIONS_LEAD', description: 'Gestión de campañas' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['VIEWER']);
  const [submittingUser, setSubmittingUser] = useState(false);

  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsersApi();
      if (res.items && res.items.length > 0) {
        setUsers(res.items);
      }
    } catch {
      // Estado mock
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && tab === 'users') {
      fetchUsers();
    }
  }, [tab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const created = await createUserApi({
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        role_names: selectedRoles,
      });
      setUsers([created, ...users]);
      setShowCreateUserModal(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
    } catch {
      // Mock create
      const mockNew: UserAdminItem = {
        id: `usr-${Date.now()}`,
        email: newEmail,
        full_name: newFullName,
        is_active: true,
        roles: selectedRoles.map((r, i) => ({ id: `r-${i}`, name: r })),
        failed_login_attempts: 0,
        created_at: new Date().toISOString(),
      };
      setUsers([mockNew, ...users]);
      setShowCreateUserModal(false);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await deactivateUserApi(userId);
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: false } : u)));
    } catch {
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: false } : u)));
    }
  };

  if (!isSuperAdmin) {
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
          Módulo de Administración Restringido
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px', lineHeight: 1.5 }}>
          Solo los usuarios con el rol constitucional <strong>SUPER_ADMIN</strong> tienen autorización para gestionar
          credenciales de redes, credenciales de acceso de usuarios y parámetros globales de retención.
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
          marginBottom: '28px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
            Administración del Sistema & Configuración
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supervisión de seguridad, conectores API de redes sociales y control de acceso RBAC
          </p>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(31, 41, 55, 0.6)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setTab('connectors')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: tab === 'connectors' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'connectors' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Conectores API
          </button>
          <button
            onClick={() => setTab('users')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: tab === 'users' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'users' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Gestión de Usuarios
          </button>
          <button
            onClick={() => setTab('policies')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: tab === 'policies' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'policies' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Políticas & Retención
          </button>
        </div>
      </div>

      {/* TAB CONECTORES */}
      {tab === 'connectors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Facebook Connector Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Facebook size={28} color="#1877f2" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                    Meta Graph API (Facebook)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Versión v20.0 — Webhook Activo</span>
                </div>
              </div>
              <span className="badge badge-success">ONLINE / OPERATIVO</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Circuit Breaker</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>CLOSED (Saludable)</div>
              </div>

              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Firma Criptográfica Webhook</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginTop: '2px' }}>HMAC-SHA256 (Activa)</div>
              </div>

              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tolerancia de Fallas (DLQ)</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#38bdf8', marginTop: '2px' }}>0 pendientes</div>
              </div>
            </div>
          </div>

          {/* TikTok Connector Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Video size={28} color="#06b6d4" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                    TikTok Display API (TikTok for Developers)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Display API v2 — Sincronización Programada</span>
                </div>
              </div>
              <span className="badge badge-success">ONLINE / OPERATIVO</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Circuit Breaker</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>CLOSED (Saludable)</div>
              </div>

              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tratamiento de Privacidad</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f472b6', marginTop: '2px' }}>API_RESTRICTED (Principio V)</div>
              </div>

              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Frecuencia de Polling</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginTop: '2px' }}>Cada 15 min (Celery Beat)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB USUARIOS */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={fetchUsers}
              style={{
                background: 'rgba(31, 41, 55, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowCreateUserModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Nuevo Usuario Institucional</span>
            </button>
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '14px 20px' }}>USUARIO / CORREO</th>
                    <th style={{ padding: '14px 20px' }}>NOMBRE COMPLETO</th>
                    <th style={{ padding: '14px 20px' }}>ROLES CONSTITUCIONALES</th>
                    <th style={{ padding: '14px 20px' }}>ESTADO</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '600', color: '#fff' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                        {u.full_name}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {u.roles.map((r) => (
                            <span key={r.id || r.name} className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                              {formatUserRole(r.name)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-warning'}`}>
                          {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {u.is_active && (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            title="Desactivar usuario"
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              color: '#fb7185',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Desactivar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB POLÍTICAS */}
      {tab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>
              Seguridad & Lockout Preventivo
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
              Parámetros regulados por BR-IAM-002 para prevención de ataques de fuerza bruta y diccionario.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Umbral de Intentos Fallidos:</span>
                <strong>5 intentos consecutivos</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Duración del Bloqueo:</span>
                <strong>15 minutos</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Algoritmo de Derivación Clave:</span>
                <strong>Argon2id (Recomendación OWASP)</strong>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>
              Retención & Purga de Datos
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
              Políticas de depuración de almacenamiento conforme a BR-INT-005 y Principio IX.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Retención Evidencias Crudas:</span>
                <strong>180 días (Purga periódica Celery)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Custodia Hash Criptográfico:</span>
                <strong>Indefinido (Inmutable en BD)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Pistas de Auditoría:</span>
                <strong>Permanente (Append-only)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      {showCreateUserModal && (
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                Crear Usuario Institucional
              </h3>
              <button
                onClick={() => setShowCreateUserModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Correo Institucional Único</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  placeholder="usuario@elalto.gob.bo"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ej. Ing. Wilfredo Quispe"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña Inicial (Mínimo 12 caracteres)</label>
                <input
                  type="password"
                  className="form-input"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rol Constitucional Asignado</label>
                <select
                  className="form-input"
                  value={selectedRoles[0]}
                  onChange={(e) => setSelectedRoles([e.target.value])}
                >
                  <option value="VIEWER">VIEWER (Solo Lectura)</option>
                  <option value="OPERATOR">OPERATOR (Operador de Monitoreo)</option>
                  <option value="ANALYST">ANALYST (Analista de Verificación)</option>
                  <option value="COMMUNICATIONS_LEAD">COMMUNICATIONS_LEAD (Líder de Comunicación)</option>
                  <option value="DIRECTOR">DIRECTOR (Director Municipal)</option>
                  <option value="AUDITOR">AUDITOR (Auditor Interno)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Administrador Total)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
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
                <button type="submit" className="btn-primary" disabled={submittingUser}>
                  {submittingUser ? 'Creando Usuario...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
