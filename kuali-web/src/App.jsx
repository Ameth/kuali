// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, LogOut, Building, User } from 'lucide-react'
import { apiService } from './services/api'
import KPICards from './components/KPICards'
import AuditsTable from './components/AuditsTable'
import AuditDetailModal from './components/AuditDetailModal'
import Login from './components/Login'

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem('kuali_token')
    const user = localStorage.getItem('kuali_user')
    return token && user ? JSON.parse(user) : null
  })

  const [metrics, setMetrics] = useState(null)
  const [audits, setAudits] = useState([])
  const [agents, setAgents] = useState([])
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingAudits, setLoadingAudits] = useState(true)

  const [filters, setFilters] = useState({
    agent_id: '',
    detected_program: '',
  })

  const [selectedAuditId, setSelectedAuditId] = useState(null)

  const loadDashboardData = useCallback(async () => {
    if (!session) return
    try {
      setLoadingMetrics(true)
      const [metricsData, agentsData] = await Promise.all([
        apiService.getDashboardMetrics(),
        apiService.getAgents(true),
      ])
      setMetrics(metricsData)
      setAgents(agentsData)
    } catch (err) {
      console.error('Error cargando KPIs:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }, [session])

  const loadAudits = useCallback(async () => {
    if (!session) return
    try {
      setLoadingAudits(true)
      const data = await apiService.getAudits(filters)
      setAudits(data)
    } catch (err) {
      console.error('Error cargando auditorías:', err)
    } finally {
      setLoadingAudits(false)
    }
  }, [session, filters])

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session, loadDashboardData])

  useEffect(() => {
    if (session) {
      loadAudits()
    }
  }, [session, loadAudits])

  const handleLogout = () => {
    localStorage.removeItem('kuali_token')
    localStorage.removeItem('kuali_user')
    setSession(null)
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleRefresh = () => {
    loadDashboardData()
    loadAudits()
  }

  if (!session) {
    return <Login onLoginSuccess={(userData) => setSession(userData)} />
  }

  return (
    <div className='min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col font-sans'>
      {/* Barra de Navegación */}
      <header className='border-b border-slate-800/80 bg-[#14161f]/80 backdrop-blur-md sticky top-0 z-30'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between'>
          {/* Logo Horizontal y Empresa */}
          <div className='flex items-center gap-4'>
            <img
              src='/kuali-logo.png'
              alt='Kuali Logo'
              className='h-8 w-auto object-contain drop-shadow-[0_4px_12px_rgba(34,211,238,0.2)]'
            />
            <div className='h-6 w-px bg-slate-800 hidden sm:block' />
            <div className='hidden sm:flex items-center gap-2'>
              <span className='text-[11px] bg-slate-800/80 text-cyan-400 font-semibold px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5'>
                <Building className='w-3.5 h-3.5 text-cyan-400' />
                {session.company_name || 'Centro Inca'}
              </span>
              <span className='text-[11px] text-slate-500'>QA Call Center</span>
            </div>
          </div>

          {/* Perfil y Acciones */}
          <div className='flex items-center gap-3'>
            <button
              onClick={handleRefresh}
              className='cursor-pointer flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#1a1d28] hover:bg-[#232736] border border-slate-700/60 px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95'
              title='Actualizar datos'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingMetrics || loadingAudits ? 'animate-spin text-cyan-400' : ''}`}
              />
              <span className='hidden sm:inline'>Actualizar</span>
            </button>

            <div className='h-6 w-px bg-slate-800' />

            {/* Usuario Activo */}
            <div className='flex items-center gap-2 text-xs text-slate-300'>
              <div className='w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-cyan-300 font-bold'>
                <User className='w-3.5 h-3.5' />
              </div>
              <span className='hidden md:inline font-medium text-slate-200'>
                {session.full_name || session.name || 'Supervisor'}
              </span>
            </div>

            {/* Salir */}
            <button
              onClick={handleLogout}
              className='cursor-pointer p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors'
              title='Cerrar sesión'
            >
              <LogOut className='w-4 h-4' />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className='flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6'>
        <KPICards metrics={metrics} loading={loadingMetrics} />

        <AuditsTable
          audits={audits}
          agents={agents}
          loading={loadingAudits}
          filters={filters}
          onFilterChange={handleFilterChange}
          onSelectAudit={(id) => setSelectedAuditId(id)}
        />
      </main>

      {/* Modal de Detalle */}
      <AuditDetailModal
        auditId={selectedAuditId}
        onClose={() => setSelectedAuditId(null)}
      />
    </div>
  )
}

export default App
