import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import CalendarioRotacionClient from "./CalendarioRotacionClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function CalendarioRotacionPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, estado, rol_id, roles(id, nombre, permisos, permisos_detallados)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");
  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("rotacion")) redirect("/dashboard");

  const roleName = (perfil as any)?.roles?.nombre ?? "operador";
  const rolId = (perfil as any)?.rol_id;
  
  // Verificar permisos detallados de rotación
  const permisosDetallados = (perfil as any)?.roles?.permisos_detallados || [];
  const permisoRotacion = permisosDetallados.find((p: any) => p.modulo === "rotacion");
  const soloLectura = permisoRotacion && permisoRotacion.leer && !permisoRotacion.escribir;

  // Obtener fecha actual para el mes
  const now = new Date();
  const mesActual = now.getMonth();
  const añoActual = now.getFullYear();
  const primerDia = new Date(añoActual, mesActual, 1);
  const ultimoDia = new Date(añoActual, mesActual + 1, 0);
  const fechaInicio = primerDia.toISOString().split("T")[0];
  const fechaFin = ultimoDia.toISOString().split("T")[0];

  // Obtener usuarios del mismo rol
  const { data: usuariosMismoRol } = await supabase
    .from("usuarios")
    .select("id, nombre, email")
    .eq("rol_id", rolId)
    .eq("estado", "activo")
    .order("nombre", { ascending: true });

  const usuariosIds = (usuariosMismoRol || []).map((u: any) => u.id);

  // Obtener turnos de todos los usuarios del mismo rol para el mes actual
  let turnosData: any[] = [];
  if (usuariosIds.length > 0) {
    const { data: turnos, error: turnosError } = await supabase
      .from("turnos")
      .select(`
        id,
        fecha,
        usuario_id,
        horario_id,
        usuarios(id, nombre),
        horarios(id, nombre, hora_inicio, hora_fin, horas_trabajadas, tramos)
      `)
      .in("usuario_id", usuariosIds)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: true });

    if (!turnosError && turnos) {
      // Filtrar turnos válidos con relaciones completas
      turnosData = turnos.filter((t: any) => 
        t && t.usuarios && t.horarios && 
        t.horarios.nombre && 
        t.horarios.hora_inicio && 
        t.horarios.hora_fin &&
        t.horarios.horas_trabajadas !== null
      );
    }
  }

  // Obtener festivos del mes
  const { data: festivos } = await supabase
    .from("festivos")
    .select("fecha, descripcion")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: true });

  return (
    <CalendarioRotacionClient
      sessionUserId={perfil.id}
      sessionUserName={(perfil as any).nombre ?? "Usuario"}
      roleName={roleName}
      soloLectura={soloLectura}
      usuarios={usuariosMismoRol || []}
      turnos={turnosData}
      festivos={festivos || []}
    />
  );
}
