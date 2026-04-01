import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { login } from '../../services/api'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/mi-panel')
    } catch (err) {
      console.error('Login error:', err)
      setError('Credenciales incorrectas o error en el sistema')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand__inner">
          <Link to="/" className="auth-brand__logo">
            <span className="auth-brand__logo-icon">LAP</span>
            <span className="auth-brand__logo-text">Service Panamá</span>
          </Link>
          <h2>Comprometidos con la excelencia!</h2>
          <p>Empresa multi-servicios con más de 12 años de experiencia en limpieza profesional en Panamá.</p>
          <div className="auth-brand__decorative">
            <div className="auth-brand__circle auth-brand__circle--1" />
            <div className="auth-brand__circle auth-brand__circle--2" />
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <h1>Iniciar Sesión</h1>
          <p className="auth-form__subtitle">Ingresa tus credenciales para acceder a tu cuenta</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <div className="input-icon">
                <Mail size={18} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-icon">
                <Lock size={18} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={e => setForm({ ...form, remember: e.target.checked })}
                />
                <span>Recordarme</span>
              </label>
              <a href="#" className="auth-link">¿Olvidaste tu contraseña?</a>
            </div>

            {error && <div className="auth-error" style={{ color: '#d32f2f', marginBottom: '15px' }}>{error}</div>}

            <button type="submit" className="btn btn--primary btn--lg auth-submit" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="auth-alt">
            ¿No tienes cuenta? <Link to="/registro" className="auth-link">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
