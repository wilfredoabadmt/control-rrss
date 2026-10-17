import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ActivePage } from './Sidebar';

interface SectionGuideBannerProps {
  activePage: ActivePage;
  onOpenManual: () => void;
}

interface QuickGuide {
  summary: string;
  actionBullets: string[];
}

const QUICK_GUIDES: Record<string, QuickGuide> = {
  dashboard: {
    summary: 'Tablero de supervisión general del sistema en tiempo real.',
    actionBullets: [
      'Verifica que los conectores de Facebook y TikTok indiquen estado verde ONLINE.',
      'Supervisa el acumulado de publicaciones y reacciones registradas.',
      'Consulta las últimas sincronizaciones ejecutadas por el servidor.',
    ],
  },
  analytics: {
    summary: 'Métricas y gráficos interactivos de cumplimiento por área.',
    actionBullets: [
      'Usa los filtros superiores para seleccionar tu Secretaría, Dirección o Unidad.',
      'Elige la publicación o rango de fechas que deseas evaluar.',
      'Revisa el porcentaje de personal que ha cumplido y quiénes tienen reacciones pendientes.',
    ],
  },
  interactions: {
    summary: 'Centro operativo para buscar, cruzar y confirmar reacciones en publicaciones.',
    actionBullets: [
      'Elige la publicación oficial que vas a auditar.',
      'Haz clic en "Sincronizar Reacciones" para descargar las interacciones en vivo.',
      'Si un funcionario usó otra cuenta personal, presiona "Verificar Manualmente" con captura.',
    ],
  },
  publications: {
    summary: 'Catálogo de publicaciones oficiales de las páginas de GAMEA.',
    actionBullets: [
      'Presiona "Sincronizar desde Redes" para traer las últimas publicaciones institucionales.',
      'Si una publicación no aparece, regístrala manualmente pegando su enlace directo (URL).',
      'Activa o pausa el monitoreo según las campañas de tu interés.',
    ],
  },
  employees: {
    summary: 'Padrón oficial del personal municipal organizado por Secretaría y Dirección.',
    actionBullets: [
      'Usa "Importar Excel / CSV" para cargar la nómina de tu área en segundos.',
      'Asegúrate de que cada persona tenga asignada su Secretaría y Dirección correctas.',
      'Vincula los perfiles de Facebook y TikTok de cada funcionario para cruce automático.',
    ],
  },
  reports: {
    summary: 'Generación formal de informes ejecutivos foliados en PDF y Excel.',
    actionBullets: [
      'Elige el tipo de reporte (por Dirección, por Campaña o Consolidado General).',
      'Define el rango de fechas de corte que necesitas entregar.',
      'Presiona "Generar Reporte" y descárgalo con firmas y membrete oficial.',
    ],
  },
  admin: {
    summary: 'Control de cuentas de usuario del sistema y credenciales de redes sociales.',
    actionBullets: [
      'Crea las cuentas de acceso de Directores y Analistas asignándoles su área de trabajo.',
      'En la pestaña "Conectores", renueva los Tokens de Facebook Graph API cuando expiren.',
      'Supervisa la asignación de roles y permisos de acceso al sistema.',
    ],
  },
  audit: {
    summary: 'Libro de actas digital inmutable para control y transparencia institucional.',
    actionBullets: [
      'Supervisa el historial cronológico de quién inició sesión y qué datos modificó.',
      'Filtra por tipo de acción (login, verificación manual, exportación de reportes).',
      'Registros de solo lectura protegidos ante auditorías internas.',
    ],
  },
};

export const SectionGuideBanner: React.FC<SectionGuideBannerProps> = ({
  activePage,
  onOpenManual,
}) => {
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
          <span>¿Qué debo hacer en esta sección? (Mostrar guía rápida)</span>
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
        padding: '14px 18px',
        marginBottom: '22px',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
            }}
          >
            <Sparkles size={15} />
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
            Guía de Acción Rápida: {guide.summary}
          </span>
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
            title="Ver manual y explicación detallada"
          >
            <BookOpen size={14} />
            <span>Ver Manual Completo</span>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '8px',
          marginTop: '6px',
        }}
      >
        {guide.actionBullets.map((bullet, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.82rem',
              color: '#cbd5e1',
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.2)',
                color: '#22d3ee',
                fontSize: '0.72rem',
                fontWeight: 700,
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
