import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import NominaClient from "./NominaClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function NominaPage() {
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

  // Cargar nóminas existentes
  const { data: nominas, error } = await supabase
    .from("nominas")
    .select(`
      id,
      periodo,
      tipo,
      fecha_inicio,
      fecha_fin,
      estado,
      total_devengado,
      total_deducciones,
      total_neto,
      created_at,
      procesada_at,
      pagada_at
    `)
    .order("periodo", { ascending: false });

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando nóminas:</p>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <NominaClient
      sessionUserId={perfil.id}
      sessionUserName={(perfil as any).nombre ?? "Usuario"}
      isAdmin={isAdmin}
      initialNominas={nominas ?? []}
    />
  );
}
