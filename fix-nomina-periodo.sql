-- Ampliar campo periodo en tabla nominas
ALTER TABLE nominas ALTER COLUMN periodo TYPE VARCHAR(20);

-- Agregar campos para auxilio y fondo en configuraciones
ALTER TABLE configuraciones 
ADD COLUMN IF NOT EXISTS auxilio_transporte NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fondo_solidario NUMERIC DEFAULT 0;

-- Agregar columnas para tipos específicos de horas extras en nominas_detalle
ALTER TABLE nominas_detalle
ADD COLUMN IF NOT EXISTS horas_extras_diurnas NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_extras_nocturnas NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_extras_diurnas_domingo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_extras_nocturnas_domingo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_extras_diurnas NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_extras_nocturnas NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_extras_diurnas_domingo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_extras_nocturnas_domingo NUMERIC DEFAULT 0;
