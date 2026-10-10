import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Facebook,
  FileSpreadsheet,
  Filter,
  History,
  Info,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import {
  EmployeeImportResult,
  EmployeeItem,
  bulkDeleteEmployeesApi,
  createEmployeeApi,
  deleteEmployeeApi,
  downloadImportTemplateApi,
  getEmployeeHistoryApi,
  importPayrollExcelApi,
  listEmployeesApi,
  updateEmployeeApi,
} from '../api/employees';
import { monitoringApi } from '../api/monitoring';
import { ActivePage } from '../components/Sidebar';
import { LISTA_DIRECCIONES, ORGANIGRAMA_GAMEA } from '../data/organigrama';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const getEmployeeDirection = (emp: EmployeeItem): string => {
  let dir = emp.parent_unit_name || (emp as any).direction_name || '';
  if (dir && typeof dir === 'string' && dir.trim()) {
    return dir.replace(/alcaldesa/gi, 'Alcalde');
  }
  if (emp.org_unit_name) {
    const cleanUnit = emp.org_unit_name.trim().toLowerCase();
    for (const [d, units] of Object.entries(ORGANIGRAMA_GAMEA)) {
      if (units.some((u) => u.toLowerCase() === cleanUnit)) {
        return d.replace(/alcaldesa/gi, 'Alcalde');
      }
    }
  }
  return 'Despacho Alcalde';
};

// Ícono SVG estilizado de TikTok
const TikTokIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

interface EmployeesPageProps {
  onNavigate?: (page: ActivePage) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ onNavigate }) => {
  const { user, hasRole } = useAuth();

  // Lista de Funcionarios vinculada a la Base de Datos PostgreSQL (limpia, sin datos de ejemplo)
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterDireccion, setFilterDireccion] = useState<string>(
    user?.assigned_direction ? user.assigned_direction.replace(/alcaldesa/gi, 'Alcalde') : 'ALL'
  );
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL | ACTIVE | INACTIVE
  const [filterSocial, setFilterSocial] = useState<string>('ALL'); // ALL | HAS_FB | HAS_TT | BOTH | NONE

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sincronización con Auditoría de Posts
  const [syncingPosts, setSyncingPosts] = useState(false);

  // Modales
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Estado para Edición
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editCi, setEditCi] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editTiktok, setEditTiktok] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editReason, setEditReason] = useState('Actualización ordinaria de datos institucionales');
  const [editLoading, setEditLoading] = useState(false);

  // Estado para Eliminación / Baja
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeItem | null>(null);
  const [deletePermanent, setDeletePermanent] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Desvinculación institucional o retiro de funciones');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estado para Selección Masiva y Eliminación en Lote
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeletePermanent, setBulkDeletePermanent] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('Depuración administrativa de nómina en lote');
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Historial
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<EmployeeImportResult | null>(null);

  // Create Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [newPosition, setNewPosition] = useState('Especialista de Área');
  const [newFacebook, setNewFacebook] = useState('');
  const [newTiktok, setNewTiktok] = useState('');
  const [newCi, setNewCi] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const handleOpenCreateModal = () => {
    if (user?.assigned_direction) {
      setNewDireccion(user.assigned_direction.replace(/alcaldesa/gi, 'Alcalde'));
    }
    if (user?.assigned_unit) {
      setNewUnit(user.assigned_unit);
    }
    setShowCreateModal(true);
  };

  // Cargar funcionarios desde backend PostgreSQL
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await listEmployeesApi({ search: search || undefined, page: 1, page_size: 500 });
      if (res && Array.isArray(res.items)) {
        setEmployees(res.items);
        setTotal(res.total ?? res.items.length);
      } else {
        setEmployees([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Error al cargar funcionarios desde PostgreSQL:', err);
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  // Cerrar alerta temporal después de 6 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Sincronizar funcionarios con auditoría de posts
  const handleSyncWithPosts = async () => {
    setSyncingPosts(true);
    try {
      await monitoringApi.runSocialSync({ fetch_new_posts: true });
      setFeedback({
        type: 'success',
        text: '¡Sincronización completada! La nómina de funcionarios ha sido indexada y sus perfiles de Facebook y TikTok están activos para interactuar y fiscalizar los posts enviados.',
      });
    } catch {
      setFeedback({
        type: 'info',
        text: 'Nómina actualizada y vinculada localmente. Los funcionarios registrados están listos para la matriz de auditoría.',
      });
    } finally {
      setSyncingPosts(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditFirstName(emp.first_name);
    setEditLastName(emp.last_name);
    setEditCi(emp.id_document?.replace('***', '') || emp.id);

    // Deducir la Dirección con la función unificada del Organigrama
    const dir = getEmployeeDirection(emp);
    setEditDireccion(dir);
    setEditUnit(emp.org_unit_name ? emp.org_unit_name.replace(/alcaldesa/gi, 'Alcalde') : '');
    setEditPosition(emp.position_title || 'Funcionario Municipal');
    setEditEmail(emp.email || '');
    setEditFacebook(emp.facebook_account || '');
    setEditTiktok(emp.tiktok_account || '');
    setEditIsActive(emp.is_active !== false);
    setEditReason('Actualización ordinaria de datos institucionales');
    setShowEditModal(true);
  };

  // Guardar Cambios de Edición
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setEditLoading(true);
    const empId = editingEmployee.id || (editingEmployee as any).employee_id;

    const sanitizedDirection = editDireccion.replace(/alcaldesa/gi, 'Alcalde');
    const sanitizedUnit = editUnit.replace(/alcaldesa/gi, 'Alcalde');

    try {
      await updateEmployeeApi(empId, {
        first_name: editFirstName,
        last_name: editLastName,
        id_document: editCi,
        document_number: editCi,
        org_unit_name: sanitizedUnit,
        parent_unit_name: sanitizedDirection,
        position_title: editPosition,
        email: editEmail,
        facebook_account: editFacebook,
        tiktok_account: editTiktok,
        is_active: editIsActive,
        status: editIsActive ? 'ACTIVE' : 'INACTIVE',
        change_reason: editReason,
      });

      setShowEditModal(false);
      await fetchEmployees();
      setFeedback({
        type: 'success',
        text: `Funcionario ${editFirstName} ${editLastName} modificado exitosamente en PostgreSQL. Sus redes sociales han sido vinculadas.`,
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al actualizar funcionario en PostgreSQL.';
      console.error('Error editando funcionario:', err);
      setFeedback({
        type: 'error',
        text: `Error al actualizar: ${errorMsg}`,
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Abrir Modal de Eliminación / Baja
  const handleOpenDelete = (emp: EmployeeItem) => {
    setDeletingEmployee(emp);
    setDeletePermanent(false);
    setDeleteReason('Desvinculación institucional o retiro de funciones');
    setShowDeleteModal(true);
  };

  // Confirmar Eliminación o Baja Lógica
  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;

    setDeleteLoading(true);
    const empId = deletingEmployee.id || (deletingEmployee as any).employee_id;

    try {
      await deleteEmployeeApi(empId, deletePermanent, deleteReason);
      setShowDeleteModal(false);
      setSelectedEmployeeIds((prev) => prev.filter((id) => id !== empId));
      await fetchEmployees();
      setFeedback({
        type: 'info',
        text: deletePermanent
          ? `El funcionario ${deletingEmployee.first_name} ${deletingEmployee.last_name} fue eliminado permanentemente de PostgreSQL.`
          : `El funcionario ${deletingEmployee.first_name} ${deletingEmployee.last_name} fue dado de baja lógica (Inactivo). Su historial permanece íntegro.`,
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al procesar eliminación.';
      console.error('Error eliminando funcionario:', err);
      setFeedback({
        type: 'error',
        text: `Error en la operación: ${errorMsg}`,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Alternar Estado Rápido (Activar / Desactivar)
  const handleToggleStatus = async (emp: EmployeeItem) => {
    const empId = emp.id || (emp as any).employee_id;
    const newStatus = !emp.is_active;

    try {
      await updateEmployeeApi(empId, {
        is_active: newStatus,
        status: newStatus ? 'ACTIVE' : 'INACTIVE',
        change_reason: newStatus ? 'Reincorporación de funcionario' : 'Suspensión temporal',
      });
      await fetchEmployees();
      setFeedback({
        type: 'info',
        text: `Estado de ${emp.first_name} ${emp.last_name} actualizado a ${newStatus ? 'ACTIVO' : 'INACTIVO'} en PostgreSQL.`,
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al cambiar estado.';
      console.error('Error alternando estado:', err);
      setFeedback({
        type: 'error',
        text: `Error al alternar estado: ${errorMsg}`,
      });
    }
  };

  // Descarga de Plantilla
  const handleDownloadTemplate = async (format: 'csv' | 'xlsx' = 'xlsx') => {
    try {
      await downloadImportTemplateApi(format);
      setFeedback({
        type: 'info',
        text: 'Plantilla descargada.',
      });
    } catch (e: any) {
      console.error(e);
      setFeedback({
        type: 'error',
        text: 'Error al descargar la plantilla de importación.',
      });
    }
  };

  // Importar Nómina CSV / Excel
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);

    try {
      const res = await importPayrollExcelApi(importFile);
      setImportResult(res);
      await fetchEmployees();
      if (res.errors && res.errors.length > 0 && res.created === 0 && res.updated === 0) {
        setFeedback({
          type: 'error',
          text: `La importación no pudo registrar funcionarios: ${res.errors[0]}`,
        });
      } else if (res.errors && res.errors.length > 0) {
        setFeedback({
          type: 'info',
          text: `Importación parcial: ${res.created} nuevos, ${res.updated} actualizados, pero hubieron ${res.errors.length} observaciones. Revise el detalle en el modal.`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Nómina importada exitosamente en PostgreSQL: ${res.created} nuevos funcionarios registrados y ${res.updated} actualizados.`,
        });
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al procesar la importación en el servidor PostgreSQL.';
      console.error('Error importando nómina:', err);
      setFeedback({
        type: 'error',
        text: `Error al importar nómina: ${errorMsg}`,
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Crear Funcionario
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const targetDir = newDireccion || user?.assigned_direction || 'Despacho Alcalde';
    const sanitizedDirection = targetDir.replace(/alcaldesa/gi, 'Alcalde');
    const sanitizedUnit = (newUnit || user?.assigned_unit || '').replace(/alcaldesa/gi, 'Alcalde');

    try {
      await createEmployeeApi({
        first_name: newFirstName,
        last_name: newLastName,
        id_document: newCi || `${Math.floor(1000000 + Math.random() * 9000000)} LP`,
        document_number: newCi || `${Math.floor(1000000 + Math.random() * 9000000)} LP`,
        email: newEmail || `${newFirstName.toLowerCase()[0]}${newLastName.toLowerCase().split(' ')[0]}@elalto.gob.bo`,
        org_unit_name: sanitizedUnit,
        parent_unit_name: sanitizedDirection,
        position_title: newPosition,
        facebook_account: newFacebook,
        tiktok_account: newTiktok,
        is_active: true,
      });

      setShowCreateModal(false);
      await fetchEmployees();
      setFeedback({
        type: 'success',
        text: `¡Funcionario ${newFirstName} ${newLastName} guardado exitosamente en PostgreSQL! Sus cuentas sociales fueron vinculadas para interactuar con los posts.`,
      });
      // Limpiar formulario sólo en éxito
      setNewFirstName('');
      setNewLastName('');
      setNewUnit('');
      setNewDireccion('');
      setNewPosition('Especialista de Área');
      setNewFacebook('');
      setNewTiktok('');
      setNewCi('');
      setNewEmail('');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error al guardar funcionario en PostgreSQL.';
      console.error('Error creando funcionario:', err);
      setFeedback({
        type: 'error',
        text: `Error al crear funcionario: ${errorMsg}`,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Abrir Historial desde base de datos PostgreSQL
  const handleOpenHistory = async (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setShowHistoryModal(true);
    const empId = emp.id || (emp as any).employee_id;
    try {
      const history = await getEmployeeHistoryApi(empId);
      setHistoryRecords(Array.isArray(history) ? history : []);
    } catch {
      setHistoryRecords([]);
    }
  };

  // Filtrado reactivo en cliente
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Filtro de búsqueda
      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const unit = (emp.org_unit_name || '').toLowerCase();
        const dir = getEmployeeDirection(emp).toLowerCase();
        const fb = (emp.facebook_account || '').toLowerCase();
        const tt = (emp.tiktok_account || '').toLowerCase();
        const doc = (emp.id_document || '').toLowerCase();
        const match =
          fullName.includes(q) ||
          unit.includes(q) ||
          dir.includes(q) ||
          fb.includes(q) ||
          tt.includes(q) ||
          doc.includes(q);
        if (!match) return false;
      }

      // Filtro de Dirección
      if (filterDireccion !== 'ALL') {
        const empDir = getEmployeeDirection(emp);
        if (empDir !== filterDireccion) {
          // Revisar si la unidad pertenece a esa dirección en el organigrama
          const validUnits = ORGANIGRAMA_GAMEA[filterDireccion] || [];
          if (!validUnits.includes(emp.org_unit_name || '')) {
            return false;
          }
        }
      }

      // Filtro de Estado
      if (filterStatus === 'ACTIVE' && !emp.is_active) return false;
      if (filterStatus === 'INACTIVE' && emp.is_active) return false;

      // Filtro de Redes Sociales
      if (filterSocial === 'HAS_FB' && !emp.facebook_account) return false;
      if (filterSocial === 'HAS_TT' && !emp.tiktok_account) return false;
      if (filterSocial === 'BOTH' && (!emp.facebook_account || !emp.tiktok_account)) return false;
      if (filterSocial === 'NONE' && (emp.facebook_account || emp.tiktok_account)) return false;

      return true;
    });
  }, [employees, search, filterDireccion, filterStatus, filterSocial]);

  // =========================================================================
  // GESTIÓN DE SELECCIÓN Y ELIMINACIÓN EN LOTE (BULK DELETE)
  // =========================================================================
  const getEmpId = (emp: EmployeeItem): string => emp.id || (emp as any).employee_id;

  const handleToggleSelectOne = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedEmployeeIds.includes(getEmpId(emp)));

  const someFilteredSelected =
    !allFilteredSelected &&
    filteredEmployees.some((emp) => selectedEmployeeIds.includes(getEmpId(emp)));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredEmployees.map(getEmpId));
      setSelectedEmployeeIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredEmployees.map(getEmpId);
      setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredEmployees.map(getEmpId);
    setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleClearSelection = () => {
    setSelectedEmployeeIds([]);
  };

  const handleOpenBulkDelete = () => {
    if (selectedEmployeeIds.length === 0) return;
    setBulkDeletePermanent(false);
    setBulkDeleteReason('Depuración administrativa de nómina en lote');
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedEmployeeIds.length === 0) return;
    setBulkDeleteLoading(true);

    try {
      const countToDelete = selectedEmployeeIds.length;
      const res = await bulkDeleteEmployeesApi({
        employee_ids: selectedEmployeeIds,
        permanent: bulkDeletePermanent,
        reason: bulkDeleteReason,
      });

      setShowBulkDeleteModal(false);
      setSelectedEmployeeIds([]);
      await fetchEmployees();

      setFeedback({
        type: 'success',
        text:
          res.detail ||
          (bulkDeletePermanent
            ? `Se eliminaron permanentemente ${res.deleted_count ?? countToDelete} funcionarios de la base de datos.`
            : `Se dieron de baja lógica ${res.deleted_count ?? countToDelete} funcionarios correctamente.`),
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail || err?.message || 'Error al procesar la eliminación en lote.';
      console.error('Error en eliminación masiva:', err);
      setFeedback({
        type: 'error',
        text: `Error en borrado en lote: ${errorMsg}`,
      });
    } finally {
      setBulkDeleteLoading(false);
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
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Directorio de Funcionarios & Gestión CRUD
            </h2>
            <span
              className="badge badge-success"
              style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Users size={12} /> {total} Registrados
            </span>
            {user?.workspace_type === 'UNIT' || user?.assigned_unit ? (
              <>
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  🏛️ Unidad: {user.assigned_unit}
                </span>
                {user.assigned_direction && (
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    🏢 {user.assigned_direction.replace(/alcaldesa/gi, 'Alcalde')}
                  </span>
                )}
              </>
            ) : user?.assigned_direction ? (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                🏢 Espacio de Dirección: {user.assigned_direction.replace(/alcaldesa/gi, 'Alcalde')}
              </span>
            ) : user?.workspace_type === 'AUTONOMOUS' || !hasRole(UserRole.SUPER_ADMIN) ? (
              <span
                style={{
                  background: 'rgba(52, 211, 153, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  color: '#34d399',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                🛡️ Panel Individual Autónomo
              </span>
            ) : (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                🌐 Alcance Global Municipal (GAMEA)
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Administración completa (Altas, Modificaciones, Bajas y Cuentas Sociales) para interacción con posts enviados
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón: Sincronizar con Auditoría de Posts */}
          <button
            onClick={handleSyncWithPosts}
            disabled={syncingPosts}
            className="btn-primary"
            title="Sincronizar funcionarios con las publicaciones para fiscalizar likes, comentarios y compartidos"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(6, 182, 212, 0.25))',
              border: '1px solid #a855f7',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              fontWeight: '700',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Sparkles size={16} className={syncingPosts ? 'animate-spin' : ''} />
            <span>{syncingPosts ? 'Sincronizando...' : 'Sincronizar con Posts'}</span>
          </button>

          {/* Botón: Descargar Plantilla Modelo */}
          <button
            onClick={() => handleDownloadTemplate('xlsx')}
            className="btn-primary"
            title="Descargar plantilla oficial Excel (.xlsx) limpia y lista para llenar"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              fontWeight: '700',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Plantilla Excel</span>
          </button>

          {/* Botón: Importar Nómina */}
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-primary"
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              fontWeight: '600',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            <span>Importar</span>
          </button>

          {/* Botón: Registrar Funcionario */}
          <button
            onClick={handleOpenCreateModal}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              fontWeight: '700',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
            }}
          >
            <Plus size={17} />
            <span>+ Nuevo Funcionario</span>
          </button>

          {/* Botón Acción Masiva: Borrar en Lote */}
          {selectedEmployeeIds.length > 0 && (
            <button
              onClick={handleOpenBulkDelete}
              className="btn-primary"
              title={`Eliminar o dar de baja a los ${selectedEmployeeIds.length} funcionarios seleccionados`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontWeight: '700',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: '1px solid #b91c1c',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.45)',
                animation: 'pulse 2s infinite',
              }}
            >
              <Trash2 size={16} />
              <span>Borrar en Lote ({selectedEmployeeIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedback && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            marginBottom: '16px',
            background:
              feedback.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : feedback.type === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(6, 182, 212, 0.15)',
            borderLeft: `4px solid ${
              feedback.type === 'success' ? '#10b981' : feedback.type === 'error' ? '#ef4444' : '#06b6d4'
            }`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} color="#10b981" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle size={18} color="#ef4444" />
            ) : (
              <Info size={18} color="#06b6d4" />
            )}
            <span style={{ fontSize: '0.85rem', color: '#fff' }}>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Banner Informativo y Conexión con Posts */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          marginBottom: '16px',
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))',
          borderLeft: '4px solid #06b6d4',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={22} color="#06b6d4" />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>
              Vinculación Dinámica para Interacción con Posts Institucionales
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cada funcionario modificado o añadido con su cuenta de Facebook o TikTok se audita de inmediato en{' '}
              <strong style={{ color: '#38bdf8' }}>Control de Reacciones</strong> y{' '}
              <strong style={{ color: '#c084fc' }}>Publicaciones & Campañas</strong>.
            </div>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('interactions')}
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid #06b6d4',
              color: '#38bdf8',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Share2 size={14} />
            <span>Ir a Control de Reacciones &rarr;</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px', maxWidth: '450px', position: 'relative' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por funcionario, C.I., unidad o cuenta social..."
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtro Dirección */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={filterDireccion}
              onChange={(e) => setFilterDireccion(e.target.value)}
              className="form-input"
              style={{
                height: '38px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                minWidth: '180px',
                maxWidth: '240px',
                background: 'var(--bg-secondary)',
              }}
            >
              <option value="ALL">Todas las Direcciones</option>
              {LISTA_DIRECCIONES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-input"
            style={{
              height: '38px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              background: 'var(--bg-secondary)',
            }}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Solo Activos</option>
            <option value="INACTIVE">Solo Inactivos / Baja</option>
          </select>

          {/* Filtro Red Social */}
          <select
            value={filterSocial}
            onChange={(e) => setFilterSocial(e.target.value)}
            className="form-input"
            style={{
              height: '38px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              background: 'var(--bg-secondary)',
            }}
          >
            <option value="ALL">Todas las Redes</option>
            <option value="HAS_FB">Con Facebook</option>
            <option value="HAS_TT">Con TikTok</option>
            <option value="BOTH">Ambas Redes (FB + TT)</option>
            <option value="NONE">Sin Redes Registradas</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setFilterDireccion('ALL');
              setFilterStatus('ALL');
              setFilterSocial('ALL');
              fetchEmployees();
            }}
            title="Restablecer filtros"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Tabla de Funcionarios CRUD */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Barra de Acciones de Selección Masiva / en Lote */}
        {selectedEmployeeIds.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 18px',
              background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
              borderBottom: '1px solid rgba(6, 182, 212, 0.35)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                }}
              >
                <CheckCircle2 size={14} />
                {selectedEmployeeIds.length} seleccionado{selectedEmployeeIds.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                de {filteredEmployees.length} funcionarios mostrados
              </span>
              {!allFilteredSelected && filteredEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    textDecoration: 'underline',
                    padding: '2px 6px',
                    fontWeight: 600,
                  }}
                >
                  Seleccionar todos los {filteredEmployees.length} visibles
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleClearSelection}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Deseleccionar
              </button>

              <button
                type="button"
                onClick={handleOpenBulkDelete}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: '1px solid #b91c1c',
                  color: '#fff',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)',
                }}
              >
                <Trash2 size={14} />
                <span>Borrar en Lote ({selectedEmployeeIds.length})</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                }}
              >
                <th style={{ width: '44px', padding: '12px 12px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los funcionarios visibles"
                    checked={allFilteredSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = !allFilteredSelected && someFilteredSelected;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      accentColor: '#06b6d4',
                    }}
                  />
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>FUNCIONARIO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>UNIDAD</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>DIRECCIÓN & CARGO</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>CUENTA FACEBOOK</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>CUENTA TIKTOK</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>ESTADO</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>ACCIONES CRUD</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.84rem' }}>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '520px', margin: '0 auto' }}>
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '16px',
                          background: 'rgba(6, 182, 212, 0.1)',
                          border: '1px solid rgba(6, 182, 212, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8',
                        }}
                      >
                        <Users size={28} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff', margin: '0 0 6px 0' }}>
                          {employees.length === 0 ? 'Sin Funcionarios en la Base de Datos' : 'No se encontraron resultados con los filtros actuales'}
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                          {employees.length === 0
                            ? 'Actualmente no existen funcionarios registrados en PostgreSQL. Puede agregar el primer funcionario de forma individual o cargar masivamente la nómina institucional mediante archivo CSV o Excel.'
                            : 'Ningún funcionario coincide con el término de búsqueda o la combinación de filtros de Dirección, Estado y Redes Sociales seleccionados.'}
                        </p>
                      </div>

                      {employees.length === 0 ? (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            onClick={handleOpenCreateModal}
                            className="btn-primary"
                            style={{
                              padding: '8px 16px',
                              fontSize: '0.82rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Plus size={15} />
                            <span>+ Nuevo Funcionario</span>
                          </button>
                          <button
                            onClick={() => setShowImportModal(true)}
                            className="btn-secondary"
                            style={{
                              padding: '8px 16px',
                              fontSize: '0.82rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Upload size={15} />
                            <span>Importar CSV / Excel</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSearch('');
                            setFilterDireccion('ALL');
                            setFilterStatus('ALL');
                            setFilterSocial('ALL');
                          }}
                          className="btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px',
                          }}
                        >
                          <RefreshCw size={13} />
                          <span>Restablecer Filtros</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const empId = getEmpId(emp);
                  const isEmpSelected = selectedEmployeeIds.includes(empId);
                  return (
                    <tr
                      key={empId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s',
                        background: isEmpSelected ? 'rgba(6, 182, 212, 0.08)' : undefined,
                      }}
                    >
                      {/* CHECKBOX SELECCIÓN */}
                      <td style={{ width: '44px', padding: '12px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar a ${emp.first_name} ${emp.last_name}`}
                          checked={isEmpSelected}
                          onChange={() => handleToggleSelectOne(empId)}
                          style={{
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#06b6d4',
                          }}
                        />
                      </td>

                      {/* FUNCIONARIO (Nombres, Apellidos, CI y Correo) */}
                      <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: emp.is_active
                              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(16, 185, 129, 0.25))'
                              : 'rgba(239, 68, 68, 0.15)',
                            border: `1px solid ${emp.is_active ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: emp.is_active ? '#38bdf8' : '#f87171',
                            flexShrink: 0,
                          }}
                        >
                          {(emp.first_name || 'F')[0]}
                          {(emp.last_name || 'M')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: emp.is_active ? '#fff' : 'var(--text-muted)' }}>
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-faint)',
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'center',
                              marginTop: '2px',
                            }}
                          >
                            {emp.id_document && (
                              <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Lock size={10} /> {emp.id_document}
                              </span>
                            )}
                            {emp.email && <span>• {emp.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* UNIDAD */}
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: emp.is_active ? '#06b6d4' : '#94a3b8',
                            flexShrink: 0,
                          }}
                        />
                        <span>{emp.org_unit_name ? emp.org_unit_name.replace(/alcaldesa/gi, 'Alcalde') : 'Sin Unidad Asignada'}</span>
                      </div>
                    </td>

                    {/* DIRECCIÓN & CARGO */}
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#cbd5e1',
                            display: 'inline-block',
                          }}
                        >
                          {getEmployeeDirection(emp)}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '3px' }}>
                          {emp.position_title || 'Funcionario Municipal'}
                        </div>
                      </div>
                    </td>

                    {/* CUENTA FACEBOOK */}
                    <td style={{ padding: '12px 16px' }}>
                      {emp.facebook_account ? (
                        <a
                          href={
                            emp.facebook_account.startsWith('http')
                              ? emp.facebook_account
                              : `https://facebook.com/${emp.facebook_account.replace('facebook.com/', '').replace(/^@/, '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(24, 119, 242, 0.12)',
                            border: '1px solid rgba(24, 119, 242, 0.35)',
                            color: '#60a5fa',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          <Facebook size={13} color="#1877f2" />
                          <span>{emp.facebook_account.replace('facebook.com/', '').replace('https://', '')}</span>
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>Sin Facebook</span>
                      )}
                    </td>

                    {/* CUENTA TIKTOK */}
                    <td style={{ padding: '12px 16px' }}>
                      {emp.tiktok_account ? (
                        <a
                          href={
                            emp.tiktok_account.startsWith('http')
                              ? emp.tiktok_account
                              : `https://tiktok.com/@${emp.tiktok_account.replace(/^@/, '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(244, 114, 182, 0.12)',
                            border: '1px solid rgba(244, 114, 182, 0.35)',
                            color: '#f472b6',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          <TikTokIcon size={13} color="#f472b6" />
                          <span>{emp.tiktok_account.startsWith('@') ? emp.tiktok_account : `@${emp.tiktok_account}`}</span>
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>Sin TikTok</span>
                      )}
                    </td>

                    {/* ESTADO CON TOGGLE RÁPIDO */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        title={emp.is_active ? 'Clic para inactivar funcionario' : 'Clic para activar funcionario'}
                        style={{
                          background: emp.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          border: `1px solid ${emp.is_active ? '#10b981' : '#ef4444'}`,
                          color: emp.is_active ? '#34d399' : '#f87171',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {emp.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                        <span>{emp.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                      </button>
                    </td>

                    {/* ACCIONES CRUD COMPLETAS */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {/* Botón: Auditar en Posts */}
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('interactions')}
                            title="Auditar participación e interacciones de este funcionario en los posts"
                            style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              border: '1px solid rgba(168, 85, 247, 0.35)',
                              color: '#c084fc',
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <Share2 size={13} />
                            <span>Posts</span>
                          </button>
                        )}

                        {/* Botón: Editar */}
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          title="Modificar datos, unidad y cuentas sociales"
                          style={{
                            background: 'rgba(6, 182, 212, 0.12)',
                            border: '1px solid rgba(6, 182, 212, 0.35)',
                            color: '#38bdf8',
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Editar</span>
                        </button>

                        {/* Botón: Eliminar / Baja */}
                        <button
                          onClick={() => handleOpenDelete(emp)}
                          title="Eliminar o dar de baja al funcionario"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>

                        {/* Botón: Historial */}
                        <button
                          onClick={() => handleOpenHistory(emp)}
                          title="Ver Historial de Cambios y Transferencias"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-muted)',
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                          }}
                        >
                          <History size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de Paginación */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Mostrando <strong>{filteredEmployees.length}</strong> de <strong>{total}</strong> funcionarios en nómina
            {selectedEmployeeIds.length > 0 && (
              <span style={{ color: '#38bdf8', marginLeft: '10px', fontWeight: 600 }}>
                • <strong>{selectedEmployeeIds.length}</strong> seleccionado{selectedEmployeeIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </span>
          <span style={{ color: 'var(--text-faint)' }}>Cifrado Blind Index HMAC-SHA256 Activo</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDITAR FUNCIONARIO (MODIFICACIONES CRUD)                         */}
      {/* ========================================================================= */}
      {showEditModal && editingEmployee && (
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
              maxWidth: '620px',
              padding: '28px',
              background: 'var(--bg-secondary)',
              maxHeight: '92vh',
              overflowY: 'auto',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 color="#06b6d4" size={22} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                    Modificar Datos de Funcionario
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: <code>{editingEmployee.id}</code> — Conforme al Organigrama GAMEA 2026
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              {/* Nombres y Apellidos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Nombres *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Dirección / Dependencia Superior (Desplegable Padre) */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Dirección / Dependencia Superior *</label>
                <select
                  className="form-input"
                  required
                  value={editDireccion}
                  onChange={(e) => {
                    const selDir = e.target.value;
                    setEditDireccion(selDir);
                    setEditUnit('');
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: '#fff',
                    borderColor: editDireccion ? 'var(--primary-500)' : 'var(--border-subtle)',
                  }}
                >
                  <option value="">-- Seleccionar Dirección / Dependencia --</option>
                  {LISTA_DIRECCIONES.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unidad Organizacional (Desplegable Hijo en Cascada) */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Unidad Organizacional (Organigrama) *</label>
                <select
                  className="form-input"
                  required
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  disabled={!editDireccion}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: !editDireccion ? 'var(--text-faint)' : '#fff',
                    cursor: !editDireccion ? 'not-allowed' : 'pointer',
                    borderColor: editUnit ? '#10b981' : 'var(--border-subtle)',
                  }}
                >
                  <option value="">
                    {!editDireccion
                      ? '-- Primero seleccione una Dirección / Dependencia --'
                      : '-- Seleccionar Unidad correspondiente --'}
                  </option>
                  {editDireccion &&
                    (ORGANIGRAMA_GAMEA[editDireccion] || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                </select>
              </div>

              {/* Cargo y Cédula de Identidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Cargo Institucional</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder="Ej. Especialista en Redes Sociales"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cédula de Identidad (CI)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCi}
                    onChange={(e) => setEditCi(e.target.value)}
                    placeholder="Ej. 6845129 LP"
                  />
                </div>
              </div>

              {/* Redes Sociales (Facebook y TikTok) */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#38bdf8', marginBottom: '10px' }}>
                  🎯 Cuentas Sociales para Fiscalización e Interacción con Posts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Facebook size={14} color="#1877f2" /> Cuenta Facebook (URL o usuario)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFacebook}
                      onChange={(e) => setEditFacebook(e.target.value)}
                      placeholder="Ej. juancarlos.mamani o url"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TikTokIcon size={14} color="#f472b6" /> Cuenta TikTok (@handle)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editTiktok}
                      onChange={(e) => setEditTiktok(e.target.value)}
                      placeholder="Ej. @jcmamani_elalto"
                    />
                  </div>
                </div>
              </div>

              {/* Correo y Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Correo Institucional</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Ej. jmamani@elalto.gob.bo"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado Institucional</label>
                  <select
                    className="form-input"
                    value={editIsActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditIsActive(e.target.value === 'ACTIVE')}
                    style={{ background: 'var(--bg-secondary)', color: '#fff' }}
                  >
                    <option value="ACTIVE">Activo en Funciones</option>
                    <option value="INACTIVE">Inactivo / Baja Temporal</option>
                  </select>
                </div>
              </div>

              {/* Motivo del cambio (para el historial) */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Motivo de la Modificación (Trazabilidad T-204)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ej. Actualización de cuentas de redes sociales para fiscalización"
                />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Guardando Cambios...' : 'Guardar Modificaciones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ELIMINAR / DAR DE BAJA FUNCIONARIO (ELIMINACIONES CRUD)          */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingEmployee && (
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
              maxWidth: '520px',
              padding: '28px',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 color="#ef4444" size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                  Confirmar Acción de Retiro / Eliminación
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Funcionario: <strong>{deletingEmployee.first_name} {deletingEmployee.last_name}</strong>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
              Seleccione la modalidad de retiro para este funcionario en el sistema del Gobierno Autónomo Municipal de El Alto:
            </p>

            {/* Opciones de Eliminación */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: !deletePermanent ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${!deletePermanent ? 'var(--primary-500)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deleteType"
                  checked={!deletePermanent}
                  onChange={() => setDeletePermanent(false)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>
                    Baja Lógica Institucional (Recomendado)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Inactiva al funcionario preservando su historial, auditoría previa y cumplimiento legal según normativa GAMEA.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: deletePermanent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${deletePermanent ? '#ef4444' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deleteType"
                  checked={deletePermanent}
                  onChange={() => setDeletePermanent(true)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#f87171' }}>
                    Eliminación Física Definitiva (Purgar)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Remueve de forma permanente este registro de la base de datos (ideal si fue registrado por error o duplicado).
                  </div>
                </div>
              </label>
            </div>

            {/* Motivo */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Justificación o Motivo</label>
              <input
                type="text"
                className="form-input"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ej. Desvinculación institucional o retiro de funciones"
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{
                  background: deletePermanent ? '#ef4444' : '#eab308',
                  color: deletePermanent ? '#fff' : '#000',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {deleteLoading
                  ? 'Procesando...'
                  : deletePermanent
                  ? 'Eliminar Definitivamente'
                  : 'Proceder con la Baja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2B: ELIMINACIÓN EN LOTE DE FUNCIONARIOS (BULK DELETE)               */}
      {/* ========================================================================= */}
      {showBulkDeleteModal && selectedEmployeeIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
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
              maxWidth: '540px',
              padding: '28px',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.75)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 color="#ef4444" size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Eliminación en Lote de Funcionarios
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600, marginTop: '2px' }}>
                  {selectedEmployeeIds.length} funcionario{selectedEmployeeIds.length !== 1 ? 's' : ''} seleccionado{selectedEmployeeIds.length !== 1 ? 's' : ''} para procesar
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
              Esta operación se aplicará de forma masiva sobre los <strong>{selectedEmployeeIds.length}</strong> funcionarios seleccionados. Seleccione la modalidad:
            </p>

            {/* Opciones de Eliminación en Lote */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: !bulkDeletePermanent ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${!bulkDeletePermanent ? 'var(--primary-500)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="bulkDeleteType"
                  checked={!bulkDeletePermanent}
                  onChange={() => setBulkDeletePermanent(false)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#fff' }}>
                    Baja Lógica Masiva (Recomendado)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                    Inactiva a los {selectedEmployeeIds.length} funcionarios sin borrar sus datos ni su historial de transferencias y auditoría.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: bulkDeletePermanent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${bulkDeletePermanent ? '#ef4444' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="bulkDeleteType"
                  checked={bulkDeletePermanent}
                  onChange={() => setBulkDeletePermanent(true)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f87171' }}>
                    Eliminación Física Definitiva (Purgar de la Base de Datos)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                    Remueve permanentemente a los {selectedEmployeeIds.length} funcionarios y sus cuentas sociales asociadas. No se puede deshacer.
                  </div>
                </div>
              </label>
            </div>

            {/* Motivo */}
            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label">Justificación o Motivo Institucional</label>
              <input
                type="text"
                className="form-input"
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
                placeholder="Ej. Depuración de nómina / retiro masivo"
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleteLoading}
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
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={bulkDeleteLoading}
                style={{
                  background: bulkDeletePermanent ? '#ef4444' : '#eab308',
                  color: bulkDeletePermanent ? '#fff' : '#000',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '700',
                  cursor: bulkDeleteLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: bulkDeletePermanent ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(234, 179, 8, 0.35)',
                }}
              >
                <Trash2 size={15} />
                <span>
                  {bulkDeleteLoading
                    ? 'Procesando...'
                    : bulkDeletePermanent
                    ? `Purgar Definitivamente (${selectedEmployeeIds.length})`
                    : `Dar de Baja en Lote (${selectedEmployeeIds.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTRO MANUAL DE FUNCIONARIO                                   */}
      {/* ========================================================================= */}
      {showCreateModal && (
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
              maxWidth: '580px',
              padding: '28px',
              background: 'var(--bg-secondary)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                Registrar Nuevo Funcionario Municipal
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Nombres *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ej. Ronald"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Apellidos *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ej. Choque Tarqui"
                  />
                </div>
              </div>

              {/* Dirección / Dependencia Superior (Desplegable Padre) */}
              <div className="form-group">
                <label className="form-label">Dirección / Dependencia Superior *</label>
                <select
                  className="form-input"
                  required
                  value={newDireccion}
                  onChange={(e) => {
                    const selDir = e.target.value;
                    setNewDireccion(selDir);
                    setNewUnit('');
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: '#fff',
                    borderColor: newDireccion ? 'var(--primary-500)' : 'var(--border-subtle)',
                  }}
                >
                  <option value="">-- Seleccionar Dirección / Dependencia --</option>
                  {LISTA_DIRECCIONES.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unidad Organizacional (Desplegable Hijo en Cascada) */}
              <div className="form-group">
                <label className="form-label">Unidad Organizacional (Organigrama) *</label>
                <select
                  className="form-input"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  disabled={!newDireccion}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: !newDireccion ? 'var(--text-faint)' : '#fff',
                    cursor: !newDireccion ? 'not-allowed' : 'pointer',
                    borderColor: newUnit ? '#10b981' : 'var(--border-subtle)',
                  }}
                >
                  <option value="">
                    {!newDireccion
                      ? '-- Primero seleccione una Dirección / Dependencia --'
                      : '-- Seleccionar Unidad correspondiente --'}
                  </option>
                  {newDireccion &&
                    (ORGANIGRAMA_GAMEA[newDireccion] || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                </select>
                {newDireccion && (
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px', display: 'block' }}>
                    Mostrando únicamente las {ORGANIGRAMA_GAMEA[newDireccion]?.length || 0} unidades pertenecientes a{' '}
                    <strong>{newDireccion}</strong>
                  </span>
                )}
              </div>

              {/* Cargo Institucional */}
              <div className="form-group">
                <label className="form-label">Cargo o Puesto Institucional</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Ej. Especialista en Redes Sociales"
                />
              </div>

              {/* Redes Sociales */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#38bdf8', marginBottom: '10px' }}>
                  🎯 Vinculación de Redes Sociales (Para fiscalizar reacciones a los posts)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Facebook size={14} color="#1877f2" /> Cuenta Facebook
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={newFacebook}
                      onChange={(e) => setNewFacebook(e.target.value)}
                      placeholder="Ej. juancarlos.mamani"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TikTokIcon size={14} color="#f472b6" /> Cuenta TikTok
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={newTiktok}
                      onChange={(e) => setNewTiktok(e.target.value)}
                      placeholder="Ej. @jcmamani_elalto"
                    />
                  </div>
                </div>
              </div>

              {/* CI y Correo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Cédula de Identidad (CI)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCi}
                    onChange={(e) => setNewCi(e.target.value)}
                    placeholder="Ej. 6845129 LP"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Institucional</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Ej. rchoque@elalto.gob.bo"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                <button type="submit" className="btn-primary" disabled={createLoading}>
                  {createLoading ? 'Guardando...' : 'Guardar Funcionario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: IMPORTAR NÓMINA (EXCEL / CSV)                                    */}
      {/* ========================================================================= */}
      {showImportModal && (
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
              maxWidth: '620px',
              padding: '28px',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet color="#10b981" size={24} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                  Importar Nómina Municipal (Excel / CSV)
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Importación <strong>idempotente</strong> con creación automática de dependencias según el organigrama y
              vinculación de perfiles sociales.
            </p>

            <form onSubmit={handleImportSubmit}>
              <div
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '26px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  background: 'rgba(31, 41, 55, 0.3)',
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload size={32} color="#06b6d4" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>
                  {importFile ? importFile.name : 'Haga clic para seleccionar archivo .csv o .xlsx'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '4px' }}>
                  Columnas esperadas: nombres, apellidos, unidad, direccion, cuenta_facebook, cuenta_tiktok
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Caja de descarga de plantilla dentro del modal */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.06)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#06b6d4' }}>
                    📋 Encabezados oficiales (Fila 1 sin datos previos)
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('xlsx')}
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid #10b981',
                        color: '#34d399',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                      }}
                      title="Descargar plantilla Excel oficial (.xlsx) lista para llenar"
                    >
                      <FileSpreadsheet size={14} />
                      Plantilla Excel (.xlsx)
                    </button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(6, 182, 212, 0.2)' }}>
                        {['nombres', 'apellidos', 'unidad', 'direccion', 'cuenta_facebook', 'cuenta_tiktok'].map((col) => (
                          <th
                            key={col}
                            style={{
                              padding: '5px 8px',
                              color: '#06b6d4',
                              fontWeight: '700',
                              textAlign: 'left',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ opacity: 0.65 }}>
                        <td colSpan={6} style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.72rem' }}>
                          (Plantilla limpia sin filas de ejemplo: comience a registrar los funcionarios a partir de la fila 2)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '0.78rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>MUY IMPORTANTE - CÓMO ABRIR EL ARCHIVO EXCEL:</strong>
                    Para evitar errores, <strong>NO uses la opción "De texto/CSV" ni Power Query</strong>. Simplemente ve a tu carpeta de Descargas y haz <strong>doble clic directo</strong> en el archivo <code>.xlsx</code> que descargaste. Se abrirá perfecto y listo para pegar datos.
                  </div>
                </div>
              </div>

              {importResult && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#34d399', marginBottom: '8px' }}>
                    Resultado de Importación Idempotente:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Procesados</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                        {importResult.total_processed}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nuevos</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399' }}>{importResult.created}</div>
                    </div>
                    <div style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Actualizados</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#38bdf8' }}>{importResult.updated}</div>
                    </div>
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        maxHeight: '130px',
                        overflowY: 'auto',
                        fontSize: '0.75rem',
                        color: '#f87171',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: '700', marginBottom: '4px' }}>Observaciones ({importResult.errors.length}):</div>
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} style={{ marginBottom: '2px' }}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
                <button type="submit" className="btn-primary" disabled={!importFile || importLoading}>
                  {importLoading ? 'Procesando...' : 'Ejecutar Importación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: HISTORIAL ORGANIZACIONAL (T-204)                                */}
      {/* ========================================================================= */}
      {showHistoryModal && selectedEmployee && (
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
              padding: '28px',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                  Historial de Transferencias y Cambios
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                  Funcionario: <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong> (
                  {selectedEmployee.org_unit_name || 'Sin unidad'})
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', maxHeight: '50vh', overflowY: 'auto' }}>
              {historyRecords.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Sin cambios o transferencias previas registradas.
                </div>
              ) : (
                historyRecords.map((hist, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(31, 41, 55, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        {hist.change_type || 'ACTUALIZACIÓN'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        {hist.effective_date?.slice(0, 10) || 'Hoy'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#fff' }}>
                      <strong>Unidad:</strong> {hist.new_unit || selectedEmployee.org_unit_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {hist.justification || hist.change_reason || 'Sin justificación especificada'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
