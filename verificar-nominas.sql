-- Script para verificar el estado de las nóminas
-- Ejecutar en Supabase SQL Editor para diagnosticar

-- Ver todas las nóminas con su estado
SELECT 
  id,
  periodo,
  tipo,
  estado,
  fecha_inicio,
  fecha_fin,
  total_devengado,
  total_deducciones,
  total_neto,
  created_at
FROM nominas
ORDER BY periodo DESC;

-- Ver cuántas nóminas hay por estado
SELECT 
  estado,
  COUNT(*) as cantidad
FROM nominas
GROUP BY estado;

-- Si necesitas cambiar una nómina a estado borrador para probar la edición:
-- UPDATE nominas SET estado = 'borrador' WHERE id = 1;
