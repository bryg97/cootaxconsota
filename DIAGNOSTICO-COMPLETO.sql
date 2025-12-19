-- DIAGNÓSTICO COMPLETO - Ejecutar línea por línea

-- 1. Ver estructura de la tabla nominas_detalle para verificar campos requeridos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'nominas_detalle'
ORDER BY ordinal_position;

-- 2. Ver políticas actuales
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 3. Ver cuántas nóminas y detalles existen
SELECT 
    'nominas' as tabla,
    COUNT(*) as registros
FROM nominas
UNION ALL
SELECT 
    'nominas_detalle' as tabla,
    COUNT(*) as registros
FROM nominas_detalle;

-- 4. Ver última nómina creada con sus detalles
SELECT 
    n.id,
    n.periodo,
    n.estado,
    n.created_at,
    COUNT(nd.id) as num_detalles
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
WHERE n.id = (SELECT MAX(id) FROM nominas)
GROUP BY n.id, n.periodo, n.estado, n.created_at;

-- 5. SOLUCIÓN DEFINITIVA: Eliminar TODAS las políticas y crear una sola simple
-- EJECUTAR TODO ESTE BLOQUE JUNTO

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de nominas
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'nominas') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON nominas', r.policyname);
    END LOOP;
    
    -- Eliminar todas las políticas de nominas_detalle
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'nominas_detalle') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON nominas_detalle', r.policyname);
    END LOOP;
END $$;

-- 6. Crear UNA SOLA política simple para cada tabla
CREATE POLICY "enable_all_for_authenticated"
ON nominas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_all_for_authenticated"
ON nominas_detalle
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Verificar que solo existen estas 2 políticas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 8. Eliminar nóminas vacías
DELETE FROM nominas WHERE id NOT IN (
    SELECT DISTINCT nomina_id FROM nominas_detalle
);

-- 9. Ver resultado final
SELECT 
    n.id,
    n.periodo,
    n.estado,
    COUNT(nd.id) as empleados,
    n.total_devengado
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
GROUP BY n.id, n.periodo, n.estado, n.total_devengado
ORDER BY n.id DESC;
