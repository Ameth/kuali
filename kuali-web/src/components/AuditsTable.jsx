// src/components/AuditsTable.jsx
import React from 'react'
import { Eye, CheckCircle2, XCircle, Search, Filter } from 'lucide-react'

const AuditsTable = ({
  audits = [],
  agents = [],
  loading = false,
  filters = {},
  onFilterChange,
  onSelectAudit,
}) => {
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

  return (
    <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl'>
      {/* Barra de Filtros */}
      <div className='p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between bg-[#10121a]'>
        <div className='flex items-center gap-2.5 text-white text-base font-bold'>
          <Filter className='w-5 h-5 text-cyan-400' />
          <span>Llamadas Auditadas por Kuali</span>
          <span className='text-xs bg-slate-800 text-cyan-300 px-3 py-1 rounded-full border border-slate-700 font-mono font-bold'>
            {audits.length}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          {/* Selector de Asesor */}
          <select
            value={filters.agent_id || ''}
            onChange={(e) => onFilterChange('agent_id', e.target.value)}
            className='cursor-pointer bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 transition-colors'
          >
            <option value=''>Todos los asesores</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name} (Ext. {ag.extension})
              </option>
            ))}
          </select>

          {/* Buscador de programa */}
          <div className='relative'>
            <Search className='w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none' />
            <input
              type='text'
              placeholder='Buscar programa...'
              value={filters.detected_program || ''}
              onChange={(e) =>
                onFilterChange('detected_program', e.target.value)
              }
              className='bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-3.5 py-2.5 outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500 w-48 sm:w-60'
            />
          </div>
        </div>
      </div>

      {/* Tabla con fuentes aumentadas a text-sm */}
      <div className='overflow-x-auto'>
        <table className='w-full text-left text-sm text-slate-200'>
          <thead className='bg-[#0d0e15] text-xs uppercase tracking-wider text-slate-300 border-b border-slate-800'>
            <tr>
              <th className='py-3.5 px-4 font-semibold'>Fecha / Hora</th>
              <th className='py-3.5 px-4 font-semibold'>Asesor</th>
              <th className='py-3.5 px-4 font-semibold'>Teléfono Prospecto</th>
              <th className='py-3.5 px-4 font-semibold'>Duración</th>
              <th className='py-3.5 px-4 font-semibold'>Programa Detectado</th>
              <th className='py-3.5 px-4 text-center font-semibold'>Guion</th>
              <th className='py-3.5 px-4 text-center font-semibold'>Puntaje</th>
              <th className='py-3.5 px-4 text-right font-semibold'>Acción</th>
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
                  No se encontraron auditorías registradas para esta empresa.
                </td>
              </tr>
            ) : (
              audits.map((a) => (
                <tr
                  key={a.id}
                  className='hover:bg-slate-800/40 transition-colors cursor-pointer group'
                  onClick={() => onSelectAudit(a.id)}
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
                    {a.detected_program ? (
                      <span className='inline-block max-w-[220px] truncate text-cyan-200 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg text-xs font-medium'>
                        {a.detected_program}
                      </span>
                    ) : (
                      <span className='text-slate-400 text-xs italic'>
                        No identificado
                      </span>
                    )}
                  </td>
                  <td className='py-4 px-4 text-center'>
                    {a.script_compliance === true ? (
                      <CheckCircle2 className='w-5 h-5 text-emerald-400 inline' />
                    ) : a.script_compliance === false ? (
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
                        onSelectAudit(a.id)
                      }}
                      className='cursor-pointer p-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center'
                      title='Ver análisis de Kuali'
                    >
                      <Eye className='w-5 h-5' />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditsTable
