# 🔧 SOLUCIÓN PASO A PASO - NÓMINAS

## ❌ PROBLEMAS ACTUALES:
1. Al hacer clic en "Ver detalle" no se muestran empleados
2. Al hacer clic en "Editar" dice 0 empleados
3. Al eliminar una nómina dice que se eliminó pero reaparece

## ✅ SOLUCIÓN COMPLETA:

### PASO 1: EJECUTAR SQL EN SUPABASE (OBLIGATORIO)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo: **VERIFICAR-Y-CORREGIR-TODO.sql**
5. Haz clic en **Run** (Ejecutar)
6. Verifica los resultados:
   - La primera sección te mostrará la estructura REAL de las tablas
   - La segunda parte configurará las políticas RLS correctamente
   - El test final te mostrará cuántos empleados hay en cada nómina

### PASO 2: VERIFICAR LOS DATOS

Después de ejecutar el SQL, verás en los resultados:
- Si la tabla se llama `nominas_detalle` o `nomina_detalles`
- Cuántos empleados hay realmente en cada nómina
- Si las políticas RLS están configuradas correctamente

### PASO 3: ESPERAR DESPLIEGUE DE VERCEL

El código ya está actualizado en el servidor. Vercel debería estar desplegando ahora.

Puedes verificar el estado en:
https://vercel.com/bryg97/cootaxconsota/deployments

### PASO 4: LIMPIAR CACHÉ DEL NAVEGADOR

1. Abre la aplicación en tu navegador
2. Presiona **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac) para refrescar sin caché
3. O abre en modo incógnito para probar

---

## 📋 ARCHIVOS SQL IMPORTANTES:

1. **VERIFICAR-Y-CORREGIR-TODO.sql** ← **EJECUTA ESTE PRIMERO**
   - Verifica la estructura real de la BD
   - Configura las políticas RLS
   - Habilita CASCADE para eliminar

2. **fix-completo-nominas-rls.sql**
   - Backup de configuración completa

3. **supabase-nomina-schema.sql**
   - Schema original de la base de datos

---

## 🐛 SI AÚN NO FUNCIONA:

### Revisar en Supabase SQL Editor:

```sql
-- Ver cuántos empleados hay en cada nómina
SELECT 
    n.id,
    n.periodo,
    n.estado,
    COUNT(nd.id) as num_empleados,
    STRING_AGG(u.nombre, ', ') as empleados
FROM nominas n
LEFT JOIN nominas_detalle nd ON nd.nomina_id = n.id
LEFT JOIN usuarios u ON nd.usuario_id = u.id
GROUP BY n.id, n.periodo, n.estado
ORDER BY n.id;
```

Si `num_empleados` es 0, significa que no hay empleados agregados a esas nóminas.

### Verificar que las políticas estén activas:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('nominas', 'nominas_detalle')
ORDER BY tablename, policyname;
```

Deberías ver 4 políticas para cada tabla (SELECT, INSERT, UPDATE, DELETE).

---

## 📞 DATOS DEL PROBLEMA:

- **Fecha**: 19 de diciembre de 2025
- **Problema**: Ver detalle y editar no muestran empleados
- **Causa**: Nombre incorrecto de tabla o políticas RLS bloqueando consultas
- **Solución**: Ejecutar VERIFICAR-Y-CORREGIR-TODO.sql en Supabase

---

## ⚡ CAMBIOS APLICADOS EN EL CÓDIGO:

✅ Tabla `nomina_detalles` → `nominas_detalle`
✅ Campo `empleado_id` → `usuario_id`
✅ Campo `empleado.nombre_completo` → `usuario.nombre`
✅ Todos los campos actualizados según schema real
✅ APIs POST/PATCH/DELETE actualizadas
✅ Componentes actualizados

**Todo el código ya está en producción, solo falta ejecutar el SQL en Supabase.**
