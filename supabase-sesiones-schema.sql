-- Tabla para rastrear sesiones activas
CREATE TABLE IF NOT EXISTS sesiones_activas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  ultima_actividad TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_token)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_activas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones_activas(session_token);

-- Función para limpiar sesiones antiguas (más de 24 horas inactivas)
CREATE OR REPLACE FUNCTION limpiar_sesiones_antiguas()
RETURNS void AS $$
BEGIN
  DELETE FROM sesiones_activas
  WHERE ultima_actividad < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE sesiones_activas ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver y eliminar sus propias sesiones
CREATE POLICY "Usuarios pueden ver sus sesiones"
  ON sesiones_activas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus sesiones"
  ON sesiones_activas FOR DELETE
  USING (auth.uid() = usuario_id);

-- Solo el sistema puede insertar/actualizar sesiones
CREATE POLICY "Sistema puede insertar sesiones"
  ON sesiones_activas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Sistema puede actualizar sesiones"
  ON sesiones_activas FOR UPDATE
  USING (auth.uid() = usuario_id);
