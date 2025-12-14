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
  created_at?: string | null;
};

function diffHoras(inicio: string, fin: string) {
  // inicio/fin en "HH:MM"
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);

  const a = hi * 60 + mi;
  const b = hf * 60 + mf;

  // si fin < inicio, cruza medianoche
  const minutos = b >= a ? b - a : 24 * 60 - a + b;
  return Math.round((minutos / 60) * 100) / 100; // 2 decimales
}

export default function TurnosClient({
  initialTurnos,
}: {
  initialTurnos: Turno[];
}) {
  const [turnos, setTurnos] = useState<Turno[]>(initialTurnos);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [nombre, setNombre] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [sinHoras, setSinHoras] = useState(false);

  const horasCalculadas = useMemo(() => {
    if (sinHoras) return 0;
    if (!horaInicio || !horaFin) return null;
    return diffHoras(horaInicio, horaFin);
  }, [horaInicio, horaFin, sinHoras]);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setHoraInicio("");
    setHoraFin("");
    setSinHoras(false);
  };

  const startEdit = (t: Turno) => {
    setEditingId(t.id);
    setNombre(t.nombre ?? "");
    setSinHoras(
      (t.horas_trabajadas ?? 0) === 0 && (!t.hora_inicio || !t.hora_fin)
    );
    setHoraInicio(t.hora_inicio ?? "");
    setHoraFin(t.hora_fin ?? "");
    setMsg("");
  };

  const upsertTurno = async () => {
    setMsg("");

    if (!nombre.trim()) {
      setMsg("❌ El nombre del turno es obligatorio.");
      return;
    }

    if (!sinHoras) {
      if (!horaInicio || !horaFin) {
        setMsg(
          "❌ Debes indicar hora inicio y fin (o marcar 'Turno sin horas')."
        );
        return;
      }
    }

    const horas = sinHoras ? 0 : horasCalculadas ?? 0;

    setSaving(true);

    const payload = {
      nombre: nombre.trim(),
      horas_trabajadas: horas,
      hora_inicio: sinHoras ? null : horaInicio,
      hora_fin: sinHoras ? null : horaFin,
    };

    const q = editingId
      ? supabase.from("horarios").update(payload).eq("id", editingId)
      : supabase.from("horarios").insert(payload);

    const { data, error } = await q
      .select("id, nombre, hora_inicio, hora_fin, horas_trabajadas, created_at")
      .single();

    setSaving(false);

    if (error) {
      setMsg("❌ Error guardando turno: " + error.message);
      return;
    }

    if (!data) {
      setMsg("❌ No se recibió respuesta al guardar.");
      return;
    }

    if (editingId) {
      setTurnos((prev) => prev.map((x) => (x.id === editingId ? (data as Turno) : x)));
      setMsg("✅ Turno actualizado.");
    } else {
      setTurnos((prev) => [...prev, data as Turno]);
      setMsg("✅ Turno creado.");
    }

    resetForm();
  };

  const deleteTurno = async (t: Turno) => {
    if (!confirm(`¿Eliminar turno "${t.nombre}"?`)) return;

    setMsg("");
    const { error } = await supabase.from("horarios").delete().eq("id", t.id);

    if (error) {
      setMsg("❌ Error eliminando turno: " + error.message);
      return;
    }

    setTurnos((prev) => prev.filter((x) => x.id !== t.id));
    setMsg("✅ Turno eliminado.");
  };

  // Crear turnos base rápidos
  const crearBase = async () => {
    setMsg("");
    setSaving(true);

    const bases: Array<{
      nombre: string;
      hora_inicio: string | null;
      hora_fin: string | null;
      horas_trabajadas?: number;
    }> = [
      { nombre: "06:00 a 14:00", hora_inicio: "06:00", hora_fin: "14:00" },
      { nombre: "14:00 a 22:00", hora_inicio: "14:00", hora_fin: "22:00" },
      { nombre: "22:00 a 06:00", hora_inicio: "22:00", hora_fin: "06:00" },
      { nombre: "Descanso obligatorio", hora_inicio: null, hora_fin: null, horas_trabajadas: 0 },
      { nombre: "Día libre", hora_inicio: null, hora_fin: null, horas_trabajadas: 0 },
      { nombre: "Vacaciones", hora_inicio: null, hora_fin: null, horas_trabajadas: 0 },
      { nombre: "Incapacidad", hora_inicio: null, hora_fin: null, horas_trabajadas: 0 },
    ];

    for (const b of bases) {
      // si ya existe por nombre, skip
      const exists = turnos.some((t) => t.nombre === b.nombre);
      if (exists) continue;

      const horas =
        b.horas_trabajadas !== undefined
          ? b.horas_trabajadas
          : diffHoras(b.hora_inicio!, b.hora_fin!);

      const { data, error } = await supabase
        .from("horarios")
        .insert({
          nombre: b.nombre,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          horas_trabajadas: horas,
        })
        .select("id, nombre, hora_inicio, hora_fin, horas_trabajadas, created_at")
        .single();

      if (error) {
        // si uno falla, seguimos, pero mostramos el último error
        setMsg("❌ Error creando turno base: " + error.message);
        continue;
      }

      if (data) {
        setTurnos((prev) => [...prev, data as Turno]);
      }
    }

    setSaving(false);
    setMsg("✅ Turnos base listos (se omitieron los que ya existían).");
  };

  return (
    <div className="space-y-6">
      {/* HEADER con botón Patrones */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Turnos</h1>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/turnos/patrones"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-md"
          >
            Patrones semanales
          </Link>

          <button
            onClick={crearBase}
            disabled={saving}
            className="border border-red-600 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            Crear turnos base
          </button>
        </div>
      </div>

      {msg && <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>}

      {/* Form */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">
          {editingId ? "Editar turno" : "Crear turno"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: 06:00 a 14:00 / Vacaciones / Día libre"
            />
          </div>

          <div className="flex items-end gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sinHoras}
                onChange={(e) => setSinHoras(e.target.checked)}
              />
              Turno sin horas (0)
            </label>

            {horasCalculadas !== null && (
              <span className="text-xs text-gray-600">
                Horas calculadas: <b>{horasCalculadas}</b>
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Hora inicio</label>
            <input
              type="time"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              disabled={sinHoras}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Hora fin</label>
            <input
              type="time"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              disabled={sinHoras}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={upsertTurno}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear turno"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-md"
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* Listado */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Turnos existentes</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Inicio</th>
                <th className="px-3 py-2 text-left">Fin</th>
                <th className="px-3 py-2 text-left">Horas</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{t.nombre}</td>
                  <td className="px-3 py-2">{t.hora_inicio ?? "—"}</td>
                  <td className="px-3 py-2">{t.hora_fin ?? "—"}</td>
                  <td className="px-3 py-2">{t.horas_trabajadas ?? 0}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      onClick={() => startEdit(t)}
                      className="px-3 py-1 rounded-md border border-blue-400 text-blue-600 hover:bg-blue-50 text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteTurno(t)}
                      className="px-3 py-1 rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {turnos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                    No hay turnos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
