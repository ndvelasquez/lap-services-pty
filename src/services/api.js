/**
 * LAP Services PTY - n8n API Integration Layer
 *
 * This module provides all API functions that will connect to n8n webhooks.
 * Each function includes the expected n8n webhook endpoint and payload format.
 *
 * SETUP:
 * 1. Set your n8n base URL in the N8N_BASE_URL constant
 * 2. Create corresponding webhook nodes in n8n for each endpoint
 * 3. The webhooks should handle the described payload and return the expected response
 *
 * All functions return mock data by default until n8n is configured.
 */

// TODO: Replace with your n8n instance URL
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678/webhook'

async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (body) options.body = JSON.stringify(body)

    const response = await fetch(`${N8N_BASE_URL}${endpoint}`, options)
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.warn(`n8n API call failed for ${endpoint}:`, error.message)
    return null // Falls back to mock data in the calling function
  }
}

// ============================================================
// AUTH - Authentication endpoints
// ============================================================

/**
 * POST /auth/login
 * Payload: { email: string, password: string }
 * Response: { token: string, user: { id, name, email, role } }
 */
export async function login(email, password) {
  const result = await apiCall('/auth/login', 'POST', { email, password })
  if (result) {
    localStorage.setItem('lap_token', result.token)
    localStorage.setItem('lap_user', JSON.stringify(result.user))
    return result
  }
  // Mock: auto-login
  const mockUser = { id: 1, name: 'Usuario Demo', email, role: 'client' }
  localStorage.setItem('lap_user', JSON.stringify(mockUser))
  return { user: mockUser }
}

/**
 * POST /auth/register
 * Payload: { name, email, phone, address, password }
 * Response: { token: string, user: { id, name, email, role } }
 */
export async function register(data) {
  const result = await apiCall('/auth/register', 'POST', data)
  if (result) {
    localStorage.setItem('lap_token', result.token)
    localStorage.setItem('lap_user', JSON.stringify(result.user))
    return result
  }
  const mockUser = { id: 1, name: data.name, email: data.email, role: 'client' }
  localStorage.setItem('lap_user', JSON.stringify(mockUser))
  return { user: mockUser }
}

export function logout() {
  localStorage.removeItem('lap_token')
  localStorage.removeItem('lap_user')
}

export function getCurrentUser() {
  const user = localStorage.getItem('lap_user')
  return user ? JSON.parse(user) : null
}

// ============================================================
// APPOINTMENTS - Appointment management
// ============================================================

/**
 * POST /appointments
 * Payload: { services[], date, time, spaceDetails, furnitureDetails, acDetails, repairDetails, notes, images[] }
 * Response: { id, status: 'pending', message: string }
 */
export async function createAppointment(data) {
  return await apiCall('/appointments', 'POST', data)
}

/**
 * GET /appointments?clientId={id}
 * Response: [{ id, services, date, time, status, location }]
 */
export async function getClientAppointments(clientId) {
  return await apiCall(`/appointments?clientId=${clientId}`)
}

/**
 * GET /appointments (admin - all appointments)
 * Response: [{ id, client, services, date, time, status }]
 */
export async function getAllAppointments() {
  return await apiCall('/appointments')
}

/**
 * PATCH /appointments/{id}
 * Payload: { status: 'confirmed' | 'cancelled' | 'completed', notes? }
 * Response: { id, status }
 */
export async function updateAppointment(id, data) {
  return await apiCall(`/appointments/${id}`, 'PATCH', data)
}

// ============================================================
// CALENDAR - Availability management
// ============================================================

/**
 * GET /calendar/availability?month={month}&year={year}
 * Response: { availableDates: number[], blockedDates: number[], timeSlots: { [date]: string[] } }
 */
export async function getAvailability(month, year) {
  return await apiCall(`/calendar/availability?month=${month}&year=${year}`)
}

/**
 * POST /calendar/block
 * Payload: { dates: string[], reason?: string }
 */
export async function blockDates(dates, reason) {
  return await apiCall('/calendar/block', 'POST', { dates, reason })
}

// ============================================================
// QUOTATIONS - Quotation management
// ============================================================

/**
 * POST /quotations
 * Payload: { appointmentId, clientId, items: [{ concept, desc, qty, price }], conditions, taxRate }
 * Response: { id, total }
 */
export async function createQuotation(data) {
  return await apiCall('/quotations', 'POST', data)
}

/**
 * GET /quotations?clientId={id}
 * Response: [{ id, service, date, amount, status }]
 */
export async function getClientQuotations(clientId) {
  return await apiCall(`/quotations?clientId=${clientId}`)
}

/**
 * PATCH /quotations/{id}
 * Payload: { status: 'sent' | 'accepted' | 'rejected' }
 */
export async function updateQuotation(id, data) {
  return await apiCall(`/quotations/${id}`, 'PATCH', data)
}

/**
 * POST /quotations/{id}/send
 * Sends the quotation to the client via email
 */
export async function sendQuotation(id) {
  return await apiCall(`/quotations/${id}/send`, 'POST')
}

// ============================================================
// SERVICES - Service catalog management
// ============================================================

/**
 * GET /services
 * Response: [{ id, name, category, description, basePrice, active }]
 */
export async function getServices() {
  return await apiCall('/services')
}

/**
 * POST /services
 * Payload: { name, category, description, basePrice }
 */
export async function createService(data) {
  return await apiCall('/services', 'POST', data)
}

/**
 * PUT /services/{id}
 * Payload: { name, category, description, basePrice, active }
 */
export async function updateService(id, data) {
  return await apiCall(`/services/${id}`, 'PUT', data)
}

// ============================================================
// CLIENTS - Client management
// ============================================================

/**
 * GET /clients
 * Response: [{ id, name, email, phone, totalAppointments, lastVisit }]
 */
export async function getClients() {
  return await apiCall('/clients')
}

/**
 * GET /clients/{id}
 * Response: { id, name, email, phone, address, appointments[], quotations[] }
 */
export async function getClient(id) {
  return await apiCall(`/clients/${id}`)
}

// ============================================================
// UPLOAD - File/image upload
// ============================================================

/**
 * POST /upload
 * Payload: FormData with 'files' field
 * Response: { urls: string[] }
 */
export async function uploadImages(files) {
  try {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    const response = await fetch(`${N8N_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Upload failed')
    return await response.json()
  } catch (error) {
    console.warn('Upload failed:', error.message)
    return { urls: files.map(f => URL.createObjectURL(f)) }
  }
}

export default {
  login, register, logout, getCurrentUser,
  createAppointment, getClientAppointments, getAllAppointments, updateAppointment,
  getAvailability, blockDates,
  createQuotation, getClientQuotations, updateQuotation, sendQuotation,
  getServices, createService, updateService,
  getClients, getClient,
  uploadImages,
}
