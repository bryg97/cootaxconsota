-- Script para verificar qué está pasando con los datos de nómina
-- Ejecutar línea por línea en Supabase SQL Editor

-- 1. Ver todas las nóminas
SELECT * FROM nominas ORDER BY id DESC LIMIT 5;

-- 2. Ver cuántos detalles tiene cada nómina
SELECT 
    n.id,
    n.periodo,
    n.estado,
    n.fecha_inicio,
    n.fecha_fin,
    COUNT(nd.id) as num_detalles,
    n.total_devengado
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
GROUP BY n.id, n.periodo, n.estado, n.fecha_inicio, n.fecha_fin, n.total_devengado
ORDER BY n.id DESC;

-- 3. Ver detalles de la última nómina (cambiar el ID si es necesario)
SELECT * FROM nominas_detalle WHERE nomina_id = (SELECT MAX(id) FROM nominas);

-- 4. Verificar políticas RLS actuales
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 5. Si no hay detalles, eliminar la nómina vacía y crear políticas correctas
-- (Ejecutar solo si la query anterior mostró 0 detalles)

-- Eliminar nómina vacía
-- DELETE FROM nominas WHERE id = <ID_DE_LA_NOMINA_VACIA>;

-- 6. ASEGURAR que las políticas permiten TODO (SELECT, INSERT, UPDATE, DELETE)
-- Primero limpiar todo
DROP POLICY IF EXISTS "allow_all_nominas" ON nominas;
DROP POLICY IF EXISTS "allow_all_nominas_detalle" ON nominas_detalle;
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
DROP POLICY IF EXISTS "allow_all_authenticated_nominas" ON nominas;
DROP POLICY IF EXISTS "allow_all_authenticated_nominas_detalle" ON nominas_detalle;

-- Ahora crear políticas simples
CREATE POLICY "allow_all_authenticated_nominas"
ON nominas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_nominas_detalle"
ON nominas_detalle
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Verificar que se crearon correctamente
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 8. Test: Intentar insertar un registro de prueba (cambia los IDs según tu BD)
-- INSERT INTO nominas_detalle (
--     nomina_id, usuario_id, salario_base, auxilio_transporte,
--     total_devengado, total_deducciones, neto_pagar
-- ) VALUES (
--     <ID_NOMINA>, '<ID_USUARIO>', 1000000, 50000,
--     1050000, 80000, 970000
-- );

-- Si el INSERT funciona, el problema está resuelto. Elimina el registro de prueba:
-- DELETE FROM nominas_detalle WHERE nomina_id = <ID_NOMINA> AND salario_base = 1000000;
