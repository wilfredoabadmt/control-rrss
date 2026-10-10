import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Share2,
  ThumbsUp,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  analyticsApi,
  AnalyticsFilters,
  AnalyticsOverviewResponse,
  AnalyticsEmployeesPageResponse,
} from '../api/analytics';
import { BarChartDirection } from '../components/charts/BarChartDirection';
import { DonutChartReactions } from '../components/charts/DonutChartReactions';
import { TimelineChart } from '../components/charts/TimelineChart';
import { PlatformComparisonBar } from '../components/charts/PlatformComparisonBar';

export const AnalyticsDashboardPage: React.FC = () => {
  // Estados de datos
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [employeesData, setEmployeesData] = useState<AnalyticsEmployeesPageResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtros
  const [daysPreset, setDaysPreset] = useState<number | null>(30); // 30 días por defecto
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [participationFilter, setParticipationFilter] = useState<'ALL' | 'PARTICIPATED' | 'NO_REACTION'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Cargar Overview
  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      setError(null);
      const filters: AnalyticsFilters = {
        days: daysPreset,
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
      };
      const res = await analyticsApi.getOverview(filters);
      setOverview(res);
    } catch (err: any) {
      console.error('Error al cargar analítica de reacciones:', err);
      setError('No se pudo cargar el resumen analítico. Verifique la conexión con el servidor.');
    } finally {
      setLoadingOverview(false);
    }
  }, [daysPreset, selectedDirection, selectedPlatform]);

  // Cargar Tabla de Funcionarios
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const filters: AnalyticsFilters = {
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
        search: searchTerm.trim() || undefined,
        participation_status: participationFilter,
        page: currentPage,
        page_size: pageSize,
      };
      const res = await analyticsApi.getEmployees(filters);
      setEmployeesData(res);
    } catch (err: any) {
      console.error('Error al cargar tabla de funcionarios:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [selectedDirection, selectedPlatform, searchTerm, participationFilter, currentPage]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Manejador de exportación a Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const blob = await analyticsApi.exportExcel({
        direction: selectedDirection !== 'ALL' ? selectedDirection : undefined,
        platform_name: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `GAMEA_Analitica_Reacciones_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error al exportar reporte Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Restablecer filtros
  const handleResetFilters = () => {
    setDaysPreset(null);
    setSelectedDirection('ALL');
    setSelectedPlatform('ALL');
    setSearchTerm('');
    setParticipationFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    daysPreset !== null ||
    selectedDirection !== 'ALL' ||
    selectedPlatform !== 'ALL' ||
    searchTerm.trim() !== '' ||
    participationFilter !== 'ALL';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Ejecutivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/40 border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 size={16} />
            <span>Fiscalización Institucional de Redes Sociales</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Analítica de Reacciones y Acompañamiento
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas cruzadas, índice de participación por dirección y taxonomía de interacciones oficiales.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              fetchOverview();
              fetchEmployees();
            }}
            disabled={loadingOverview}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loadingOverview ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={14} />
            <span>{exportingExcel ? 'Generando Excel...' : 'Exportar Excel Oficial'}</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros Interactivos y Presets */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 shadow-lg backdrop-blur-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Presets de Ventana Temporal */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Calendar size={12} />
              Ventana:
            </span>
            {[
              { label: '7 días', val: 7 },
              { label: '15 días', val: 15 },
              { label: '30 días', val: 30 },
              { label: 'Histórico', val: null },
            ].map((p) => {
              const active = daysPreset === p.val;
              return (
                <button
                  key={p.label}
                  onClick={() => setDaysPreset(p.val)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Filtro por Dirección */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Dirección:</span>
            <select
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 max-w-[260px] truncate"
            >
              <option value="ALL">Todas las Direcciones</option>
              {overview?.available_directions?.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Plataforma */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'ALL', label: 'Todas las Redes' },
              { id: 'FACEBOOK', label: 'Facebook' },
              { id: 'TIKTOK', label: 'TikTok' },
            ].map((plat) => {
              const active = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  onClick={() => {
                    setSelectedPlatform(plat.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {plat.label}
                </button>
              );
            })}
          </div>

          {/* Botón Reset si hay filtros aplicados */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/50 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <X size={12} />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Tarjetas KPI Métricas Clave */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* KPI 1: Funcionarios Observables */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Funcionarios Totales</span>
              <Users size={16} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {overview.kpis.total_employees}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-cyan-400 font-semibold">
                {overview.kpis.observable_employees}
              </span>{' '}
              con cuentas vinculadas
            </div>
          </div>

          {/* KPI 2: Total Reacciones */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Reacciones</span>
              <ThumbsUp size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {overview.kpis.total_reactions.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Promedio:</span>
              <strong className="text-blue-400 font-semibold">
                {overview.kpis.average_reactions_per_post}
              </strong>{' '}
              por post
            </div>
          </div>

          {/* KPI 3: Tasa de Participación */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tasa Participación</span>
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {overview.kpis.participation_rate.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <strong className="text-emerald-400 font-semibold">
                {overview.kpis.participating_employees}
              </strong>{' '}
              funcionarios activos
            </div>
          </div>

          {/* KPI 4: Publicaciones Auditadas */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Posts Auditados</span>
              <Layers size={16} className="text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {overview.kpis.total_publications}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Evaluadas en la ventana</div>
          </div>

          {/* KPI 5: Comentarios y Compartidos */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md relative overflow-hidden group hover:border-slate-700 transition-all col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Otros Acompañamientos</span>
              <MessageSquare size={16} className="text-pink-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {overview.kpis.total_comments + overview.kpis.total_shares}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span>{overview.kpis.total_comments} coment.</span>
              <span>•</span>
              <span>{overview.kpis.total_shares} comp.</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Grilla de Gráficos Estadísticos Interactivos (2x2) */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Ranking por Dirección */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <BarChart3 size={18} className="text-cyan-400" />
                  Ranking de Participación por Dirección
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tasa de acompañamiento y volumen de reacciones por unidad municipal.
                </p>
              </div>
              {selectedDirection !== 'ALL' && (
                <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                  Filtro activo
                </span>
              )}
            </div>
            <BarChartDirection
              data={overview.direction_rankings}
              selectedDirection={selectedDirection !== 'ALL' ? selectedDirection : null}
              onSelectDirection={(dir) => {
                setSelectedDirection(dir || 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Gráfico 2: Desglose Taxonómico de Reacciones (Donut) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <ThumbsUp size={18} className="text-blue-400" />
                  Taxonomía y Tipos de Reacciones
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proporción de Me gusta, Me encanta, Comentarios y Compartidos.
                </p>
              </div>
            </div>
            <DonutChartReactions
              data={overview.reactions_breakdown}
              totalCount={overview.kpis.total_reactions}
            />
          </div>

          {/* Gráfico 3: Serie Temporal Diaria */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" />
                  Actividad Cronológica y Tendencia
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evolución diaria de interacciones en el rango seleccionado.
                </p>
              </div>
            </div>
            <TimelineChart data={overview.timeline_series} />
          </div>

          {/* Gráfico 4: Comparativa de Plataformas */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Share2 size={18} className="text-pink-400" />
                  Comparativa Bilateral de Plataformas
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Volumen y distribución entre Facebook y TikTok.
                </p>
              </div>
              {selectedPlatform !== 'ALL' && (
                <span className="px-2 py-0.5 rounded text-[11px] bg-blue-950/60 text-blue-300 border border-blue-800/60">
                  {selectedPlatform}
                </span>
              )}
            </div>
            <PlatformComparisonBar
              comparison={overview.platform_comparison}
              selectedPlatform={selectedPlatform !== 'ALL' ? selectedPlatform : null}
              onSelectPlatform={(plat) => {
                setSelectedPlatform(plat || 'ALL');
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* 5. Tabla Detallada de Fiscalización por Funcionario */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Users size={20} className="text-cyan-400" />
              Detalle Analítico por Funcionario Municipal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoría nominal con enlaces de perfil, conteo de reacciones y porcentaje de cumplimiento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input de Búsqueda */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Nombre o C.I...."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 transition-all"
              />
            </div>

            {/* Toggle de Estado de Participación */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'PARTICIPATED', label: 'Con Reacción' },
                { id: 'NO_REACTION', label: 'Sin Reacción' },
              ].map((st) => {
                const active = participationFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setParticipationFilter(st.id as any);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabla Responsiva */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Funcionario</th>
                <th className="py-3 px-4">Dependencia / Cargo</th>
                <th className="py-3 px-4">Cuentas RRSS</th>
                <th className="py-3 px-4 text-center">Reacciones</th>
                <th className="py-3 px-4 text-center">Cobertura</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {loadingEmployees ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto text-cyan-400 mb-2" />
                    <span>Cargando detalle de funcionarios...</span>
                  </td>
                </tr>
              ) : employeesData?.items && employeesData.items.length > 0 ? (
                employeesData.items.map((emp) => (
                  <tr
                    key={emp.employee_id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Funcionario */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{emp.full_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-950 px-1 rounded border border-slate-800 text-[10px]">
                          C.I. {emp.document_number}
                        </span>
                      </div>
                    </td>

                    {/* Dependencia / Cargo */}
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="text-slate-200 truncate font-medium">{emp.direction}</div>
                      <div className="text-[11px] text-slate-400 truncate">{emp.position}</div>
                    </td>

                    {/* Cuentas RRSS */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {emp.facebook_account ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-mono">
                            <span className="font-black">f</span> {emp.facebook_account}
                          </span>
                        ) : null}
                        {emp.tiktok_account ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-pink-400 font-mono">
                            <span>♪</span> {emp.tiktok_account}
                          </span>
                        ) : null}
                        {!emp.facebook_account && !emp.tiktok_account && (
                          <span className="text-[10px] text-slate-400 italic">Sin cuentas vinculadas</span>
                        )}
                      </div>
                    </td>

                    {/* Reacciones */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-black text-white">
                        {emp.total_reactions}
                      </span>
                      {emp.total_comments > 0 && (
                        <div className="text-[10px] text-cyan-400">
                          +{emp.total_comments} coment.
                        </div>
                      )}
                    </td>

                    {/* Cobertura */}
                    <td className="py-3 px-4 text-center">
                      <div className="font-bold text-slate-200">
                        {emp.participation_rate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {emp.participated_posts_count} / {emp.total_available_posts} posts
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4 text-center">
                      {emp.has_participated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                          <CheckCircle2 size={12} />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 text-slate-400 border border-slate-800">
                          <XCircle size={12} />
                          Sin Reacción
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <span>No se encontraron funcionarios coincidentes con los criterios actuales.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {employeesData && employeesData.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
            <span>
              Mostrando página <strong>{employeesData.page}</strong> de{' '}
              <strong>{employeesData.total_pages}</strong> ({employeesData.total} funcionarios)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-white">
                {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(employeesData.total_pages, p + 1))}
                disabled={currentPage >= employeesData.total_pages}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
