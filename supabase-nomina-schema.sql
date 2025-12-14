-- =====================================================
-- SCRIPT SQL PARA MÓDULO DE NÓMINA
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columnas a configuraciones (si no existen)
ALTER TABLE configuraciones 
ADD COLUMN IF NOT EXISTS auxilio_transporte NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fondo_solidario NUMERIC DEFAULT 0;

-- 2. Crear tabla de nóminas (cabecera)
CREATE TABLE IF NOT EXISTS nominas (
  id BIGSERIAL PRIMARY KEY,
  periodo VARCHAR(7) NOT NULL, -- Formato: 2025-01 o 2025-01-Q1 (primera quincena)
  tipo VARCHAR(20) NOT NULL DEFAULT 'quincenal', -- 'quincenal' o 'mensual'
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador', -- 'borrador', 'procesada', 'pagada'
  total_devengado NUMERIC DEFAULT 0,
  total_deducciones NUMERIC DEFAULT 0,
  total_neto NUMERIC DEFAULT 0,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  procesada_at TIMESTAMPTZ,
  pagada_at TIMESTAMPTZ
);

-- 3. Crear tabla de detalle de nóminas (por empleado)
CREATE TABLE IF NOT EXISTS nominas_detalle (
  id BIGSERIAL PRIMARY KEY,
  nomina_id BIGINT NOT NULL REFERENCES nominas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  
  -- Devengado
  salario_base NUMERIC NOT NULL DEFAULT 0,
  auxilio_transporte NUMERIC DEFAULT 0,
  
  -- Horas y valores
  horas_trabajadas NUMERIC DEFAULT 0,
  horas_extras NUMERIC DEFAULT 0,
  valor_horas_extras NUMERIC DEFAULT 0,
  
  -- Recargos
  horas_recargo_nocturno NUMERIC DEFAULT 0,
  valor_recargo_nocturno NUMERIC DEFAULT 0,
  horas_recargo_festivo NUMERIC DEFAULT 0,
  valor_recargo_festivo NUMERIC DEFAULT 0,
  horas_recargo_dominical NUMERIC DEFAULT 0,
  valor_recargo_dominical NUMERIC DEFAULT 0,
  
  total_recargos NUMERIC DEFAULT 0,
  total_devengado NUMERIC DEFAULT 0,
  
  -- Deducciones
  deduccion_salud NUMERIC DEFAULT 0, -- 4%
  deduccion_pension NUMERIC DEFAULT 0, -- 4%
  deduccion_fondo_solidario NUMERIC DEFAULT 0,
  total_deducciones NUMERIC DEFAULT 0,
  
  -- Neto a pagar
  neto_pagar NUMERIC DEFAULT 0,
  
  -- Metadata
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(nomina_id, usuario_id)
);

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_nominas_periodo ON nominas(periodo);
CREATE INDEX IF NOT EXISTS idx_nominas_estado ON nominas(estado);
CREATE INDEX IF NOT EXISTS idx_nominas_detalle_nomina ON nominas_detalle(nomina_id);
CREATE INDEX IF NOT EXISTS idx_nominas_detalle_usuario ON nominas_detalle(usuario_id);

-- 5. Habilitar RLS (Row Level Security) 
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas_detalle ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de seguridad básicas
-- Los administradores pueden ver todas las nóminas
CREATE POLICY nominas_select_policy ON nominas
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios 
      WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'admin')
    )
  );

-- Los empleados pueden ver sus propios detalles de nómina
CREATE POLICY nominas_detalle_select_policy ON nominas_detalle
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM usuarios 
      WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'admin')
    )
  );

-- Solo administradores pueden insertar/actualizar
CREATE POLICY nominas_insert_policy ON nominas
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM usuarios 
      WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'admin')
    )
  );

CREATE POLICY nominas_update_policy ON nominas
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM usuarios 
      WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'admin')
    )
  );

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
