// src/app/dashboard/configuracion/page.tsx

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ConfiguracionClient from "./ConfiguracionClient";

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export default async function ConfiguracionPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("estado, roles(permisos)")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");
  if ((perfil as any).estado === "bloqueado") redirect("/login?blocked=1");

  const permisos = toStringArray((perfil as any)?.roles?.permisos);
  if (!permisos.includes("configuracion")) redirect("/dashboard");

  // Traer la primera configuración (asumimos 1 sola)
  const { data: config, error: configError } = await supabase
    .from("configuraciones")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Traer festivos
  const { data: festivos, error: festivosError } = await supabase
    .from("festivos")
    .select("id, fecha, descripcion")
    .order("fecha", { ascending: true });

  if (configError) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando configuración:</p>
        <p>{configError.message}</p>
      </div>
    );
  }

  if (festivosError) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        <p className="font-semibold">Error cargando festivos:</p>
        <p>{festivosError.message}</p>
      </div>
    );
  }

  return (
    <ConfiguracionClient
      initialConfig={config}
      initialFestivos={festivos ?? []}
    />
  );
}
