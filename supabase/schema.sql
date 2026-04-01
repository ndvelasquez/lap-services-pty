-- LAP Services PTY - Supabase Schema
-- Este script configura la base de datos, perfiles de usuario, roles y políticas (RLS)

-- 1. Activar extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Esquema para Roles de Usuario (Personal y Clientes)
CREATE TYPE user_role AS ENUM ('client', 'admin');

-- 3. Tabla de Perfiles (Se sincroniza con auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  role user_role DEFAULT 'client'::user_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para crear perfil automáticamente al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'phone', 'client');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Tabla de Catálogo de Servicios
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Citas (Appointments)
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status DEFAULT 'pending'::appointment_status,
  location_address TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Detalles de Servicios Solicitados en la Cita
CREATE TABLE public.appointment_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  custom_details JSONB, -- Para guardar datos específicos (ej: tipo de piso, # de A/C)
  images TEXT[] -- URLs de las fotos subidas a Supabase Storage
);

-- 7. Cotizaciones (Quotations)
CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status quotation_status DEFAULT 'draft'::quotation_status,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  conditions TEXT,
  pdf_url TEXT,
  pdf_version INTEGER DEFAULT 1,
  pdf_generated_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Ítems de la Cotización
CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);


-- ========================================================================
-- RECORD LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Funciones helper para RLS
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas para Perfiles
-- Clientes pueden leer/actualizar su propio perfil. Admin lee/actualiza todos.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id OR public.get_my_role() = 'admin');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para Servicios
-- Cualquier usuario (incluso anónimos) puede ver los servicios activos. Sólo admins modifican.
CREATE POLICY "Anyone can view active services" ON services FOR SELECT USING (active = true OR public.get_my_role() = 'admin');
CREATE POLICY "Only admins can insert services" ON services FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "Only admins can update services" ON services FOR UPDATE USING (public.get_my_role() = 'admin');

-- Políticas para Citas
-- Clientes ven sólo las suyas, y pueden insertar.
CREATE POLICY "Clients view own appointments" ON appointments FOR SELECT USING (auth.uid() = client_id OR public.get_my_role() = 'admin');
CREATE POLICY "Clients can insert appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update own pending appointments" ON appointments FOR UPDATE USING ((auth.uid() = client_id AND status = 'pending') OR public.get_my_role() = 'admin');

-- Políticas para Servicios de Cita
CREATE POLICY "View appointment services" ON appointment_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM appointments WHERE id = appointment_services.appointment_id AND (client_id = auth.uid() OR public.get_my_role() = 'admin'))
);
CREATE POLICY "Insert appointment services" ON appointment_services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM appointments WHERE id = appointment_services.appointment_id AND client_id = auth.uid())
);

-- Políticas para Cotizaciones
CREATE POLICY "Clients view own quotations" ON quotations FOR SELECT USING (auth.uid() = client_id OR public.get_my_role() = 'admin');
CREATE POLICY "Admins manage everything" ON quotations FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Clients can update quote status (accept/reject)" ON quotations FOR UPDATE 
  USING (auth.uid() = client_id) 
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Políticas para Items de Cotización
CREATE POLICY "View quotation items" ON quotation_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotations WHERE id = quotation_items.quotation_id AND (client_id = auth.uid() OR public.get_my_role() = 'admin'))
);
CREATE POLICY "Admins manage quote items" ON quotation_items FOR ALL USING (public.get_my_role() = 'admin');

-- ========================================================================
-- STORAGE - Bucket para documentos (PDFs de cotizaciones)
-- ========================================================================

-- Crear bucket lap_documents (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lap_documents', 'lap_documents', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en el bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden subir archivos
CREATE POLICY "Admins can upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lap_documents' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Política: Admins pueden ver todos los documentos
CREATE POLICY "Admins can view all documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lap_documents' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Política: Clientes pueden ver sus propios documentos (basado en quotations)
CREATE POLICY "Clients can view own documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lap_documents' AND 
  EXISTS (
    SELECT 1 FROM public.quotations 
    WHERE client_id = auth.uid() 
    AND pdf_url LIKE '%' || storage.objects.name || '%'
  )
);

-- Política: Solo admins pueden eliminar documentos
CREATE POLICY "Admins can delete documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'lap_documents' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
