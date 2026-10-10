import React from 'react';
import { PlatformComparison } from '../../api/analytics';

interface PlatformComparisonBarProps {
  comparison: PlatformComparison;
  onSelectPlatform?: (platform: string | null) => void;
  selectedPlatform?: string | null;
}

export const PlatformComparisonBar: React.FC<PlatformComparisonBarProps> = ({
  comparison,
  onSelectPlatform,
  selectedPlatform,
}) => {
  const fb = comparison.facebook;
  const tt = comparison.tiktok;

  const total = fb.total_reactions + tt.total_reactions;
  const fbPct = total > 0 ? (fb.total_reactions / total) * 100 : 50;
  const ttPct = total > 0 ? (tt.total_reactions / total) * 100 : 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Tarjetas Bilaterales Interactivas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {/* Facebook Card */}
        <div
          onClick={() => {
            if (onSelectPlatform) {
              onSelectPlatform(selectedPlatform === 'FACEBOOK' ? null : 'FACEBOOK');
            }
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            border: selectedPlatform === 'FACEBOOK'
              ? '1px solid #3b82f6'
              : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedPlatform === 'FACEBOOK'
              ? 'rgba(59, 130, 246, 0.15)'
              : 'rgba(17, 24, 39, 0.55)',
            boxShadow: selectedPlatform === 'FACEBOOK' ? '0 0 18px rgba(59, 130, 246, 0.25)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(24, 119, 242, 0.2)',
                  border: '1px solid rgba(24, 119, 242, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1877F2',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                }}
              >
                f
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Facebook</span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#60a5fa' }}>{fbPct.toFixed(1)}%</span>
          </div>

          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {fb.total_reactions.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{fb.total_comments} coment.</span>
            <span>•</span>
            <span>{fb.total_shares} comp.</span>
          </div>
        </div>

        {/* TikTok Card */}
        <div
          onClick={() => {
            if (onSelectPlatform) {
              onSelectPlatform(selectedPlatform === 'TIKTOK' ? null : 'TIKTOK');
            }
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            border: selectedPlatform === 'TIKTOK'
              ? '1px solid #f43f5e'
              : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedPlatform === 'TIKTOK'
              ? 'rgba(244, 63, 94, 0.15)'
              : 'rgba(17, 24, 39, 0.55)',
            boxShadow: selectedPlatform === 'TIKTOK' ? '0 0 18px rgba(244, 63, 94, 0.25)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.25) 0%, rgba(0, 242, 254, 0.25) 100%)',
                  border: '1px solid rgba(254, 44, 85, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f43f5e',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                }}
              >
                ♪
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>TikTok</span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f472b6' }}>{ttPct.toFixed(1)}%</span>
          </div>

          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {tt.total_reactions.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{tt.total_comments} coment.</span>
            <span>•</span>
            <span>{tt.total_shares} comp.</span>
          </div>
        </div>
      </div>

      {/* Barra Proporcional Dividida */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        <div
          style={{
            width: '100%',
            height: '10px',
            background: 'rgba(11, 15, 25, 0.9)',
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex',
            padding: '1px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${fbPct}%`,
              background: 'linear-gradient(90deg, #1877F2 0%, #3b82f6 100%)',
              borderTopLeftRadius: '9999px',
              borderBottomLeftRadius: '9999px',
              transition: 'width 0.4s ease',
            }}
            title={`Facebook: ${fb.total_reactions} (${fbPct.toFixed(1)}%)`}
          />
          <div
            style={{
              height: '100%',
              width: `${ttPct}%`,
              background: 'linear-gradient(90deg, #00f2fe 0%, #fe2c55 100%)',
              borderTopRightRadius: '9999px',
              borderBottomRightRadius: '9999px',
              transition: 'width 0.4s ease',
            }}
            title={`TikTok: ${tt.total_reactions} (${ttPct.toFixed(1)}%)`}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 2px' }}>
          <span>{fb.total_reactions} reacciones FB</span>
          <span>{tt.total_reactions} reacciones TT</span>
        </div>
      </div>
    </div>
  );
};
