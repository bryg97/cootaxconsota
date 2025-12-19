import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import NominaDetalleClient from "./NominaDetalleClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function NominaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Obtener la nómina
  const { data: nomina, error: nominaError } = await supabase
    .from("nominas")
    .select("*")
    .eq("id", id)
    .single();

  if (nominaError || !nomina) {
    redirect("/dashboard/nomina");
  }

  // Obtener el detalle de empleados
  const { data: detalles, error: detallesError } = await supabase
    .from("nominas_detalle")
    .select(`
      *,
      usuario:usuarios(
        id,
        nombre,
        email
      )
    `)
    .eq("nomina_id", id)
    .order("usuario_id");

  console.log('Detalles query result:', { 
    detallesCount: detalles?.length, 
    error: detallesError,
    nominaId: id 
  });

  return (
    <NominaDetalleClient
      nomina={nomina}
      detalles={detalles || []}
      isAdmin={isAdmin}
    />
  );
}
