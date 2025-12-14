import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si hay usuario autenticado, redirigir al dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Si no hay usuario, redirigir al login
  redirect("/login");
}
