// src/services/api.js
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_URL,
})

// Interceptor para adjuntar el Bearer Token automáticamente
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kuali_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para redireccionar a login si el token expira (401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('kuali_token')
      localStorage.removeItem('kuali_user')
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export const apiService = {
  // Autenticación con OAuth2 (form-urlencoded)
  login: async (email, password) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)

    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  // Perfil del usuario activo
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  // KPIs consolidados del Dashboard
  getDashboardMetrics: async () => {
    const response = await apiClient.get('/audits/metrics/dashboard')
    return response.data
  },

  // Tendencia de calidad temporal
  getQualityTimeline: async (startDate = null, endDate = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const response = await apiClient.get('/audits/metrics/timeline', { params })
    return response.data
  },

  // Listado de auditorías con paginación y filtros de fecha
  getAudits: async (filters = {}) => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    }
    if (filters.agent_id) params.agent_id = filters.agent_id
    if (filters.detected_program)
      params.detected_program = filters.detected_program
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    if (filters.min_score !== undefined && filters.min_score !== '')
      params.min_score = filters.min_score
    if (filters.max_score !== undefined && filters.max_score !== '')
      params.max_score = filters.max_score

    const response = await apiClient.get('/audits', { params })
    return response.data
  },

  // Detalle profundo y transcripción (mantenemos ambos nombres para compatibilidad total)
  getAuditDetail: async (auditId) => {
    const response = await apiClient.get(`/audits/${auditId}`)
    return response.data
  },

  getAudit: async (auditId) => {
    const response = await apiClient.get(`/audits/${auditId}`)
    return response.data
  },

  // Catálogo de asesores
  getAgents: async (isActive = true) => {
    const response = await apiClient.get('/agents', {
      params: { is_active: isActive },
    })
    return response.data
  },

  // Cambiar contraseña del usuario autenticado
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },

  // --- Métodos de Super Admin ---
  getAdminCompanies: async () => {
    const response = await apiClient.get('/admin/companies')
    return response.data
  },

  createCompany: async (name, pbx_type = 'issabel') => {
    const response = await apiClient.post('/admin/companies', {
      name,
      pbx_type,
    })
    return response.data
  },

  getAIConfig: async () => {
    const response = await apiClient.get('/admin/ai-config')
    return response.data
  },

  updateAIConfig: async (configData) => {
    const response = await apiClient.put('/admin/ai-config', configData)
    return response.data
  },

  // Actualizar datos de una empresa
  updateCompany: async (companyId, updateData) => {
    const response = await apiClient.put(
      `/admin/companies/${companyId}`,
      updateData,
    )
    return response.data
  },

  // Regenerar API Key de la PBX
  regenerateCompanyKey: async (companyId) => {
    const response = await apiClient.post(
      `/admin/companies/${companyId}/regenerate-key`,
    )
    return response.data
  },

  // Obtener usuarios asignados a una empresa
  getCompanyUsers: async (companyId) => {
    const response = await apiClient.get(`/admin/companies/${companyId}/users`)
    return response.data
  },

  // Crear usuario para una empresa
  createCompanyUser: async (companyId, userData) => {
    const response = await apiClient.post(
      `/admin/companies/${companyId}/users`,
      userData,
    )
    return response.data
  },

  toggleCompanyStatus: async (companyId) => {
    const response = await apiClient.put(
      `/admin/companies/${companyId}/toggle-status`,
    )
    return response.data
  },

  // Configuración de IA por Cliente
  getCompanyAIConfig: async (companyId) => {
    const response = await apiClient.get(
      `/admin/companies/${companyId}/ai-config`,
    )
    return response.data
  },

  updateCompanyAIConfig: async (companyId, configData) => {
    const response = await apiClient.put(
      `/admin/companies/${companyId}/ai-config`,
      configData,
    )
    return response.data
  },
}

export default apiService
