import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Info,
  MessageSquare,
  Radio,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { ActivePage } from './Sidebar';

interface SectionManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: ActivePage;
}

interface SectionInfo {
  id: ActivePage | 'workflow';
  title: string;
  badge: string;
  icon: React.ElementType;
  purpose: string;
  steps: {
    title: string;
    description: string;
  }[];
  keyActions: {
    label: string;
    description: string;
  }[];
  tips: string[];
}

const SECTIONS_DATA: SectionInfo[] = [
  {
    id: 'dashboard',
    title: 'Panel General de Monitoreo',
    badge: 'Supervisión en Vivo',
    icon: Activity,
    purpose:
      'Es la pantalla principal para observar de inmediato la salud del sistema, el estado de conexión con Facebook y TikTok, y los totales generales de publicaciones e interacciones registradas.',
    steps: [
      {
        title: '1. Verificar la conexión con redes sociales',
        description:
          'En el encabezado superior, comprueba que Facebook y TikTok tengan el indicador verde "ONLINE". Si indica "TOKEN EXPIRADO", dirígete a Configuración para renovar la credencial.',
      },
      {
        title: '2. Supervisar los totales institucionales',
        description:
          'Revisa las tarjetas de resumen: cantidad de publicaciones monitoreadas, total de interacciones capturadas y revisiones pendientes.',
      },
      {
        title: '3. Comprobar las sincronizaciones automáticas',
        description:
          'La tabla inferior muestra los últimos trabajos ejecutados por el servidor. Te confirma si las lecturas automáticas finalizaron con éxito.',
      },
    ],
    keyActions: [
      {
        label: 'Botón "Refrescar"',
        description: 'Vuelve a consultar el servidor para obtener los datos más recientes en pantalla.',
      },
      {
        label: 'Cambio "Operativo / Ejecutivo"',
        description: 'Alterna entre la vista de métricas técnicas de sincronización y los indicadores agregados de personal.',
      },
    ],
    tips: [
      'En esta sección no necesitas registrar ni editar información; es exclusivamente un tablero de control e información en tiempo real.',
      'Si notas que los datos no se actualizan, comprueba primero el estado de los conectores de Facebook y TikTok.',
    ],
  },
  {
    id: 'analytics',
    title: 'Analítica y Cumplimiento de Personal',
    badge: 'Métricas por Área',
    icon: BarChart3,
    purpose:
      'Permite a Directores y Supervisores evaluar el nivel de participación y apoyo del personal en las publicaciones oficiales, filtrando de manera aislada por Secretaría, Dirección o Unidad.',
    steps: [
      {
        title: '1. Selecciona tu Secretaría, Dirección o Unidad',
        description:
          'Utiliza los selectores superiores. Al elegir tu área, todos los gráficos, porcentajes y listas se actualizarán de forma instantánea para mostrar únicamente a tu equipo.',
      },
      {
        title: '2. Elige la Publicación o Período de evaluación',
        description:
          'Puedes evaluar el impacto de una publicación oficial específica o ver el rendimiento acumulado en el rango de fechas que desees.',
      },
      {
        title: '3. Interpreta los resultados gráficos',
        description:
          'El gráfico circular te muestra el porcentaje de cumplidos (verde), pendientes (amarillo) y sin registro (rojo). El gráfico de línea muestra a qué horas reaccionó tu personal.',
      },
      {
        title: '4. Revisa la tabla de personal de tu área',
        description:
          'Debajo de los gráficos verás la lista individual con el estado exacto de cada funcionario y el botón de acceso directo a su verificación.',
      },
    ],
    keyActions: [
      {
        label: 'Selector de Secretaría / Dirección',
        description: 'Filtra y aísla los datos para que no veas totales generales ajenos a tu oficina.',
      },
      {
        label: 'Selector de Publicación',
        description: 'Elige qué post oficial de la Alcaldía deseas auditar para ver quién cumplió.',
      },
    ],
    tips: [
      'Si eres Director o Encargado de Unidad, el sistema ya preselecciona automáticamente tu área asignada.',
      'Si un funcionario reaccionó pero no aparece en verde, ve a "Registro de Reacciones" para verificar o vincular su cuenta.',
    ],
  },
  {
    id: 'interactions',
    title: 'Registro y Verificación de Reacciones',
    badge: 'Validación Operativa',
    icon: MessageSquare,
    purpose:
      'Módulo operativo donde se revisan, cruzan y confirman una a una las reacciones (Me gusta, Me encanta, Compartidos, Comentarios) emitidas por los funcionarios públicos.',
    steps: [
      {
        title: '1. Selecciona la publicación que vas a fiscalizar',
        description:
          'En el selector superior, elige la publicación oficial de Facebook o TikTok cuyos comentarios o reacciones deseas revisar.',
      },
      {
        title: '2. Presiona "Sincronizar Reacciones"',
        description:
          'El sistema se conecta a la red social y descarga a todas las personas que interactuaron, cruzándolas automáticamente con la lista de funcionarios.',
      },
      {
        title: '3. Identifica a los funcionarios pendientes',
        description:
          'Filtra por "Pendientes" para ver quiénes aún no tienen confirmada su reacción en la publicación seleccionada.',
      },
      {
        title: '4. Realiza una Verificación Manual si es necesario',
        description:
          'Si un funcionario reaccionó desde un perfil con otro nombre o adjuntó una captura de prueba, haz clic en "Verificar Manualmente" y registra la confirmación.',
      },
    ],
    keyActions: [
      {
        label: 'Botón "Sincronizar Reacciones"',
        description: 'Ejecuta la descarga en vivo de las reacciones de la publicación desde Facebook/TikTok.',
      },
      {
        label: 'Botón "Verificar Manual"',
        description: 'Permite a un supervisor validar la interacción de un funcionario adjuntando justificativo o captura.',
      },
    ],
    tips: [
      'Facebook y TikTok tienen restricciones de privacidad en ciertos perfiles personales; por ello la verificación manual con captura es el método formal de respaldo.',
      'Una vez verificada una interacción, el porcentaje en "Analítica" subirá automáticamente.',
    ],
  },
  {
    id: 'publications',
    title: 'Publicaciones Oficiales Monitoreadas',
    badge: 'Catálogo de Campañas',
    icon: Radio,
    purpose:
      'Catálogo centralizado de todas las publicaciones, videos y transmisiones en vivo realizadas por las páginas institucionales del Gobierno Autónomo Municipal de El Alto.',
    steps: [
      {
        title: '1. Sincronizar las últimas publicaciones',
        description:
          'Haz clic en "Sincronizar desde Redes" para que el sistema descargue los posts y videos más recientes de las cuentas oficiales de GAMEA.',
      },
      {
        title: '2. Agregar una publicación manualmente',
        description:
          'Si una publicación es muy reciente y necesitas auditarla de inmediato, presiona "Registrar Publicación", pega el enlace (URL de Facebook o TikTok) y asígnale un nombre descriptivo.',
      },
      {
        title: '3. Activar o pausar la fiscalización',
        description:
          'Puedes definir qué publicaciones son campañas obligatorias de seguimiento y cuáles son publicaciones informativas estándar.',
      },
    ],
    keyActions: [
      {
        label: 'Botón "Sincronizar desde Redes"',
        description: 'Trae automáticamente las publicaciones nuevas de la página oficial de Facebook o TikTok.',
      },
      {
        label: 'Botón "Nueva Publicación Manual"',
        description: 'Permite registrar cualquier publicación oficial simplemente pegando su enlace web.',
      },
    ],
    tips: [
      'Asegúrate de que la fecha de la publicación sea correcta para que el cruce de horarios con el personal sea exacto.',
      'Puedes hacer clic en el enlace externo para abrir y ver la publicación real en Facebook o TikTok en una pestaña nueva.',
    ],
  },
  {
    id: 'employees',
    title: 'Padrón de Personal Municipal',
    badge: 'Gestión de Servidores',
    icon: Users,
    purpose:
      'Directorio oficial de todos los servidores públicos y personal de la Alcaldía organizados por Secretaría, Dirección y Unidad, con sus cuentas de redes sociales asociadas.',
    steps: [
      {
        title: '1. Cargar o actualizar el personal',
        description:
          'Para cargar muchos funcionarios de golpe, usa el botón "Importar Excel / CSV" con la plantilla oficial. Para registrar a uno solo, usa "Nuevo Funcionario".',
      },
      {
        title: '2. Asignar Secretaría y Dirección correctas',
        description:
          'Es vital que cada persona tenga seleccionada su área exacta para que sus estadísticas computen correctamente en los gráficos de su Director.',
      },
      {
        title: '3. Vincular las cuentas de redes sociales',
        description:
          'En el perfil del funcionario, ingresa su usuario o enlace de Facebook y TikTok. Esto permite que el sistema reconozca automáticamente cuando reaccione.',
      },
      {
        title: '4. Mantener la nómina al día',
        description:
          'Si un funcionario es reubicado o causa baja, actualiza su estado para no distorsionar las métricas de cumplimiento de su unidad.',
      },
    ],
    keyActions: [
      {
        label: 'Botón "Importar Nómina"',
        description: 'Carga masiva rápida de decenas o cientos de funcionarios mediante archivo Excel o CSV.',
      },
      {
        label: 'Botón "Nuevo Funcionario"',
        description: 'Formulario individual para registrar a un nuevo trabajador.',
      },
      {
        label: 'Botón "Vincular Red Social"',
        description: 'Asigna el perfil de Facebook o TikTok de la persona para lectura automática.',
      },
    ],
    tips: [
      'Descarga la "Plantilla de Ejemplo" antes de importar un archivo Excel para asegurar que las columnas coincidan.',
      'Los nombres de usuario de Facebook deben ser los identificadores públicos que aparecen al final del enlace del perfil.',
    ],
  },
  {
    id: 'reports',
    title: 'Reportes y Descargas Oficiales',
    badge: 'Informes Ejecutivos',
    icon: FileSpreadsheet,
    purpose:
      'Generación formal de reportes ejecutivos en PDF y Excel, foliados y estructurados para presentación ante la Máxima Autoridad Ejecutiva (MAE) y auditoría institucional.',
    steps: [
      {
        title: '1. Selecciona el Tipo de Informe',
        description:
          'Elige entre "Reporte de Cumplimiento por Dirección", "Evaluación de Campaña Específica" o "Consolidado Institucional Completo".',
      },
      {
        title: '2. Define los filtros de área y fecha',
        description:
          'Selecciona la Secretaría o Dirección que deseas reportar y el rango de fechas de corte para el informe.',
      },
      {
        title: '3. Genera y descarga el archivo',
        description:
          'Presiona "Generar Reporte". El documento se generará en segundos listo para descargar en formato Excel o PDF con formato institucional.',
      },
    ],
    keyActions: [
      {
        label: 'Botón "Generar Reporte"',
        description: 'Procesa las métricas actuales del período seleccionado y compila el documento oficial.',
      },
      {
        label: 'Botón "Descargar Excel / PDF"',
        description: 'Descarga en tu computadora el archivo generado listo para imprimir o enviar.',
      },
    ],
    tips: [
      'Todos los reportes llevan un código identificador único y fecha de emisión para garantizar que nadie pueda alterar los datos entregados.',
      'Antes de generar el reporte final, asegúrate de haber sincronizado las reacciones del día en "Registro de Reacciones".',
    ],
  },
  {
    id: 'admin',
    title: 'Configuración y Control de Acceso',
    badge: 'Administración del Sistema',
    icon: Settings,
    purpose:
      'Gestión de usuarios del sistema (cuentas de acceso de directores y operadores) y configuración de las credenciales de conexión con Facebook y TikTok.',
    steps: [
      {
        title: '1. Crear usuarios que accederán al sistema',
        description:
          'Haz clic en "Nuevo Usuario", ingresa su correo institucional y asígnale su rol (Director, Analista, Operador o Superadministrador).',
      },
      {
        title: '2. Delimitar el ámbito de trabajo',
        description:
          'Si el usuario es Director de Comunicación, asígnale esa Dirección para que el sistema solo le permita ver y gestionar a su personal correspondiente.',
      },
      {
        title: '3. Gestionar los Tokens de Redes Sociales',
        description:
          'En la pestaña "Conectores", puedes renovar el Token de Meta Graph API cuando expire para que la sincronización siga funcionando en vivo.',
      },
    ],
    keyActions: [
      {
        label: 'Pestaña "Usuarios"',
        description: 'Permite crear cuentas, cambiar contraseñas y habilitar o bloquear accesos.',
      },
      {
        label: 'Pestaña "Conectores"',
        description: 'Muestra el estado de las credenciales de Facebook y TikTok y permite actualizarlas.',
      },
    ],
    tips: [
      'Por seguridad, asigna siempre el rol más ajustado a cada persona: los Directores solo necesitan ver su área.',
      'Si un conector de Facebook expira, la pestaña muestra una guía sencilla de cómo generar el nuevo token en Meta for Developers.',
    ],
  },
  {
    id: 'audit',
    title: 'Registro Histórico de Acciones',
    badge: 'Seguridad y Transparencia',
    icon: ShieldAlert,
    purpose:
      'Bitácora inmutable de seguridad. Registra automáticamente cada inicio de sesión, cambio de datos, verificación manual y exportación de reporte para control y transparencia.',
    steps: [
      {
        title: '1. Supervisar ingresos y actividades recientes',
        description:
          'Revisa qué usuario del sistema realizó cada acción, desde qué fecha y hora, y qué registros fueron modificados.',
      },
      {
        title: '2. Filtrar por tipo de acción o usuario',
        description:
          'Puedes buscar acciones específicas como "Inicio de Sesión", "Verificación Manual" o "Exportación de Reporte" para responder a auditorías internas.',
      },
    ],
    keyActions: [
      {
        label: 'Filtro de Acciones',
        description: 'Permite buscar rápidamente por tipo de operación (Login, Creación, Verificación, Reporte).',
      },
      {
        label: 'Detalle de Registro',
        description: 'Muestra los datos antes y después de cada cambio realizado en el sistema.',
      },
    ],
    tips: [
      'Esta sección es de solo lectura; ningún usuario (ni siquiera el Administrador) puede borrar ni editar los registros de auditoría.',
      'Garantiza la total transparencia y tranquilidad en caso de requerimientos de la Unidad de Auditoría Interna.',
    ],
  },
];

export const SectionManualModal: React.FC<SectionManualModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'dashboard',
}) => {
  const [selectedId, setSelectedId] = useState<ActivePage | 'workflow'>(
    initialSection === 'matrix' || initialSection === 'monitoring-hub' ? 'analytics' : initialSection
  );

  if (!isOpen) return null;

  const currentSection =
    SECTIONS_DATA.find((s) => s.id === selectedId) || SECTIONS_DATA[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid var(--border-focus)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(31, 41, 55, 0.4) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)',
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Manual y Guía de Uso — GAMEA Social Monitor
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Conoce qué hace cada sección y los pasos exactos para trabajar sin dudas técnicas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Cerrar manual"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenedor Principal: Selector Lateral + Detalle de Sección */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Menú de Secciones a la Izquierda */}
          <div
            style={{
              width: '280px',
              borderRight: '1px solid var(--border-subtle)',
              background: 'rgba(10, 16, 30, 0.6)',
              overflowY: 'auto',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '6px 12px',
              }}
            >
              Las 8 Secciones del Sistema
            </div>

            {SECTIONS_DATA.map((sec) => {
              const IconComponent = sec.icon;
              const isSelected = sec.id === selectedId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedId(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                    background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    color: isSelected ? '#22d3ee' : 'var(--text-muted)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                >
                  <IconComponent size={18} color={isSelected ? '#06b6d4' : 'currentColor'} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sec.title}
                  </span>
                  {isSelected && <ChevronRight size={14} color="#06b6d4" />}
                </button>
              );
            })}

            {/* Pestaña Extra: Flujo de Trabajo Recomendado */}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setSelectedId('workflow')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: selectedId === 'workflow' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  background: selectedId === 'workflow' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: selectedId === 'workflow' ? '#34d399' : 'var(--text-muted)',
                  fontWeight: selectedId === 'workflow' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                <Sparkles size={18} color={selectedId === 'workflow' ? '#10b981' : 'currentColor'} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Flujo de Trabajo Recomendado</span>
              </button>
            </div>
          </div>

          {/* Área de Contenido Detallado a la Derecha */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {selectedId === 'workflow' ? (
              /* Flujo de Trabajo de 4 Pasos */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '8px',
                    }}
                  >
                    <Sparkles size={14} /> Guía Práctica de Inicio
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    ¿Cómo empezar a trabajar de principio a fin?
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    Sigue esta secuencia lógica para asegurar que todas las métricas de tu Secretaría o Dirección
                    estén completas y listas para reporte:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    {
                      step: 'Paso 1',
                      title: 'Padrón de Personal',
                      desc: 'Asegúrate de que tus funcionarios estén registrados con su Secretaría y Dirección asignadas y sus cuentas de Facebook/TikTok vinculadas.',
                      color: '#06b6d4',
                    },
                    {
                      step: 'Paso 2',
                      title: 'Publicaciones Oficiales',
                      desc: 'Confirma que la publicación oficial que quieres auditar esté cargada en el catálogo (presiona "Sincronizar desde Redes" o agrégala con su enlace).',
                      color: '#3b82f6',
                    },
                    {
                      step: 'Paso 3',
                      title: 'Registro de Reacciones',
                      desc: 'Ingresa a la publicación y haz clic en "Sincronizar Reacciones". El sistema cruzará automáticamente las reacciones con tu personal. Si alguien apoyó con otra cuenta, valídalo manualmente con captura.',
                      color: '#f59e0b',
                    },
                    {
                      step: 'Paso 4',
                      title: 'Analítica y Reportes',
                      desc: 'Entra a "Analítica" para ver los gráficos interactivos de tu área (aislados sin datos externos) y a "Reportes" para descargar la planilla oficial en Excel o PDF para tu jefatura.',
                      color: '#10b981',
                    },
                  ].map((wf, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '16px 18px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          background: `${wf.color}20`,
                          border: `1px solid ${wf.color}50`,
                          color: wf.color,
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {wf.step}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                          {wf.title}
                        </h4>
                        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                          {wf.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Vista de Sección Seleccionada */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Cabecera de la sección */}
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                      color: '#22d3ee',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '8px',
                    }}
                  >
                    {currentSection.badge}
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {currentSection.title}
                  </h3>
                  <div
                    style={{
                      background: 'rgba(6, 182, 212, 0.06)',
                      borderLeft: '4px solid var(--primary-500)',
                      padding: '12px 16px',
                      borderRadius: '0 8px 8px 0',
                      marginTop: '12px',
                    }}
                  >
                    <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0, lineHeight: 1.55 }}>
                      <strong>¿Para qué sirve?</strong> {currentSection.purpose}
                    </p>
                  </div>
                </div>

                {/* Pasos a seguir (Qué tienes que hacer aquí) */}
                <div>
                  <h4
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={18} color="#10b981" />
                    ¿Qué tienes que hacer en esta sección? (Paso a Paso)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentSection.steps.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8', marginBottom: '3px' }}>
                          {st.title}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {st.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones y Acciones Clave */}
                <div>
                  <h4
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Zap size={18} color="#f59e0b" />
                    Botones y Funciones Principales
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {currentSection.keyActions.map((ka, kaIdx) => (
                      <div
                        key={kaIdx}
                        style={{
                          background: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginBottom: '2px' }}>
                          {ka.label}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {ka.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consejos Clave */}
                <div
                  style={{
                    background: 'rgba(31, 41, 55, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Info size={16} color="#06b6d4" />
                    Consejos y Respuestas a Dudas Frecuentes
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentSection.tips.map((tip, tIdx) => (
                      <li key={tIdx} style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(10, 16, 30, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            💡 Puedes abrir este manual en cualquier momento presionando el botón <strong>"Manual de Uso"</strong> en la cabecera.
          </div>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
