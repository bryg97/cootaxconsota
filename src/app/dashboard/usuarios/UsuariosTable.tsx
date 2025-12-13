// src/app/dashboard/usuarios/UsuariosTable.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Usuario = {
  id: string | null;
  nombre?: string | null;
  rol?: string | null;
  email?: string | null;
  correo?: string | null;
  estado?: string | null;
  salario_base?: number | null;
  [key: string]: any;
};

interface Props {
  initialUsuarios: Usuario[];
}

export default function UsuariosTable({ initialUsuarios }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(initialUsuarios);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const toggleEstado = async (usuario: Usuario) => {
    if (!usuario.id) {
      alert("Usuario sin ID válido.");
      return;
    }

    const estadoActual = usuario.estado ?? "activo";
    const nuevoEstado = estadoActual === "activo" ? "bloqueado" : "activo";

    setLoadingId(usuario.id);

    const { error } = await supabase
      .from("usuarios")
      .update({ estado: nuevoEstado })
      .eq("id", usuario.id);

    setLoadingId(null);

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuario.id ? { ...u, estado: nuevoEstado } : u
      )
    );
  };

  const eliminarUsuario = async (usuario: Usuario) => {
    if (!usuario.id) {
      alert("Usuario sin ID válido.");
      return;
    }

    if (
      !confirm(
        `¿Seguro que quieres eliminar al usuario "${
          usuario.nombre ?? usuario.email ?? usuario.correo ?? usuario.id
        }"?`
      )
    ) {
      return;
    }

    setLoadingId(usuario.id);

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", usuario.id);

    setLoadingId(null);

    if (error) {
      alert("Error eliminando usuario: " + error.message);
      return;
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
  };

  return (
    <div>
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Total usuarios: {usuarios.length}
        </div>

        {/* ✅ BOTÓN AGREGAR USUARIO */}
        <Link
          href="/dashboard/usuarios/nuevo"
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md text-sm"
        >
          + Agregar usuario
        </Link>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Correo</th>
              <th className="px-4 py-2 text-left">Rol</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const correo = u.email ?? u.correo ?? "-";
              const estado = u.estado ?? "desconocido";
              const tieneId = !!u.id;
              const idStr = tieneId ? String(u.id) : "";

              return (
                <tr key={u.id ?? correo} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {idStr || "—"}
                  </td>
                  <td className="px-4 py-2">{u.nombre ?? "-"}</td>
                  <td className="px-4 py-2">{correo}</td>
                  <td className="px-4 py-2">{u.rol ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        estado === "activo"
                          ? "bg-green-100 text-green-700"
                          : estado === "bloqueado"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      disabled={loadingId === u.id || !tieneId}
                      onClick={() => toggleEstado(u)}
                      className={`px-2 py-1 text-xs rounded-md border ${
                        estado === "activo"
                          ? "border-red-400 text-red-600 hover:bg-red-50"
                          : "border-green-400 text-green-600 hover:bg-green-50"
                      } disabled:opacity-50`}
                    >
                      {loadingId === u.id
                        ? "Guardando..."
                        : estado === "activo"
                        ? "Bloquear"
                        : "Activar"}
                    </button>

                    <button
                      disabled={loadingId === u.id || !tieneId}
                      onClick={() => eliminarUsuario(u)}
                      className="px-2 py-1 text-xs rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Eliminar
                    </button>

                    {tieneId && (
                      <Link
                        href={`/dashboard/usuarios/editar?id=${encodeURIComponent(
                          idStr
                        )}`}
                        className="px-2 py-1 text-xs rounded-md border border-blue-400 text-blue-600 hover:bg-blue-50"
                      >
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}

            {usuarios.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-4 text-center text-gray-500"
                >
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
