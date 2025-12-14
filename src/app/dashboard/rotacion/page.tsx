import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import RotacionClient from "./RotacionClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function RotacionPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, estado, roles(nombre, permisos)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");
  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("rotacion")) redirect("/dashboard");

  const roleName = (perfil as any)?.roles?.nombre ?? "operador";
  const isAdmin = roleName === "admin";

  // Config (tope horas semanales)
  const { data: config } = await supabase
    .from("configuraciones")
    .select("horas_semanales")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Turnos catálogo (horarios)
  const { data: horarios, error: horariosError } = await supabase
    .from("horarios")
    .select("id, nombre, hora_inicio, hora_fin, horas_trabajadas")
    .order("id", { ascending: true });

  if (horariosError) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando turnos (horarios):</p>
        <p>{horariosError.message}</p>
      </div>
    );
  }

  // Patrones + detalle
  const { data: patrones, error: patronesError } = await supabase
    .from("patrones_turnos")
    .select("id, nombre, patrones_turnos_detalle(dia, horario_id)")
    .order("id", { ascending: true });

  if (patronesError) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando patrones:</p>
        <p>{patronesError.message}</p>
      </div>
    );
  }

  // Si es admin, lista usuarios (operadores) para asignar rotación
  let usuarios: any[] = [];
  if (isAdmin) {
    const { data: usersData, error: usersError } = await supabase
      .from("usuarios")
      .select("id, nombre, email, estado, roles(nombre)")
      .order("nombre", { ascending: true });

    if (usersError) {
      return (
        <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
          <p className="font-semibold">Error cargando usuarios:</p>
          <p>{usersError.message}</p>
        </div>
      );
    }

    // aquí puedes filtrar si quieres solo operadores:
    usuarios = (usersData ?? []).map((u: any) => ({
      ...u,
      rol_nombre: u?.roles?.nombre ?? "operador",
    }));
  }

  return (
    <RotacionClient
      sessionUserId={perfil.id}
      sessionUserName={perfil.nombre ?? "Usuario"}
      isAdmin={isAdmin}
      topeHorasSemanales={Number((config as any)?.horas_semanales ?? 0)}
      initialHorarios={horarios ?? []}
      initialPatrones={patrones ?? []}
      initialUsuarios={usuarios}
    />
  );
}
