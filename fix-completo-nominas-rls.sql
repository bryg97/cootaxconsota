-- Script completo para configurar políticas RLS de nóminas
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- PARTE 1: Verificar estructura de tablas
-- =====================================================

-- Verificar que las tablas existan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('nominas', 'nomina_detalles', 'empleados');

-- Verificar columnas de nomina_detalles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nomina_detalles'
ORDER BY ordinal_position;

-- =====================================================
-- PARTE 2: Configurar CASCADE en clave foránea
-- =====================================================

-- Eliminar constraint existente y recrear con CASCADE
ALTER TABLE nomina_detalles
DROP CONSTRAINT IF EXISTS nomina_detalles_nomina_id_fkey CASCADE;

ALTER TABLE nomina_detalles
ADD CONSTRAINT nomina_detalles_nomina_id_fkey
FOREIGN KEY (nomina_id)
REFERENCES nominas(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Hacer lo mismo para empleado_id si es UUID
ALTER TABLE nomina_detalles
DROP CONSTRAINT IF EXISTS nomina_detalles_empleado_id_fkey CASCADE;

ALTER TABLE nomina_detalles
ADD CONSTRAINT nomina_detalles_empleado_id_fkey
FOREIGN KEY (empleado_id)
REFERENCES empleados(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- =====================================================
-- PARTE 3: Eliminar políticas existentes
-- =====================================================

-- Eliminar todas las políticas de las tablas
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nominas;
DROP POLICY IF EXISTS "Permitir lectura de nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir insertar nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir actualizar nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir eliminar nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir eliminar nominas para usuarios autenticados" ON nominas;

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nomina_detalles;
DROP POLICY IF EXISTS "Permitir lectura de detalles" ON nomina_detalles;
DROP POLICY IF EXISTS "Permitir insertar detalles" ON nomina_detalles;
DROP POLICY IF EXISTS "Permitir actualizar detalles" ON nomina_detalles;
DROP POLICY IF EXISTS "Permitir eliminar detalles" ON nomina_detalles;
DROP POLICY IF EXISTS "Permitir eliminar detalles de nomina para usuarios autenticados" ON nomina_detalles;

-- =====================================================
-- PARTE 4: Crear políticas nuevas para NOMINAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (todos los usuarios autenticados pueden leer)
CREATE POLICY "select_nominas_policy"
ON nominas
FOR SELECT
TO authenticated
USING (true);

-- Política para INSERT (solo admins)
CREATE POLICY "insert_nominas_policy"
ON nominas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'admin'
  )
);

-- Política para UPDATE (solo admins, nóminas no pagadas)
CREATE POLICY "update_nominas_policy"
ON nominas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'admin'
  )
)
WITH CHECK (true);

-- Política para DELETE (solo admins, nóminas no pagadas)
CREATE POLICY "delete_nominas_policy"
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

-- =====================================================
-- PARTE 5: Crear políticas para NOMINA_DETALLES
-- =====================================================

-- Habilitar RLS
ALTER TABLE nomina_detalles ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (todos los usuarios autenticados)
CREATE POLICY "select_nomina_detalles_policy"
ON nomina_detalles
FOR SELECT
TO authenticated
USING (true);

-- Política para INSERT (solo admins)
CREATE POLICY "insert_nomina_detalles_policy"
ON nomina_detalles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'admin'
  )
);

-- Política para UPDATE (solo admins)
CREATE POLICY "update_nomina_detalles_policy"
ON nomina_detalles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'admin'
  )
)
WITH CHECK (true);

-- Política para DELETE (solo admins, nóminas no pagadas)
CREATE POLICY "delete_nomina_detalles_policy"
ON nomina_detalles
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
    WHERE n.id = nomina_detalles.nomina_id
    AND n.estado != 'pagada'
  )
);

-- =====================================================
-- PARTE 6: Verificar políticas creadas
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('nominas', 'nomina_detalles')
ORDER BY tablename, policyname;

-- =====================================================
-- PARTE 7: Verificar datos existentes
-- =====================================================

-- Ver nóminas
SELECT id, periodo, tipo, estado, 
       (SELECT COUNT(*) FROM nomina_detalles WHERE nomina_id = nominas.id) as num_detalles
FROM nominas
ORDER BY id;

-- Ver detalles con empleados
SELECT 
  nd.id,
  nd.nomina_id,
  nd.empleado_id,
  e.nombre_completo,
  nd.salario_base,
  nd.total_devengado,
  nd.total_deducciones,
  nd.neto_pagar
FROM nomina_detalles nd
LEFT JOIN empleados e ON nd.empleado_id = e.id
ORDER BY nd.nomina_id, nd.id;
