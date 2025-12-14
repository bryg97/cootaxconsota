import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import PatronesClient from "./PatronesClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function PatronesPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("estado, roles(permisos)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");
  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("turnos")) redirect("/dashboard");

  // Turnos disponibles (horarios)
  const { data: turnos, error: turnosError } = await supabase
    .from("horarios")
    .select("id, nombre, hora_inicio, hora_fin, horas_trabajadas")
    .order("id", { ascending: true });

  if (turnosError) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando turnos:</p>
        <p>{turnosError.message}</p>
      </div>
    );
  }

  // Patrones + detalle
  const { data: patrones, error: patronesError } = await supabase
    .from("patrones_turnos")
    .select("id, nombre, created_at, patrones_turnos_detalle(dia, horario_id)")
    .order("id", { ascending: true });

  if (patronesError) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando patrones:</p>
        <p>{patronesError.message}</p>
      </div>
    );
  }

  return (
    <PatronesClient
      initialTurnos={turnos ?? []}
      initialPatrones={patrones ?? []}
    />
  );
}
