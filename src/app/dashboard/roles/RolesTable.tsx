// src/app/dashboard/roles/RolesTable.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PermisoDetallado = {
  modulo: string;
  leer: boolean;
  escribir: boolean;
};

type Rol = {
  id: number;
  nombre: string;
  permisos: string[] | null;
  permisos_detallados?: PermisoDetallado[] | null;
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
  const [roles, setRoles] = useState<Rol[]>(initialRoles.map(r => ({
    ...r,
    permisos_detallados: r.permisos_detallados || MODULOS_DISPONIBLES.map(m => ({
      modulo: m.id,
      leer: r.permisos?.includes(m.id) ?? false,
      escribir: r.permisos?.includes(m.id) ?? false,
    }))
  })));
  const [loadingId, setLoadingId] = useState<number | "nuevo" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPermisos, setNuevoPermisos] = useState<PermisoDetallado[]>(
    MODULOS_DISPONIBLES.map(m => ({ modulo: m.id, leer: false, escribir: false }))
  );

  const togglePermisoEnNuevo = (moduloId: string, tipo: 'leer' | 'escribir') => {
    setNuevoPermisos((prev) =>
      prev.map(p => 
        p.modulo === moduloId ? { ...p, [tipo]: !p[tipo] } : p
      )
    );
  };

  const togglePermisoEnRol = (rolId: number, moduloId: string, tipo: 'leer' | 'escribir') => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== rolId) return r;
        
        // Asegurar que permisos_detallados existe
        const permisosActuales = r.permisos_detallados || [];
        
        // Buscar si ya existe el permiso para este módulo
        const existePermiso = permisosActuales.find(p => p.modulo === moduloId);
        
        let permisosActualizados;
        if (existePermiso) {
          // Actualizar el permiso existente
          permisosActualizados = permisosActuales.map(p =>
            p.modulo === moduloId ? { ...p, [tipo]: !p[tipo] } : p
          );
        } else {
          // Crear el permiso si no existe
          permisosActualizados = [
            ...permisosActuales,
            { modulo: moduloId, leer: tipo === 'leer', escribir: tipo === 'escribir' }
          ];
        }
        
        return { ...r, permisos_detallados: permisosActualizados };
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

    // Generar permisos simples para compatibilidad
    const permisosSimples = nuevoPermisos
      .filter(p => p.leer || p.escribir)
      .map(p => p.modulo);

    const { data, error } = await supabase
      .from("roles")
      .insert({
        nombre: nuevoNombre.trim(),
        permisos: permisosSimples,
        permisos_detallados: nuevoPermisos,
      })
      .select("id, nombre, permisos, permisos_detallados")
      .single();

    setLoadingId(null);

    if (error || !data) {
      setErrorMsg(error?.message ?? "Error creando rol.");
      return;
    }

    setRoles((prev) => [...prev, data as Rol]);
    setNuevoNombre("");
    setNuevoPermisos(MODULOS_DISPONIBLES.map(m => ({ modulo: m.id, leer: false, escribir: false })));
  };

  const handleGuardarRol = async (rol: Rol) => {
    setErrorMsg("");
    setLoadingId(rol.id);

    // Generar permisos simples para compatibilidad
    const permisosSimples = (rol.permisos_detallados || [])
      .filter(p => p.leer || p.escribir)
      .map(p => p.modulo);

    const { error } = await supabase
      .from("roles")
      .update({
        nombre: rol.nombre,
        permisos: permisosSimples,
        permisos_detallados: rol.permisos_detallados,
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
            <p className="block text-xs font-medium mb-2">
              Permisos por módulo
            </p>
            <div className="space-y-2">
              {MODULOS_DISPONIBLES.map((mod) => {
                const permiso = nuevoPermisos.find(p => p.modulo === mod.id);
                return (
                  <div key={mod.id} className="flex items-center gap-4 bg-gray-50 p-2 rounded">
                    <span className="text-xs font-medium w-28">{mod.label}</span>
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={permiso?.leer ?? false}
                        onChange={() => togglePermisoEnNuevo(mod.id, 'leer')}
                      />
                      <span>👁️ Ver</span>
                    </label>
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={permiso?.escribir ?? false}
                        onChange={() => togglePermisoEnNuevo(mod.id, 'escribir')}
                      />
                      <span>✏️ Editar</span>
                    </label>
                  </div>
                );
              })}
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
                        <div className="space-y-1">
                          {MODULOS_DISPONIBLES.map((mod) => {
                            const permiso = (rol.permisos_detallados || []).find(p => p.modulo === mod.id);
                            return (
                              <div key={mod.id} className="flex items-center gap-2 bg-gray-50 p-1 rounded text-xs">
                                <span className="w-20 font-medium">{mod.label}</span>
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={permiso?.leer ?? false}
                                    onChange={() => togglePermisoEnRol(rol.id, mod.id, 'leer')}
                                  />
                                  <span>👁️</span>
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={permiso?.escribir ?? false}
                                    onChange={() => togglePermisoEnRol(rol.id, mod.id, 'escribir')}
                                  />
                                  <span>✏️</span>
                                </label>
                              </div>
                            );
                          })}
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
