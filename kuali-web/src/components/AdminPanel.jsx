// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react'
import {
  Building2,
  Cpu,
  Plus,
  Key,
  Copy,
  Check,
  Save,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  RefreshCw,
  Edit2,
  Users,
  RotateCw,
  X,
  UserPlus,
  Lock,
  Mail,
  User,
  PhoneForwarded,
} from 'lucide-react'
import { apiService } from '../services/api'

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('companies')

  // Empresas
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [selectedPbxType, setSelectedPbxType] = useState('issabel')
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [companyError, setCompanyError] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  // Edición de Empresa
  const [editingCompany, setEditingCompany] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPbxType, setEditPbxType] = useState('issabel')
  const [savingEdit, setSavingEdit] = useState(false)

  // Modal Gestión de Usuarios
  const [selectedCompanyForUsers, setSelectedCompanyForUsers] = useState(null)
  const [companyUsers, setCompanyUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userError, setUserError] = useState(null)
  const [userSuccess, setUserSuccess] = useState(null)
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'admin',
  })
  const [creatingUser, setCreatingUser] = useState(false)

  // Configuración de IA por Empresa
  const [selectedAICompanyId, setSelectedAICompanyId] = useState('')
  const [aiConfig, setAiConfig] = useState({
    gemini_model: 'gemini-1.5-flash',
    temperature: 0.2,
    audit_prompt: '',
    updated_at: null,
    updated_by: null,
  })
  const [loadingAI, setLoadingAI] = useState(false)
  const [savingAI, setSavingAI] = useState(false)
  const [aiSuccessMsg, setAiSuccessMsg] = useState(null)
  const [aiErrorMsg, setAiErrorMsg] = useState(null)

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true)
      const data = await apiService.getAdminCompanies()
      setCompanies(data)
      if (data.length > 0 && !selectedAICompanyId) {
        setSelectedAICompanyId(data[0].id)
      }
    } catch (err) {
      console.error('Error cargando empresas:', err)
    } finally {
      setLoadingCompanies(false)
    }
  }

  const loadCompanyAIConfig = async (companyId) => {
    if (!companyId) return
    try {
      setLoadingAI(true)
      setAiSuccessMsg(null)
      setAiErrorMsg(null)
      const data = await apiService.getCompanyAIConfig(companyId)
      setAiConfig({
        gemini_model: data.gemini_model,
        temperature: data.temperature,
        audit_prompt: data.audit_prompt,
        updated_at: data.updated_at,
        updated_by: data.updated_by,
      })
    } catch (err) {
      setAiErrorMsg('Error cargando los parámetros de IA para esta empresa.')
    } finally {
      setLoadingAI(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedAICompanyId) {
      loadCompanyAIConfig(selectedAICompanyId)
    }
  }, [selectedAICompanyId])

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return
    try {
      setCreatingCompany(true)
      setCompanyError(null)
      await apiService.createCompany(newCompanyName.trim(), selectedPbxType)
      setNewCompanyName('')
      await loadCompanies()
    } catch (err) {
      setCompanyError(err.response?.data?.detail || 'Error creando la empresa.')
    } finally {
      setCreatingCompany(false)
    }
  }

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleRegenerateKey = async (company) => {
    if (
      !window.confirm(
        `¿Estás seguro de regenerar la API Key para "${company.name}"? La clave anterior dejará de funcionar en la PBX.`,
      )
    ) {
      return
    }
    try {
      await apiService.regenerateCompanyKey(company.id)
      await loadCompanies()
    } catch (err) {
      alert('Error regenerando la clave de PBX.')
    }
  }

  const handleToggleStatus = async (company) => {
    const action = company.is_active ? 'inactivar' : 'activar'
    if (
      !window.confirm(
        `¿Estás seguro de ${action} a "${company.name}"? ${company.is_active ? 'Ningún usuario de esta empresa podrá acceder.' : 'Los usuarios podrán ingresar nuevamente.'}`,
      )
    ) {
      return
    }
    try {
      await apiService.toggleCompanyStatus(company.id)
      await loadCompanies()
    } catch (err) {
      alert('Error cambiando el estado de la empresa.')
    }
  }

  const handleStartEdit = (company) => {
    setEditingCompany(company)
    setEditName(company.name)
    setEditPbxType(company.pbx_type || 'issabel')
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return
    try {
      setSavingEdit(true)
      await apiService.updateCompany(editingCompany.id, {
        name: editName.trim(),
        pbx_type: editPbxType,
      })
      setEditingCompany(null)
      await loadCompanies()
    } catch (err) {
      alert('Error actualizando la empresa.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Gestión de Usuarios
  const handleOpenUsersModal = async (company) => {
    setSelectedCompanyForUsers(company)
    setUserError(null)
    setUserSuccess(null)
    setNewUser({ full_name: '', email: '', password: '', role: 'admin' })
    try {
      setLoadingUsers(true)
      const users = await apiService.getCompanyUsers(company.id)
      setCompanyUsers(users)
    } catch (err) {
      setUserError('Error al cargar la lista de usuarios.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserError(null)
    setUserSuccess(null)
    try {
      setCreatingUser(true)
      await apiService.createCompanyUser(selectedCompanyForUsers.id, newUser)
      setUserSuccess('Usuario creado exitosamente.')
      setNewUser({ full_name: '', email: '', password: '', role: 'admin' })
      const users = await apiService.getCompanyUsers(selectedCompanyForUsers.id)
      setCompanyUsers(users)
    } catch (err) {
      setUserError(err.response?.data?.detail || 'Error creando usuario.')
    } finally {
      setCreatingUser(false)
    }
  }

  // Guardar Ajustes IA por Empresa
  const handleSaveAIConfig = async (e) => {
    e.preventDefault()
    if (!selectedAICompanyId) return
    try {
      setSavingAI(true)
      setAiSuccessMsg(null)
      setAiErrorMsg(null)
      const updated = await apiService.updateCompanyAIConfig(
        selectedAICompanyId,
        {
          gemini_model: aiConfig.gemini_model,
          temperature: aiConfig.temperature,
          audit_prompt: aiConfig.audit_prompt,
        },
      )
      setAiConfig((prev) => ({
        ...prev,
        updated_at: updated.updated_at,
        updated_by: updated.updated_by,
      }))
      setAiSuccessMsg(
        `Parámetros y Prompt de auditoría guardados exitosamente para este cliente.`,
      )
    } catch (err) {
      setAiErrorMsg(
        err.response?.data?.detail || 'Error guardando parámetros de IA.',
      )
    } finally {
      setSavingAI(false)
    }
  }

  const formatPbxLabel = (type) => {
    const map = {
      issabel: 'Issabel PBX',
      asterisk: 'Asterisk Puro',
      freepbx: 'FreePBX',
      vicidial: 'Vicidial',
      generic: 'API Genérica',
    }
    return map[type] || type || 'Issabel PBX'
  }

  const currentSelectedCompanyName =
    companies.find((c) => c.id === selectedAICompanyId)?.name ||
    'Seleccione empresa'

  return (
    <div className='space-y-6'>
      {/* Cabecera del Panel */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400'>
            <ShieldCheck className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-bold text-white tracking-tight'>
                Panel Maestro de Super Administrador
              </h2>
              <span className='text-[10px] font-mono uppercase bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-md font-semibold'>
                Kuali Core
              </span>
            </div>
            <p className='text-xs text-slate-400'>
              Administración global de inquilinos (Tenants) y motor de
              inteligencia artificial
            </p>
          </div>
        </div>

        {/* Sub-pestañas */}
        <div className='flex items-center gap-1 bg-[#0d0e15] p-1 rounded-xl border border-slate-800 self-start sm:self-auto'>
          <button
            onClick={() => setActiveTab('companies')}
            className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'companies'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className='w-3.5 h-3.5' />
            <span>Clientes & PBX</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_engine')}
            className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ai_engine'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className='w-3.5 h-3.5' />
            <span>Motor de IA por Cliente</span>
          </button>
        </div>
      </div>

      {/* Vista 1: Clientes y Tenants */}
      {activeTab === 'companies' && (
        <div className='space-y-6'>
          <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl'>
            <h3 className='text-sm font-bold text-white mb-1 flex items-center gap-2'>
              <Plus className='w-4 h-4 text-cyan-400' />
              <span>Registrar Nuevo Cliente / Tenant</span>
            </h3>
            <p className='text-xs text-slate-400 mb-4'>
              Crea una empresa en Kuali y genera automáticamente su API Key de
              integración PBX
            </p>

            <form
              onSubmit={handleCreateCompany}
              className='flex flex-col sm:flex-row items-center gap-3'
            >
              <input
                type='text'
                required
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder='Nombre de la empresa (ej: Centro Inca, Clínica del Norte...)'
                className='w-full sm:flex-1 bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500'
              />
              <select
                value={selectedPbxType}
                onChange={(e) => setSelectedPbxType(e.target.value)}
                className='cursor-pointer w-full sm:w-44 bg-[#0d0e15] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400'
              >
                <option value='issabel'>Issabel PBX</option>
                <option value='asterisk'>Asterisk Puro</option>
                <option value='freepbx'>FreePBX</option>
                <option value='vicidial'>Vicidial</option>
                <option value='generic'>API Genérica</option>
              </select>
              <button
                type='submit'
                disabled={creatingCompany}
                className='cursor-pointer w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50'
              >
                <Plus className='w-4 h-4' />
                <span>{creatingCompany ? 'Creando...' : 'Crear Cliente'}</span>
              </button>
            </form>

            {companyError && (
              <p className='text-xs text-rose-400 mt-2.5 flex items-center gap-1.5'>
                <AlertCircle className='w-4 h-4' /> {companyError}
              </p>
            )}
          </div>

          <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl'>
            <div className='p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#10121a]'>
              <div className='flex items-center gap-2.5'>
                <Building2 className='w-5 h-5 text-purple-400' />
                <span className='font-bold text-white text-sm'>
                  Empresas Registradas
                </span>
                <span className='text-xs bg-slate-800 text-purple-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-slate-700'>
                  {companies.length}
                </span>
              </div>
              <button
                onClick={loadCompanies}
                className='cursor-pointer p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors'
                title='Refrescar lista'
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingCompanies ? 'animate-spin text-purple-400' : ''}`}
                />
              </button>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm text-slate-200'>
                <thead className='bg-[#0d0e15] text-xs uppercase tracking-wider text-slate-300 border-b border-slate-800'>
                  <tr>
                    <th className='py-3.5 px-4 font-semibold'>
                      Empresa / Tenant
                    </th>
                    <th className='py-3.5 px-4 font-semibold'>Tipo PBX</th>
                    <th className='py-3.5 px-4 font-semibold'>Llamadas</th>
                    <th className='py-3.5 px-4 font-semibold'>
                      API Key para PBX
                    </th>
                    <th className='py-3.5 px-4 text-center font-semibold'>
                      Estado
                    </th>
                    <th className='py-3.5 px-4 text-right font-semibold'>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-800/60 font-normal'>
                  {loadingCompanies ? (
                    <tr>
                      <td
                        colSpan='6'
                        className='py-8 text-center text-slate-400 text-xs'
                      >
                        Cargando empresas...
                      </td>
                    </tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td
                        colSpan='6'
                        className='py-8 text-center text-slate-400 text-xs'
                      >
                        No hay empresas registradas.
                      </td>
                    </tr>
                  ) : (
                    companies.map((c) => (
                      <tr
                        key={c.id}
                        className='hover:bg-slate-800/30 transition-colors'
                      >
                        <td className='py-4 px-4 font-semibold text-white'>
                          {editingCompany?.id === c.id ? (
                            <div className='flex items-center gap-2'>
                              <input
                                type='text'
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className='bg-[#0d0e15] border border-cyan-400 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none'
                              />
                              <select
                                value={editPbxType}
                                onChange={(e) => setEditPbxType(e.target.value)}
                                className='bg-[#0d0e15] border border-cyan-400 text-white text-xs px-2 py-1.5 rounded-lg outline-none'
                              >
                                <option value='issabel'>Issabel</option>
                                <option value='asterisk'>Asterisk</option>
                                <option value='freepbx'>FreePBX</option>
                                <option value='vicidial'>Vicidial</option>
                                <option value='generic'>Genérica</option>
                              </select>
                              <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className='cursor-pointer text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1.5 rounded-lg'
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingCompany(null)}
                                className='cursor-pointer text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-lg'
                              >
                                <X className='w-3.5 h-3.5' />
                              </button>
                            </div>
                          ) : (
                            <div className='flex items-center gap-2.5'>
                              <div className='w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-xs'>
                                {c.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span>{c.name}</span>
                                {c.updated_by && (
                                  <p className='text-[10px] text-slate-500 font-normal'>
                                    Modif. por {c.updated_by}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className='py-4 px-4'>
                          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-cyan-950/50 text-cyan-300 border border-cyan-800/50'>
                            <PhoneForwarded className='w-3 h-3 text-cyan-400' />
                            {formatPbxLabel(c.pbx_type)}
                          </span>
                        </td>

                        <td className='py-4 px-4 font-mono text-cyan-300 font-bold'>
                          {c.total_audits}
                        </td>

                        <td className='py-4 px-4'>
                          {c.api_key ? (
                            <div className='inline-flex items-center gap-2 bg-[#0d0e15] border border-slate-800 px-3 py-1 rounded-xl'>
                              <Key className='w-3.5 h-3.5 text-slate-400' />
                              <span className='font-mono text-xs text-slate-300 max-w-[200px] truncate'>
                                {c.api_key}
                              </span>
                              <button
                                onClick={() => handleCopyKey(c.api_key)}
                                className='cursor-pointer p-1 text-slate-400 hover:text-cyan-300 transition-colors'
                                title='Copiar API Key'
                              >
                                {copiedKey === c.api_key ? (
                                  <Check className='w-3.5 h-3.5 text-emerald-400' />
                                ) : (
                                  <Copy className='w-3.5 h-3.5' />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className='text-slate-500 text-xs italic'>
                              Sin API Key
                            </span>
                          )}
                        </td>

                        <td className='py-4 px-4 text-center'>
                          <button
                            onClick={() => handleToggleStatus(c)}
                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                              c.is_active
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/30'
                            }`}
                            title='Haz clic para cambiar estado'
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span>{c.is_active ? 'Activo' : 'Inactivo'}</span>
                          </button>
                        </td>

                        <td className='py-4 px-4 text-right'>
                          <div className='inline-flex items-center gap-1.5'>
                            <button
                              onClick={() => handleStartEdit(c)}
                              className='cursor-pointer p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors'
                              title='Editar empresa y tipo PBX'
                            >
                              <Edit2 className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleRegenerateKey(c)}
                              className='cursor-pointer p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors'
                              title='Regenerar API Key de PBX'
                            >
                              <RotateCw className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleOpenUsersModal(c)}
                              className='cursor-pointer flex items-center gap-1.5 text-xs bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 px-2.5 py-1.5 rounded-lg transition-colors ml-1'
                              title='Gestionar Usuarios'
                            >
                              <Users className='w-3.5 h-3.5' />
                              <span>Usuarios</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vista 2: Ajustes de IA por Cliente */}
      {activeTab === 'ai_engine' && (
        <div className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80'>
            <div className='flex items-center gap-3'>
              <div className='p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'>
                <Sliders className='w-5 h-5' />
              </div>
              <div>
                <h3 className='text-base font-bold text-white tracking-tight'>
                  Parametrización de IA por Cliente
                </h3>
                <p className='text-xs text-slate-400'>
                  Personaliza el modelo, rigurosidad y criterios de evaluación
                  QA para cada empresa
                </p>
              </div>
            </div>

            {/* Selector de Cliente */}
            <div className='flex items-center gap-2 self-start md:self-auto'>
              <span className='text-xs font-semibold text-slate-400'>
                Cliente a configurar:
              </span>
              <select
                value={selectedAICompanyId}
                onChange={(e) => setSelectedAICompanyId(e.target.value)}
                className='cursor-pointer bg-[#0d0e15] border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 transition-colors'
              >
                {companies.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className='bg-[#14161f] text-white'
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {aiSuccessMsg && (
            <div className='mb-5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2'>
              <CheckCircle2 className='w-4 h-4 flex-shrink-0' />
              <span>{aiSuccessMsg}</span>
            </div>
          )}

          {aiErrorMsg && (
            <div className='mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 flex-shrink-0' />
              <span>{aiErrorMsg}</span>
            </div>
          )}

          {loadingAI ? (
            <div className='py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2'>
              <RefreshCw className='w-5 h-5 animate-spin text-cyan-400' />
              <span>
                Cargando parámetros de {currentSelectedCompanyName}...
              </span>
            </div>
          ) : (
            <form onSubmit={handleSaveAIConfig} className='space-y-5'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                <div>
                  <label className='block text-xs font-semibold text-slate-300 mb-1.5'>
                    Modelo de Gemini asignado
                  </label>
                  <select
                    value={aiConfig.gemini_model}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, gemini_model: e.target.value })
                    }
                    className='cursor-pointer w-full bg-[#0d0e15] border border-slate-700 text-slate-100 text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 transition-colors'
                  >
                    <option value='gemini-1.5-flash'>
                      Gemini 1.5 Flash (Recomendado: Rápido y económico)
                    </option>
                    <option value='gemini-1.5-pro'>
                      Gemini 1.5 Pro (Máximo razonamiento)
                    </option>
                    <option value='gemini-2.0-flash-exp'>
                      Gemini 2.0 Flash Experimental
                    </option>
                  </select>
                </div>

                <div>
                  <div className='flex justify-between items-center mb-1.5'>
                    <label className='text-xs font-semibold text-slate-300'>
                      Temperatura / Rigurosidad:{' '}
                      <span className='text-cyan-400 font-mono'>
                        {aiConfig.temperature}
                      </span>
                    </label>
                    <span className='text-[11px] text-slate-400'>
                      0.0 (estricto) a 1.0 (creativo)
                    </span>
                  </div>
                  <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.05'
                    value={aiConfig.temperature}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        temperature: parseFloat(e.target.value),
                      })
                    }
                    className='w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer'
                  />
                </div>
              </div>

              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='block text-xs font-semibold text-slate-300'>
                    System Prompt de Auditoría QA para{' '}
                    <span className='text-cyan-400'>
                      {currentSelectedCompanyName}
                    </span>
                  </label>
                  {aiConfig.updated_by && (
                    <span className='text-[11px] text-slate-500'>
                      Última edición por {aiConfig.updated_by}
                    </span>
                  )}
                </div>
                <textarea
                  rows={12}
                  value={aiConfig.audit_prompt}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, audit_prompt: e.target.value })
                  }
                  placeholder={`Define los criterios específicos, KPIs y rubros a auditar para ${currentSelectedCompanyName}...`}
                  className='w-full bg-[#0d0e15] border border-slate-700 text-slate-100 font-mono text-xs rounded-xl p-4 outline-none focus:border-cyan-400 transition-colors leading-relaxed placeholder:text-slate-600'
                />
              </div>

              <div className='flex justify-between items-center pt-2'>
                <span className='text-[11px] text-slate-500'>
                  Las llamadas entrantes de {currentSelectedCompanyName} se
                  evaluarán automáticamente con esta configuración.
                </span>
                <button
                  type='submit'
                  disabled={savingAI}
                  className='cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 disabled:opacity-50'
                >
                  <Save className='w-4 h-4' />
                  <span>
                    {savingAI
                      ? 'Guardando ajustes...'
                      : `Guardar Ajustes de ${currentSelectedCompanyName}`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal: Gestión de Usuarios del Tenant */}
      {selectedCompanyForUsers && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'>
          <div className='bg-[#14161f] border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
            <div className='p-5 border-b border-slate-800 flex items-center justify-between bg-[#10121a]'>
              <div className='flex items-center gap-2.5'>
                <Users className='w-5 h-5 text-purple-400' />
                <div>
                  <h3 className='text-sm font-bold text-white'>
                    Usuarios de {selectedCompanyForUsers.name}
                  </h3>
                  <p className='text-[11px] text-slate-400'>
                    Gestiona accesos y crea supervisores para este cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyForUsers(null)}
                className='cursor-pointer p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='p-6 overflow-y-auto space-y-6'>
              {userSuccess && (
                <div className='p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 flex-shrink-0' />
                  <span>{userSuccess}</span>
                </div>
              )}
              {userError && (
                <div className='p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 flex-shrink-0' />
                  <span>{userError}</span>
                </div>
              )}

              {/* Formulario Crear Usuario */}
              <div className='bg-[#0d0e15] border border-slate-800/80 p-4 rounded-2xl'>
                <h4 className='text-xs font-bold text-white mb-3 flex items-center gap-2'>
                  <UserPlus className='w-4 h-4 text-cyan-400' />
                  <span>Registrar Nuevo Usuario / Supervisor</span>
                </h4>
                <form onSubmit={handleCreateUser} className='space-y-3'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div className='relative'>
                      <User className='w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none' />
                      <input
                        type='text'
                        required
                        placeholder='Nombre completo'
                        value={newUser.full_name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, full_name: e.target.value })
                        }
                        className='w-full bg-[#14161f] border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-cyan-400'
                      />
                    </div>
                    <div className='relative'>
                      <Mail className='w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none' />
                      <input
                        type='email'
                        required
                        placeholder='correo@ejemplo.com'
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                        className='w-full bg-[#14161f] border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-cyan-400'
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div className='relative'>
                      <Lock className='w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none' />
                      <input
                        type='password'
                        required
                        placeholder='Contraseña inicial (mín. 6)'
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        className='w-full bg-[#14161f] border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-cyan-400'
                      />
                    </div>
                    <div>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({ ...newUser, role: e.target.value })
                        }
                        className='w-full bg-[#14161f] border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400'
                      >
                        <option value='admin'>
                          Administrador / Supervisor
                        </option>
                        <option value='viewer'>Solo Lectura (Viewer)</option>
                      </select>
                    </div>
                  </div>

                  <div className='flex justify-end pt-1'>
                    <button
                      type='submit'
                      disabled={creatingUser}
                      className='cursor-pointer bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50'
                    >
                      <UserPlus className='w-3.5 h-3.5' />
                      <span>
                        {creatingUser ? 'Registrando...' : 'Agregar Usuario'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Usuarios */}
              <div className='space-y-2'>
                <h4 className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                  Usuarios Existentes ({companyUsers.length})
                </h4>
                {loadingUsers ? (
                  <p className='text-xs text-slate-500 py-4 text-center'>
                    Cargando usuarios...
                  </p>
                ) : companyUsers.length === 0 ? (
                  <p className='text-xs text-slate-500 py-4 text-center'>
                    No hay usuarios asignados a esta empresa.
                  </p>
                ) : (
                  <div className='divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-[#0d0e15]'>
                    {companyUsers.map((u) => (
                      <div
                        key={u.id}
                        className='p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30'
                      >
                        <div>
                          <p className='font-semibold text-white'>
                            {u.full_name}
                          </p>
                          <p className='text-[11px] text-slate-400 font-mono'>
                            {u.email}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='capitalize px-2 py-0.5 rounded-md bg-slate-800 text-purple-300 font-medium text-[10px] border border-slate-700'>
                            {u.role}
                          </span>
                          <span
                            className='w-2 h-2 rounded-full bg-emerald-400'
                            title='Activo'
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
