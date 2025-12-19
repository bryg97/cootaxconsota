-- SCRIPT SIMPLIFICADO PARA VERIFICAR PROBLEMA DE NÓMINAS
-- Ejecutar línea por línea en Supabase SQL Editor

-- 1. Ver qué tablas de nómina existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%nomina%';

-- 2. Ver estructura de usuarios
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- 3. Ver estructura de nominas_detalle
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'nominas_detalle'
ORDER BY ordinal_position;

-- 4. Ver cuántos registros hay en cada tabla
SELECT 
    'nominas' as tabla,
    COUNT(*) as registros
FROM nominas
UNION ALL
SELECT 
    'nominas_detalle' as tabla,
    COUNT(*) as registros
FROM nominas_detalle;

-- 5. Ver nóminas con su cantidad de empleados
SELECT 
    n.id,
    n.periodo,
    n.estado,
    COUNT(nd.id) as num_empleados
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
GROUP BY n.id, n.periodo, n.estado
ORDER BY n.id;

-- 6. Ver primeros 5 registros de nominas_detalle
SELECT * FROM nominas_detalle LIMIT 5;

-- 7. Ver primeros 5 usuarios
SELECT id, nombre, email FROM usuarios LIMIT 5;

-- 8. SOLUCIÓN: Configurar políticas RLS simples
-- Primero eliminar todas las políticas existentes

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nominas;
DROP POLICY IF EXISTS "select_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "insert_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "update_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "delete_nominas_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_select_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_insert_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_update_policy" ON nominas;
DROP POLICY IF EXISTS "nominas_delete_policy" ON nominas;

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON nominas_detalle;
DROP POLICY IF EXISTS "select_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "insert_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "update_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "delete_nomina_detalles_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_select_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_insert_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_update_policy" ON nominas_detalle;
DROP POLICY IF EXISTS "nominas_detalle_delete_policy" ON nominas_detalle;

-- 9. Habilitar RLS
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas_detalle ENABLE ROW LEVEL SECURITY;

-- 10. Crear políticas SIMPLES (permitir todo a usuarios autenticados)
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

-- 11. Configurar CASCADE para eliminar
ALTER TABLE nominas_detalle
DROP CONSTRAINT IF EXISTS nominas_detalle_nomina_id_fkey CASCADE;

ALTER TABLE nominas_detalle
ADD CONSTRAINT nominas_detalle_nomina_id_fkey
FOREIGN KEY (nomina_id)
REFERENCES nominas(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 12. Verificar políticas creadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;

-- 13. TEST FINAL: Ver nóminas con empleados
SELECT 
    n.id,
    n.periodo,
    n.estado,
    n.total_devengado,
    n.total_deducciones,
    n.total_neto,
    COUNT(nd.id) as num_empleados
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
GROUP BY n.id, n.periodo, n.estado, n.total_devengado, n.total_deducciones, n.total_neto
ORDER BY n.id;
