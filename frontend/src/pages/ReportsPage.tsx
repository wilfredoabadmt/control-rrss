import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Shield
} from 'lucide-react';
import {
  ReportExecutionItem,
  generateReportApi,
  listReportExecutionsApi
} from '../api/reports';
import { formatReportType } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const [executions, setExecutions] = useState<ReportExecutionItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [lastGeneratedHash, setLastGeneratedHash] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const res = await listReportExecutionsApi();
      setExecutions(res || []);
    } catch {
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setLastGeneratedHash(null);
    setReportError(null);

    try {
      const { blob, filename, sha256 } = await generateReportApi({
        report_type: 'VERIFICATION_STATUS',
        campaign_title: campaignTitle || undefined,
      });

      // Crear link y descargar archivo en el navegador
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setLastGeneratedHash(sha256 || null);
      fetchExecutions();
    } catch (err: any) {
      console.error(err);
      setReportError(err.response?.data?.detail || err.message || 'Error al generar el reporte oficial.');
    } finally {
      setGenerating(false);
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
          marginBottom: '28px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
            Generación & Custodia de Reportes Oficiales
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Principio XXIV: Reportes Oficiales Reproducibles con Hash SHA-256 Inmutable
          </p>
        </div>

        <button
          onClick={fetchExecutions}
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
          <span>Actualizar Historial</span>
        </button>
      </div>

      {/* Banner Principio XXVII */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '28px',
          borderLeft: '4px solid #06b6d4',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <Shield size={24} color="#06b6d4" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: '#fff' }}>Garantía Constitucional en Reportes:</strong> Todo reporte generado incluye
          automáticamente la hoja de metadatos metodológicos y el descargo formal de prohibición de rankings de
          funcionarios (Principio XXVII).
        </div>
      </div>

      {/* Formulario de Generación */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <FileSpreadsheet size={22} color="#10b981" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>
            Generar Nuevo Reporte Excel (.xlsx)
          </h3>
        </div>

        <form onSubmit={handleGenerateReport}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Filtro por Campaña Institucional</label>
              <input
                type="text"
                className="form-input"
                placeholder="Dejar vacío para reporte consolidado general"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Formato de Exportación</label>
              <input
                type="text"
                className="form-input"
                disabled
                value="Microsoft Excel OpenXML (.xlsx) — Multihoja Firmado"
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={generating}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              {generating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Calculando Criptografía SHA-256...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Generar & Descargar Reporte Oficial</span>
                </>
              )}
            </button>
          </div>
        </form>

        {lastGeneratedHash && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px 18px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <CheckCircle size={20} color="#34d399" />
            <div style={{ fontSize: '0.85rem' }}>
              <strong style={{ color: '#34d399' }}>Reporte generado exitosamente con firma criptográfica:</strong>
              <div style={{ fontFamily: 'monospace', color: '#fff', marginTop: '2px', wordBreak: 'break-all' }}>
                SHA-256: {lastGeneratedHash}
              </div>
            </div>
          </div>
        )}

        {reportError && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#f87171',
              fontSize: '0.85rem',
            }}
          >
            <strong>Aviso del Sistema:</strong> {reportError}
          </div>
        )}
      </div>

      {/* Historial de Reportes Generados */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>
        Custodia de Ejecuciones de Reporte (Audit Trail)
      </h3>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '14px 20px' }}>TIPO DE REPORTE</th>
                <th style={{ padding: '14px 20px' }}>FILTROS / CAMPAÑA</th>
                <th style={{ padding: '14px 20px' }}>REGISTROS</th>
                <th style={{ padding: '14px 20px' }}>FIRMA DIGITAL (SHA-256)</th>
                <th style={{ padding: '14px 20px' }}>FECHA (UTC)</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {executions.map((exec) => (
                <tr key={exec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#fff' }}>{formatReportType(exec.report_type)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                      Versión: {exec.report_version}
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {exec.parameters?.campaign || 'General'}
                  </td>

                  <td style={{ padding: '14px 20px', color: '#fff', fontWeight: '500' }}>
                    {exec.row_count} filas
                  </td>

                  <td style={{ padding: '14px 20px', maxWidth: '260px' }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--primary-500)',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={exec.file_hash}
                    >
                      {exec.file_hash}
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', color: 'var(--text-faint)' }}>
                    {new Date(exec.generated_at).toLocaleString()}
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <span className="badge badge-success">CERTIFICADO</span>
                  </td>
                </tr>
              ))}

              {executions.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se registran reportes oficiales generados previamente en la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
