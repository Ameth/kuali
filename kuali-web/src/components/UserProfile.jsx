// src/components/UserProfile.jsx
import React, { useState } from 'react'
import {
  User,
  Mail,
  Building,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { apiService } from '../services/api'

const UserProfile = ({ session }) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmación de la contraseña no coincide.')
      return
    }

    try {
      setLoading(true)
      await apiService.changePassword(currentPassword, newPassword)
      setSuccessMsg('¡Contraseña actualizada exitosamente!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error actualizando contraseña.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Tarjeta 1: Información de Perfil */}
        <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl'>
          <div className='flex items-center gap-3 mb-5 pb-3 border-b border-slate-800/80'>
            <div className='p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'>
              <User className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-base font-bold text-white tracking-tight'>
                Información de la Cuenta
              </h3>
              <p className='text-xs text-slate-400'>
                Datos corporativos de tu usuario
              </p>
            </div>
          </div>

          <div className='space-y-3.5 text-xs'>
            <div className='bg-[#0d0e15] border border-slate-800/80 p-3.5 rounded-xl'>
              <span className='text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1'>
                Nombre de Usuario
              </span>
              <span className='text-sm font-semibold text-white'>
                {session?.full_name || session?.name || 'Supervisor General'}
              </span>
            </div>

            <div className='bg-[#0d0e15] border border-slate-800/80 p-3.5 rounded-xl'>
              <span className='text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1'>
                Correo Electrónico
              </span>
              <span className='text-sm font-mono text-slate-200'>
                {session?.email}
              </span>
            </div>

            <div className='bg-[#0d0e15] border border-slate-800/80 p-3.5 rounded-xl'>
              <span className='text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1'>
                Empresa Vinculada
              </span>
              <span className='text-sm font-semibold text-cyan-300 flex items-center gap-1.5'>
                <Building className='w-4 h-4 text-cyan-400' />
                {session?.company_name || 'Centro Inca'}
              </span>
            </div>

            <div className='bg-[#0d0e15] border border-slate-800/80 p-3.5 rounded-xl'>
              <span className='text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1'>
                Rol del Sistema
              </span>
              <span className='text-sm font-semibold text-purple-300 flex items-center gap-1.5 capitalize'>
                <ShieldCheck className='w-4 h-4 text-purple-400' />
                {session?.role || 'Supervisor'}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Cambio de Contraseña */}
        <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl'>
          <div className='flex items-center gap-3 mb-5 pb-3 border-b border-slate-800/80'>
            <div className='p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400'>
              <KeyRound className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-base font-bold text-white tracking-tight'>
                Seguridad y Contraseña
              </h3>
              <p className='text-xs text-slate-400'>
                Actualiza tu clave de acceso
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {errorMsg && (
              <div className='p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 flex-shrink-0' />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className='p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2'>
                <CheckCircle2 className='w-4 h-4 flex-shrink-0' />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Contraseña Actual */}
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
                Contraseña actual
              </label>
              <div className='relative'>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder='••••••••'
                  className='w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 transition-colors pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowCurrent(!showCurrent)}
                  className='cursor-pointer absolute right-3 top-3 text-slate-400 hover:text-slate-200'
                >
                  {showCurrent ? (
                    <EyeOff className='w-4 h-4' />
                  ) : (
                    <Eye className='w-4 h-4' />
                  )}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
                Nueva contraseña
              </label>
              <div className='relative'>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='Mínimo 6 caracteres'
                  className='w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 transition-colors pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowNew(!showNew)}
                  className='cursor-pointer absolute right-3 top-3 text-slate-400 hover:text-slate-200'
                >
                  {showNew ? (
                    <EyeOff className='w-4 h-4' />
                  ) : (
                    <Eye className='w-4 h-4' />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
                Confirmar nueva contraseña
              </label>
              <input
                type='password'
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Repite la nueva contraseña'
                className='w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 transition-colors'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='cursor-pointer w-full mt-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]'
            >
              <KeyRound className='w-4 h-4' />
              <span>
                {loading ? 'Actualizando clave...' : 'Guardar nueva contraseña'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
