-- Agregar columna tipo_descanso a tabla usuarios
-- Valores: 'fijo_domingo', 'aleatorio'
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tipo_descanso VARCHAR(20) DEFAULT 'fijo_domingo';

COMMENT ON COLUMN usuarios.tipo_descanso IS 'Tipo de descanso obligatorio: fijo_domingo (siempre domingo) o aleatorio (según patrón semanal)';

-- Agregar columna dia_adicional_pago a nominas_detalle para registrar días adicionales por descanso no tomado
ALTER TABLE nominas_detalle 
ADD COLUMN IF NOT EXISTS dias_adicionales_descanso NUMERIC(10,2) DEFAULT 0;

ALTER TABLE nominas_detalle 
ADD COLUMN IF NOT EXISTS valor_dias_adicionales NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN nominas_detalle.dias_adicionales_descanso IS 'Días adicionales a pagar por no haber tenido descanso obligatorio en la semana';
COMMENT ON COLUMN nominas_detalle.valor_dias_adicionales IS 'Valor monetario de los días adicionales';
