import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { ActivePage } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface SectionGuideBannerProps {
  activePage: ActivePage;
  onOpenManual: () => void;
}

type RolePerspective = 'general' | 'superadmin' | 'director' | 'operator';

interface RoleAdvice {
  general: string[];
  superadmin: string[];
  director: string[];
  operator: string[];
}

interface QuickGuide {
  summary: string;
  roleAdvice: RoleAdvice;
}

const QUICK_GUIDES: Record<string, QuickGuide> = {
  dashboard: {
    summary: 'Tablero de supervisión general del sistema en tiempo real.',
    roleAdvice: {
      general: [
        'Verifica que los conectores de Facebook y TikTok indiquen estado verde ONLINE.',
        'Supervisa el acumulado de publicaciones y reacciones registradas en el día.',
        'Consulta las últimas sincronizaciones ejecutadas por el servidor.',
      ],
      superadmin: [
        'Comprueba el estado de salud de los adaptadores de Meta y TikTok.',
        'Si un conector dice "TOKEN EXPIRADO", ve a Configuración para renovar la clave.',
        'Supervisa que los workers automáticos no tengan errores en la tabla inferior.',
      ],
      director: [
        'Verifica que el sistema esté en línea antes de revisar los datos de tu dirección.',
        'Para ver el cumplimiento de tu equipo, pasa directamente a "Analítica y Cumplimiento".',
        'Revisa el total de publicaciones monitoreadas en la gestión actual.',
      ],
      operator: [
        'Comprueba que el conector de la red social correspondiente esté activo.',
        'Usa el botón "Refrescar" para confirmar que la base de datos esté al día.',
        'Monitorea el contador de "Revisiones Pendientes" para saber cuánto trabajo hay por validar.',
      ],
    },
  },
  'mae-dashboard': {
    summary: 'Tablero de Decisiones Estratégicas exclusivo de la MAE (Alcaldesa) y Despacho.',
    roleAdvice: {
      general: [
        'Evalúa la Tasa Global de Compromiso de todo el municipio (Meta Institucional: 80%).',
        'Revisa el Semáforo de Secretarías: identifica qué despachos están en rojo (< 45%).',
        'Presiona "Instruir Notificación" para generar y enviar la llamada de atención formal.',
      ],
      superadmin: [
        'Garantiza que todas las direcciones tengan sus métricas debidamente procesadas para la MAE.',
        'Supervisa que las clasificaciones del semáforo reflejen fielmente la nómina municipal.',
        'Apoya a Despacho en la exportación o impresión del informe de gabinete.',
      ],
      director: [
        'Este panel es de acceso reservado para la MAE y el Super Administrador.',
        'Tu dirección será evaluada aquí en las reuniones semanales de gabinete.',
        'Mantén tu cumplimiento por encima del 75% en "Analítica" para figurar en verde.',
      ],
      operator: [
        'Acceso reservado a la Máxima Autoridad Ejecutiva.',
        'Tu labor de verificación en "Reacciones" alimenta en tiempo real este tablero.',
        'Valida oportunamente las reacciones de tu área para que no aparezca rezagada.',
      ],
    },
  },
  analytics: {
    summary: 'Métricas y gráficos interactivos de cumplimiento aislados por área.',
    roleAdvice: {
      general: [
        'Usa los filtros superiores para seleccionar tu Secretaría, Dirección o Unidad.',
        'Elige la publicación o rango de fechas que deseas evaluar.',
        'Revisa el porcentaje de personal que ha cumplido y quiénes tienen reacciones pendientes.',
      ],
      superadmin: [
        'Puedes alternar entre cualquier Secretaría o Dirección para auditar a los directores.',
        'Comprueba que no existan funcionarios sin área asignada para no distorsionar las métricas.',
        'Exporta la sábana consolidada en Excel para auditorías o informes generales.',
      ],
      director: [
        'El sistema selecciona automáticamente tu dirección para mostrar solo a tu gente.',
        'Revisa la lista inferior: identifica a los funcionarios en rojo (pendientes de reacción).',
        'Convoca a tu personal rezagado antes del corte de gabinete para elevar tu porcentaje.',
      ],
      operator: [
        'Verifica que las reacciones que validaste manualmente ya figuren como cumplidas (verde).',
        'Filtra por publicaciones específicas para confirmar el avance de cada campaña.',
        'Usa el botón de acceso directo junto a cada funcionario para revisar su caso.',
      ],
    },
  },
  interactions: {
    summary: 'Centro operativo para buscar, cruzar y confirmar reacciones en publicaciones.',
    roleAdvice: {
      general: [
        'Elige la publicación oficial que vas a auditar en el menú superior.',
        'Haz clic en "Sincronizar Reacciones" para descargar las interacciones en vivo.',
        'Si un funcionario usó otra cuenta personal, presiona "Verificar Manualmente" con captura.',
      ],
      superadmin: [
        'Supervisa las sincronizaciones masivas de comentarios y reacciones.',
        'Audita las verificaciones manuales aprobadas para mantener la integridad de la nómina.',
        'Revisa publicaciones con alto volumen de interacciones ciudadanas vs institucionales.',
      ],
      director: [
        'Selecciona la publicación institucional de la campaña del día.',
        'Filtra por tu dirección para revisar quién de tu personal ya reaccionó.',
        'Si un funcionario tuyo reaccionó con cuenta familiar o apodo, valida su captura aquí.',
      ],
      operator: [
        'Presiona "Sincronizar Reacciones" para actualizar la lista desde Facebook o TikTok.',
        'Busca al personal por nombre o CI y haz clic en "Verificar Manualmente" si tienen captura.',
        'Adjunta el respaldo o motivo formal para que quede registrado en auditoría.',
      ],
    },
  },
  publications: {
    summary: 'Catálogo de publicaciones oficiales de las páginas de GAMEA.',
    roleAdvice: {
      general: [
        'Presiona "Sincronizar desde Redes" para traer las últimas publicaciones institucionales.',
        'Si una publicación no aparece, regístrala manualmente pegando su enlace directo (URL).',
        'Activa o pausa el monitoreo según las campañas de tu interés.',
      ],
      superadmin: [
        'Verifica que el Webhook o Scraper de Facebook y TikTok descargue los posts del día.',
        'Asigna nombres claros de campaña a las publicaciones para facilitar el trabajo de los directores.',
        'Desactiva el monitoreo en posts informativos menores que no requieran fiscalización.',
      ],
      director: [
        'Revisa las publicaciones oficiales prioritarias lanzadas por la Dirección de Comunicación.',
        'Haz clic en el enlace para abrir la publicación en Facebook o TikTok y compartirla.',
        'Haz clic en "Ver Reacciones" para fiscalizar directamente la participación en ese post.',
      ],
      operator: [
        'Si Comunicación emite un post urgente, presiona "Nueva Publicación" y pega la URL.',
        'Verifica que la fecha y hora de la publicación coincidan con el lanzamiento oficial.',
        'Comprueba que el identificador del post sea válido antes de activar la sincronización.',
      ],
    },
  },
  employees: {
    summary: 'Padrón oficial del personal municipal organizado por Secretaría y Dirección.',
    roleAdvice: {
      general: [
        'Usa "Importar Excel / CSV" para cargar la nómina de tu área en segundos.',
        'Asegúrate de que cada persona tenga asignada su Secretaría y Dirección correctas.',
        'Vincula los perfiles de Facebook y TikTok de cada funcionario para cruce automático.',
      ],
      superadmin: [
        'Sube la nómina maestra institucional descargada de Recursos Humanos mediante Excel.',
        'Verifica que todas las Secretarías y Direcciones concuerden con el organigrama municipal.',
        'Revisa que los directores tengan bien asignada su área para restringir su vista.',
      ],
      director: [
        'Verifica la lista de funcionarios de tu dirección; si falta alguien, agrégalo con "Nuevo Funcionario".',
        'Asegúrate de que tus dependientes registren su usuario de Facebook o TikTok.',
        'Si un trabajador fue reubicado o causó baja, actualiza su estado a inactivo.',
      ],
      operator: [
        'Edita los perfiles del personal para añadir su enlace o ID de Facebook / TikTok.',
        'Descarga la plantilla de ejemplo antes de importar listas en lote.',
        'Busca funcionarios por cédula de identidad para verificar que no existan duplicados.',
      ],
    },
  },
  reports: {
    summary: 'Generación formal de informes ejecutivos foliados en PDF y Excel.',
    roleAdvice: {
      general: [
        'Elige el tipo de reporte (por Dirección, por Campaña o Consolidado General).',
        'Define el rango de fechas de corte que necesitas entregar.',
        'Presiona "Generar Reporte" y descárgalo con firmas y membrete oficial.',
      ],
      superadmin: [
        'Genera los consolidados generales de todo el municipio para el informe mensual.',
        'Verifica la integridad de los reportes emitidos y su foliado institucional.',
        'Facilita a las unidades de Auditoría Interna los informes con respaldo digital.',
      ],
      director: [
        'Genera el informe semanal de cumplimiento exclusivo de tu Secretaría o Dirección.',
        'Descárgalo en PDF listo para imprimir y firmar para la reunión de gabinete.',
        'Adjunta la planilla Excel como respaldo ante la Dirección de Comunicación o MAE.',
      ],
      operator: [
        'Antes de generar el informe, asegúrate de haber sincronizado todas las reacciones del día.',
        'Verifica que el rango de fechas abarque exactamente el período solicitado por tu jefe.',
        'Descarga el archivo y archívalo en la carpeta de respaldos de tu unidad.',
      ],
    },
  },
  admin: {
    summary: 'Control de cuentas de usuario del sistema y credenciales de redes sociales.',
    roleAdvice: {
      general: [
        'Crea las cuentas de acceso de Directores y Analistas asignándoles su área de trabajo.',
        'En la pestaña "Conectores", renueva los Tokens de Facebook Graph API cuando expiren.',
        'Supervisa la asignación de roles y permisos de acceso al sistema.',
      ],
      superadmin: [
        'Crea a los usuarios directores y define su secretaría o dirección en "Ámbito Asignado".',
        'En la pestaña "Conectores", renueva el Token de Facebook con la guía de desarrollador.',
        'Administra los cambios de contraseña y bloqueos preventivos por seguridad.',
      ],
      director: [
        'En esta sección puedes ver los conectores activos y tus datos de cuenta.',
        'Si necesitas que un analista de tu oficina tenga acceso, solicítalo al Super Admin.',
        'Comprueba que tu usuario tenga asignada correctamente tu Dirección oficial.',
      ],
      operator: [
        'Consulta el estado de las credenciales de Facebook y TikTok.',
        'Si un token expira, notifica al Super Administrador para su renovación inmediata.',
        'Verifica que tus permisos de operador te permitan registrar verificaciones.',
      ],
    },
  },
  audit: {
    summary: 'Libro de actas digital inmutable para control y transparencia institucional.',
    roleAdvice: {
      general: [
        'Supervisa el historial cronológico de quién inició sesión y qué datos modificó.',
        'Filtra por tipo de acción (login, verificación manual, exportación de reportes).',
        'Registros de solo lectura protegidos ante auditorías internas.',
      ],
      superadmin: [
        'Monitorea intentos fallidos de inicio de sesión para prevenir accesos no autorizados.',
        'Supervisa quién exportó reportes oficiales y qué directores validaron reacciones manuales.',
        'Utiliza este registro como respaldo legal ante requerimientos de transparencia.',
      ],
      director: [
        'Comprueba que las verificaciones manuales enviadas por tu equipo figuren registradas.',
        'Verifica la fecha y hora exacta en que se emitieron los reportes de tu área.',
        'Esta sección respalda formalmente que ninguna métrica fue alterada sin registro.',
      ],
      operator: [
        'Consulta tus propias acciones recientes para confirmar que tus cargas se guardaron.',
        'Los registros son permanentes; asegúrate de adjuntar motivos claros al verificar.',
        'No es posible borrar registros en esta sección por mandato de transparencia.',
      ],
    },
  },
};

export const SectionGuideBanner: React.FC<SectionGuideBannerProps> = ({
  activePage,
  onOpenManual,
}) => {
  const { user } = useAuth();

  // Determinar perspectiva inicial según el rol del usuario autenticado
  const initialPerspective: RolePerspective = (() => {
    if (user?.roles?.includes(UserRole.SUPER_ADMIN)) return 'superadmin';
    if (user?.roles?.includes(UserRole.DIRECTOR) || user?.roles?.includes(UserRole.COMMUNICATIONS_LEAD)) return 'director';
    if (user?.roles?.includes(UserRole.OPERATOR) || user?.roles?.includes(UserRole.ANALYST)) return 'operator';
    return 'general';
  })();

  const [perspective, setPerspective] = useState<RolePerspective>(initialPerspective);

  // Normalizar ids legacy
  const normalizedPage =
    activePage === 'matrix' || activePage === 'monitoring-hub' ? 'analytics' : activePage;

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gamea_guide_banner_expanded');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gamea_guide_banner_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const guide = QUICK_GUIDES[normalizedPage] || QUICK_GUIDES.dashboard;
  const currentBullets = guide.roleAdvice[perspective] || guide.roleAdvice.general;

  if (!isExpanded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '10px',
          padding: '8px 16px',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={toggleExpanded}
          style={{
            background: 'none',
            border: 'none',
            color: '#22d3ee',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <HelpCircle size={16} />
          <span>¿Qué debo hacer en esta sección? (Mostrar guía paso a paso)</span>
          <ChevronDown size={14} />
        </button>

        <button
          onClick={onOpenManual}
          style={{
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '6px',
            color: '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <BookOpen size={13} />
          <span>Manual Completo</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(17, 24, 39, 0.9) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        borderLeft: '4px solid #06b6d4',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '22px',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Cabecera del Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
              Guía de Acción: {guide.summary}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: '1px' }}>
              Elige tu rol para ver exactamente qué debes hacer en esta pantalla
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenManual}
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '7px',
              color: '#22d3ee',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Ver manual y explicación detallada de las 8 secciones"
          >
            <BookOpen size={14} />
            <span>Manual del Sistema</span>
          </button>

          <button
            onClick={toggleExpanded}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 500,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Ocultar resumen"
          >
            <ChevronUp size={14} />
            <span>Ocultar</span>
          </button>
        </div>
      </div>

      {/* Selector de Perspectiva por Rol */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'general', label: 'Guía General', icon: HelpCircle },
          { id: 'superadmin', label: '⚡ Como Super Admin', icon: Zap },
          { id: 'director', label: '🏛️ Como Director / Jefe', icon: UserCheck },
          { id: 'operator', label: '✍️ Como Operador / Analista', icon: Users },
        ].map((tab) => {
          const isCurrent = perspective === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPerspective(tab.id as RolePerspective)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isCurrent ? 'var(--primary-500)' : 'transparent',
                color: isCurrent ? '#fff' : 'var(--text-muted)',
                fontWeight: isCurrent ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de Acciones según el Rol */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '8px',
        }}
      >
        {currentBullets.map((bullet, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.83rem',
              color: '#e2e8f0',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background:
                  perspective === 'superadmin'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : perspective === 'director'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(6, 182, 212, 0.2)',
                color:
                  perspective === 'superadmin'
                    ? '#fbbf24'
                    : perspective === 'director'
                    ? '#60a5fa'
                    : '#22d3ee',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              {idx + 1}
            </span>
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
