// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import DashboardClient from "./DashboardClient";

export default async function DashboardHomePage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Cargar datos del usuario
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, email, tipo_descanso")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");

  // Obtener fechas del mes actual
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const fechaInicio = firstDay.toISOString().split("T")[0];
  const fechaFin = lastDay.toISOString().split("T")[0];

  // Cargar turnos del usuario del mes actual
  const { data: turnosData } = await supabase
    .from("turnos")
    .select("fecha, horario_id, horarios(nombre, hora_inicio, hora_fin, horas_trabajadas)")
    .eq("usuario_id", user.id)
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: true });

  // Mapear turnos para formato correcto (filtrar turnos con 0 horas)
  const turnos = (turnosData || [])
    .filter((t: any) => (t.horarios?.horas_trabajadas || 0) > 0)
    .map((t: any) => ({
      fecha: t.fecha,
      horario_id: t.horario_id,
      horarios: {
        nombre: t.horarios?.nombre || "",
        hora_inicio: t.horarios?.hora_inicio || "",
        hora_fin: t.horarios?.hora_fin || "",
        horas_trabajadas: t.horarios?.horas_trabajadas || 0,
      },
    }));

  // Cargar festivos del mes actual
  const { data: festivos } = await supabase
    .from("festivos")
    .select("fecha, descripcion")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: true });

  return (
    <DashboardClient
      userName={perfil.nombre}
      turnos={turnos}
      festivos={festivos || []}
      tipoDescanso={(perfil as any).tipo_descanso || null}
    />
  );
}
