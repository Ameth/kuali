// src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw,
  LogOut,
  Building,
  User,
  LayoutDashboard,
  PhoneCall,
  KeyRound,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { apiService } from './services/api'
import KPICards from './components/KPICards'
import AuditsTable from './components/AuditsTable'
import AuditDetailModal from './components/AuditDetailModal'
import Login from './components/Login'
import AnalyticsCharts from './components/AnalyticsCharts'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem('kuali_token')
    const user = localStorage.getItem('kuali_user')
    return token && user ? JSON.parse(user) : null
  })

  // Vista activa: 'dashboard' | 'audits' | 'profile' | 'admin'
  const [currentView, setCurrentView] = useState('dashboard')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const [metrics, setMetrics] = useState(null)
  const [agents, setAgents] = useState([])
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingAudits, setLoadingAudits] = useState(true)

  // Estructura paginada que coincide con la respuesta del backend
  const [auditsData, setAuditsData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 1,
  })

  const [filters, setFilters] = useState({
    agent_id: '',
    detected_program: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 10,
  })

  // Estado que almacena el objeto completo de la llamada seleccionada
  const [selectedAudit, setSelectedAudit] = useState(null)

  // Cerrar el menú desplegable al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      console.error('Error cargando métricas:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }, [session])

  const loadAudits = useCallback(async () => {
    if (!session) return
    try {
      setLoadingAudits(true)
      const res = await apiService.getAudits(filters)
      if (Array.isArray(res)) {
        setAuditsData({
          items: res,
          total: res.length,
          page: 1,
          limit: 10,
          total_pages: 1,
        })
      } else {
        setAuditsData(res)
      }
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
      page: 1,
    }))
  }

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }))
  }

  const handleRefresh = () => {
    loadDashboardData()
    loadAudits()
  }

  // Redirigir a login si no hay token o sesión activa
  if (!session) {
    return <Login onLoginSuccess={(userData) => setSession(userData)} />
  }

  return (
    <div className='min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col font-sans'>
      {/* Barra de Navegación Superior */}
      <header className='border-b border-slate-800/80 bg-[#14161f]/90 backdrop-blur-md sticky top-0 z-30'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between'>
          {/* Logo y Empresa */}
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-3'>
              <img
                src='/kuali-logo.png'
                alt='Kuali Logo'
                className='h-8 w-auto object-contain drop-shadow-[0_4px_12px_rgba(34,211,238,0.2)]'
              />
              <span className='text-[11px] bg-slate-800/80 text-cyan-400 font-medium px-2.5 py-1 rounded-lg border border-slate-700/60 hidden md:flex items-center gap-1.5'>
                <Building className='w-3.5 h-3.5 text-cyan-400' />
                {session.company_name || 'Centro Inca'}
              </span>
            </div>

            {/* Pestañas de Navegación */}
            <nav className='flex items-center gap-1 bg-[#0d0e15] p-1 rounded-xl border border-slate-800/80'>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <LayoutDashboard className='w-3.5 h-3.5' />
                <span>Panel de control</span>
              </button>

              <button
                onClick={() => setCurrentView('audits')}
                className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'audits'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <PhoneCall className='w-3.5 h-3.5' />
                <span>Llamadas auditadas</span>
              </button>

              {session.role === 'superadmin' && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentView === 'admin'
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <ShieldCheck className='w-3.5 h-3.5 text-purple-400' />
                  <span>Administración</span>
                </button>
              )}
            </nav>
          </div>

          {/* Menú de Usuario */}
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

            <div className='relative' ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className='cursor-pointer flex items-center gap-2.5 text-xs text-slate-200 bg-[#14161f] hover:bg-[#1a1d28] border border-slate-700/70 py-1.5 px-3 rounded-xl transition-all'
              >
                <div className='w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-cyan-300 font-bold'>
                  <User className='w-3.5 h-3.5' />
                </div>
                <div className='text-left hidden md:block'>
                  <div className='font-semibold text-slate-100 text-xs leading-none'>
                    {session.full_name || session.name || 'Supervisor'}
                  </div>
                  <div className='text-[10px] text-slate-400 font-medium capitalize mt-0.5'>
                    {session.role || 'Supervisor'}
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className='absolute right-0 mt-2 w-56 bg-[#14161f] border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150'>
                  <div className='px-4 py-2 border-b border-slate-800/80'>
                    <p className='text-xs font-semibold text-white'>
                      {session.email}
                    </p>
                    <p className='text-[11px] text-cyan-400 font-medium mt-0.5'>
                      {session.company_name || 'Centro Inca'}
                    </p>
                  </div>

                  <div className='p-1'>
                    <button
                      onClick={() => {
                        setCurrentView('profile')
                        setUserMenuOpen(false)
                      }}
                      className='cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors text-left'
                    >
                      <KeyRound className='w-4 h-4 text-cyan-400' />
                      <span>Mi perfil y contraseña</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className='cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left mt-1'
                    >
                      <LogOut className='w-4 h-4' />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className='flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6'>
        {currentView === 'dashboard' && (
          <div className='space-y-6'>
            <KPICards metrics={metrics} loading={loadingMetrics} />
            <AnalyticsCharts metrics={metrics} audits={auditsData.items} />
          </div>
        )}

        {currentView === 'audits' && (
          <AuditsTable
            data={auditsData}
            agents={agents}
            loading={loadingAudits}
            filters={filters}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onSelectAudit={(audit) => setSelectedAudit(audit)}
          />
        )}

        {currentView === 'profile' && <UserProfile session={session} />}

        {currentView === 'admin' && session.role === 'superadmin' && (
          <AdminPanel />
        )}
      </main>

      {/* Modal de Detalle Dinámico */}
      {selectedAudit && (
        <AuditDetailModal
          audit={selectedAudit}
          onClose={() => setSelectedAudit(null)}
        />
      )}
    </div>
  )
}

export default App
