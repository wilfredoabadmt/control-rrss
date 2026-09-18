import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Database,
  Facebook,
  Layers,
  LogOut,
  Radio,
  Users
} from 'lucide-react';
import axios from 'axios';

interface DashboardPageProps {
  onLogout?: () => void;
}

interface SystemHealth {
  status: string;
  checks?: {
    postgres?: { status: string };
    redis?: { status: string };
  };
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    // Consulta periódica o inicial al health endpoint
    axios.get('/health/liveness')
      .then(res => setHealth(res.data))
      .catch(() => setHealth({ status: 'LOCAL_DEV' }));
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Institucional */}
      <header style={{
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>GAMEA Social Monitor</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Panel de Control & Analítica</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="badge badge-success" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            Sistema {health?.status || 'ONLINE'}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Banner de Estado Fundación */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>
                Fase 0 — Fundación Inicial Desplegada
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                FastAPI, PostgreSQL 16, Celery & Redis, React 18+ y Arquitectura Modular Monolith en operación.
              </p>
            </div>
            <span className="badge badge-info">Fase 0: Aprobada</span>
          </div>
        </div>

        {/* Métricas / Cards de Monitoreo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem' }}>Funcionarios Registrados</span>
              <Users size={20} color="#06b6d4" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>0</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Pendiente importación nómina (Fase 2)</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem' }}>Publicaciones Monitoreadas</span>
              <BarChart3 size={20} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>0</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Meta & TikTok adapters (Fase 3 & 4)</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem' }}>Interacciones Capturadas</span>
              <Activity size={20} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>0</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Idempotencia estricta activa</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem' }}>Sincronización Celery</span>
              <Radio size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>Activo</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Workers en espera de tareas</div>
          </div>
        </div>

        {/* Adaptadores y Conectores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Facebook size={22} color="#1877f2" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>Conector Facebook / Meta</h4>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
              Graph API v20.0 y Webhooks con validación SHA-256 HMAC según Principio XI.
            </p>
            <span className="badge badge-info">Adaptador Configurado</span>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Database size={22} color="#06b6d4" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>Base de Datos PostgreSQL</h4>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
              PostgreSQL 16 con extensiones UUID, auditoría append-only y Alembic migrations.
            </p>
            <span className="badge badge-success" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
              <CheckCircle2 size={14} /> Listo para migraciones
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
