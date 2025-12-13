// src/app/dashboard/usuarios/page.tsx

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import UsuariosTable from "./UsuariosTable";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function UsuariosPage() {
  const supabase = await createServerSupabaseClient();

  // 1) Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2) Cargar perfil + permisos (roles.permisos es jsonb)
  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios")
    .select("estado, rol_id, roles(nombre, permisos)")
    .eq("id", user.id)
    .single();

  if (perfilError || !perfil) redirect("/login");

  // 3) Si está bloqueado -> fuera
  if ((perfil as any).estado === "bloqueado") {
    redirect("/login?blocked=1");
  }

  // 4) Permiso requerido: "usuarios"
  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("usuarios")) {
    redirect("/dashboard");
  }

  // 5) Traer usuarios + rol por JOIN
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, estado, salario_base, rol_id, roles(nombre)")
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando usuarios:</p>
        <p>{error.message}</p>
      </div>
    );
  }

  // 6) Normalizar datos para la tabla:
  //    tu UsuariosTable espera "rol" (texto), entonces lo mapeamos desde roles.nombre
  const normalizedUsuarios =
    (usuarios ?? []).map((u: any) => ({
      ...u,
      rol: u?.roles?.nombre ?? "operador",
    })) ?? [];

  return <UsuariosTable initialUsuarios={normalizedUsuarios} />;
}
