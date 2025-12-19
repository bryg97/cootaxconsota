-- Script completo para configurar políticas RLS de nóminas
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- PARTE 1: Verificar estructura de tablas
-- =====================================================

-- Verificar que las tablas existan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('nominas', 'nominas_detalle', 'usuarios');

-- Verificar columnas de nominas_detalle
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nominas_detalle'
ORDER BY ordinal_position;

-- =====================================================
-- PARTE 2: Configurar CASCADE en clave foránea
-- =====================================================

-- Eliminar constraint existente y recrear con CASCADE
ALTER TABLE nominas_detalle
DROP CONSTRAINT IF EXISTS nominas_detalle_nomina_id_fkey CASCADE;

ALTER TABLE nominas_detalle
ADD CONSTRAINT nominas_detalle_nomina_id_fkey
FOREIGN KEY (nomina_id)
REFERENCES nominas(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Hacer lo mismo para usuario_id si es UUID
ALTER TABLE nominas_detalle
DROP CONSTRAINT IF EXISTS nominas_detalle_usuario_id_fkey CASCADE;

ALTER TABLE nominas_detalle
ADD CONSTRAINT nominas_detalle_usuario_id_fkey
FOREIGN KEY (usuario_id)
REFERENCES usuarios(id)
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

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir lectura de detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir insertar detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir actualizar detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir eliminar detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir eliminar detalles de nomina para usuarios autenticados" ON nominas_detalle;
DROP POLICY IF EXISTS "select_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "insert_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "update_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "delete_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_select_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_insert_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_update_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_delete_policy" ON nominas_detalle;

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
-- PARTE 5: Crear políticas para NOMINAS_DETALLE
-- =====================================================

-- Habilitar RLS
ALTER TABLE nominas_detalle ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (todos los usuarios autenticados)
CREATE POLICY "nominas_detalle_select_policy"
ON nominas_detalle
FOR SELECT
TO authenticated
USING (true);

-- Política para INSERT (solo admins)
CREATE POLICY "nominas_detalle_insert_policy"
ON nominas_detalle
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
CREATE POLICY "nominas_detalle_update_policy"
ON nominas_detalle
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
CREATE POLICY "nominas_detalle_delete_policy"
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
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- =====================================================
-- PARTE 7: Verificar datos existentes
-- =====================================================

-- Ver nóminas
SELECT id, periodo, tipo, estado, 
       (SELECT COUNT(*) FROM nominas_detalle WHERE nomina_id = nominas.id) as num_detalles
FROM nominas
ORDER BY id;

-- Ver detalles con usuarios
SELECT 
  nd.id,
  nd.nomina_id,
  nd.usuario_id,
  u.nombre,
  u.email,
  nd.salario_base,
  nd.total_devengado,
  nd.total_deducciones,
  nd.neto_pagar
FROM nominas_detalle nd
LEFT JOIN usuarios u ON nd.usuario_id = u.id
ORDER BY nd.nomina_id, nd.id;
