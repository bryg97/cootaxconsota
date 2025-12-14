import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import NuevaNominaClient from "./NuevaNominaClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function NuevaNominaPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("estado, roles(nombre, permisos)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");
  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("nomina")) redirect("/dashboard");

  const roleName = (perfil as any)?.roles?.nombre ?? "operador";
  if (roleName !== "admin") redirect("/dashboard/nomina");

  // Cargar configuración
  const { data: config } = await supabase
    .from("configuraciones")
    .select("horas_mensuales, auxilio_transporte, fondo_solidario")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Cargar usuarios activos con salario
  const { data: usuariosData } = await supabase
    .from("usuarios")
    .select("id, nombre, email, salario_base, roles(nombre)")
    .eq("estado", "activo")
    .order("nombre", { ascending: true });

  // Mapear usuarios para tener el formato correcto
  const usuarios = (usuariosData || []).map((u: any) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    salario_base: u.salario_base,
    roles: { nombre: u.roles?.nombre || "operador" },
  }));

  // Cargar horarios con tramos
  const { data: horarios } = await supabase
    .from("horarios")
    .select("id, nombre, tramos, horas_trabajadas")
    .order("nombre", { ascending: true });

  // Cargar festivos
  const { data: festivos } = await supabase
    .from("festivos")
    .select("fecha")
    .order("fecha", { ascending: true });

  return (
    <NuevaNominaClient
      config={config || {}}
      usuarios={usuarios}
      horarios={horarios || []}
      festivos={festivos || []}
    />
  );
}
