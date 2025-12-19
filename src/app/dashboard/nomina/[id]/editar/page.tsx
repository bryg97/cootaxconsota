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
    .from("nomina_detalles")
    .select(`
      *,
      empleado:empleados(
        id,
        nombre_completo,
        numero_documento,
        cargo
      )
    `)
    .eq("nomina_id", id)
    .order("empleado_id");

  // Obtener lista de empleados activos para agregar
  const { data: empleadosActivos } = await supabase
    .from("empleados")
    .select("id, nombre_completo, numero_documento, cargo, salario_base")
    .eq("estado", "activo")
    .order("nombre_completo");

  return (
    <EditarNominaClient
      nomina={nomina}
      detalles={detalles || []}
      empleadosActivos={empleadosActivos || []}
    />
  );
}
