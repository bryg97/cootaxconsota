# ESTRUCTURA DE BASE DE DATOS - REFERENCIA

## Tabla: usuarios
- id: uuid (PK)
- nombre: varchar
- email: varchar
- rol_id: bigint
- salario_base: numeric
- created_at: timestamp
- rol: text
- estado: text ('activo', 'bloqueado')
- tipo_descanso: varchar ('fijo_domingo', 'rotativo')

## Tabla: nominas
- id: bigint (PK)
- periodo: varchar
- tipo: varchar ('quincenal', 'mensual')
- fecha_inicio: date
- fecha_fin: date
- estado: varchar ('borrador', 'procesada', 'pagada')
- total_devengado: numeric
- total_deducciones: numeric
- total_neto: numeric
- created_by: uuid
- created_at: timestamp
- procesada_at: timestamp
- pagada_at: timestamp

## Tabla: nominas_detalle
- id: bigint (PK)
- nomina_id: bigint (FK → nominas.id)
- usuario_id: uuid (FK → usuarios.id)
- salario_base: numeric
- auxilio_transporte: numeric
- horas_trabajadas: numeric
- horas_extras: numeric
- valor_horas_extras: numeric
- horas_recargo_nocturno: numeric
- valor_recargo_nocturno: numeric
- horas_recargo_festivo: numeric
- valor_recargo_festivo: numeric
- horas_recargo_dominical: numeric
- valor_recargo_dominical: numeric
- total_recargos: numeric
- total_devengado: numeric
- deduccion_salud: numeric
- deduccion_pension: numeric
- deduccion_fondo_solidario: numeric
- total_deducciones: numeric
- neto_pagar: numeric
- observaciones: text
- created_at: timestamp
- dias_adicionales_descanso: numeric
- valor_dias_adicionales: numeric
- horas_extras_diurnas: numeric
- horas_extras_nocturnas: numeric
- horas_extras_diurnas_domingo: numeric
- horas_extras_nocturnas_domingo: numeric
- valor_extras_diurnas: numeric
- valor_extras_nocturnas: numeric
- valor_extras_diurnas_domingo: numeric
- valor_extras_nocturnas_domingo: numeric

## CAMPOS QUE NO EXISTEN (NO USAR)
❌ usuarios.numero_documento
❌ usuarios.cargo
❌ nominas_detalle.empleado_id (usar usuario_id)

## QUERIES CORRECTOS
```sql
-- Obtener detalles de nómina con usuarios
SELECT 
  nd.*,
  u.id as usuario_id,
  u.nombre,
  u.email,
  u.salario_base
FROM nominas_detalle nd
LEFT JOIN usuarios u ON nd.usuario_id = u.id
WHERE nd.nomina_id = ?;

-- Obtener usuarios activos
SELECT 
  id,
  nombre,
  email,
  salario_base,
  estado
FROM usuarios
WHERE estado = 'activo';
```
