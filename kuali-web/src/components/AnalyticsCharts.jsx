// src/components/AnalyticsCharts.jsx
import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Users, BookOpen } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-[#0d0e15] border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md'>
        <p className='text-xs font-semibold text-slate-300 mb-1'>{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className='text-xs font-mono font-medium'
            style={{ color: entry.color }}
          >
            {entry.name}: <span className='font-bold'>{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const AnalyticsCharts = ({ metrics, audits = [] }) => {
  // 1. Tendencia de calidad por llamada (Línea/Área estilo Google)
  const timelineData = audits
    .filter((a) => a.overall_score !== null && a.overall_score !== undefined)
    .slice(-10) // Últimas 10 llamadas
    .map((a, idx) => ({
      index: `#${idx + 1}`,
      fecha: new Date(a.call_date).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
      }),
      calificacion: a.overall_score,
      empatia: a.empathy_score || 0,
    }))

  // 2. Desempeño por asesor (del endpoint de métricas)
  const agentsData = (metrics?.agents_summary || []).map((ag) => ({
    name: ag.agent_name || 'Asesor',
    promedio: ag.average_score || 0,
    llamadas: ag.total_calls || 0,
  }))

  // 3. Programas detectados
  const programsData = (metrics?.top_programs || []).map((p) => ({
    name:
      p.program_name.length > 20
        ? p.program_name.substring(0, 20) + '...'
        : p.program_name,
    total: p.count,
  }))

  return (
    <div className='space-y-6'>
      {/* Gráfico Principal: Tendencia de Calidad */}
      <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl'>
        <div className='flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'>
              <TrendingUp className='w-4 h-4' />
            </div>
            <div>
              <h4 className='text-sm font-bold text-white tracking-tight'>
                Tendencia de Calidad QA
              </h4>
              <p className='text-xs text-slate-400'>
                Evolución de calificación y empatía en llamadas recientes
              </p>
            </div>
          </div>
          <div className='flex items-center gap-4 text-xs font-medium'>
            <span className='flex items-center gap-1.5 text-cyan-300'>
              <span className='w-2.5 h-2.5 rounded-full bg-cyan-400' />{' '}
              Calificación
            </span>
            <span className='flex items-center gap-1.5 text-purple-300'>
              <span className='w-2.5 h-2.5 rounded-full bg-purple-400' />{' '}
              Empatía
            </span>
          </div>
        </div>

        <div className='h-64 w-full'>
          {timelineData.length === 0 ? (
            <div className='h-full flex items-center justify-center text-xs text-slate-500 font-mono'>
              Esperando más auditorías para trazar la línea de tendencia...
            </div>
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={timelineData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='colorScore' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#22d3ee' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#22d3ee' stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id='colorEmp' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#a855f7' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#a855f7' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='#1e2230'
                  vertical={false}
                />
                <XAxis
                  dataKey='fecha'
                  stroke='#64748b'
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  stroke='#64748b'
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type='monotone'
                  dataKey='calificacion'
                  name='Calificación'
                  stroke='#22d3ee'
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill='url(#colorScore)'
                />
                <Area
                  type='monotone'
                  dataKey='empatia'
                  name='Empatía'
                  stroke='#a855f7'
                  strokeWidth={2}
                  fillOpacity={1}
                  fill='url(#colorEmp)'
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráficos Inferiores en 2 Columnas */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Rendimiento por Asesor */}
        <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl'>
          <div className='flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800/80'>
            <div className='p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'>
              <Users className='w-4 h-4' />
            </div>
            <div>
              <h4 className='text-sm font-bold text-white tracking-tight'>
                Rendimiento por Asesor
              </h4>
              <p className='text-xs text-slate-400'>
                Promedio de calificación individual
              </p>
            </div>
          </div>

          <div className='h-56 w-full'>
            {agentsData.length === 0 ? (
              <div className='h-full flex items-center justify-center text-xs text-slate-500'>
                Sin datos de asesores registrados.
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={agentsData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='#1e2230'
                    vertical={false}
                  />
                  <XAxis
                    dataKey='name'
                    stroke='#64748b'
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    stroke='#64748b'
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey='promedio'
                    name='Puntaje Promedio'
                    fill='#38bdf8'
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribución de Programas Consultados */}
        <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl'>
          <div className='flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800/80'>
            <div className='p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'>
              <BookOpen className='w-4 h-4' />
            </div>
            <div>
              <h4 className='text-sm font-bold text-white tracking-tight'>
                Programas Más Consultados
              </h4>
              <p className='text-xs text-slate-400'>
                Volumen de llamadas por programa educativo
              </p>
            </div>
          </div>

          <div className='h-56 w-full'>
            {programsData.length === 0 ? (
              <div className='h-full flex items-center justify-center text-xs text-slate-500'>
                Sin programas identificados aún.
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={programsData}
                  layout='vertical'
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='#1e2230'
                    horizontal={false}
                  />
                  <XAxis
                    type='number'
                    stroke='#64748b'
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey='name'
                    type='category'
                    stroke='#94a3b8'
                    fontSize={11}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey='total'
                    name='Llamadas'
                    fill='#34d399'
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsCharts
