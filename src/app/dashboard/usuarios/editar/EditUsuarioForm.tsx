// src/app/dashboard/usuarios/editar/EditUsuarioForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string | null;
  salario_base: number | null;
  tipo_descanso: string | null;
};

interface Props {
  initialUsuario: Usuario;
  canChangePassword: boolean; // ✨
}

export default function EditUsuarioForm({
  initialUsuario,
  canChangePassword,
}: Props) {
  const router = useRouter();

  const [nombre, setNombre] = useState(initialUsuario.nombre);
  const [email, setEmail] = useState(initialUsuario.email);
  const [rol, setRol] = useState(initialUsuario.rol ?? "operador");
  const [salarioBase, setSalarioBase] = useState<number | "">(
    initialUsuario.salario_base ?? ""
  );
  const [tipoDescanso, setTipoDescanso] = useState(
    initialUsuario.tipo_descanso ?? "fijo_domingo"
  );

  // Estados para cambiar contraseña (solo si canChangePassword)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Estados para reset vía correo
  const [resetMsg, setResetMsg] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendResetEmail = async () => {
    setErrorMsg("");
    setResetMsg("");

    if (!initialUsuario.email) {
      setErrorMsg("El usuario no tiene correo asignado.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      initialUsuario.email,
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (error) {
      setErrorMsg("Error enviando correo de restablecimiento: " + error.message);
      return;
    }

    setResetMsg(
      `Se envió un correo de restablecimiento a ${initialUsuario.email}.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    // 1) Si el admin está editando su propia cuenta → permitir cambio de contraseña directo
    if (canChangePassword && newPassword.trim() !== "") {
      if (newPassword !== confirmPassword) {
        setLoading(false);
        setErrorMsg("Las contraseñas no coinciden.");
        return;
      }

      const { error: passError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passError) {
        setLoading(false);
        setErrorMsg(
          "Error actualizando la contraseña: " + passError.message
        );
        return;
      }
    }

    // 2) Actualizar datos del usuario en la tabla
    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre,
        email,
        rol,
        salario_base:
          salarioBase === "" ? null : Number(salarioBase),
        tipo_descanso: tipoDescanso,
      })
      .eq("id", initialUsuario.id);

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg("Datos actualizados correctamente.");

    router.push("/dashboard/usuarios");
    router.refresh();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Editar usuario</h1>

      {errorMsg && (
        <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-green-100 text-green-700 p-3 rounded">
          {successMsg}
        </div>
      )}

      {resetMsg && (
        <div className="mb-4 bg-blue-100 text-blue-700 p-3 rounded">
          {resetMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-md bg-white p-4 rounded-lg shadow"
      >
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre
          </label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        {/* Correo */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Correo
          </label>
          <input
            type="email"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Rol
          </label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          >
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        {/* Salario base */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Salario base
          </label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={salarioBase}
            onChange={(e) =>
              setSalarioBase(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            min={0}
          />
        </div>

        {/* Tipo de descanso obligatorio */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo de descanso obligatorio
          </label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={tipoDescanso}
            onChange={(e) => setTipoDescanso(e.target.value)}
          >
            <option value="fijo_domingo">Fijo (Domingo)</option>
            <option value="aleatorio">Aleatorio (Según patrón)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Fijo: Siempre descansa domingo. Aleatorio: Según patrón semanal
          </p>
        </div>

        {/* Cambiar contraseña — SOLO si el admin edita su propia cuenta */}
        {canChangePassword && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <p className="text-sm font-semibold mb-2">
              Cambiar contraseña (solo tu cuenta)
            </p>

            {/* Nueva contraseña */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="w-full border rounded-md px-3 py-2 text-sm pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
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

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Confirmar nueva contraseña
              </label>
              <input
                type={showPass ? "text" : "password"}
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
              />
            </div>
          </div>
        )}

        {/* Reset Password por correo — SOLO si edita a otro usuario */}
        {!canChangePassword && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <p className="text-sm font-semibold mb-2">
              Restablecer contraseña del usuario
            </p>

            <p className="text-xs text-gray-600 mb-3">
              Se enviará un correo de restablecimiento a:{" "}
              <span className="font-semibold">{initialUsuario.email}</span>
            </p>

            <button
              type="button"
              onClick={handleSendResetEmail}
              className="px-3 py-2 text-sm rounded-md border border-blue-400 text-blue-600 hover:bg-blue-50"
            >
              Enviar correo de restablecimiento
            </button>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/usuarios")}
            className="border border-gray-300 text-sm px-4 py-2 rounded-md hover:bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
