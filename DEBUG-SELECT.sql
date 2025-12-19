-- Verificar que el SELECT que usa el código funcione correctamente

-- 1. Query EXACTA que usa la página de detalle
SELECT 
    nd.*,
    u.id as usuario_id,
    u.nombre,
    u.email
FROM nominas_detalle nd
LEFT JOIN usuarios u ON nd.usuario_id = u.id
WHERE nd.nomina_id = 8
ORDER BY nd.usuario_id;

-- 2. Si lo anterior no devuelve datos, verificar sin JOIN
SELECT * FROM nominas_detalle WHERE nomina_id = 8;

-- 3. Verificar que los usuario_id existen
SELECT 
    nd.usuario_id,
    u.id,
    u.nombre,
    u.email
FROM nominas_detalle nd
LEFT JOIN usuarios u ON nd.usuario_id = u.id
WHERE nd.nomina_id = 8;

-- 4. Verificar políticas en usuarios también
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY tablename, policyname;
