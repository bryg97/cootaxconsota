-- SCRIPT PARA VERIFICAR POR QUÉ NO APARECEN EMPLEADOS
-- Ejecutar en Supabase SQL Editor línea por línea

-- 1. Ver qué políticas hay actualmente
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 2. Ver cuántos registros hay en nominas_detalle
SELECT COUNT(*) as total_detalles FROM nominas_detalle;

-- 3. Ver detalles de la nómina 3 específicamente
SELECT * FROM nominas_detalle WHERE nomina_id = 3;

-- 4. Ver si el problema es el JOIN con usuarios
SELECT 
    nd.*,
    u.id as usuario_id_join,
    u.nombre,
    u.email
FROM nominas_detalle nd
LEFT JOIN usuarios u ON nd.usuario_id = u.id
WHERE nd.nomina_id = 3;

-- 5. SOLUCIÓN: Eliminar todas las políticas complejas y crear políticas SIMPLES
-- Primero eliminar todas
DROP POLICY IF EXISTS "select_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "insert_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "update_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "delete_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_select_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_insert_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_update_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_delete_policy" ON nominas;

DROP POLICY IF EXISTS "select_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "insert_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "update_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "delete_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_select_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_insert_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_update_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_delete_policy" ON nominas_detalle;

-- 6. Crear políticas SÚPER SIMPLES (permitir TODO a usuarios autenticados)
CREATE POLICY "allow_all_nominas"
ON nominas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_nominas_detalle"
ON nominas_detalle
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Verificar que se crearon
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 8. Test final: ver nóminas con cantidad de empleados
SELECT 
    n.id,
    n.periodo,
    n.estado,
    COUNT(nd.id) as num_empleados,
    n.total_devengado,
    n.total_neto
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
GROUP BY n.id, n.periodo, n.estado, n.total_devengado, n.total_neto
ORDER BY n.id;
