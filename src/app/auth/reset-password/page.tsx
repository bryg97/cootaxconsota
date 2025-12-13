// src/app/auth/reset-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Supabase manda type=recovery en la URL cuando el usuario viene del correo
  const type = searchParams.get("type");

  useEffect(() => {
    if (type !== "recovery") {
      setMsg(
        "Abre este enlace desde el correo de restablecimiento de contraseña."
      );
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMsg("");

    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (error) {
      setErrorMsg("Error actualizando la contraseña: " + error.message);
      return;
    }

    setMsg("Contraseña actualizada correctamente. Ahora puedes iniciar sesión.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold mb-4 text-center">
          Restablecer contraseña
        </h1>

        {errorMsg && (
          <div className="mb-4 bg-red-100 text-red-700 p-3 rounded text-sm">
            {errorMsg}
          </div>
        )}

        {msg && (
          <div className="mb-4 bg-green-100 text-green-700 p-3 rounded text-sm">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="w-full border rounded-md px-3 py-2 text-sm pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600"
              >
                {showPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirmar contraseña
            </label>
            <input
              type={showPass ? "text" : "password"}
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
