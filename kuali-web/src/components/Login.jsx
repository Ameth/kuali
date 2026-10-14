// src/components/Login.jsx
import React, { useState } from 'react'
import { Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react'
import { apiService } from '../services/api'

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@centroinca.com')
  const [password, setPassword] = useState('Inca2026*')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Toma la versión inyectada por vite.config.js o fallback si no está definida
  const appVersion =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await apiService.login(email, password)
      localStorage.setItem('kuali_token', data.access_token)
      localStorage.setItem(
        'kuali_user',
        JSON.stringify({
          id: data.user_id,
          name: data.full_name,
          email: data.email,
          role: data.role,
          company_id: data.company_id,
          company_name: data.company_name,
        }),
      )
      onLoginSuccess(data)
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Error de autenticación. Verifica tus credenciales.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#0d0e12] flex items-center justify-center p-4 relative overflow-hidden font-sans'>
      {/* Luces de fondo difuminadas */}
      <div className='absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none' />

      <div className='w-full max-w-md relative z-10'>
        {/* Cabecera del formulario */}
        <div className='text-center mb-8 flex flex-col items-center'>
          <div className='mb-4 transition-transform duration-300 hover:scale-105'>
            <img
              src='/kuali-logo.png'
              alt='Logo Kuali'
              className='h-16 w-auto object-contain drop-shadow-[0_8px_25px_rgba(34,211,238,0.25)]'
            />
          </div>
          <div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 mb-2.5'>
            <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
            <span className='text-xs font-semibold tracking-wider text-slate-200 uppercase'>
              Kuali · Sistema QA
            </span>
          </div>
          {/* Nuevo Eslogan */}
          <p className='text-sm text-slate-300 font-medium'>
            Asistente inteligente de análisis y calidad
          </p>
        </div>

        {/* Tarjeta de Login */}
        <div className='bg-[#14161f]/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl'>
          <form onSubmit={handleSubmit} className='space-y-5'>
            {error && (
              <div className='p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2.5'>
                <ShieldAlert className='w-5 h-5 flex-shrink-0' />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className='block text-sm font-medium text-slate-200 mb-2'>
                Correo Electrónico
              </label>
              <div className='relative'>
                <Mail className='w-4 h-4 text-slate-400 absolute left-3.5 top-3.5' />
                <input
                  type='email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='usuario@centroinca.com'
                  className='w-full bg-[#0d0e15] border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-200 mb-2'>
                Contraseña
              </label>
              <div className='relative'>
                <Lock className='w-4 h-4 text-slate-400 absolute left-3.5 top-3.5' />
                <input
                  type='password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='w-full bg-[#0d0e15] border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='cursor-pointer w-full mt-2 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-[0.99]'
            >
              {loading ? (
                <span>Validando acceso...</span>
              ) : (
                <>
                  <span>Ingresar a Kuali</span>
                  <ArrowRight className='w-4 h-4' />
                </>
              )}
            </button>
          </form>

          {/* Pie con Versión Dinámica */}
          <div className='mt-6 pt-5 border-t border-slate-800/80 text-center'>
            <span className='text-xs text-slate-400 font-mono tracking-wide'>
              Versión {appVersion}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
