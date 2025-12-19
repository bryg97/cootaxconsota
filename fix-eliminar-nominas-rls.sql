-- Script para configurar políticas RLS para eliminar nóminas
-- Ejecutar en Supabase SQL Editor

-- Habilitar RLS si no está habilitado
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas_detalle ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de DELETE si existen
DROP POLICY IF EXISTS "Permitir eliminar nominas para usuarios autenticados" ON nominas;
DROP POLICY IF EXISTS "Permitir eliminar detalles de nomina para usuarios autenticados" ON nominas_detalle;

-- Crear política para eliminar nóminas (solo admins)
CREATE POLICY "Permitir eliminar nominas para usuarios autenticados"
ON nominas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'admin'
  )
  AND estado != 'pagada'
);

-- Crear política para eliminar detalles de nómina (solo admins)
CREATE POLICY "Permitir eliminar detalles de nomina para usuarios autenticados"
ON nominas_detalle
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'admin'
  )
  AND EXISTS (
    SELECT 1 FROM nominas n
    WHERE n.id = nominas_detalle.nomina_id
    AND n.estado != 'pagada'
  )
);

-- Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
AND policyname LIKE '%eliminar%';

-- También podemos agregar ON DELETE CASCADE en la clave foránea si no existe
-- Esto eliminará automáticamente los detalles cuando se elimine la nómina
ALTER TABLE nominas_detalle
DROP CONSTRAINT IF EXISTS nominas_detalle_nomina_id_fkey;

ALTER TABLE nominas_detalle
ADD CONSTRAINT nominas_detalle_nomina_id_fkey
FOREIGN KEY (nomina_id)
REFERENCES nominas(id)
ON DELETE CASCADE;
