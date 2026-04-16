import { Link } from 'react-router-dom'
import {
  Sparkles, Sofa, Wind, Wrench, ShoppingBag, Car,
  ArrowRight, Star, CheckCircle, MessageCircle, ChevronRight
} from 'lucide-react'
import './Landing.css'

const services = [
  { icon: Sparkles, title: 'Limpieza de Espacios', desc: 'Casas, apartamentos, oficinas y locales comerciales', color: '#2E7D32' },
  { icon: Sofa, title: 'Limpieza de Muebles', desc: 'Sofás, colchones, alfombras, sillas y persianas rollers', color: '#4CAF50' },
  { icon: Wind, title: 'Aire Acondicionado', desc: 'Lavado, instalación, venta y reparación de AC', color: '#66BB6A' },
  { icon: Car, title: 'Auto Detailing', desc: 'Lavado interior y profesional de autos a domicilio', color: '#1B5E20' },
  { icon: Wrench, title: 'Reparaciones y Pintura', desc: 'Plomería, electricidad y pintura general de espacios', color: '#388E3C' },
  { icon: ShoppingBag, title: 'Productos de Limpieza', desc: 'Desinfectantes anti-ácaros, desengrasantes y más', color: '#81C784' },
]

const steps = [
  { num: '01', title: 'Elige tu servicio', desc: 'Selecciona entre nuestra amplia gama de servicios profesionales' },
  { num: '02', title: 'Selecciona fecha y hora', desc: 'Revisa la disponibilidad y escoge el horario que mejor te convenga' },
  { num: '03', title: 'Detalla lo que necesitas', desc: 'Describe las características del espacio, muebles o equipos' },
  { num: '04', title: 'Recibe tu cotización', desc: 'Te enviaremos un presupuesto detallado en menos de 24 horas' },
]

const testimonials = [
  { name: 'María García', text: 'Excelente servicio de limpieza. Mi apartamento quedó impecable, como nuevo. Totalmente recomendados.', rating: 5 },
  { name: 'Carlos López', text: 'El lavado del aire acondicionado fue rápido y profesional. Ahora enfría mucho mejor. Muy satisfecho.', rating: 5 },
  { name: 'Ana Rodríguez', text: 'Hicieron un trabajo increíble con mis muebles. Quitaron manchas que creí imposibles. Volveré a contratar.', rating: 5 },
]

export default function Landing() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__gradient" />
          <div className="hero__particles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="hero__particle" style={{ '--delay': `${i * 0.8}s`, '--x': `${15 + i * 15}%` }} />
            ))}
          </div>
        </div>
        <div className="container hero__content">
          <div className="hero__text">
            <div className="hero__badge">
              <Sparkles size={14} />
              <span>+12 años de experiencia en Panamá</span>
            </div>
            <h1 className="hero__title">
              Tu Espacio,<br />
              <span className="hero__title-accent">Impecable</span>
            </h1>
            <p className="hero__subtitle">
              Empresa multi-servicios comprometidos con la excelencia.
              Limpieza profesional, mantenimiento y reparaciones para hogares,
              oficinas y vehículos.
            </p>
            <div className="hero__actions">
              <Link to="/agendar" className="btn btn--primary btn--lg">
                Agenda tu Cita
                <ArrowRight size={18} />
              </Link>
              <Link to="/servicios" className="btn btn--ghost btn--lg">
                Ver Servicios
              </Link>
            </div>
            <div className="hero__trust">
              <div className="hero__trust-item">
                <CheckCircle size={16} />
                <span>Servicio garantizado</span>
              </div>
              <a href="https://wa.me/50769841395" target="_blank" rel="noopener noreferrer" className="hero__trust-item hero__trust-item--link">
                <MessageCircle size={16} />
                <span>Chatea por WhatsApp</span>
              </a>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__card hero__card--1">
              <Sparkles size={24} />
              <span>Limpieza Profunda</span>
            </div>
            <div className="hero__card hero__card--2">
              <Wind size={24} />
              <span>A/C Impecable</span>
            </div>
            <div className="hero__card hero__card--3">
              <Star size={24} />
              <span>5.0 ★★★★★</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section" id="servicios">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Nuestros Servicios</h2>
            <p className="section-subtitle">
              Soluciones profesionales de limpieza y mantenimiento para cada necesidad
            </p>
          </div>
          <div className="services-grid">
            {services.map((s, i) => (
              <Link to="/servicios" key={i} className="service-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="service-card__icon" style={{ background: `${s.color}15`, color: s.color }}>
                  <s.icon size={28} />
                </div>
                <h3 className="service-card__title">{s.title}</h3>
                <p className="service-card__desc">{s.desc}</p>
                <span className="service-card__link">
                  Solicitar <ChevronRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section--dark" id="como-funciona">
        <div className="container">
          <div className="section-header section-header--center">
            <h2 className="section-title">¿Cómo Funciona?</h2>
            <p className="section-subtitle" style={{ color: 'var(--light-500)' }}>
              Solicita tu servicio en 4 simples pasos
            </p>
          </div>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-card__number">{step.num}</div>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__desc">{step.desc}</p>
                {i < steps.length - 1 && <div className="step-card__connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" id="testimonios">
        <div className="container">
          <div className="section-header section-header--center">
            <h2 className="section-title">Lo Que Dicen Nuestros Clientes</h2>
            <p className="section-subtitle">
              La satisfacción de nuestros clientes es nuestro mejor aval
            </p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-card__stars">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={16} fill="#FFB74D" color="#FFB74D" />
                  ))}
                </div>
                <p className="testimonial-card__text">"{t.text}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">{t.name[0]}</div>
                  <span className="testimonial-card__name">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>¿Listo para un espacio impecable?</h2>
            <p>Agenda tu cita hoy y experimenta la diferencia de un servicio profesional</p>
            <Link to="/agendar" className="btn btn--primary btn--lg">
              Agenda tu Cita Ahora
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
