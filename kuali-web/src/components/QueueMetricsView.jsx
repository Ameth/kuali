// src/components/QueueMetricsView.jsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  PhoneIncoming,
  PhoneCall,
  PhoneOff,
  Clock,
  AlertTriangle,
  TrendingUp,
  BellOff,
  RefreshCw,
  Filter,
  CheckCircle2,
  X,
  Download,
  GitCommit,
  Eye,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import { apiService } from '../services/api'
import CallTimeline from './CallTimeline'
import AuditDetailModal from './AuditDetailModal'

const QueueMetricsView = () => {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('calls')
  const [callStatusFilter, setCallStatusFilter] = useState('')
  const [callsList, setCallsList] = useState([])
  const [loadingCalls, setLoadingCalls] = useState(false)

  const [selectedCallTrace, setSelectedCallTrace] = useState(null)

  const [selectedAgentHistory, setSelectedAgentHistory] = useState(null)
  const [agentModalTab, setAgentModalTab] = useState('missed')
  const [loadingAgentHistory, setLoadingAgentHistory] = useState(false)

  const [allAgents, setAllAgents] = useState([])

  const [selectedAuditForModal, setSelectedAuditForModal] = useState(null)

  const [filters, setFilters] = useState({
    queue: '',
    agent_name: '',
    customer_phone: '',
    start_date: '',
    end_date: '',
  })

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiService.getQueueMetrics(filters)
      setMetrics(data)
      if (
        !filters.agent_name &&
        !filters.customer_phone &&
        data?.agents_summary?.length > 0
      ) {
        setAllAgents(data.agents_summary.map((a) => a.agent_name))
      }
    } catch (err) {
      console.error('Error al cargar métricas de cola:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadCalls = useCallback(async () => {
    try {
      setLoadingCalls(true)
      const data = await apiService.getQueueCallsList({
        ...filters,
        status_filter: callStatusFilter,
      })
      setCallsList(data)
    } catch (err) {
      console.error('Error al cargar listado de llamadas de cola:', err)
    } finally {
      setLoadingCalls(false)
    }
  }, [filters, callStatusFilter])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    loadCalls()
  }, [loadCalls])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleQuickCardFilter = (status) => {
    setCallStatusFilter(status)
    setActiveTab('calls')
  }

  const handleOpenAgentHistory = async (agentName, defaultTab = 'missed') => {
    setAgentModalTab(defaultTab)
    setSelectedAgentHistory({
      agent_name: agentName,
      attended_calls: [],
      missed_calls: [],
    })
    try {
      setLoadingAgentHistory(true)
      const history = await apiService.getAgentQueueHistory(agentName, filters)
      setSelectedAgentHistory(history)
    } catch (err) {
      console.error('Error cargando historial del asesor:', err)
    } finally {
      setLoadingAgentHistory(false)
    }
  }

  const getAbandonColor = (rate) => {
    if (rate <= 5)
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (rate <= 10) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  }

  const formatRingDuration = (item) => {
    if (item.ring_ms && item.ring_ms > 0 && item.ring_ms < 1000) {
      return '< 1s (Extensión ocupada/no disponible)'
    }
    if (item.ring_seconds === 0) {
      return '< 1s (Extensión ocupada/no disponible)'
    }
    return `${item.ring_seconds}s`
  }

  const formatCallDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    const d = new Date(dateString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()

    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12 || 12
    const strHours = String(hours).padStart(2, '0')

    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`
  }

  return (
    <div className='space-y-6 animate-in fade-in duration-200'>
      {/* Barra de Filtros Dinámicos */}
      <div className='bg-[#14161f] border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider'>
            <Filter className='w-4 h-4 text-cyan-400' />
            <span>Filtros operativos</span>
          </div>

          <div className='flex items-center gap-2'>
            {(filters.queue ||
              filters.agent_name ||
              filters.customer_phone ||
              filters.start_date ||
              filters.end_date) && (
              <button
                onClick={() =>
                  setFilters({
                    queue: '',
                    agent_name: '',
                    customer_phone: '',
                    start_date: '',
                    end_date: '',
                  })
                }
                className='cursor-pointer text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-xl transition-colors'
              >
                Limpiar filtros
              </button>
            )}

            <button
              onClick={() => {
                loadMetrics()
                loadCalls()
              }}
              disabled={loading}
              className='cursor-pointer flex items-center gap-1.5 bg-[#0d0e15] hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-colors'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => apiService.exportQueueMetricsExcel(filters)}
              className='cursor-pointer flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-xs px-3 py-1.5 rounded-xl transition-colors font-medium'
            >
              <Download className='w-3.5 h-3.5 text-emerald-400' />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1'>
          {/* Cola */}
          <div>
            <label className='block text-[10px] font-semibold text-slate-400 uppercase mb-1'>
              Cola
            </label>
            <select
              value={filters.queue}
              onChange={(e) => handleFilterChange('queue', e.target.value)}
              className='cursor-pointer w-full bg-[#0d0e15] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-400 transition-colors'
            >
              <option value=''>Todas las colas</option>
              {metrics?.available_queues?.map((q) => (
                <option key={q} value={q}>
                  Cola {q}
                </option>
              ))}
            </select>
          </div>

          {/* Asesor */}
          <div>
            <label className='block text-[10px] font-semibold text-slate-400 uppercase mb-1'>
              Asesor
            </label>
            <select
              value={filters.agent_name}
              onChange={(e) => handleFilterChange('agent_name', e.target.value)}
              className='cursor-pointer w-full bg-[#0d0e15] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-400 transition-colors'
            >
              <option value=''>Todos los asesores</option>
              {allAgents.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Teléfono cliente */}
          <div>
            <label className='block text-[10px] font-semibold text-slate-400 uppercase mb-1'>
              Teléfono cliente
            </label>
            <input
              type='text'
              placeholder='Ej: 3001234567...'
              value={filters.customer_phone}
              onChange={(e) =>
                handleFilterChange('customer_phone', e.target.value)
              }
              className='w-full bg-[#0d0e15] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-600'
            />
          </div>

          {/* Desde */}
          <div>
            <label className='block text-[10px] font-semibold text-slate-400 uppercase mb-1'>
              Desde
            </label>
            <input
              type='date'
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className='w-full bg-[#0d0e15] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-400 transition-colors [color-scheme:dark]'
            />
          </div>

          {/* Hasta */}
          <div>
            <label className='block text-[10px] font-semibold text-slate-400 uppercase mb-1'>
              Hasta
            </label>
            <input
              type='date'
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className='w-full bg-[#0d0e15] border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-400 transition-colors [color-scheme:dark]'
            />
          </div>
        </div>
      </div>

      {/* Tarjetas Principales de KPI */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-[#14161f] border border-slate-800/80 rounded-2xl p-5 shadow-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
              Resumen de llamadas
            </span>
            <div className='p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'>
              <PhoneIncoming className='w-4 h-4' />
            </div>
          </div>
          <div
            onClick={() => handleQuickCardFilter('')}
            className='cursor-pointer flex items-baseline gap-2 group'
            title='Ver todas las llamadas'
          >
            <span className='text-2xl font-bold text-white font-mono group-hover:text-cyan-300 transition-colors'>
              {metrics?.total_received || 0}
            </span>
            <span className='text-xs text-slate-400'>entrantes</span>
          </div>
          <div className='mt-3 flex items-center gap-2 text-xs'>
            <button
              onClick={() => handleQuickCardFilter('answered')}
              className='cursor-pointer px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1 transition-colors'
            >
              <PhoneCall className='w-3 h-3' /> {metrics?.total_answered || 0}{' '}
              atendidas
            </button>
            <button
              onClick={() => handleQuickCardFilter('lost')}
              className='cursor-pointer px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-semibold flex items-center gap-1 transition-colors'
            >
              <PhoneOff className='w-3 h-3' />{' '}
              {(metrics?.total_abandoned || 0) + (metrics?.total_timeout || 0)}{' '}
              perdidas
            </button>
          </div>
        </div>

        <div className='bg-[#14161f] border border-slate-800/80 rounded-2xl p-5 shadow-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
              Tasa de abandono
            </span>
            <div
              className={`p-2 rounded-xl border ${getAbandonColor(metrics?.abandon_rate || 0)}`}
            >
              <TrendingUp className='w-4 h-4' />
            </div>
          </div>
          <div className='flex items-baseline gap-2'>
            <span
              className={`text-2xl font-bold font-mono ${metrics?.abandon_rate > 10 ? 'text-rose-400' : 'text-emerald-400'}`}
            >
              {metrics?.abandon_rate || 0}%
            </span>
          </div>
          <p className='text-xs text-slate-400 mt-2'>
            {metrics?.abandon_rate <= 5
              ? 'Meta óptima de atención (< 5%)'
              : 'Por encima del umbral recomendado'}
          </p>
        </div>

        <div className='bg-[#14161f] border border-slate-800/80 rounded-2xl p-5 shadow-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
              Espera promedio (ASA)
            </span>
            <div className='p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'>
              <Clock className='w-4 h-4' />
            </div>
          </div>
          <div className='flex items-baseline gap-2'>
            <span className='text-2xl font-bold text-indigo-300 font-mono'>
              {metrics?.average_speed_of_answer || 0}s
            </span>
          </div>
          <p className='text-xs text-slate-400 mt-2'>
            Demora media antes de ser atendido
          </p>
        </div>

        <div className='bg-[#14161f] border border-slate-800/80 rounded-2xl p-5 shadow-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
              Paciencia de abandono
            </span>
            <div className='p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400'>
              <AlertTriangle className='w-4 h-4' />
            </div>
          </div>
          <div className='flex items-baseline gap-2'>
            <span className='text-2xl font-bold text-amber-300 font-mono'>
              {metrics?.average_abandon_time || 0}s
            </span>
          </div>
          <p className='text-xs text-slate-400 mt-2'>
            Tiempo que aguanta el cliente antes de colgar
          </p>
        </div>
      </div>

      {/* Selector de Vista: Análisis por Llamadas vs Análisis por Asesor */}
      <div className='bg-[#14161f] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl'>
        <div className='p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-[#10121a]'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setActiveTab('calls')}
              className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'calls'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              Auditoría por Llamadas ({callsList.length})
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'agents'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              Rendimiento por Asesor ({metrics?.agents_summary?.length || 0})
            </button>
          </div>

          {activeTab === 'calls' && (
            <div className='flex items-center gap-2 text-xs'>
              <span className='text-slate-400'>Estado:</span>
              <button
                onClick={() => setCallStatusFilter('')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg border transition-colors ${
                  callStatusFilter === ''
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-[#0d0e15] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setCallStatusFilter('answered')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg border transition-colors ${
                  callStatusFilter === 'answered'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#0d0e15] text-slate-400 border-slate-800 hover:text-emerald-300'
                }`}
              >
                Atendidas
              </button>
              <button
                onClick={() => setCallStatusFilter('lost')}
                className={`cursor-pointer px-2.5 py-1 rounded-lg border transition-colors ${
                  callStatusFilter === 'lost'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-[#0d0e15] text-slate-400 border-slate-800 hover:text-rose-300'
                }`}
              >
                No atendidas / Perdidas
              </button>
            </div>
          )}
        </div>

        {/* VISTA 1: TABLA POR LLAMADAS */}
        {activeTab === 'calls' && (
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase tracking-wider bg-[#0d0e15]'>
                  <th className='py-3.5 px-4'>Fecha y hora</th>
                  <th className='py-3.5 px-4'>Cola</th>
                  <th className='py-3.5 px-4'>Teléfono</th>
                  <th className='py-3.5 px-4'>Resultado</th>
                  <th className='py-3.5 px-4'>Asesor que atendió</th>
                  <th className='py-3.5 px-4 text-center'>Saltos en cola</th>
                  <th className='py-3.5 px-4 text-right'>Espera / Habla</th>
                  <th className='py-3.5 px-4 text-center'>Trazabilidad</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-800/60 text-xs text-slate-200'>
                {loadingCalls ? (
                  <tr>
                    <td colSpan='8' className='text-center py-8 text-slate-400'>
                      Cargando llamadas...
                    </td>
                  </tr>
                ) : callsList.length === 0 ? (
                  <tr>
                    <td colSpan='8' className='text-center py-8 text-slate-400'>
                      No hay llamadas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  callsList.map((call) => {
                    const isAnswered = call.status === 'answered'
                    return (
                      <tr
                        key={call.id}
                        className='hover:bg-slate-800/30 transition-colors'
                      >
                        <td className='py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap'>
                          {formatCallDateTime(call.created_at)}
                        </td>
                        <td className='py-3.5 px-4 font-mono text-cyan-300'>
                          {call.queue}
                        </td>
                        <td className='py-3.5 px-4 font-mono text-slate-200'>
                          {call.customer_phone || 'Sin número'}
                        </td>
                        <td className='py-3.5 px-4'>
                          {isAnswered ? (
                            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'>
                              <CheckCircle2 className='w-3 h-3' /> Atendida
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30'>
                              <PhoneOff className='w-3 h-3' />{' '}
                              {call.status === 'timeout'
                                ? 'Desborde tiempo'
                                : 'Abandonada'}
                            </span>
                          )}
                        </td>
                        <td className='py-3.5 px-4 font-semibold text-slate-100'>
                          {isAnswered ? (
                            call.agent_name || 'Asesor'
                          ) : (
                            <span className='text-slate-500 italic'>
                              Ningún asesor contestó
                            </span>
                          )}
                        </td>
                        <td className='py-3.5 px-4 text-center'>
                          {call.missed_rings_count > 0 ? (
                            <span
                              className='inline-flex items-center gap-1 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              title={`Timbró en ${call.missed_rings_count} extensiones sin respuesta`}
                            >
                              <GitCommit className='w-3 h-3' />
                              {isAnswered
                                ? `Atendida tras ${call.missed_rings_count} saltos`
                                : `${call.missed_rings_count} intentos fallidos`}
                            </span>
                          ) : (
                            <span className='text-slate-400 font-mono text-[11px]'>
                              {isAnswered
                                ? 'Directa (1er intento)'
                                : 'Colgó rápido'}
                            </span>
                          )}
                        </td>
                        <td className='py-3.5 px-4 text-right font-mono text-slate-300 whitespace-nowrap'>
                          <span>{call.wait_time_seconds}s espera</span>
                          {isAnswered && (
                            <span className='text-slate-500'>
                              {' '}
                              / {call.talk_time_seconds}s habla
                            </span>
                          )}
                        </td>
                        <td className='py-3.5 px-4 text-right whitespace-nowrap'>
                          <div className='inline-flex items-center justify-end gap-2'>
                            <button
                              onClick={() => setSelectedCallTrace(call)}
                              className='cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors whitespace-nowrap'
                            >
                              <Eye className='w-3.5 h-3.5 shrink-0' />
                              <span>Ver ruta</span>
                            </button>

                            {call.audit_id && (
                              <button
                                onClick={() =>
                                  setSelectedAuditForModal({
                                    id: call.audit_id,
                                    uniqueid: call.uniqueid,
                                    agent_name: call.agent_name,
                                    customer_phone: call.customer_phone,
                                    call_date: call.created_at,
                                    duration_seconds: call.talk_time_seconds,
                                    overall_score: call.overall_score,
                                  })
                                }
                                className='cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-colors whitespace-nowrap'
                                title='Abrir evaluación de calidad de esta grabación'
                              >
                                <Sparkles className='w-3.5 h-3.5 text-purple-400 shrink-0' />
                                <span>
                                  Auditoría{' '}
                                  {call.overall_score !== null &&
                                  call.overall_score !== undefined
                                    ? `(${call.overall_score})`
                                    : ''}
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTA 2: TABLA POR ASESOR */}
        {activeTab === 'agents' && (
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase tracking-wider bg-[#0d0e15]'>
                  <th className='py-3.5 px-4'>Asesor</th>
                  <th className='py-3.5 px-4 text-center'>
                    Llamadas atendidas
                  </th>
                  <th className='py-3.5 px-4 text-center'>
                    Llamadas dejadas timbrar
                  </th>
                  <th className='py-3.5 px-4 text-right'>
                    Duración promedio al habla
                  </th>
                  <th className='py-3.5 px-4 text-center'>Auditar historial</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-800/60 text-xs text-slate-200'>
                {metrics?.agents_summary?.length === 0 ? (
                  <tr>
                    <td colSpan='5' className='text-center py-8 text-slate-400'>
                      No hay registros de asesores para los filtros
                      seleccionados.
                    </td>
                  </tr>
                ) : (
                  metrics?.agents_summary?.map((ag, idx) => (
                    <tr
                      key={idx}
                      className='hover:bg-slate-800/20 transition-colors'
                    >
                      <td className='py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2'>
                        <div className='w-7 h-7 rounded-full bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-300 text-[11px] font-bold'>
                          {ag.agent_name.charAt(0)}
                        </div>
                        <span>{ag.agent_name}</span>
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        <button
                          onClick={() =>
                            handleOpenAgentHistory(ag.agent_name, 'attended')
                          }
                          className='cursor-pointer inline-flex items-center gap-1 font-mono font-semibold text-emerald-300 hover:bg-emerald-500/15 px-3 py-1 rounded-full border border-transparent hover:border-emerald-500/30 transition-colors'
                          title='Ver las llamadas que atendió este asesor'
                        >
                          <UserCheck className='w-3.5 h-3.5' />{' '}
                          {ag.answered_calls} atendidas
                        </button>
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        <button
                          onClick={() =>
                            handleOpenAgentHistory(ag.agent_name, 'missed')
                          }
                          className={`cursor-pointer inline-flex items-center gap-1.5 font-mono font-semibold px-3 py-1 rounded-full text-xs border transition-colors ${
                            ag.missed_rings > 0
                              ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                              : 'text-slate-400 bg-slate-800/40 border-slate-700/50'
                          }`}
                          title='Ver qué llamadas dejó timbrar sin contestar'
                        >
                          <BellOff className='w-3.5 h-3.5' />
                          <span>{ag.missed_rings} sin contestar</span>
                        </button>
                      </td>
                      <td className='py-3.5 px-4 text-right font-mono text-slate-200'>
                        {ag.avg_talk_time_seconds
                          ? `${ag.avg_talk_time_seconds}s`
                          : '0s'}
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        <button
                          onClick={() =>
                            handleOpenAgentHistory(ag.agent_name, 'missed')
                          }
                          className='cursor-pointer text-xs text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 px-3 py-1.5 rounded-xl transition-colors font-medium'
                        >
                          Ver detalle de gestión
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Trazabilidad de una llamada específica (Nivel superior z-[60]) */}
      {selectedCallTrace && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200'>
          <div className='bg-[#14161f] border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]'>
            <div className='p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#10121a]'>
              <div>
                <h3 className='text-sm sm:text-base font-bold text-white'>
                  Ruta de la llamada en cola
                </h3>
                <p className='text-xs text-slate-400 font-mono mt-0.5'>
                  ID: {selectedCallTrace.uniqueid} • Teléfono:{' '}
                  {selectedCallTrace.customer_phone || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCallTrace(null)}
                className='cursor-pointer p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-5 overflow-y-auto'>
              <CallTimeline uniqueid={selectedCallTrace.uniqueid} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Expediente Bidireccional del Asesor */}
      {selectedAgentHistory && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200'>
          <div className='bg-[#14161f] border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]'>
            <div className='p-5 border-b border-slate-800 flex items-center justify-between bg-[#10121a]'>
              <div>
                <h3 className='text-base font-bold text-white'>
                  Detalle operativo: {selectedAgentHistory.agent_name}
                </h3>
                <p className='text-xs text-slate-400 mt-0.5'>
                  Auditoría de llamadas atendidas y llamadas dejadas timbrar en
                  cola
                </p>
              </div>
              <button
                onClick={() => setSelectedAgentHistory(null)}
                className='cursor-pointer p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='px-5 pt-3 bg-[#0e1017] border-b border-slate-800 flex gap-3'>
              <button
                onClick={() => setAgentModalTab('missed')}
                className={`cursor-pointer pb-3 text-xs font-semibold border-b-2 transition-colors ${
                  agentModalTab === 'missed'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Dejadas timbrar / No contestó (
                {selectedAgentHistory.missed_calls.length})
              </button>
              <button
                onClick={() => setAgentModalTab('attended')}
                className={`cursor-pointer pb-3 text-xs font-semibold border-b-2 transition-colors ${
                  agentModalTab === 'attended'
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Llamadas atendidas ({selectedAgentHistory.attended_calls.length}
                )
              </button>
            </div>

            <div className='p-5 overflow-y-auto flex-1'>
              {loadingAgentHistory ? (
                <div className='py-12 text-center text-xs text-slate-400'>
                  Cargando historial del asesor...
                </div>
              ) : agentModalTab === 'missed' ? (
                selectedAgentHistory.missed_calls.length === 0 ? (
                  <div className='py-10 text-center text-xs text-slate-400'>
                    Este asesor no tiene llamadas dejadas timbrar en este
                    periodo.
                  </div>
                ) : (
                  <div className='space-y-2.5'>
                    {selectedAgentHistory.missed_calls.map((m, idx) => (
                      <div
                        key={idx}
                        className='bg-[#0d0e15] border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-4 text-xs'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-mono text-slate-300'>
                              {formatCallDateTime(m.timestamp)}
                            </span>
                            <span className='px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]'>
                              Cola {m.queue}
                            </span>
                          </div>
                          <p className='text-slate-300 mt-1.5 leading-relaxed'>
                            Cliente{' '}
                            <span className='font-mono text-white'>
                              {m.customer_phone}
                            </span>{' '}
                            • Timbró{' '}
                            <span className='text-amber-300 font-semibold'>
                              {formatRingDuration(m)}
                            </span>{' '}
                            sin respuesta.
                          </p>
                        </div>

                        <div className='flex items-center gap-3 shrink-0'>
                          {m.final_status === 'answered' ? (
                            <span className='text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap'>
                              Rescatada por <strong>{m.rescued_by}</strong>
                            </span>
                          ) : (
                            <span className='text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap'>
                              Llamada perdida (Nadie contestó)
                            </span>
                          )}
                          <button
                            onClick={() =>
                              setSelectedCallTrace({
                                uniqueid: m.uniqueid,
                                customer_phone: m.customer_phone,
                              })
                            }
                            className='cursor-pointer text-cyan-400 hover:underline font-medium whitespace-nowrap'
                          >
                            Ver ruta
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : selectedAgentHistory.attended_calls.length === 0 ? (
                <div className='py-10 text-center text-xs text-slate-400'>
                  No hay llamadas atendidas registradas en este periodo.
                </div>
              ) : (
                <div className='space-y-2.5'>
                  {selectedAgentHistory.attended_calls.map((c, idx) => (
                    <div
                      key={idx}
                      className='bg-[#0d0e15] border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs'
                    >
                      <div>
                        <span className='font-mono text-slate-300'>
                          {formatCallDateTime(c.created_at)}
                        </span>
                        <p className='text-slate-200 mt-1'>
                          Cliente{' '}
                          <span className='font-mono text-white'>
                            {c.customer_phone || 'Sin número'}
                          </span>{' '}
                          • Cola{' '}
                          <span className='text-cyan-300 font-mono'>
                            {c.queue}
                          </span>
                        </p>
                      </div>
                      <div className='flex items-center gap-3 shrink-0'>
                        <span className='font-mono text-emerald-300'>
                          Habla: {c.talk_time_seconds}s
                        </span>

                        {c.audit_id && (
                          <button
                            onClick={() =>
                              setSelectedAuditForModal({
                                id: c.audit_id,
                                uniqueid: c.uniqueid,
                                agent_name: c.agent_name,
                                customer_phone: c.customer_phone,
                                call_date: c.created_at,
                                duration_seconds: c.talk_time_seconds,
                                overall_score: c.overall_score,
                              })
                            }
                            className='cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-colors'
                          >
                            <Sparkles className='w-3 h-3 text-purple-400' />
                            <span>
                              Auditoría{' '}
                              {c.overall_score !== null &&
                              c.overall_score !== undefined
                                ? `(${c.overall_score})`
                                : ''}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedCallTrace(c)}
                          className='cursor-pointer text-cyan-400 hover:underline font-medium'
                        >
                          Ver ruta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Auditoría de Calidad de la Grabación */}
      {selectedAuditForModal && (
        <AuditDetailModal
          auditId={selectedAuditForModal.id}
          audit={selectedAuditForModal}
          onClose={() => setSelectedAuditForModal(null)}
        />
      )}
    </div>
  )
}

export default QueueMetricsView
