-- Script para agregar columna permisos_detallados a la tabla roles

ALTER TABLE roles
ADD COLUMN IF NOT EXISTS permisos_detallados JSONB DEFAULT '[]'::jsonb;

-- Migrar permisos existentes al formato detallado
UPDATE roles
SET permisos_detallados = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'modulo', p,
      'leer', true,
      'escribir', true
    )
  )
  FROM jsonb_array_elements_text(permisos) AS p
)
WHERE permisos IS NOT NULL AND permisos != 'null'::jsonb AND permisos_detallados = '[]'::jsonb;

-- Verificar los cambios
SELECT id, nombre, permisos, permisos_detallados FROM roles;
