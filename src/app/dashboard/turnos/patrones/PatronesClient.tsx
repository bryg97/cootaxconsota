"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Turno = {
  id: number;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas_trabajadas: number;
};

type Patron = {
  id: number;
  nombre: string;
  created_at?: string | null;
  patrones_turnos_detalle?: { dia: number; horario_id: number | null }[];
};

const DIAS = [
  { dia: 1, label: "Lunes" },
  { dia: 2, label: "Martes" },
  { dia: 3, label: "Miércoles" },
  { dia: 4, label: "Jueves" },
  { dia: 5, label: "Viernes" },
  { dia: 6, label: "Sábado" },
  { dia: 7, label: "Domingo" },
];

function buildMap(detalle?: { dia: number; horario_id: number | null }[]) {
  const m: Record<number, number | null> = {};
  for (const d of DIAS) m[d.dia] = null;
  (detalle ?? []).forEach((x) => (m[x.dia] = x.horario_id ?? null));
  return m;
}

export default function PatronesClient({
  initialTurnos,
  initialPatrones,
}: {
  initialTurnos: Turno[];
  initialPatrones: Patron[];
}) {
  const [turnos] = useState<Turno[]>(initialTurnos);
  const [patrones, setPatrones] = useState<Patron[]>(initialPatrones);
  const [msg, setMsg] = useState("");

  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Patron | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [diasMap, setDiasMap] = useState<Record<number, number | null>>(
    buildMap()
  );

  const turnosOptions = useMemo(() => {
    return turnos.map((t) => ({
      id: t.id,
      label:
        t.hora_inicio && t.hora_fin
          ? `${t.nombre} (${t.hora_inicio}–${t.hora_fin}, ${t.horas_trabajadas}h)`
          : `${t.nombre} (${t.horas_trabajadas}h)`,
    }));
  }, [turnos]);

  const crearPatron = async () => {
    setMsg("");
    if (!nombre.trim()) {
      setMsg("❌ Debes escribir un nombre para el patrón.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("patrones_turnos")
      .insert({ nombre: nombre.trim() })
      .select("id, nombre, created_at")
      .single();

    setSaving(false);

    if (error) {
      setMsg("❌ Error creando patrón: " + error.message);
      return;
    }

    setPatrones((prev) => [...prev, { ...(data as Patron), patrones_turnos_detalle: [] }]);
    setNombre("");
    setMsg("✅ Patrón creado. Ahora puedes asignar turnos por día (Editar).");
  };

  const abrirEditar = (p: Patron) => {
    setMsg("");
    setEditing(p);
    setEditNombre(p.nombre);
    setDiasMap(buildMap(p.patrones_turnos_detalle));
  };

  const cerrarEditar = () => {
    setEditing(null);
    setEditNombre("");
    setDiasMap(buildMap());
  };

  const guardarEditar = async () => {
    if (!editing) return;

    setMsg("");
    if (!editNombre.trim()) {
      setMsg("❌ El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);

    // 1) actualizar nombre patrón
    const { error: upNameErr } = await supabase
      .from("patrones_turnos")
      .update({ nombre: editNombre.trim() })
      .eq("id", editing.id);

    if (upNameErr) {
      setSaving(false);
      setMsg("❌ Error guardando nombre: " + upNameErr.message);
      return;
    }

    // 2) upsert detalle (1..7)
    const rows = DIAS.map((d) => ({
      patron_id: editing.id,
      dia: d.dia,
      horario_id: diasMap[d.dia] ?? null,
    }));

    const { error: upDetErr } = await supabase
      .from("patrones_turnos_detalle")
      .upsert(rows, { onConflict: "patron_id,dia" });

    setSaving(false);

    if (upDetErr) {
      setMsg("❌ Error guardando detalle: " + upDetErr.message);
      return;
    }

    // refrescar en UI local
    const updated: Patron = {
      ...editing,
      nombre: editNombre.trim(),
      patrones_turnos_detalle: DIAS.map((d) => ({
        dia: d.dia,
        horario_id: diasMap[d.dia] ?? null,
      })),
    };

    setPatrones((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
    setEditing(updated);
    setMsg("✅ Patrón guardado.");
  };

  const eliminarPatron = async (p: Patron) => {
    if (!confirm(`¿Eliminar patrón "${p.nombre}"?`)) return;

    setMsg("");
    const { error } = await supabase.from("patrones_turnos").delete().eq("id", p.id);

    if (error) {
      setMsg("❌ Error eliminando patrón: " + error.message);
      return;
    }

    setPatrones((prev) => prev.filter((x) => x.id !== p.id));
    if (editing?.id === p.id) cerrarEditar();
    setMsg("✅ Patrón eliminado.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Patrones semanales</h1>
        <Link
          href="/dashboard/turnos"
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-md"
        >
          Regresar a turnos
        </Link>
      </div>

      {msg && <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>}

      {/* Crear */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Crear patrón</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Semana A / Rotación 1 / Nocturnos"
          />
          <button
            onClick={crearPatron}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear patrón"}
          </button>
        </div>
      </section>

      {/* Listado */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Patrones existentes</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Resumen</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {patrones.map((p) => {
                const map = buildMap(p.patrones_turnos_detalle);
                const resumen = DIAS.map((d) => {
                  const id = map[d.dia];
                  const t = turnos.find((x) => x.id === id);
                  return `${d.label.slice(0, 3)}: ${t?.nombre ?? "—"}`;
                }).join(" | ");

                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{p.nombre}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{resumen}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="px-3 py-1 rounded-md border border-blue-400 text-blue-600 hover:bg-blue-50 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarPatron(p)}
                        className="px-3 py-1 rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {patrones.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                    No hay patrones creados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Editor */}
      {editing && (
        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Editar patrón</h2>
            <button
              onClick={cerrarEditar}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-3 py-1 rounded-md"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DIAS.map((d) => (
              <div key={d.dia}>
                <label className="block text-xs font-medium mb-1">{d.label}</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={diasMap[d.dia] ?? ""}
                  onChange={(e) =>
                    setDiasMap((prev) => ({
                      ...prev,
                      [d.dia]: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">— Sin asignar —</option>
                  {turnosOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              onClick={guardarEditar}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar patrón"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
