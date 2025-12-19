import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import TurnosConsultaClient from "./TurnosConsultaClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function TurnosConsultaPage() {
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
  if (!permisos.includes("nomina")) redirect("/dashboard");

  const roleName = (perfil as any)?.roles?.nombre ?? "operador";
  const isAdmin = roleName === "admin";

  // Obtener usuarios activos para el filtro
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre, email")
    .eq("estado", "activo")
    .order("nombre");

  // Obtener horarios para el filtro
  const { data: horarios } = await supabase
    .from("horarios")
    .select("id, nombre, horas_trabajadas")
    .order("nombre");

  return (
    <TurnosConsultaClient
      isAdmin={isAdmin}
      usuarios={usuarios || []}
      horarios={horarios || []}
      sessionUserId={user.id}
    />
  );
}
