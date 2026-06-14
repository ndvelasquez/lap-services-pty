import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de Supabase para evitar llamadas reales en los tests
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://mock-url.com' } })),
      })),
    },
  })),
}))

// Mock de SweetAlert2 — su animación/DOM no es compatible con jsdom
// (lanza "swalPromiseResolve is not a function"). Devolvemos confirmaciones
// resueltas para que los flujos de UI continúen en los tests.
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true, value: true })),
    mixin: vi.fn(() => ({ fire: vi.fn(() => Promise.resolve({ isConfirmed: true })) })),
    close: vi.fn(),
    showLoading: vi.fn(),
  },
}))

// Mock de fetch global
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
)

// Mock de crypto.randomUUID para JSDOM
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2) + Date.now().toString(36)
  };
} else if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
}
