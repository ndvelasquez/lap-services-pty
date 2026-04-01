/**
 * Notification & Alert System for LAP Services PTY
 * Uses SweetAlert2 for modal alerts and Sonner for toast notifications.
 */
import Swal from 'sweetalert2'
import { toast } from 'sonner'

// ─── Brand Colors ───
const BRAND = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  error: '#d32f2f',
  warning: '#f9a825',
  info: '#1976d2',
}

// ─── SweetAlert2 Themed Defaults ───
const swalDefaults = {
  customClass: {
    popup: 'swal-lap-popup',
    title: 'swal-lap-title',
    confirmButton: 'swal-lap-btn swal-lap-btn--confirm',
    cancelButton: 'swal-lap-btn swal-lap-btn--cancel',
    denyButton: 'swal-lap-btn swal-lap-btn--deny',
  },
  buttonsStyling: false,
  showClass: { popup: 'swal2-show', backdrop: 'swal2-backdrop-show' },
  hideClass: { popup: 'swal2-hide', backdrop: 'swal2-backdrop-hide' },
}

// ─── Modal Alerts (SweetAlert2) ───

/** Success modal – use for completed actions like "PDF generado" */
export function alertSuccess(title, text = '') {
  return Swal.fire({
    ...swalDefaults,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Aceptar',
    iconColor: BRAND.primary,
  })
}

/** Error modal – use for caught errors */
export function alertError(title, text = '') {
  return Swal.fire({
    ...swalDefaults,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Cerrar',
    iconColor: BRAND.error,
  })
}

/** Warning modal – input validation, non-blocking warnings */
export function alertWarning(title, text = '') {
  return Swal.fire({
    ...swalDefaults,
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Entendido',
    iconColor: BRAND.warning,
  })
}

/** Info modal – neutral information */
export function alertInfo(title, text = '') {
  return Swal.fire({
    ...swalDefaults,
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Aceptar',
    iconColor: BRAND.info,
  })
}

/** Confirm modal – replaces native confirm() with async/await */
export async function alertConfirm(title, text = '', confirmText = 'Confirmar', cancelText = 'Cancelar') {
  const result = await Swal.fire({
    ...swalDefaults,
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    iconColor: BRAND.primary,
    reverseButtons: true,
  })
  return result.isConfirmed
}

// ─── Toast Notifications (Sonner) ───

/** Success toast */
export function toastSuccess(message) {
  toast.success(message, { duration: 4000 })
}

/** Error toast */
export function toastError(message) {
  toast.error(message, { duration: 5000 })
}

/** Warning toast */
export function toastWarning(message) {
  toast.warning(message, { duration: 4500 })
}

/** Info toast */
export function toastInfo(message) {
  toast.info(message, { duration: 4000 })
}

/** Loading toast (returns dismiss function) */
export function toastLoading(message) {
  return toast.loading(message)
}

/** Dismiss a specific toast or all */
export function toastDismiss(id) {
  toast.dismiss(id)
}
