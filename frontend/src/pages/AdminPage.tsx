import React, { useEffect, useState } from 'react';
import {
  Check,
  Facebook,
  Key,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  Users,
  Video,
  X
} from 'lucide-react';
import {
  UserAdminItem,
  createUserApi,
  deactivateUserApi,
  listUsersApi,
  updateUserApi,
} from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { formatUserRole } from '../utils/formatters';
import { UserRole } from '../types';

export interface RoleMeta {
  role: string;
  name: string;
  level: string;
  color: string;
  bg: string;
  border: string;
  summary: string;
  functions: string[];
  restrictions: string;
  scope?: string;
}

export const ROLE_DEFINITIONS: RoleMeta[] = [
  {
    role: 'SUPER_ADMIN',
    name: 'Super Administrador del Sistema',
    level: 'Nivel 1 — Control Total Institucional',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.1)',
    border: 'rgba(56, 189, 248, 0.35)',
    summary: 'Máxima autoridad técnica y de seguridad de la plataforma GAMEA Social Monitor.',
    functions: [
      'Gestión integral de usuarios: altas, bajas lógicas, reseteo de contraseñas y asignación de roles RBAC.',
      'Configuración de conectores oficiales y tokens de acceso (Meta Graph API para Facebook y TikTok API).',
      'Administración de políticas de seguridad, parámetros de bloqueo preventivo (Argon2id) y auditoría inmutable.',
      'Supervisión global de las nóminas, transferencias organizacionales y exportación de respaldos.',
    ],
    restrictions: 'Acceso total e irrestricto sin limitaciones operativas.',
  },
  {
    role: 'DIRECTOR',
    name: 'Director Municipal / Máxima Autoridad',
    level: 'Nivel 2 — Supervisión Estratégica y Ejecutiva',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.1)',
    border: 'rgba(192, 132, 252, 0.35)',
    summary: 'Supervisión ejecutiva del cumplimiento institucional por secretarías, direcciones y unidades.',
    functions: [
      'Visualización de métricas consolidadas de rendimiento comunicacional de todo el municipio.',
      'Aprobación y seguimiento de campañas prioritarias y directrices de difusión pública.',
      'Descarga de reportes ejecutivos consolidados e informes de cumplimiento para la Alcaldía.',
      'Consulta del directorio de funcionarios y movimientos organizacionales.',
    ],
    restrictions: 'No puede alterar configuraciones de conectores de API ni parámetros de seguridad técnica.',
  },
  {
    role: 'AUDITOR',
    name: 'Auditor de Cumplimiento & Transparencia',
    level: 'Nivel 2 — Fiscalización Inmutable & Forense',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.1)',
    border: 'rgba(52, 211, 153, 0.35)',
    summary: 'Garante de la integridad probatoria y la cadena de custodia epistémica (Principio X).',
    functions: [
      'Acceso irrestricto en modo solo lectura a la bitácora inmutable append-only con hashes SHA-256.',
      'Verificación epistémica de interacciones y publicaciones para determinar su autenticidad legal.',
      'Desencriptación autorizada de datos confidenciales (cédulas de identidad) bajo registro de auditoría.',
      'Fiscalización de transferencias, rotaciones de personal y consistencia de nóminas.',
    ],
    restrictions: 'Estricto modo solo lectura; no puede modificar ni borrar registros de fiscalización.',
  },
  {
    role: 'COMMUNICATIONS_LEAD',
    name: 'Líder / Responsable de Comunicación',
    level: 'Nivel 3 — Gestión Táctica de Campañas',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.1)',
    border: 'rgba(251, 191, 36, 0.35)',
    summary: 'Administración de la estrategia de difusión, campañas oficiales y metas de interacción.',
    functions: [
      'Creación, catalogación y activación de campañas institucionales y publicaciones municipales.',
      'Asignación de términos clave, hashtags obligatorios y ponderaciones de impacto en redes sociales.',
      'Monitoreo de alcance, resonancia ciudadana y cumplimiento de vocerías municipales.',
      'Generación de reportes de difusión para la Dirección de Comunicación.',
    ],
    restrictions: 'No puede gestionar cuentas de usuario ni acceder a pistas de auditoría forense del sistema.',
  },
  {
    role: 'ANALYST',
    name: 'Analista de Monitoreo & Redes',
    level: 'Nivel 3 — Operación Analítica en Tiempo Real',
    color: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.1)',
    border: 'rgba(96, 165, 250, 0.35)',
    summary: 'Operación continua del motor de analítica, cruce de publicaciones y verificación técnica.',
    functions: [
      'Operación del Centro de Monitoreo en vivo de publicaciones e interacciones (Facebook y TikTok).',
      'Cruce de actividades detectadas contra la nómina de funcionarios y cuentas registradas.',
      'Etiquetado y clasificación manual de evidencias cuando la API de red social presenta restricciones.',
      'Detección de anomalías y seguimiento de perfiles vinculados a dependencias municipales.',
    ],
    restrictions: 'No puede eliminar funcionarios ni alterar políticas de seguridad institucional.',
  },
  {
    role: 'OPERATOR',
    name: 'Operador Técnico & Scraper',
    level: 'Nivel 4 — Operaciones de Recolección de Datos',
    color: '#f472b6',
    bg: 'rgba(244, 114, 182, 0.1)',
    border: 'rgba(244, 114, 182, 0.35)',
    summary: 'Ejecución y supervisión de las tareas programadas de extracción y recolección de datos.',
    functions: [
      'Monitoreo del pipeline de extracción y tareas periódicas de scraping en páginas institucionales.',
      'Verificación del estado operativo de los conectores de redes y alertas de desconexión.',
      'Carga y validación inicial de archivos de nómina o novedades de personal municipal.',
    ],
    restrictions: 'No tiene acceso a auditoría de seguridad ni a reportes ejecutivos confidenciales.',
  },
  {
    role: 'VIEWER',
    name: 'Visor Institucional / Consulta',
    level: 'Nivel 5 — Consulta General Restringida',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.35)',
    summary: 'Acceso en modo solo lectura con enmascaramiento estricto de información personal (Principio XX).',
    functions: [
      'Visualización de cuadros de mando consolidados y estadísticas públicas de difusión institucional.',
      'Consulta del estado general de campañas de su unidad correspondiente.',
      'Acceso transparente a resúmenes de cumplimiento sin facultades de edición ni exportación masiva.',
    ],
    restrictions: 'Datos personales (cédula CI y teléfonos) permanentemente enmascarados con asteriscos.',
  },
];

export const AdminPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [tab, setTab] = useState<'connectors' | 'users' | 'roles_matrix' | 'policies'>('users');

  const [users, setUsers] = useState<UserAdminItem[]>([
    {
      id: 'usr-001',
      email: 'wilfredosbad@gmail.com',
      full_name: 'Wilfredo Abad Mancilla Teran',
      is_active: true,
      roles: [{ id: 'r1', name: 'SUPER_ADMIN', description: 'Control total de la plataforma' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-002',
      email: 'admin@elalto.gob.bo',
      full_name: 'Super Administrador GAMEA',
      is_active: true,
      roles: [{ id: 'r2', name: 'SUPER_ADMIN', description: 'Control total de la plataforma' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-003',
      email: 'director.comunicacion@elalto.gob.bo',
      full_name: 'Dirección de Comunicación Social',
      is_active: true,
      roles: [{ id: 'r3', name: 'DIRECTOR', description: 'Supervisión ejecutiva institucional' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-004',
      email: 'auditor@elalto.gob.bo',
      full_name: 'Lic. Gonzalo Vargas (Auditoría)',
      is_active: true,
      roles: [{ id: 'r4', name: 'AUDITOR', description: 'Inspección de pistas y reportes' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-005',
      email: 'analista.monitoreo@elalto.gob.bo',
      full_name: 'Equipo de Monitoreo Digital',
      is_active: true,
      roles: [{ id: 'r5', name: 'ANALYST', description: 'Análisis operativo de métricas' }],
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modales
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['VIEWER']);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Edit User Form State
  const [editUserId, setEditUserId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsersApi();
      if (res.items && res.items.length > 0) {
        setUsers(res.items);
      }
    } catch {
      // Estado mock retenido
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
      setSelectedRoles(['VIEWER']);
    } catch {
      // Mock create local
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
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleOpenEdit = (user: UserAdminItem) => {
    setEditUserId(user.id);
    setEditEmail(user.email);
    setEditFullName(user.full_name);
    setEditRoles(user.roles.map((r) => r.name));
    setEditIsActive(user.is_active);
    setEditPassword('');
    setShowEditUserModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      await updateUserApi(editUserId, {
        full_name: editFullName,
        email: editEmail,
        is_active: editIsActive,
        password: editPassword.trim() ? editPassword.trim() : undefined,
        role_names: editRoles,
      });
      setUsers(
        users.map((u) =>
          u.id === editUserId
            ? {
                ...u,
                full_name: editFullName,
                email: editEmail,
                is_active: editIsActive,
                roles: editRoles.map((r, i) => ({ id: `r-${i}`, name: r })),
              }
            : u
        )
      );
      setShowEditUserModal(false);
    } catch {
      // Mock update local si falla la red
      setUsers(
        users.map((u) =>
          u.id === editUserId
            ? {
                ...u,
                full_name: editFullName,
                email: editEmail,
                is_active: editIsActive,
                roles: editRoles.map((r, i) => ({ id: `r-${i}`, name: r })),
              }
            : u
        )
      );
      setShowEditUserModal(false);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (user: UserAdminItem) => {
    const nextStatus = !user.is_active;
    try {
      if (nextStatus) {
        await updateUserApi(user.id, { is_active: true });
      } else {
        await deactivateUserApi(user.id);
      }
      setUsers(users.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u)));
    } catch {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u)));
    }
  };

  const toggleRoleSelection = (role: string, current: string[], setter: (r: string[]) => void) => {
    if (current.includes(role)) {
      if (current.length === 1) return; // Mínimo 1 rol
      setter(current.filter((r) => r !== role));
    } else {
      setter([...current, role]);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.roles.some((r) => r.name.toLowerCase().includes(term))
    );
  });

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
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="#06b6d4" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Administración del Sistema & Control de Acceso
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Control de usuarios constitucionales, matriz de roles RBAC, conectores API y políticas de seguridad
          </p>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(31, 41, 55, 0.7)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setTab('users')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: tab === 'users' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'users' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <Users size={16} />
            <span>Gestión de Usuarios</span>
          </button>

          <button
            onClick={() => setTab('roles_matrix')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: tab === 'roles_matrix' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'roles_matrix' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <Key size={16} />
            <span>Funciones por Rol</span>
          </button>

          <button
            onClick={() => setTab('connectors')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: tab === 'connectors' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'connectors' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <Sliders size={16} />
            <span>Conectores API</span>
          </button>

          <button
            onClick={() => setTab('policies')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: tab === 'policies' ? 'var(--primary-500)' : 'transparent',
              color: tab === 'policies' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <ShieldCheck size={16} />
            <span>Seguridad & Políticas</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB USUARIOS                                                              */}
      {/* ========================================================================= */}
      {tab === 'users' && (
        <div>
          {/* Top Actions & Search Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre, correo o rol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '38px' }}
              />
              <Search
                size={16}
                color="var(--text-faint)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={fetchUsers}
                title="Actualizar listado de usuarios"
                style={{
                  background: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  padding: '9px 13px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Nuevo Usuario Institucional</span>
              </button>
            </div>
          </div>

          {/* Tabla de Usuarios Profesional */}
          <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      background: 'rgba(15, 23, 42, 0.4)',
                    }}
                  >
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>USUARIO / CORREO</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>NOMBRE COMPLETO</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>ROLES CONSTITUCIONALES</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>ESTADO</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.86rem' }}>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2))',
                              border: '1px solid rgba(6, 182, 212, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#38bdf8',
                              flexShrink: 0,
                            }}
                          >
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#fff' }}>{u.email}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 20px', color: '#e2e8f0', fontWeight: '500' }}>
                        {u.full_name}
                      </td>

                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {u.roles.map((r) => {
                            const meta = ROLE_DEFINITIONS.find((rd) => rd.role === r.name);
                            return (
                              <span
                                key={r.id || r.name}
                                style={{
                                  background: meta ? meta.bg : 'rgba(6, 182, 212, 0.12)',
                                  border: `1px solid ${meta ? meta.border : 'rgba(6, 182, 212, 0.35)'}`,
                                  color: meta ? meta.color : '#38bdf8',
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.74rem',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {meta ? meta.name.split(' ')[0] : formatUserRole(r.name)}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td style={{ padding: '14px 20px' }}>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-warning'}`}>
                          {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {/* Botón Editar Usuario */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Editar datos, roles y credenciales"
                            style={{
                              background: 'rgba(6, 182, 212, 0.12)',
                              border: '1px solid rgba(6, 182, 212, 0.35)',
                              color: '#38bdf8',
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Pencil size={13} />
                            <span>Editar</span>
                          </button>

                          {/* Botón Activar / Desactivar */}
                          <button
                            onClick={() => handleToggleActive(u)}
                            title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                            style={{
                              background: u.is_active ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              border: `1px solid ${u.is_active ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                              color: u.is_active ? '#fb7185' : '#34d399',
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Trash2 size={13} />
                            <span>{u.is_active ? 'Desactivar' : 'Activar'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Total de usuarios registrados: {filteredUsers.length}</span>
              <span>Acceso restringido a SUPER_ADMIN</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN RESUMEN DE FUNCIONES POR ROL (RBAC)                                */}
          {/* ========================================================================= */}
          <div style={{ marginTop: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>
                  Matriz de Funciones y Responsabilidades por Rol Institucional (RBAC)
                </h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Catálogo constitucional de atribuciones, alcances operativos y restricciones por perfil de usuario
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {ROLE_DEFINITIONS.map((r) => (
                <div
                  key={r.role}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    borderTop: `3px solid ${r.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header de la Tarjeta del Rol */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span
                        style={{
                          background: r.bg,
                          border: `1px solid ${r.border}`,
                          color: r.color,
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {r.role}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{r.level}</span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                      {r.name}
                    </h4>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                      {r.summary}
                    </p>

                    {/* Lista de Atribuciones Clave */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: '700', color: r.color, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Funciones & Atribuciones:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {r.functions.map((fn, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {fn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Alcance / Restricción */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.74rem',
                      color: 'var(--text-faint)',
                    }}
                  >
                    <strong style={{ color: '#fff' }}>Alcance: </strong>
                    {r.scope || r.restrictions}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB ROLES & PERMISOS DEDICADO                                             */}
      {/* ========================================================================= */}
      {tab === 'roles_matrix' && (
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              Arquitectura Constitucional RBAC (Principio XVIII)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              El modelo de control de acceso basado en roles de GAMEA Social Monitor aplica el principio de mínimo privilegio.
              Cada usuario institucional cuenta con atribuciones estrictamente delimitadas para proteger la confidencialidad
              de los datos personales (Principio XX) y asegurar la inmutabilidad de la fiscalización pública (Principio X).
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '18px',
            }}
          >
            {ROLE_DEFINITIONS.map((r) => (
              <div
                key={r.role}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderTop: `4px solid ${r.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      background: r.bg,
                      border: `1px solid ${r.border}`,
                      color: r.color,
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                    }}
                  >
                    {r.role}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>{r.level}</span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  {r.name}
                </h4>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {r.summary}
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: r.color, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Responsabilidades Operativas:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                    {r.functions.map((fn, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {fn}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: '0.76rem',
                    color: 'var(--text-faint)',
                  }}
                >
                  <strong style={{ color: '#fff' }}>Restricción Institucional: </strong>
                  {r.restrictions}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONECTORES API                                                        */}
      {/* ========================================================================= */}
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
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Page Access Token</div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#38bdf8', marginTop: '4px' }}>
                  EAAG...••••••••••••...ZDZD
                </div>
              </div>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Páginas Monitoreadas</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginTop: '4px' }}>
                  Gobierno Autónomo Municipal de El Alto
                </div>
              </div>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Estado de Rate Limit</div>
                <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                  12% utilizado (200 req / h)
                </div>
              </div>
            </div>
          </div>

          {/* TikTok Connector Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Video size={28} color="#f472b6" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                    TikTok Business API
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OAuth 2.0 Client Credentials</span>
                </div>
              </div>
              <span className="badge badge-success">ONLINE / OPERATIVO</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Client Key</div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#f472b6', marginTop: '4px' }}>
                  awz8...••••••••••••...09a1
                </div>
              </div>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Cuentas Oficiales</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginTop: '4px' }}>
                  @alcaldiaelalto (Oficial)
                </div>
              </div>
              <div style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Estado de Rate Limit</div>
                <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                  8% utilizado (50 req / h)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB POLÍTICAS & SEGURIDAD                                                 */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL EDITAR USUARIO (DATOS Y ROLES)                                      */}
      {/* ========================================================================= */}
      {showEditUserModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
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
              maxWidth: '640px',
              padding: '32px',
              background: 'var(--bg-secondary)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Pencil color="#06b6d4" size={22} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                  Editar Usuario Institucional
                </h3>
              </div>
              <button
                onClick={() => setShowEditUserModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Actualice los datos personales, modifique los <strong>roles constitucionales</strong> asignados o ajuste el estado de la cuenta.
            </p>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Ej. Wilfredo Abad Mancilla Teran"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Institucional *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="usuario@elalto.gob.bo"
                  />
                </div>
              </div>

              {/* Selector de Roles Constitucionales Interactivo */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Roles Constitucionales Asignados (RBAC) *</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Seleccione uno o más roles</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {ROLE_DEFINITIONS.map((r) => {
                    const isSelected = editRoles.includes(r.role);
                    return (
                      <div
                        key={r.role}
                        onClick={() => toggleRoleSelection(r.role, editRoles, setEditRoles)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isSelected ? r.color : 'var(--border-subtle)'}`,
                          background: isSelected ? r.bg : 'rgba(15, 23, 42, 0.4)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `1px solid ${isSelected ? r.color : 'var(--border-subtle)'}`,
                            background: isSelected ? r.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={13} color="#000" strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                            {r.level.split('—')[1] || r.level}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Estado de la cuenta & Contraseña opcional */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Estado de la Cuenta</label>
                  <select
                    className="form-input"
                    value={editIsActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditIsActive(e.target.value === 'ACTIVE')}
                  >
                    <option value="ACTIVE">ACTIVO (Permite Inicio de Sesión)</option>
                    <option value="INACTIVE">INACTIVO (Acceso Bloqueado)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nueva Contraseña (Opcional)</label>
                  <input
                    type="password"
                    className="form-input"
                    minLength={6}
                    placeholder="Dejar en blanco para no cambiar"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submittingEdit}>
                  {submittingEdit ? 'Guardando Cambios...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CREAR USUARIO                                                       */}
      {/* ========================================================================= */}
      {showCreateUserModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
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
              maxWidth: '600px',
              padding: '32px',
              background: 'var(--bg-secondary)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users color="#06b6d4" size={22} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                  Crear Nuevo Usuario Institucional
                </h3>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
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
                  <label className="form-label">Correo Institucional Único *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="usuario@elalto.gob.bo"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Contraseña Inicial * (Mínimo 12 caracteres)</label>
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

              {/* Selector de Roles */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Roles Constitucionales Asignados *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {ROLE_DEFINITIONS.map((r) => {
                    const isSelected = selectedRoles.includes(r.role);
                    return (
                      <div
                        key={r.role}
                        onClick={() => toggleRoleSelection(r.role, selectedRoles, setSelectedRoles)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isSelected ? r.color : 'var(--border-subtle)'}`,
                          background: isSelected ? r.bg : 'rgba(15, 23, 42, 0.4)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: `1px solid ${isSelected ? r.color : 'var(--border-subtle)'}`,
                            background: isSelected ? r.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={12} color="#000" strokeWidth={3} />}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                          {r.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '9px 18px',
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
