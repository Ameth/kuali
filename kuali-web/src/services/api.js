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

  // Listado de auditorías con filtros
  getAudits: async (filters = {}) => {
    const params = {
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    }
    if (filters.agent_id) params.agent_id = filters.agent_id
    if (filters.detected_program)
      params.detected_program = filters.detected_program
    if (filters.min_score !== undefined && filters.min_score !== '')
      params.min_score = filters.min_score
    if (filters.max_score !== undefined && filters.max_score !== '')
      params.max_score = filters.max_score

    const response = await apiClient.get('/audits', { params })
    return response.data
  },

  // Detalle profundo y transcripción
  getAuditDetail: async (auditId) => {
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
}

export default apiService
