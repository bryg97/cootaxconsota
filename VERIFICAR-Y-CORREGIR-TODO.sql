-- ============================================
-- SCRIPT PARA VERIFICAR Y CORREGIR TODO
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- PASO 1: Ver la estructura REAL actual
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('nominas', 'nominas_detalle', 'nomina_detalles')
ORDER BY table_name, ordinal_position;

-- PASO 2: Ver qué tabla existe realmente
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%nomina%';

-- PASO 3: Ver datos reales
SELECT 
    nd.*,
    u.nombre,
    u.numero_documento
FROM nominas_detalle nd
LEFT JOIN usuarios u ON nd.usuario_id = u.id
LIMIT 5;

-- PASO 4: Ver las políticas RLS actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename LIKE '%nomina%'
ORDER BY tablename, policyname;

-- ============================================
-- SI LA TABLA SE LLAMA nominas_detalle:
-- ============================================

-- Configurar CASCADE
ALTER TABLE nominas_detalle
DROP CONSTRAINT IF EXISTS nominas_detalle_nomina_id_fkey CASCADE;

ALTER TABLE nominas_detalle
ADD CONSTRAINT nominas_detalle_nomina_id_fkey
FOREIGN KEY (nomina_id)
REFERENCES nominas(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nominas;
DROP POLICY IF EXISTS "Permitir lectura de nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir insertar nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir actualizar nominas" ON nominas;
DROP POLICY IF EXISTS "Permitir eliminar nominas" ON nominas;
DROP POLICY IF EXISTS "select_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "insert_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "update_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "delete_nominas_policy" ON nominas;

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir lectura de detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir insertar detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir actualizar detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "Permitir eliminar detalles" ON nominas_detalle;
DROP POLICY IF EXISTS "select_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "insert_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "update_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "delete_nomina_detalles_policy" ON nominas_detalle;

-- Habilitar RLS
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas SIMPLES para NOMINAS (permitir todo a autenticados)
CREATE POLICY "nominas_select_policy"
ON nominas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "nominas_insert_policy"
ON nominas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "nominas_update_policy"
ON nominas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "nominas_delete_policy"
ON nominas FOR DELETE
TO authenticated
USING (true);

-- Políticas SIMPLES para NOMINAS_DETALLE (permitir todo a autenticados)
CREATE POLICY "nominas_detalle_select_policy"
ON nominas_detalle FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "nominas_detalle_insert_policy"
ON nominas_detalle FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "nominas_detalle_update_policy"
ON nominas_detalle FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "nominas_detalle_delete_policy"
ON nominas_detalle FOR DELETE
TO authenticated
USING (true);

-- Verificar políticas creadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- Test final
SELECT 
    n.id,
    n.periodo,
    n.estado,
    COUNT(nd.id) as num_empleados
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
GROUP BY n.id, n.periodo, n.estado
ORDER BY n.id;
