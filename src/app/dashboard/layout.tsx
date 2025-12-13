import { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, estado, rol_id, roles(nombre, permisos)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");

  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const roleName = (perfil as any)?.roles?.nombre ?? "operador";
  const permisos = toStringArray((perfil as any)?.roles?.permisos);

  return (
    <DashboardLayoutClient
      userName={(perfil as any).nombre ?? "Usuario"}
      roleName={roleName}
      permisos={permisos}
    >
      {children}
    </DashboardLayoutClient>
  );
}
