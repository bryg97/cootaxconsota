-- Ver estructura de tabla turnos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'turnos'
ORDER BY ordinal_position;

-- Ver estructura de horarios (para obtener las horas)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'horarios'
ORDER BY ordinal_position;

-- Ver algunos datos de ejemplo
SELECT 
    t.*,
    u.nombre as usuario_nombre,
    h.nombre as horario_nombre,
    h.horas_trabajadas
FROM turnos t
LEFT JOIN usuarios u ON t.usuario_id = u.id
LEFT JOIN horarios h ON t.horario_id = h.id
ORDER BY t.fecha DESC
LIMIT 10;
