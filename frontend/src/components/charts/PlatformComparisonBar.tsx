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
    <div className="w-full space-y-4">
      {/* Tarjetas Bilaterales Interactivas */}
      <div className="grid grid-cols-2 gap-3">
        {/* Facebook Card */}
        <div
          onClick={() => {
            if (onSelectPlatform) {
              onSelectPlatform(selectedPlatform === 'FACEBOOK' ? null : 'FACEBOOK');
            }
          }}
          className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            selectedPlatform === 'FACEBOOK'
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
              : 'bg-slate-900/60 border-slate-800 hover:border-blue-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#1877F2]/20 border border-[#1877F2]/40 flex items-center justify-center text-[#1877F2] font-black text-xs">
                f
              </span>
              <span className="text-xs font-semibold text-slate-200">Facebook</span>
            </div>
            <span className="text-xs font-bold text-blue-400">{fbPct.toFixed(1)}%</span>
          </div>

          <div className="text-2xl font-black text-white tracking-tight">
            {fb.total_reactions.toLocaleString()}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <span>{fb.total_comments} comentarios</span>
            <span>•</span>
            <span>{fb.total_shares} compartidos</span>
          </div>
        </div>

        {/* TikTok Card */}
        <div
          onClick={() => {
            if (onSelectPlatform) {
              onSelectPlatform(selectedPlatform === 'TIKTOK' ? null : 'TIKTOK');
            }
          }}
          className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            selectedPlatform === 'TIKTOK'
              ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-slate-900/60 border-slate-800 hover:border-pink-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#fe2c55]/30 to-[#00f2fe]/30 border border-pink-500/40 flex items-center justify-center text-pink-400 font-black text-xs">
                ♪
              </span>
              <span className="text-xs font-semibold text-slate-200">TikTok</span>
            </div>
            <span className="text-xs font-bold text-pink-400">{ttPct.toFixed(1)}%</span>
          </div>

          <div className="text-2xl font-black text-white tracking-tight">
            {tt.total_reactions.toLocaleString()}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <span>{tt.total_comments} comentarios</span>
            <span>•</span>
            <span>{tt.total_shares} compartidos</span>
          </div>
        </div>
      </div>

      {/* Proportional Split Bar */}
      <div className="w-full">
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full transition-all duration-500"
            style={{ width: `${fbPct}%` }}
            title={`Facebook: ${fb.total_reactions} (${fbPct.toFixed(1)}%)`}
          />
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-r-full transition-all duration-500"
            style={{ width: `${ttPct}%` }}
            title={`TikTok: ${tt.total_reactions} (${ttPct.toFixed(1)}%)`}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
          <span>{fb.total_reactions} reacciones</span>
          <span>{tt.total_reactions} reacciones</span>
        </div>
      </div>
    </div>
  );
};
