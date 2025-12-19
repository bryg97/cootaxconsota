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
    .select("id, nombre, estado, roles(nombre, permisos, permisos_detallados)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");
  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("nomina")) redirect("/dashboard");

  const roleName = (perfil as any)?.roles?.nombre ?? "operador";
  const isAdmin = roleName === "admin";
  
  // Verificar permisos detallados de nómina
  const permisosDetallados = (perfil as any)?.roles?.permisos_detallados || [];
  const permisoNomina = permisosDetallados.find((p: any) => p.modulo === "nomina");
  const soloLectura = permisoNomina && permisoNomina.leer && !permisoNomina.escribir;
  const esOperador = roleName === "operador";

  // Si es operador con solo lectura, solo mostrar sus propias liquidaciones
  let nominasQuery = supabase
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
    `);

  // Si es operador con solo lectura, filtrar nóminas que contengan sus liquidaciones
  let nominas;
  let error;
  
  if (esOperador && soloLectura) {
    // Obtener IDs de nóminas donde el usuario tiene liquidaciones
    const { data: misDetalles } = await supabase
      .from("nominas_detalle")
      .select("nomina_id")
      .eq("usuario_id", user.id);
    
    const nominaIds = (misDetalles || []).map(d => d.nomina_id);
    
    if (nominaIds.length > 0) {
      const result = await nominasQuery.in("id", nominaIds).order("periodo", { ascending: false });
      nominas = result.data;
      error = result.error;
    } else {
      nominas = [];
      error = null;
    }
  } else {
    const result = await nominasQuery.order("periodo", { ascending: false });
    nominas = result.data;
    error = result.error;
  }

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
      soloLectura={esOperador && soloLectura}
      initialNominas={nominas ?? []}
    />
  );
}
