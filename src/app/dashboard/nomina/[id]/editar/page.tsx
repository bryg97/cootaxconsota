import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import EditarNominaClient from "./EditarNominaClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function EditarNominaPage({
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

  if (!isAdmin) redirect("/dashboard/nomina");

  // Obtener la nómina
  const { data: nomina, error: nominaError } = await supabase
    .from("nominas")
    .select("*")
    .eq("id", id)
    .single();

  if (nominaError || !nomina) {
    redirect("/dashboard/nomina");
  }

  // Solo se pueden editar nóminas en estado borrador o procesada (no pagadas)
  if (nomina.estado === "pagada") {
    redirect(`/dashboard/nomina/${id}`);
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

  console.log('Editar - Detalles query:', { 
    detallesCount: detalles?.length, 
    error: detallesError 
  });

  // Obtener lista de usuarios activos para agregar
  const { data: empleadosActivos } = await supabase
    .from("usuarios")
    .select("id, nombre, email, salario_base")
    .eq("estado", "activo")
    .order("nombre");

  console.log('Editar - Empleados activos:', empleadosActivos?.length);

  return (
    <EditarNominaClient
      nomina={nomina}
      detalles={detalles || []}
      empleadosActivos={empleadosActivos || []}
    />
  );
}
