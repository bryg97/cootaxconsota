import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import TurnosClient from "./TurnosClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function TurnosPage() {
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

  const { data: turnos, error } = await supabase
    .from("horarios")
    .select("id, nombre, hora_inicio, hora_fin, tramos, horas_trabajadas, created_at")
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando turnos:</p>
        <p>{error.message}</p>
      </div>
    );
  }

  return <TurnosClient initialTurnos={turnos ?? []} />;
}
