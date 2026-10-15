// src/components/AuditsTable.jsx
import React from 'react'
import {
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'

const AuditsTable = ({
  data = { items: [], total: 0, page: 1, limit: 10, total_pages: 1 },
  agents = [],
  loading = false,
  filters = {},
  onFilterChange,
  onPageChange,
  onSelectAudit,
}) => {
  const audits = data.items || []
  const currentPage = data.page || 1
  const totalPages = data.total_pages || 1
  const totalItems = data.total || 0

  const getBadgeScore = (score) => {
    if (score === null || score === undefined) {
      return (
        <span className='text-slate-400 font-mono text-sm'>Sin evaluar</span>
      )
    }
    let color = 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    if (score >= 8.0) {
      color = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    } else if (score >= 6.0) {
      color = 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    }

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-mono font-bold border ${color}`}
      >
        {score} / 10
      </span>
    )
  }

  const formatSeconds = (secs) => {
    if (!secs) return '0s'
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}m ${rem}s`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleClearFilters = () => {
    onFilterChange('agent_id', '')
    onFilterChange('detected_program', '')
    onFilterChange('start_date', '')
    onFilterChange('end_date', '')
  }

  const hasActiveFilters = Boolean(
    filters.agent_id ||
    filters.detected_program ||
    filters.start_date ||
    filters.end_date,
  )

  const getDetectedHighlight = (audit) => {
    if (audit.detected_program) return audit.detected_program
    const res = audit.analysis_result || {}
    return (
      res.detected_program ||
      res.detected_service ||
      res.detected_topic ||
      res.categoria ||
      null
    )
  }

  const getComplianceStatus = (audit) => {
    if (
      audit.script_compliance !== null &&
      audit.script_compliance !== undefined
    ) {
      return audit.script_compliance
    }
    const res = audit.analysis_result || {}
    if (res.script_compliance !== undefined) return res.script_compliance
    if (res.protocol_compliance !== undefined) return res.protocol_compliance
    if (res.protocolo_cumplido !== undefined) return res.protocolo_cumplido
    return null
  }

  const handleSelect = (audit) => {
    if (typeof onSelectAudit === 'function') {
      onSelectAudit(audit)
    }
  }

  return (
    <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl'>
      {/* Barra de Filtros */}
      <div className='p-4 sm:p-5 border-b border-slate-800/80 flex flex-col gap-3.5 bg-[#10121a]'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5 text-white text-base font-bold'>
            <Filter className='w-5 h-5 text-cyan-400' />
            <span>Llamadas auditadas</span>
            <span className='text-xs bg-slate-800 text-cyan-300 px-3 py-1 rounded-full border border-slate-700 font-mono font-bold'>
              {totalItems} en total
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className='cursor-pointer self-start lg:self-auto flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors'
            >
              <RotateCcw className='w-3.5 h-3.5 text-cyan-400' />
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>

        {/* Controles de Filtros */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1'>
          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Asesor
            </label>
            <select
              value={filters.agent_id || ''}
              onChange={(e) => onFilterChange('agent_id', e.target.value)}
              className='cursor-pointer w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-3 py-2 outline-none focus:border-cyan-400 transition-colors'
            >
              <option value=''>Todos los asesores</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} (Ext. {ag.extension})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Búsqueda (Aspecto o teléfono)
            </label>
            <div className='relative'>
              <Search className='w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none' />
              <input
                type='text'
                placeholder='Buscar por servicio o teléfono...'
                value={filters.detected_program || ''}
                onChange={(e) =>
                  onFilterChange('detected_program', e.target.value)
                }
                className='w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Desde
            </label>
            <div className='relative'>
              <Calendar className='w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none' />
              <input
                type='date'
                value={filters.start_date || ''}
                onChange={(e) => onFilterChange('start_date', e.target.value)}
                className='cursor-pointer w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-cyan-400 transition-colors [color-scheme:dark]'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Hasta
            </label>
            <div className='relative'>
              <Calendar className='w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none' />
              <input
                type='date'
                value={filters.end_date || ''}
                onChange={(e) => onFilterChange('end_date', e.target.value)}
                className='cursor-pointer w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-cyan-400 transition-colors [color-scheme:dark]'
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className='overflow-x-auto'>
        <table className='w-full text-left text-sm text-slate-200'>
          <thead className='bg-[#0d0e15] text-xs font-semibold text-slate-300 border-b border-slate-800'>
            <tr>
              <th className='py-3.5 px-4'>Fecha y hora</th>
              <th className='py-3.5 px-4'>Asesor</th>
              <th className='py-3.5 px-4'>Teléfono del cliente</th>
              <th className='py-3.5 px-4'>Duración</th>
              <th className='py-3.5 px-4'>Aspecto o servicio clave</th>
              <th className='py-3.5 px-4 text-center'>Protocolo</th>
              <th className='py-3.5 px-4 text-center'>Puntaje</th>
              <th className='py-3.5 px-4 text-right'>Acción</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-800/60 font-normal'>
            {loading ? (
              <tr>
                <td
                  colSpan='8'
                  className='py-12 text-center text-slate-300 text-base'
                >
                  Cargando auditorías...
                </td>
              </tr>
            ) : audits.length === 0 ? (
              <tr>
                <td
                  colSpan='8'
                  className='py-12 text-center text-slate-400 text-base'
                >
                  No se encontraron auditorías para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              audits.map((a) => {
                const detectedHighlight = getDetectedHighlight(a)
                const complianceStatus = getComplianceStatus(a)

                return (
                  <tr
                    key={a.id}
                    className='hover:bg-slate-800/40 transition-colors cursor-pointer group'
                    onClick={() => handleSelect(a)}
                  >
                    <td className='py-4 px-4 font-mono text-slate-300 text-xs sm:text-sm'>
                      {formatDate(a.call_date)}
                    </td>
                    <td className='py-4 px-4 font-semibold text-white'>
                      {a.agent_name}
                      {a.agent_extension && (
                        <span className='text-xs text-cyan-300/90 font-mono ml-2'>
                          (Ext. {a.agent_extension})
                        </span>
                      )}
                    </td>
                    <td className='py-4 px-4 font-mono text-slate-300'>
                      {a.customer_phone || 'Sin número'}
                    </td>
                    <td className='py-4 px-4 text-slate-300'>
                      {formatSeconds(a.duration_seconds)}
                    </td>
                    <td className='py-4 px-4'>
                      {detectedHighlight ? (
                        <span className='inline-block max-w-[220px] truncate text-cyan-200 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg text-xs font-medium'>
                          {detectedHighlight}
                        </span>
                      ) : (
                        <span className='text-slate-400 text-xs italic'>
                          No identificado
                        </span>
                      )}
                    </td>
                    <td className='py-4 px-4 text-center'>
                      {complianceStatus === true ? (
                        <CheckCircle2 className='w-5 h-5 text-emerald-400 inline' />
                      ) : complianceStatus === false ? (
                        <XCircle className='w-5 h-5 text-rose-400 inline' />
                      ) : (
                        <span className='text-slate-500'>-</span>
                      )}
                    </td>
                    <td className='py-4 px-4 text-center'>
                      {getBadgeScore(a.overall_score)}
                    </td>
                    <td className='py-4 px-4 text-right'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(a)
                        }}
                        className='cursor-pointer p-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center'
                        title='Ver análisis de la llamada'
                      >
                        <Eye className='w-5 h-5' />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className='p-4 border-t border-slate-800/80 bg-[#10121a] flex flex-col sm:flex-row items-center justify-between gap-3'>
        <div className='text-xs text-slate-400'>
          Mostrando página{' '}
          <span className='font-semibold text-slate-200'>{currentPage}</span> de{' '}
          <span className='font-semibold text-slate-200'>{totalPages}</span> (
          {totalItems} registros)
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className='cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-[#0d0e15] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
          >
            <ChevronLeft className='w-4 h-4' />
            <span>Anterior</span>
          </button>

          <span className='text-xs font-mono font-semibold px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300'>
            {currentPage}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className='cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-[#0d0e15] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
          >
            <span>Siguiente</span>
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuditsTable
