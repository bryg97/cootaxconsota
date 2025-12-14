"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Tramo = { inicio: string; fin: string };

type Turno = {
  id: number;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas_trabajadas: number;
  tramos: Tramo[];
  created_at?: string | null;
};

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function diffHoras(inicio: string, fin: string) {
  const a = minutos(inicio);
  const b = minutos(fin);
  const mins = b >= a ? b - a : 24 * 60 - a + b; // cruza medianoche
  return Math.round((mins / 60) * 100) / 100;
}

function horasTramos(tramos: Tramo[]) {
  let total = 0;
  for (const t of tramos) {
    if (!t.inicio || !t.fin) continue;
    total += diffHoras(t.inicio, t.fin);
  }
  return Math.round(total * 100) / 100;
}

export default function TurnosClient({ initialTurnos }: { initialTurnos: any[] }) {
  const normalized: Turno[] = (initialTurnos ?? []).map((t: any) => ({
    id: t.id,
    nombre: t.nombre,
    hora_inicio: t.hora_inicio,
    hora_fin: t.hora_fin,
    horas_trabajadas: Number(t.horas_trabajadas ?? 0),
    tramos: Array.isArray(t.tramos) ? t.tramos : [],
    created_at: t.created_at ?? null,
  }));

  const [turnos, setTurnos] = useState<Turno[]>(normalized);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [sinHoras, setSinHoras] = useState(false);
  const [tramos, setTramos] = useState<Tramo[]>([{ inicio: "", fin: "" }]);

  const horasCalculadas = useMemo(() => {
    if (sinHoras) return 0;
    const ok = tramos.filter((t) => t.inicio && t.fin);
    if (ok.length === 0) return null;
    return horasTramos(ok);
  }, [tramos, sinHoras]);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setSinHoras(false);
    setTramos([{ inicio: "", fin: "" }]);
    setMsg("");
  };

  const startEdit = (t: Turno) => {
    setEditingId(t.id);
    setNombre(t.nombre ?? "");
    const isZero = (t.horas_trabajadas ?? 0) === 0 && (!t.tramos || t.tramos.length === 0);
    setSinHoras(isZero);
    setTramos(t.tramos?.length ? t.tramos : [{ inicio: t.hora_inicio ?? "", fin: t.hora_fin ?? "" }]);
    setMsg("");
  };

  const addTramo = () => setTramos((prev) => [...prev, { inicio: "", fin: "" }]);

  const removeTramo = (idx: number) => {
    setTramos((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTramo = (idx: number, key: "inicio" | "fin", value: string) => {
    setTramos((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  };

  const upsertTurno = async () => {
    setMsg("");

    if (!nombre.trim()) {
      setMsg("❌ El nombre del turno es obligatorio.");
      return;
    }

    const tramosValidos = sinHoras
      ? []
      : tramos.filter((t) => t.inicio && t.fin);

    if (!sinHoras && tramosValidos.length === 0) {
      setMsg("❌ Agrega al menos 1 tramo (inicio y fin) o marca 'Turno sin horas'.");
      return;
    }

    const totalHoras = sinHoras ? 0 : horasTramos(tramosValidos);

    // Compatibilidad: guardar primer tramo en hora_inicio/hora_fin
    const first = tramosValidos[0] ?? null;

    setSaving(true);

    const payload = {
      nombre: nombre.trim(),
      tramos: tramosValidos,
      horas_trabajadas: totalHoras,
      hora_inicio: first ? first.inicio : null,
      hora_fin: first ? first.fin : null,
    };

    const q = editingId
      ? supabase.from("horarios").update(payload).eq("id", editingId)
      : supabase.from("horarios").insert(payload);

    const { data, error } = await q
      .select("id, nombre, hora_inicio, hora_fin, horas_trabajadas, tramos, created_at")
      .single();

    setSaving(false);

    if (error) {
      setMsg("❌ Error guardando turno: " + error.message);
      return;
    }

    if (editingId) {
      setTurnos((prev) => prev.map((x) => (x.id === editingId ? (data as any) : x)));
      setMsg("✅ Turno actualizado.");
    } else {
      setTurnos((prev) => [...prev, data as any]);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Turnos</h1>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/turnos/patrones"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-md"
          >
            Patrones semanales
          </Link>
        </div>
      </div>

      {msg && <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>}

      {/* Form */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">{editingId ? "Editar turno" : "Crear turno"}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: 07:00–12:00 y 13:00–16:00 / 23:00–06:00"
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
        </div>

        {/* Tramos */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tramos del turno</p>
            <button
              onClick={addTramo}
              disabled={sinHoras}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3 py-1 rounded-md disabled:opacity-50"
            >
              + Agregar tramo
            </button>
          </div>

          {tramos.map((t, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Inicio</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={t.inicio}
                  onChange={(e) => updateTramo(idx, "inicio", e.target.value)}
                  disabled={sinHoras}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Fin</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={t.fin}
                  onChange={(e) => updateTramo(idx, "fin", e.target.value)}
                  disabled={sinHoras}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => removeTramo(idx)}
                  disabled={sinHoras || tramos.length === 1}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3 py-2 rounded-md disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500">
            ✅ Si un tramo cruza medianoche (ej 23:00–06:00) está permitido.
          </p>
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
                <th className="px-3 py-2 text-left">Tramos</th>
                <th className="px-3 py-2 text-left">Horas</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{t.nombre}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {(t.tramos?.length ?? 0) > 0
                      ? t.tramos.map((x, i) => (
                          <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 rounded bg-gray-100">
                            {x.inicio}–{x.fin}
                          </span>
                        ))
                      : "—"}
                  </td>
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
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
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
