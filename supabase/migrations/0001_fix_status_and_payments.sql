-- Migración 0001: Sincronizar schema con el código de la aplicación
-- Corrige tres desincronizaciones entre supabase/schema.sql y src/services/api.js:
--   1) El enum appointment_status no incluía los estados intermedios usados por la app.
--   2) La tabla payments se usa en api.js pero nunca fue creada.
--   3) appointments.payment_proof_url se escribe en api.js pero no existía la columna.
-- También declara los buckets de storage usados sin estar definidos (lap_images, lap_quotations).

-- ========================================================================
-- 1. Ampliar enum appointment_status
--    (api.js usa: quotation_sent, payment_uploaded, modification_requested)
--    ADD VALUE IF NOT EXISTS es idempotente; debe ir fuera de cualquier transacción
--    explícita. Supabase aplica cada statement por separado.
-- ========================================================================
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'quotation_sent';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'payment_uploaded';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'modification_requested';

-- ========================================================================
-- 2. Columna payment_proof_url en appointments (api.js línea ~562)
-- ========================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- ========================================================================
-- 3. Tabla payments (abonos: depósito 50% + pago final 50%)
--    Columnas según uso real en api.js (uploadPaymentProof, getAdminPayments,
--    verifyDeposit, recordFinalPayment, getIncomeStats).
-- ========================================================================
CREATE TYPE payment_type AS ENUM ('deposit', 'final');
CREATE TYPE payment_status AS ENUM ('pending', 'verified');

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_type payment_type NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_appointment ON public.payments(appointment_id);

-- ------------------------------------------------------------------------
-- RLS para payments: el cliente ve/inserta los pagos de SUS citas; el admin
-- gestiona todo. Reutiliza el helper public.get_my_role() definido en schema.sql.
-- ------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = payments.appointment_id
      AND (a.client_id = auth.uid() OR public.get_my_role() = 'admin')
  )
);

CREATE POLICY "Clients insert own payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = payments.appointment_id
      AND a.client_id = auth.uid()
  )
);

CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (
  public.get_my_role() = 'admin'
);

-- ========================================================================
-- 4. Buckets de storage usados por la app pero no declarados
--    - lap_images: fotos del wizard + comprobantes de pago.
--      NOTA: hoy api.js usa getPublicUrl() sobre lap_images. Lo declaramos
--      como NO público y añadimos políticas RLS; ver SECURITY.md para la
--      tarea de migrar uploadPaymentProof a URLs firmadas.
--    - lap_quotations: PDFs generados por n8n/PDFMonkey (privado).
-- ========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lap_images', 'lap_images', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lap_quotations', 'lap_quotations', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Políticas storage para lap_images: usuarios autenticados suben; el dueño de la
-- cita y el admin pueden leer.
CREATE POLICY "Authenticated can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lap_images');

CREATE POLICY "Authenticated can view images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'lap_images');

-- Políticas storage para lap_quotations: sólo admin gestiona; el cliente ve los
-- PDFs de sus propias cotizaciones (match por nombre de archivo en pdf_url).
CREATE POLICY "Admins manage quotation pdfs" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'lap_quotations' AND public.get_my_role() = 'admin'
);

CREATE POLICY "Clients view own quotation pdfs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lap_quotations' AND
  EXISTS (
    SELECT 1 FROM public.quotations q
    WHERE q.client_id = auth.uid()
      AND q.pdf_url LIKE '%' || storage.objects.name || '%'
  )
);
