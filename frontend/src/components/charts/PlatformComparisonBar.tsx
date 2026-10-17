import React from 'react';
import { PlatformComparison } from '../../api/analytics';
import { useAnimatedNumber } from '../../utils/useAnimatedNumber';
import { MessageSquare, Share2 } from 'lucide-react';

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
  const fbPctRaw = total > 0 ? (fb.total_reactions / total) * 100 : 50;
  const ttPctRaw = total > 0 ? (tt.total_reactions / total) * 100 : 50;

  const animFb = useAnimatedNumber(fb.total_reactions, 600);
  const animTt = useAnimatedNumber(tt.total_reactions, 600);
  const animFbPct = useAnimatedNumber(fbPctRaw, 600, 1);
  const animTtPct = useAnimatedNumber(ttPctRaw, 600, 1);

  const normSelected = (selectedPlatform || 'ALL').toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Tarjetas Bilaterales Interactivas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {/* Facebook Card */}
        <div
          onClick={() => {
            if (onSelectPlatform) {
              onSelectPlatform(normSelected === 'FACEBOOK' ? null : 'FACEBOOK');
            }
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            border: normSelected === 'FACEBOOK'
              ? '1px solid #3b82f6'
              : '1px solid rgba(255, 255, 255, 0.08)',
            background: normSelected === 'FACEBOOK'
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
              : 'rgba(17, 24, 39, 0.55)',
            boxShadow: normSelected === 'FACEBOOK' ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.22s ease',
            transform: normSelected === 'FACEBOOK' ? 'scale(1.01)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'rgba(24, 119, 242, 0.25)',
                  border: '1px solid rgba(24, 119, 242, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1877F2',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                }}
              >
                f
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>Facebook</span>
            </div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {animFbPct}%
            </span>
          </div>

          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {animFb.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MessageSquare size={11} color="#34d399" /> {fb.total_comments} coment.
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Share2 size={11} color="#60a5fa" /> {fb.total_shares} comp.
            </span>
          </div>
        </div>

        {/* TikTok Card */}
        <div
          onClick={() => {
            if (onSelectPlatform) {
              onSelectPlatform(normSelected === 'TIKTOK' ? null : 'TIKTOK');
            }
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            border: normSelected === 'TIKTOK'
              ? '1px solid #f43f5e'
              : '1px solid rgba(255, 255, 255, 0.08)',
            background: normSelected === 'TIKTOK'
              ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
              : 'rgba(17, 24, 39, 0.55)',
            boxShadow: normSelected === 'TIKTOK' ? '0 0 20px rgba(244, 63, 94, 0.3)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.22s ease',
            transform: normSelected === 'TIKTOK' ? 'scale(1.01)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.3) 0%, rgba(0, 242, 254, 0.3) 100%)',
                  border: '1px solid rgba(254, 44, 85, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f43f5e',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                }}
              >
                ♪
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>TikTok</span>
            </div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#f472b6',
                background: 'rgba(244, 63, 94, 0.15)',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              {animTtPct}%
            </span>
          </div>

          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {animTt.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MessageSquare size={11} color="#34d399" /> {tt.total_comments} coment.
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Share2 size={11} color="#f472b6" /> {tt.total_shares} comp.
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Distribución Proporcional */}
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
              width: `${fbPctRaw}%`,
              background: 'linear-gradient(90deg, #1877F2 0%, #3b82f6 100%)',
              borderTopLeftRadius: '9999px',
              borderBottomLeftRadius: '9999px',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`Facebook: ${fb.total_reactions} (${fbPctRaw.toFixed(1)}%)`}
          />
          <div
            style={{
              height: '100%',
              width: `${ttPctRaw}%`,
              background: 'linear-gradient(90deg, #00f2fe 0%, #fe2c55 100%)',
              borderTopRightRadius: '9999px',
              borderBottomRightRadius: '9999px',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title={`TikTok: ${tt.total_reactions} (${ttPctRaw.toFixed(1)}%)`}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 2px' }}>
          <span>{fb.total_reactions.toLocaleString()} reacciones FB</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>Clic en una red para filtrar</span>
          <span>{tt.total_reactions.toLocaleString()} reacciones TT</span>
        </div>
      </div>
    </div>
  );
};

export default PlatformComparisonBar;
