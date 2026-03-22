import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, Sofa, Wind, Wrench, ShoppingBag, Car, Paintbrush, HardHat,
  ChevronRight, Search
} from 'lucide-react'
import './Services.css'

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'espacios', label: 'Limpieza de Espacios' },
  { id: 'muebles', label: 'Muebles' },
  { id: 'ac', label: 'Aire Acondicionado' },
  { id: 'auto', label: 'Auto Detailing' },
  { id: 'reparaciones', label: 'Reparaciones' },
  { id: 'productos', label: 'Productos' },
]

const allServices = [
  { cat: 'espacios', icon: Sparkles, title: 'Limpieza de Apartamentos', desc: 'Limpieza profunda de cada rincón de tu apartamento', price: 'Desde $80' },
  { cat: 'espacios', icon: Sparkles, title: 'Limpieza de Casas', desc: 'Servicio completo de limpieza para tu hogar', price: 'Desde $120' },
  { cat: 'espacios', icon: Sparkles, title: 'Limpieza de Oficinas', desc: 'Espacios de trabajo impecables y productivos', price: 'Desde $150' },
  { cat: 'espacios', icon: HardHat, title: 'Limpieza Post-Remodelación', desc: 'Limpieza técnica profesional tras obras y remodelaciones', price: 'Cotización' },
  { cat: 'muebles', icon: Sofa, title: 'Limpieza de Sofás', desc: 'Sofás como nuevos, sin manchas ni olores', price: 'Desde $40/pieza' },
  { cat: 'muebles', icon: Sofa, title: 'Limpieza de Colchones', desc: 'Elimina ácaros y alérgenos de tu colchón', price: 'Desde $35' },
  { cat: 'muebles', icon: Sofa, title: 'Limpieza de Alfombras', desc: 'Restaura el brillo original de tus alfombras', price: 'Desde $30/m²' },
  { cat: 'muebles', icon: Sofa, title: 'Sillas de Oficina', desc: 'Limpieza profesional de sillas y mobiliario de oficina', price: 'Desde $25/pieza' },
  { cat: 'muebles', icon: Sofa, title: 'Persianas Rollers', desc: 'Limpieza y mantenimiento de persianas y cortinas', price: 'Desde $20/unidad' },
  { cat: 'ac', icon: Wind, title: 'Lavado de Split', desc: 'Mantenimiento y limpieza de equipos split', price: 'Desde $45' },
  { cat: 'ac', icon: Wind, title: 'Aire Central', desc: 'Servicio completo para sistemas centrales', price: 'Desde $200' },
  { cat: 'ac', icon: Wind, title: 'Instalación de AC', desc: 'Instalación profesional de equipos nuevos', price: 'Cotización' },
  { cat: 'auto', icon: Car, title: 'Auto Detailing Interior', desc: 'Lavado interior profesional a domicilio', price: 'Desde $60' },
  { cat: 'auto', icon: Car, title: 'Lavado Completo', desc: 'Interior y exterior con productos premium', price: 'Desde $80' },
  { cat: 'reparaciones', icon: Wrench, title: 'Plomería', desc: 'Reparaciones e instalaciones de plomería', price: 'Cotización' },
  { cat: 'reparaciones', icon: Wrench, title: 'Electricidad', desc: 'Reparaciones y mantenimiento eléctrico', price: 'Cotización' },
  { cat: 'reparaciones', icon: Paintbrush, title: 'Pintura General', desc: 'Pintura de interiores y exteriores', price: 'Cotización' },
  { cat: 'productos', icon: ShoppingBag, title: 'Desinfectante Anti-Ácaros', desc: 'Protección para toda la familia contra ácaros', price: '$15.00' },
  { cat: 'productos', icon: ShoppingBag, title: 'Desengrasante Profesional', desc: 'Desengrasante industrial de alto rendimiento', price: '$12.00' },
  { cat: 'productos', icon: ShoppingBag, title: 'Limpia Vidrios', desc: 'Fórmula profesional para cristales impecables', price: '$8.00' },
]

export default function Services() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = allServices.filter(s => {
    const matchCat = filter === 'all' || s.cat === filter
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="services-page">
      <section className="services-hero">
        <div className="container">
          <h1>Nuestros Servicios</h1>
          <p>Soluciones profesionales de limpieza y mantenimiento para cada necesidad</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="services-toolbar">
            <div className="services-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar servicio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="services-filters">
              {categories.map(c => (
                <button
                  key={c.id}
                  className={`filter-chip ${filter === c.id ? 'filter-chip--active' : ''}`}
                  onClick={() => setFilter(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="services-list-grid">
            {filtered.map((s, i) => (
              <div key={i} className="svc-card">
                <div className="svc-card__icon">
                  <s.icon size={28} />
                </div>
                <div className="svc-card__body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                <div className="svc-card__footer">
                  <span className="svc-card__price">{s.price}</span>
                  <Link to="/agendar" className="btn btn--primary btn--sm">
                    Solicitar <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="services-empty">
              <p>No se encontraron servicios con esos criterios.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
