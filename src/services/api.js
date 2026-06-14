// Barrel de compatibilidad de la capa de datos.
//
// La API real vive en módulos de dominio bajo src/features/<dominio>/api.js.
// Este archivo re-exporta todo para que el código existente que importa desde
// '../../services/api' siga funcionando sin cambios, y para ofrecer un punto
// único de entrada. El objetivo es migrar gradualmente los imports a los módulos
// de cada feature.

import { supabase } from '../lib/supabase'

import {
  login, register, logout, getCurrentUser, savePushSubscription
} from '../features/auth/api'

import {
  createAppointment, getClientAppointments, getAllAppointments,
  getAppointment, updateAppointment, getAvailableSlots
} from '../features/appointments/api'

import {
  getQuotationById, updateQuotation, generateQuotationPdf, regenerateQuotationPdf,
  createQuotation, getClientQuotations, getAllQuotations, sendQuotation,
  deleteQuotation, getQuotationByAppointmentId,
  acceptQuotation, rejectQuotation, requestModification
} from '../features/quotations/api'

import { getServices, createService, getAllServices, updateService, toggleServiceActive } from '../features/services-catalog/api'
import { getAllClients, getClients, getClientCount } from '../features/clients/api'
import {
  uploadPaymentProof, getAdminPayments, verifyDeposit, recordFinalPayment, getIncomeStats
} from '../features/payments/api'
import { uploadImages } from '../shared/storage'

export { supabase }
export {
  login, register, logout, getCurrentUser, savePushSubscription,
  createAppointment, getClientAppointments, getAllAppointments, getAppointment, updateAppointment, getAvailableSlots,
  getQuotationById, updateQuotation, generateQuotationPdf, regenerateQuotationPdf,
  createQuotation, getClientQuotations, getAllQuotations, sendQuotation, deleteQuotation, getQuotationByAppointmentId,
  acceptQuotation, rejectQuotation, requestModification,
  getServices, createService, getAllServices, updateService, toggleServiceActive,
  getAllClients, getClients, getClientCount,
  uploadPaymentProof, getAdminPayments, verifyDeposit, recordFinalPayment, getIncomeStats,
  uploadImages
}

export default {
  login, register, logout, getCurrentUser,
  createAppointment, getAppointment, getClientAppointments, getAllAppointments, updateAppointment,
  createQuotation, getClientQuotations, getQuotationById, getQuotationByAppointmentId, updateQuotation, deleteQuotation,
  generateQuotationPdf, regenerateQuotationPdf, sendQuotation,
  acceptQuotation, rejectQuotation, requestModification,
  uploadPaymentProof, getAvailableSlots,
  getServices, createService, getClients, uploadImages,
  savePushSubscription,
  getAdminPayments, verifyDeposit, recordFinalPayment, getIncomeStats
}
