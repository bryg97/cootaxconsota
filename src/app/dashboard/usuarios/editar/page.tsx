// src/app/dashboard/usuarios/editar/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EditUsuarioForm from "./EditUsuarioForm";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string | null;
  salario_base: number | null;
};

export default function EditarUsuarioPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [canChangePassword, setCanChangePassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const id = searchParams.get("id"); // ← leemos ?id=...

  useEffect(() => {
    const cargar = async () => {
      if (!id) {
        setErrorMsg("ID de usuario no válido.");
        setLoading(false);
        return;
      }

      // 1) Verificar sesión
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // 2) Verificar que sea admin
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (perfil?.rol !== "admin") {
        router.push("/dashboard");
        return;
      }

      // 3) Cargar usuario a editar
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, email, rol, salario_base")
        .eq("id", id)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message ?? "Usuario no encontrado");
        setLoading(false);
        return;
      }

      // ¿El usuario editado es el mismo que está logueado?
      setCanChangePassword(user.id === data.id);

      setUsuario(data as Usuario);
      setLoading(false);
    };

    cargar();
  }, [id, router]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow text-sm">
        Cargando usuario...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded text-sm">
        {errorMsg}
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <EditUsuarioForm
      initialUsuario={usuario}
      canChangePassword={canChangePassword}
    />
  );
}
