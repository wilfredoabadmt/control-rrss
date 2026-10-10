import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building,
  Check,
  CheckCircle2,
  Facebook,
  Globe,
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
  X,
  Zap,
} from 'lucide-react';
import {
  UserAdminItem,
  createUserApi,
  deactivateUserApi,
  listUsersApi,
  updateUserApi,
} from '../api/admin';
import { monitoringApi } from '../api/monitoring';
import { useAuth } from '../context/AuthContext';
import { formatUserRole } from '../utils/formatters';
import { ConnectorsDiagnosticResponse, UserRole } from '../types';
import { LISTA_DIRECCIONES, ORGANIGRAMA_GAMEA } from '../data/organigrama';

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

  const [users, setUsers] = useState<UserAdminItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modales
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState<'GLOBAL' | 'DIRECTION' | 'UNIT' | 'AUTONOMOUS'>('UNIT');
  const [newAssignedDirection, setNewAssignedDirection] = useState('');
  const [newAssignedUnit, setNewAssignedUnit] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['VIEWER']);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Edit User Form State
  const [editUserId, setEditUserId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editWorkspaceType, setEditWorkspaceType] = useState<'GLOBAL' | 'DIRECTION' | 'UNIT' | 'AUTONOMOUS'>('UNIT');
  const [editAssignedDirection, setEditAssignedDirection] = useState('');
  const [editAssignedUnit, setEditAssignedUnit] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const canManageUsers = hasRole([UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD]);

  // Estado del Diagnóstico Exhaustivo de Conectores API
  const [connectorsDiag, setConnectorsDiag] = useState<ConnectorsDiagnosticResponse | null>(null);
  const [loadingDiag, setLoadingDiag] = useState<boolean>(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ platform: string; success: boolean; message: string } | null>(null);

  const fetchDiagnostics = async () => {
    setLoadingDiag(true);
    setDiagError(null);
    try {
      const data = await monitoringApi.getConnectorsDiagnostics();
      setConnectorsDiag(data);
    } catch {
      setDiagError('No se pudo comunicar con el servicio de diagnóstico del servidor.');
    } finally {
      setLoadingDiag(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsersApi();
      setUsers(res.items || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageUsers && tab === 'users') {
      fetchUsers();
    }
    if (isSuperAdmin && tab === 'connectors') {
      fetchDiagnostics();
    }
  }, [tab, canManageUsers, isSuperAdmin]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const isGlobal = newWorkspaceType === 'GLOBAL';
      const isAutonomous = newWorkspaceType === 'AUTONOMOUS';
      const created = await createUserApi({
        email: newEmail.trim(),
        full_name: newFullName.trim(),
        password: newPassword,
        role_names: selectedRoles,
        workspace_type: newWorkspaceType,
        assigned_direction: isGlobal || isAutonomous ? undefined : (newAssignedDirection.trim() || undefined),
        assigned_unit: newWorkspaceType === 'UNIT' ? (newAssignedUnit.trim() || undefined) : undefined,
      });
      setUsers([created, ...users.filter((u) => u.id !== created.id)]);
      setShowCreateUserModal(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewWorkspaceType('UNIT');
      setNewAssignedDirection('');
      setNewAssignedUnit('');
      setSelectedRoles(['VIEWER']);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Error al crear el usuario en la base de datos.');
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
    const initialWsType = user.workspace_type || (user.assigned_unit ? 'UNIT' : user.assigned_direction ? 'DIRECTION' : 'AUTONOMOUS');
    setEditWorkspaceType(initialWsType);
    setEditAssignedDirection(user.assigned_direction || '');
    setEditAssignedUnit(user.assigned_unit || '');
    setEditPassword('');
    setShowEditUserModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      const isGlobal = editWorkspaceType === 'GLOBAL';
      const isAutonomous = editWorkspaceType === 'AUTONOMOUS';
      const updated = await updateUserApi(editUserId, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        is_active: editIsActive,
        password: editPassword.trim() ? editPassword.trim() : undefined,
        role_names: editRoles,
        workspace_type: editWorkspaceType,
        assigned_direction: isGlobal || isAutonomous ? null : (editAssignedDirection.trim() || null),
        assigned_unit: editWorkspaceType === 'UNIT' ? (editAssignedUnit.trim() || null) : null,
      });
      setUsers(
        users.map((u) =>
          u.id === editUserId
            ? {
                ...u,
                full_name: updated.full_name || editFullName,
                email: updated.email || editEmail,
                is_active: updated.is_active !== undefined ? updated.is_active : editIsActive,
                roles: updated.roles || editRoles.map((r, i) => ({ id: `r-${i}`, name: r })),
                workspace_type: updated.workspace_type || editWorkspaceType,
                assigned_direction: updated.assigned_direction !== undefined ? updated.assigned_direction : (editAssignedDirection.trim() || null),
                assigned_unit: updated.assigned_unit !== undefined ? updated.assigned_unit : (editAssignedUnit.trim() || null),
              }
            : u
        )
      );
      setShowEditUserModal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Error al actualizar el usuario en la base de datos.');
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
      (u.assigned_direction && u.assigned_direction.toLowerCase().includes(term)) ||
      u.roles.some((r) => r.name.toLowerCase().includes(term))
    );
  });

  if (!canManageUsers) {
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
          Solo los usuarios con roles directivos o administrativos autorizados (<strong>SUPER_ADMIN</strong>, <strong>DIRECTOR</strong> o <strong>COMMUNICATIONS_LEAD</strong>) tienen autorización para gestionar usuarios y alcances institucionales.
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

          {isSuperAdmin && (
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
          )}

          {isSuperAdmin && (
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
          )}
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
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>ÁREA / PANEL ASIGNADO</th>
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

                      {/* ÁREA / ESPACIO ASIGNADO */}
                      <td style={{ padding: '14px 20px' }}>
                        {u.workspace_type === 'GLOBAL' ? (
                          <span
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              color: '#38bdf8',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Globe size={13} /> GAMEA Global (Municipal)
                          </span>
                        ) : u.workspace_type === 'UNIT' || u.assigned_unit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                background: 'rgba(168, 85, 247, 0.15)',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                color: '#c084fc',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              🏛️ {u.assigned_unit || 'Unidad Específica'}
                            </span>
                            {u.assigned_direction && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                ↳ 🏢 {u.assigned_direction}
                              </span>
                            )}
                          </div>
                        ) : u.assigned_direction ? (
                          <span
                            style={{
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              color: '#38bdf8',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            🏢 {u.assigned_direction}
                          </span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(148, 163, 184, 0.1)',
                              border: '1px solid rgba(148, 163, 184, 0.25)',
                              color: '#94a3b8',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Shield size={13} /> Panel Individual
                          </span>
                        )}
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

                  {filteredUsers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron usuarios institucionales registrados en la base de datos.
                      </td>
                    </tr>
                  )}
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
      {/* ========================================================================= */}
      {/* TAB CONECTORES API & DIAGNÓSTICO EXHAUSTIVO DE VARIABLES                   */}
      {/* ========================================================================= */}
      {tab === 'connectors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header de la sección de conectores */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Diagnóstico & Auditoría de Conectores API
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Verificación exhaustiva de variables de entorno (.env / Coolify) y credenciales de redes sociales.
              </p>
            </div>
            <button
              onClick={fetchDiagnostics}
              disabled={loadingDiag}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px' }}
            >
              <RefreshCw size={16} className={loadingDiag ? 'animate-spin' : ''} />
              <span>{loadingDiag ? 'Inspeccionando Variables...' : 'Volver a Verificar Conectores'}</span>
            </button>
          </div>

          {/* Banner de Estado Global */}
          {connectorsDiag && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: connectorsDiag.all_operational
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${
                  connectorsDiag.all_operational ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                }`,
              }}
            >
              {connectorsDiag.all_operational ? (
                <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, fontSize: '0.875rem' }}>
                <strong style={{ color: connectorsDiag.all_operational ? '#34d399' : '#f87171' }}>
                  {connectorsDiag.all_operational
                    ? 'Conectores en Estado Operativo:'
                    : `Atención — Falta de Datos Detectada (${connectorsDiag.total_missing_variables} variables incompletas o mock):`}
                </strong>
                <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                  {connectorsDiag.all_operational
                    ? 'Todas las variables de entorno requeridas fueron encontradas en el sistema con credenciales activas.'
                    : 'Existen conectores sin credenciales reales o con parámetros de demostración. A continuación se detalla el estado exacto de cada variable y cómo configurarla en el servidor.'}
                </div>
              </div>
            </div>
          )}

          {/* Fallback de carga */}
          {loadingDiag && !connectorsDiag && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--primary-500)' }} />
              Verificando variables de entorno en el servidor...
            </div>
          )}

          {/* Error de conexión */}
          {diagError && (
            <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem' }}>
              {diagError}
            </div>
          )}

          {/* Tarjetas de Conectores Dinámicos */}
          {connectorsDiag?.connectors.map((c) => {
            const isOperational = c.overall_status === 'OPERATIONAL';
            const isPartial = c.overall_status === 'PARTIAL';
            const statusColor = isOperational ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';
            const statusBg = isOperational ? 'rgba(16, 185, 129, 0.15)' : isPartial ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
            const statusBorder = isOperational ? 'rgba(16, 185, 129, 0.4)' : isPartial ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';

            return (
              <div
                key={c.platform_name}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderLeft: `4px solid ${statusColor}`,
                  boxShadow: `0 4px 20px ${isOperational ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'}`,
                }}
              >
                {/* Cabecera del Conector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {c.icon_type === 'facebook' ? (
                      <Facebook size={30} color="#1877f2" />
                    ) : (
                      <Video size={30} color="#f472b6" />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                          {c.display_name}
                        </h3>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-faint)' }}>
                          API {c.api_version}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Cuenta Objetivo: <strong style={{ color: '#fff' }}>{c.target_account}</strong> — {c.rate_limit_display}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        background: statusBg,
                        color: statusColor,
                        border: `1px solid ${statusBorder}`,
                      }}
                    >
                      {c.status_label}
                    </span>
                  </div>
                </div>

                {/* Resumen de Diagnóstico */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(31, 41, 55, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    color: isOperational ? '#34d399' : 'var(--text-muted)',
                  }}
                >
                  {c.diagnostic_summary}
                </div>

                {/* Tabla Exhaustiva de Variables del Sistema */}
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Variables del Sistema & Credenciales Evaluadas
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(17, 24, 39, 0.7)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '10px 14px' }}>VARIABLE DE ENTORNO</th>
                          <th style={{ padding: '10px 14px' }}>DESCRIPCIÓN / PROPÓSITO</th>
                          <th style={{ padding: '10px 14px' }}>VALOR DETECTADO</th>
                          <th style={{ padding: '10px 14px' }}>ORIGEN</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>ESTADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.variables.map((v) => {
                          const isVarOk = v.configured || v.status_badge === 'CONFIGURADO' || v.status_badge.includes('VERIFICADO');
                          const isVarMock = v.status_badge === 'MOCK_DEMO';
                          return (
                            <tr key={v.key} style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(31, 41, 55, 0.15)' }}>
                              <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: isVarOk ? '#38bdf8' : isVarMock ? '#f59e0b' : '#ef4444' }}>
                                {v.key}
                                {v.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                              </td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                                <div style={{ color: '#fff', fontWeight: 500 }}>{v.label}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{v.description}</div>
                              </td>
                              <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    background: isVarOk ? 'rgba(56, 189, 248, 0.1)' : isVarMock ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: isVarOk ? '#7dd3fc' : isVarMock ? '#fbbf24' : '#fca5a5',
                                  }}
                                >
                                  {v.masked_value}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                                {v.source}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                {isVarOk && (
                                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                    {v.status_badge.includes('VERIFICADO') ? 'VERIFICADO EN VIVO' : 'PRESENTE'}
                                  </span>
                                )}
                                {isVarMock && (
                                  <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 600 }}>
                                    PLANTILLA MOCK
                                  </span>
                                )}
                                {!isVarOk && !isVarMock && (
                                  <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 600 }}>
                                    FALTA DATO
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MENSAJE EXPLICATIVO SI HAY FALTA DE DATOS */}
                {c.has_missing_data && (
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                      <AlertTriangle size={18} />
                      <span>Mensaje de Falta de Datos en el Sistema:</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                      El conector no puede sincronizar datos reales con la plataforma porque las siguientes variables no han sido proporcionadas en la configuración del servidor:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {c.missing_variables.map((m) => (
                        <div
                          key={m.variable_name}
                          style={{
                            background: 'rgba(17, 24, 39, 0.6)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid #ef4444',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <strong style={{ color: '#fca5a5', fontFamily: 'monospace' }}>{m.variable_name}</strong>
                            <span style={{ color: 'var(--text-faint)' }}>— {m.impact}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                            <strong>Instrucción para configurar:</strong> {m.instructions}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección de Prueba de Conexión en Vivo */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                    Última verificación del sistema: {c.last_checked_at}
                  </div>
                  <button
                    onClick={async () => {
                      setTestingPlatform(c.platform_name);
                      setTestResult(null);
                      try {
                        const res = await monitoringApi.testConnection({ platform_name: c.platform_name });
                        setTestResult({ platform: c.platform_name, success: res.success, message: res.message });
                      } catch {
                        setTestResult({
                          platform: c.platform_name,
                          success: false,
                          message: 'Error al enviar petición de prueba de conexión al servidor.',
                        });
                      } finally {
                        setTestingPlatform(null);
                      }
                    }}
                    disabled={testingPlatform === c.platform_name}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Zap size={14} className={testingPlatform === c.platform_name ? 'animate-spin' : ''} />
                    <span>{testingPlatform === c.platform_name ? 'Probando...' : 'Ejecutar Test de Conexión'}</span>
                  </button>
                </div>

                {/* Resultado de prueba de conexión si aplica a esta tarjeta */}
                {testResult && testResult.platform === c.platform_name && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      fontSize: '0.82rem',
                      color: testResult.success ? '#34d399' : '#fca5a5',
                    }}
                  >
                    <strong>Resultado del Test:</strong> {testResult.message}
                  </div>
                )}
              </div>
            );
          })}
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

              {/* Espacio de Trabajo / Partición Multi-Tenant */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Building size={16} color="#38bdf8" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Espacio de Trabajo & Alcance de Funcionarios
                  </span>
                </div>

                {/* Nivel de Espacio */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Tipo de Partición / Nivel de Espacio *
                  </label>
                  <select
                    className="form-input"
                    value={editWorkspaceType}
                    onChange={(e) => {
                      const next = e.target.value as 'GLOBAL' | 'DIRECTION' | 'UNIT' | 'AUTONOMOUS';
                      setEditWorkspaceType(next);
                      if (next === 'GLOBAL' || next === 'AUTONOMOUS') {
                        setEditAssignedDirection('');
                        setEditAssignedUnit('');
                      } else if (next === 'DIRECTION') {
                        setEditAssignedUnit('');
                        if (!editAssignedDirection) {
                          setEditAssignedDirection(LISTA_DIRECCIONES[0] || '');
                        }
                      } else if (next === 'UNIT') {
                        if (!editAssignedDirection) {
                          const firstDir = LISTA_DIRECCIONES[0] || '';
                          setEditAssignedDirection(firstDir);
                          const units = ORGANIGRAMA_GAMEA[firstDir] || [];
                          setEditAssignedUnit(units[0] || '');
                        }
                      }
                    }}
                  >
                    <option value="UNIT">🏢 Unidad Específica (Recomendado - Espacio 100% Aislado e Independiente)</option>
                    <option value="DIRECTION">🏛️ Dirección Completa (Acceso a todas las unidades de una Dirección)</option>
                    <option value="AUTONOMOUS">🛡️ Espacio Autónomo / Personal (Solo funcionarios creados por él)</option>
                    <option value="GLOBAL">🌐 Global Institucional (Supervisión Total GAMEA - Todas las Direcciones)</option>
                  </select>
                </div>

                {/* Dirección (si es UNIT o DIRECTION) */}
                {(editWorkspaceType === 'UNIT' || editWorkspaceType === 'DIRECTION') && (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Dirección Institucional Asignada *
                    </label>
                    <select
                      className="form-input"
                      value={editAssignedDirection}
                      onChange={(e) => {
                        const newDir = e.target.value;
                        setEditAssignedDirection(newDir);
                        if (editWorkspaceType === 'UNIT') {
                          const units = ORGANIGRAMA_GAMEA[newDir] || [];
                          setEditAssignedUnit(units[0] || '');
                        }
                      }}
                      required
                    >
                      <option value="">-- Seleccionar Dirección GAMEA --</option>
                      {LISTA_DIRECCIONES.map((dir) => (
                        <option key={dir} value={dir}>
                          🏢 {dir}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Unidad (si es UNIT) */}
                {editWorkspaceType === 'UNIT' && (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Unidad Organizacional Específica *
                    </label>
                    {editAssignedDirection && ORGANIGRAMA_GAMEA[editAssignedDirection]?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                          className="form-input"
                          value={
                            ORGANIGRAMA_GAMEA[editAssignedDirection].includes(editAssignedUnit)
                              ? editAssignedUnit
                              : (editAssignedUnit ? '__CUSTOM__' : '')
                          }
                          onChange={(e) => {
                            if (e.target.value !== '__CUSTOM__') {
                              setEditAssignedUnit(e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Seleccionar Unidad del Organigrama --</option>
                          {ORGANIGRAMA_GAMEA[editAssignedDirection].map((unit) => (
                            <option key={unit} value={unit}>
                              🏛️ {unit}
                            </option>
                          ))}
                          <option value="__CUSTOM__">✍️ Otra unidad (especificar manualmente)...</option>
                        </select>

                        {(!ORGANIGRAMA_GAMEA[editAssignedDirection].includes(editAssignedUnit) || !editAssignedUnit) && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Escriba el nombre exacto de la Unidad..."
                            value={editAssignedUnit === '__CUSTOM__' ? '' : editAssignedUnit}
                            onChange={(e) => setEditAssignedUnit(e.target.value)}
                            required
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombre de la Unidad organizativa..."
                        value={editAssignedUnit}
                        onChange={(e) => setEditAssignedUnit(e.target.value)}
                        required
                      />
                    )}
                  </div>
                )}

                {/* Callout descriptivo de seguridad y alcance */}
                <div
                  style={{
                    background:
                      editWorkspaceType === 'UNIT'
                        ? 'rgba(168, 85, 247, 0.12)'
                        : editWorkspaceType === 'DIRECTION'
                        ? 'rgba(56, 189, 248, 0.12)'
                        : editWorkspaceType === 'GLOBAL'
                        ? 'rgba(234, 179, 8, 0.12)'
                        : 'rgba(100, 116, 139, 0.15)',
                    border: `1px solid ${
                      editWorkspaceType === 'UNIT'
                        ? 'rgba(168, 85, 247, 0.3)'
                        : editWorkspaceType === 'DIRECTION'
                        ? 'rgba(56, 189, 248, 0.3)'
                        : editWorkspaceType === 'GLOBAL'
                        ? 'rgba(234, 179, 8, 0.3)'
                        : 'rgba(100, 116, 139, 0.3)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.74rem',
                    color: '#e2e8f0',
                    lineHeight: 1.45,
                  }}
                >
                  {editWorkspaceType === 'UNIT' && (
                    <>
                      🔒 <strong>Aislamiento Total por Unidad:</strong> Este usuario tendrá un espacio de trabajo estrictamente
                      independiente. Cargará su propia nómina de funcionarios y ningún usuario de otra unidad o dirección podrá
                      ver ni alterar sus listas.
                    </>
                  )}
                  {editWorkspaceType === 'DIRECTION' && (
                    <>
                      🏛️ <strong>Consolidado de Dirección:</strong> Podrá ver y supervisar la nómina de funcionarios de todas
                      las unidades que componen esta Dirección específica.
                    </>
                  )}
                  {editWorkspaceType === 'AUTONOMOUS' && (
                    <>
                      🛡️ <strong>Espacio Autónomo Personal:</strong> Panel individual. Solo visualizará y administrará los
                      funcionarios que registre directamente desde su sesión.
                    </>
                  )}
                  {editWorkspaceType === 'GLOBAL' && (
                    <>
                      🌐 <strong>Supervisión Global Municipal:</strong> Tendrá visibilidad y acceso de control sobre todas las
                      Direcciones y Unidades del Gobierno Autónomo Municipal de El Alto.
                    </>
                  )}
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

              {/* Espacio de Trabajo / Partición Multi-Tenant */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Building size={16} color="#38bdf8" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Espacio de Trabajo & Alcance de Funcionarios
                  </span>
                </div>

                {/* Nivel de Espacio */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Tipo de Partición / Nivel de Espacio *
                  </label>
                  <select
                    className="form-input"
                    value={newWorkspaceType}
                    onChange={(e) => {
                      const next = e.target.value as 'GLOBAL' | 'DIRECTION' | 'UNIT' | 'AUTONOMOUS';
                      setNewWorkspaceType(next);
                      if (next === 'GLOBAL' || next === 'AUTONOMOUS') {
                        setNewAssignedDirection('');
                        setNewAssignedUnit('');
                      } else if (next === 'DIRECTION') {
                        setNewAssignedUnit('');
                        if (!newAssignedDirection) {
                          setNewAssignedDirection(LISTA_DIRECCIONES[0] || '');
                        }
                      } else if (next === 'UNIT') {
                        if (!newAssignedDirection) {
                          const firstDir = LISTA_DIRECCIONES[0] || '';
                          setNewAssignedDirection(firstDir);
                          const units = ORGANIGRAMA_GAMEA[firstDir] || [];
                          setNewAssignedUnit(units[0] || '');
                        }
                      }
                    }}
                  >
                    <option value="UNIT">🏢 Unidad Específica (Recomendado - Espacio 100% Aislado e Independiente)</option>
                    <option value="DIRECTION">🏛️ Dirección Completa (Acceso a todas las unidades de una Dirección)</option>
                    <option value="AUTONOMOUS">🛡️ Espacio Autónomo / Personal (Solo funcionarios creados por él)</option>
                    <option value="GLOBAL">🌐 Global Institucional (Supervisión Total GAMEA - Todas las Direcciones)</option>
                  </select>
                </div>

                {/* Dirección (si es UNIT o DIRECTION) */}
                {(newWorkspaceType === 'UNIT' || newWorkspaceType === 'DIRECTION') && (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Dirección Institucional Asignada *
                    </label>
                    <select
                      className="form-input"
                      value={newAssignedDirection}
                      onChange={(e) => {
                        const newDir = e.target.value;
                        setNewAssignedDirection(newDir);
                        if (newWorkspaceType === 'UNIT') {
                          const units = ORGANIGRAMA_GAMEA[newDir] || [];
                          setNewAssignedUnit(units[0] || '');
                        }
                      }}
                      required
                    >
                      <option value="">-- Seleccionar Dirección GAMEA --</option>
                      {LISTA_DIRECCIONES.map((dir) => (
                        <option key={dir} value={dir}>
                          🏢 {dir}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Unidad (si es UNIT) */}
                {newWorkspaceType === 'UNIT' && (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Unidad Organizacional Específica *
                    </label>
                    {newAssignedDirection && ORGANIGRAMA_GAMEA[newAssignedDirection]?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                          className="form-input"
                          value={
                            ORGANIGRAMA_GAMEA[newAssignedDirection].includes(newAssignedUnit)
                              ? newAssignedUnit
                              : (newAssignedUnit ? '__CUSTOM__' : '')
                          }
                          onChange={(e) => {
                            if (e.target.value !== '__CUSTOM__') {
                              setNewAssignedUnit(e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Seleccionar Unidad del Organigrama --</option>
                          {ORGANIGRAMA_GAMEA[newAssignedDirection].map((unit) => (
                            <option key={unit} value={unit}>
                              🏛️ {unit}
                            </option>
                          ))}
                          <option value="__CUSTOM__">✍️ Otra unidad (especificar manualmente)...</option>
                        </select>

                        {(!ORGANIGRAMA_GAMEA[newAssignedDirection].includes(newAssignedUnit) || !newAssignedUnit) && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Escriba el nombre exacto de la Unidad..."
                            value={newAssignedUnit === '__CUSTOM__' ? '' : newAssignedUnit}
                            onChange={(e) => setNewAssignedUnit(e.target.value)}
                            required
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombre de la Unidad organizativa..."
                        value={newAssignedUnit}
                        onChange={(e) => setNewAssignedUnit(e.target.value)}
                        required
                      />
                    )}
                  </div>
                )}

                {/* Callout descriptivo de seguridad y alcance */}
                <div
                  style={{
                    background:
                      newWorkspaceType === 'UNIT'
                        ? 'rgba(168, 85, 247, 0.12)'
                        : newWorkspaceType === 'DIRECTION'
                        ? 'rgba(56, 189, 248, 0.12)'
                        : newWorkspaceType === 'GLOBAL'
                        ? 'rgba(234, 179, 8, 0.12)'
                        : 'rgba(100, 116, 139, 0.15)',
                    border: `1px solid ${
                      newWorkspaceType === 'UNIT'
                        ? 'rgba(168, 85, 247, 0.3)'
                        : newWorkspaceType === 'DIRECTION'
                        ? 'rgba(56, 189, 248, 0.3)'
                        : newWorkspaceType === 'GLOBAL'
                        ? 'rgba(234, 179, 8, 0.3)'
                        : 'rgba(100, 116, 139, 0.3)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.74rem',
                    color: '#e2e8f0',
                    lineHeight: 1.45,
                  }}
                >
                  {newWorkspaceType === 'UNIT' && (
                    <>
                      🔒 <strong>Aislamiento Total por Unidad:</strong> Este usuario tendrá un espacio de trabajo estrictamente
                      independiente. Cargará su propia nómina de funcionarios y ningún usuario de otra unidad o dirección podrá
                      ver ni alterar sus listas.
                    </>
                  )}
                  {newWorkspaceType === 'DIRECTION' && (
                    <>
                      🏛️ <strong>Consolidado de Dirección:</strong> Podrá ver y supervisar la nómina de funcionarios de todas
                      las unidades que componen esta Dirección específica.
                    </>
                  )}
                  {newWorkspaceType === 'AUTONOMOUS' && (
                    <>
                      🛡️ <strong>Espacio Autónomo Personal:</strong> Panel individual. Solo visualizará y administrará los
                      funcionarios que registre directamente desde su sesión.
                    </>
                  )}
                  {newWorkspaceType === 'GLOBAL' && (
                    <>
                      🌐 <strong>Supervisión Global Municipal:</strong> Tendrá visibilidad y acceso de control sobre todas las
                      Direcciones y Unidades del Gobierno Autónomo Municipal de El Alto.
                    </>
                  )}
                </div>
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
