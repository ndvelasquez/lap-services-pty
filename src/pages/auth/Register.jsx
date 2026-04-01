import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react'
import { register } from '../../services/api'
import { alertSuccess } from '../../lib/notifications'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '',
    password: '', confirmPassword: '', terms: false
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const passStrength = () => {
    const p = form.password
    if (p.length < 6) return 0
    let s = 1
    if (p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)) s = 3
    else if (p.length >= 6 && (/[A-Z]/.test(p) || /[0-9]/.test(p))) s = 2
    return s
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      return setError('Las contraseñas no coinciden')
    }
    setError(null)
    setLoading(true)
    
    try {
      const { session } = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password
      })
      
      if (!session) {
        await alertSuccess('Cuenta Creada', 'Por favor, revisa tu bandeja de entrada o spam para confirmar tu correo antes de iniciar sesión.')
        navigate('/login')
      } else {
        navigate('/mi-panel')
      }
    } catch (err) {
      console.error('Register error:', err)
      setError(err.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const strength = passStrength()

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand__inner">
          <Link to="/" className="auth-brand__logo">
            <span className="auth-brand__logo-icon">LAP</span>
            <span className="auth-brand__logo-text">Service Panamá</span>
          </Link>
          <h2>Comprometidos con la excelencia!</h2>
          <p>Crea tu cuenta para agendar citas y recibir cotizaciones de nuestros servicios profesionales.</p>
          <div className="auth-brand__decorative">
            <div className="auth-brand__circle auth-brand__circle--1" />
            <div className="auth-brand__circle auth-brand__circle--2" />
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <h1>Crear Cuenta</h1>
          <p className="auth-form__subtitle">Completa tus datos para registrarte</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <div className="input-icon">
                <User size={18} />
                <input type="text" className="form-input" placeholder="Tu nombre completo"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <div className="input-icon">
                <Mail size={18} />
                <input type="email" className="form-input" placeholder="tu@email.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <div className="input-icon">
                <Phone size={18} />
                <input type="tel" className="form-input" placeholder="+507 6XXX-XXXX"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección</label>
              <div className="input-icon">
                <MapPin size={18} />
                <input type="text" className="form-input" placeholder="Tu dirección"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-icon">
                <Lock size={18} />
                <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password && (
                <div className="password-strength">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`password-strength__bar ${
                      strength >= i ? (strength === 1 ? 'password-strength__bar--weak' : strength === 2 ? 'password-strength__bar--medium' : 'password-strength__bar--strong') : ''
                    }`} />
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <div className="input-icon">
                <Lock size={18} />
                <input type="password" className="form-input" placeholder="Repite tu contraseña"
                  value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
              </div>
            </div>

            <label className="checkbox-label">
              <input type="checkbox" checked={form.terms} onChange={e => setForm({ ...form, terms: e.target.checked })} required />
              <span>Acepto los <a href="#" className="auth-link">términos y condiciones</a></span>
            </label>

            {error && (
              <div className="auth-error" style={{
                background: 'rgba(211, 47, 47, 0.08)',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                color: '#d32f2f',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                <span style={{ flex: 1 }}>{error}</span>
                <button type="button" onClick={() => setError(null)} style={{
                  background: 'none', border: 'none', color: '#d32f2f',
                  cursor: 'pointer', fontSize: '1.1rem', padding: 0, flexShrink: 0,
                  lineHeight: 1, opacity: 0.7
                }}>✕</button>
              </div>
            )}

            <button type="submit" className="btn btn--primary btn--lg auth-submit" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="auth-alt">
            ¿Ya tienes cuenta? <Link to="/login" className="auth-link">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
