// src/app/dashboard/roles/page.tsx

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import RolesTable from "./RolesTable";

export default async function RolesPage() {
  const supabase = await createServerSupabaseClient();

  // Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar que sea admin
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    redirect("/dashboard");
  }

  // Traer roles
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, nombre, permisos")
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando roles:</p>
        <p>{error.message}</p>
      </div>
    );
  }

  return <RolesTable initialRoles={roles ?? []} />;
}
