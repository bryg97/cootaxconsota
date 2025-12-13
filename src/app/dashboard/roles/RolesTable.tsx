// src/app/dashboard/roles/RolesTable.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Rol = {
  id: number;
  nombre: string;
  permisos: string[] | null;
};

const MODULOS_DISPONIBLES = [
  { id: "usuarios", label: "Usuarios" },
  { id: "roles", label: "Roles" },
  { id: "configuracion", label: "Configuración" },
  { id: "turnos", label: "Turnos" },
  { id: "rotacion", label: "Rotación" },
  { id: "nomina", label: "Nómina" },
];

interface Props {
  initialRoles: Rol[];
}

export default function RolesTable({ initialRoles }: Props) {
  const [roles, setRoles] = useState<Rol[]>(initialRoles);
  const [loadingId, setLoadingId] = useState<number | "nuevo" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPermisos, setNuevoPermisos] = useState<string[]>([]);

  const togglePermisoEnNuevo = (permisoId: string) => {
    setNuevoPermisos((prev) =>
      prev.includes(permisoId)
        ? prev.filter((p) => p !== permisoId)
        : [...prev, permisoId]
    );
  };

  const togglePermisoEnRol = (rolId: number, permisoId: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== rolId) return r;
        const permisosActuales = r.permisos ?? [];
        const nuevos = permisosActuales.includes(permisoId)
          ? permisosActuales.filter((p) => p !== permisoId)
          : [...permisosActuales, permisoId];
        return { ...r, permisos: nuevos };
      })
    );
  };

  const handleCrearRol = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nuevoNombre.trim()) {
      setErrorMsg("El nombre del rol es obligatorio.");
      return;
    }

    setLoadingId("nuevo");

    const { data, error } = await supabase
      .from("roles")
      .insert({
        nombre: nuevoNombre.trim(),
        permisos: nuevoPermisos,
      })
      .select("id, nombre, permisos")
      .single();

    setLoadingId(null);

    if (error || !data) {
      setErrorMsg(error?.message ?? "Error creando rol.");
      return;
    }

    setRoles((prev) => [...prev, data as Rol]);
    setNuevoNombre("");
    setNuevoPermisos([]);
  };

  const handleGuardarRol = async (rol: Rol) => {
    setErrorMsg("");
    setLoadingId(rol.id);

    const { error } = await supabase
      .from("roles")
      .update({
        nombre: rol.nombre,
        permisos: rol.permisos ?? [],
      })
      .eq("id", rol.id);

    setLoadingId(null);

    if (error) {
      setErrorMsg("Error actualizando rol: " + error.message);
    }
  };

  const handleEliminarRol = async (rol: Rol) => {
    if (rol.nombre.toLowerCase() === "admin") {
      alert("No se puede eliminar el rol admin.");
      return;
    }

    if (!confirm(`¿Seguro que deseas eliminar el rol "${rol.nombre}"?`)) {
      return;
    }

    setErrorMsg("");
    setLoadingId(rol.id);

    const { error } = await supabase.from("roles").delete().eq("id", rol.id);

    setLoadingId(null);

    if (error) {
      setErrorMsg("Error eliminando rol: " + error.message);
      return;
    }

    setRoles((prev) => prev.filter((r) => r.id !== rol.id));
  };

  const handleChangeNombreRol = (rolId: number, value: string) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === rolId ? { ...r, nombre: value } : r))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Gestión de roles</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
          {errorMsg}
        </div>
      )}

      {/* Crear nuevo rol */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Crear nuevo rol</h2>

        <form onSubmit={handleCrearRol} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Nombre del rol
            </label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: supervisor, coordinador..."
            />
          </div>

          <div>
            <p className="block text-xs font-medium mb-1">
              Módulos permitidos
            </p>
            <div className="flex flex-wrap gap-2">
              {MODULOS_DISPONIBLES.map((mod) => (
                <label
                  key={mod.id}
                  className="inline-flex items-center gap-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={nuevoPermisos.includes(mod.id)}
                    onChange={() => togglePermisoEnNuevo(mod.id)}
                  />
                  <span>{mod.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingId === "nuevo"}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loadingId === "nuevo" ? "Creando..." : "Crear rol"}
          </button>
        </form>
      </section>

      {/* Lista de roles */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Roles existentes</h2>

        {roles.length === 0 ? (
          <p className="text-sm text-gray-500">No hay roles registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Permisos</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((rol) => {
                  const permisos = rol.permisos ?? [];
                  const isSaving = loadingId === rol.id;

                  return (
                    <tr key={rol.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{rol.id}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="border rounded px-2 py-1 text-xs w-full"
                          value={rol.nombre}
                          onChange={(e) =>
                            handleChangeNombreRol(rol.id, e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {MODULOS_DISPONIBLES.map((mod) => (
                            <label
                              key={mod.id}
                              className="inline-flex items-center gap-1 bg-gray-100 rounded px-2 py-1"
                            >
                              <input
                                type="checkbox"
                                checked={permisos.includes(mod.id)}
                                onChange={() =>
                                  togglePermisoEnRol(rol.id, mod.id)
                                }
                              />
                              <span>{mod.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          disabled={isSaving}
                          onClick={() => handleGuardarRol(rol)}
                          className="px-3 py-1 rounded-md border border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50"
                        >
                          {isSaving ? "Guardando..." : "Guardar"}
                        </button>

                        <button
                          disabled={isSaving}
                          onClick={() => handleEliminarRol(rol)}
                          className="px-3 py-1 rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
