"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tramo = { inicio: string; fin: string };

type Turno = {
  id: number;
  nombre: string;
  // Legacy (pueden existir, pero NO son la fuente de verdad si usas tramos)
  hora_inicio: string | null;
  hora_fin: string | null;

  // Nuevo
  tramos?: Tramo[] | null;

  horas_trabajadas: number;
  created_at?: string | null;
};

function toHHMM(v: string) {
  // a veces llega "HH:MM:SS"
  return v?.slice(0, 5) ?? "";
}

function diffHoras(inicio: string, fin: string) {
  const [hi, mi] = toHHMM(inicio).split(":").map(Number);
  const [hf, mf] = toHHMM(fin).split(":").map(Number);
  const a = hi * 60 + mi;
  const b = hf * 60 + mf;
  const minutos = b >= a ? b - a : 24 * 60 - a + b; // cruza medianoche
  return Math.round((minutos / 60) * 100) / 100;
}

function sanitizeTramos(input: any): Tramo[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(Boolean)
    .map((t) => ({
      inicio: toHHMM(String(t?.inicio ?? "")),
      fin: toHHMM(String(t?.fin ?? "")),
    }))
    .filter((t) => t.inicio && t.fin);
}

function sumHorasTramos(tramos: Tramo[]) {
  return tramos.reduce((acc, t) => acc + diffHoras(t.inicio, t.fin), 0);
}

function tramosToText(tramos: Tramo[]) {
  if (!tramos.length) return "—";
  return tramos.map((t) => `${toHHMM(t.inicio)}–${toHHMM(t.fin)}`).join(" / ");
}

export default function TurnosClient({ initialTurnos }: { initialTurnos: Turno[] }) {
  const [turnos, setTurnos] = useState<Turno[]>(
    (initialTurnos ?? []).map((t) => ({ ...t, tramos: sanitizeTramos((t as any).tramos) }))
  );
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [nombre, setNombre] = useState("");
  const [sinHoras, setSinHoras] = useState(false);
  const [tramos, setTramos] = useState<Tramo[]>([{ inicio: "", fin: "" }]);

  const horasCalculadas = useMemo(() => {
    if (sinHoras) return 0;
    const clean = sanitizeTramos(tramos);
    if (!clean.length) return null;
    return Math.round(sumHorasTramos(clean) * 100) / 100;
  }, [tramos, sinHoras]);

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setSinHoras(false);
    setTramos([{ inicio: "", fin: "" }]);
  };

  const startEdit = (t: Turno) => {
    setEditingId(t.id);
    setNombre(t.nombre ?? "");

    const tTramos = sanitizeTramos(t.tramos);
    const isSinHoras =
      (t.horas_trabajadas ?? 0) === 0 &&
      (!tTramos.length || tTramos.every((x) => diffHoras(x.inicio, x.fin) === 0));

    setSinHoras(isSinHoras);

    if (tTramos.length) {
      setTramos(tTramos.map((x) => ({ inicio: toHHMM(x.inicio), fin: toHHMM(x.fin) })));
    } else if (t.hora_inicio && t.hora_fin) {
      setTramos([{ inicio: toHHMM(t.hora_inicio), fin: toHHMM(t.hora_fin) }]);
    } else {
      setTramos([{ inicio: "", fin: "" }]);
    }

    setMsg("");
  };

  const updateTramo = (idx: number, key: keyof Tramo, value: string) => {
    setTramos((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  };

  const addTramo = () => setTramos((prev) => [...prev, { inicio: "", fin: "" }]);
  const removeTramo = (idx: number) => setTramos((prev) => prev.filter((_, i) => i !== idx));

  const upsertTurno = async () => {
    setMsg("");

    if (!nombre.trim()) {
      setMsg("❌ El nombre del turno es obligatorio.");
      return;
    }

    const cleanTramos = sinHoras ? [] : sanitizeTramos(tramos);

    if (!sinHoras && cleanTramos.length === 0) {
      setMsg("❌ Debes agregar al menos 1 tramo válido (inicio y fin).");
      return;
    }

    const horas = sinHoras ? 0 : Math.round(sumHorasTramos(cleanTramos) * 100) / 100;

    setSaving(true);

    // Compatibilidad: guardamos hora_inicio/hora_fin con el primer tramo (si existe)
    const first = cleanTramos[0];

    const payload: any = {
      nombre: nombre.trim(),
      tramos: cleanTramos, // ✅ fuente de verdad
      horas_trabajadas: horas,
      hora_inicio: sinHoras ? null : first?.inicio ?? null,
      hora_fin: sinHoras ? null : first?.fin ?? null,
    };

    console.log("Guardando turno:", { nombre: nombre.trim(), tramosCount: cleanTramos.length, tramos: cleanTramos, horas });

    const q = editingId
      ? supabase.from("horarios").update(payload).eq("id", editingId)
      : supabase.from("horarios").insert(payload);

    const { data, error } = await q
      .select("id, nombre, hora_inicio, hora_fin, tramos, horas_trabajadas, created_at")
      .single();

    setSaving(false);

    if (error) {
      setMsg("❌ Error guardando turno: " + error.message);
      return;
    }

    const saved: Turno = {
      ...(data as any),
      tramos: sanitizeTramos((data as any)?.tramos),
    };

    if (editingId) {
      setTurnos((prev) => prev.map((x) => (x.id === editingId ? saved : x)));
      setMsg("✅ Turno actualizado.");
    } else {
      setTurnos((prev) => [...prev, saved]);
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

  // Crear turnos base rápidos (si no existen)
  const crearBase = async () => {
    setMsg("");
    setSaving(true);

    const bases: Array<{ nombre: string; tramos: Tramo[] }> = [
      { nombre: "06:00 a 14:00", tramos: [{ inicio: "06:00", fin: "14:00" }] },
      { nombre: "14:00 a 22:00", tramos: [{ inicio: "14:00", fin: "22:00" }] },
      { nombre: "22:00 a 06:00", tramos: [{ inicio: "22:00", fin: "06:00" }] },
      { nombre: "Descanso obligatorio", tramos: [] },
      { nombre: "Día libre", tramos: [] },
      { nombre: "Vacaciones", tramos: [] },
      { nombre: "Incapacidad", tramos: [] },
    ];

    for (const b of bases) {
      if (turnos.some((t) => t.nombre === b.nombre)) continue;

      const horas = b.tramos.length ? Math.round(sumHorasTramos(b.tramos) * 100) / 100 : 0;
      const first = b.tramos[0];

      const { data, error } = await supabase
        .from("horarios")
        .insert({
          nombre: b.nombre,
          tramos: b.tramos,
          horas_trabajadas: horas,
          hora_inicio: first?.inicio ?? null,
          hora_fin: first?.fin ?? null,
        })
        .select("id, nombre, hora_inicio, hora_fin, tramos, horas_trabajadas, created_at")
        .single();

      if (!error && data) {
        setTurnos((prev) => [
          ...prev,
          { ...(data as any), tramos: sanitizeTramos((data as any).tramos) } as Turno,
        ]);
      }
    }

    setSaving(false);
    setMsg("✅ Turnos base listos (se omitieron los que ya existían).");
  };

  const recalcularHoras = async () => {
    if (!confirm("¿Recalcular las horas de todos los turnos basándose en sus tramos? Esto actualizará la base de datos.")) {
      return;
    }

    setMsg("");
    setSaving(true);

    let actualizados = 0;
    let detalles: string[] = [];
    
    for (const t of turnos) {
      const tTramos = sanitizeTramos(t.tramos);
      
      // Si no hay tramos válidos, verificamos si hay hora_inicio/hora_fin (legacy)
      let horasReales = 0;
      if (tTramos.length > 0) {
        horasReales = Math.round(sumHorasTramos(tTramos) * 100) / 100;
        detalles.push(`${t.nombre}: ${tTramos.length} tramos = ${horasReales}h`);
      } else if (t.hora_inicio && t.hora_fin) {
        // Calcular desde hora_inicio/hora_fin si no hay tramos
        horasReales = Math.round(diffHoras(t.hora_inicio, t.hora_fin) * 100) / 100;
        detalles.push(`${t.nombre}: legacy (${t.hora_inicio}-${t.hora_fin}) = ${horasReales}h`);
      } else {
        detalles.push(`${t.nombre}: sin datos = 0h`);
      }

      // Actualizamos si las horas son diferentes
      if (horasReales !== (t.horas_trabajadas ?? 0)) {
        const { error } = await supabase
          .from("horarios")
          .update({ horas_trabajadas: horasReales })
          .eq("id", t.id);

        if (!error) {
          actualizados++;
          setTurnos((prev) => prev.map((x) => x.id === t.id ? { ...x, horas_trabajadas: horasReales } : x));
        }
      }
    }

    setSaving(false);
    console.log("Detalles de recálculo:", detalles);
    setMsg(`✅ Se recalcularon y actualizaron ${actualizados} turnos. Ver consola para detalles.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Turnos</h1>
        <div className="flex gap-2">
          <a
            href="/dashboard/turnos/patrones"
            className="border border-green-600 text-green-600 hover:bg-green-50 text-sm font-semibold px-4 py-2 rounded-md"
          >
            Patrones semanales
          </a>
          <button
            onClick={recalcularHoras}
            disabled={saving}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            Recalcular horas
          </button>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {editingId ? "Editar turno" : "Crear turno"}
          </h2>

          <div className="text-xs text-gray-600">
            {horasCalculadas !== null && (
              <>
                Horas calculadas: <b>{horasCalculadas}</b>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Oficina 8h / Vacaciones / Día libre"
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
          </div>
        </div>

        {/* Tramos */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tramos del turno</p>
            <button
              type="button"
              onClick={addTramo}
              disabled={sinHoras}
              className="text-xs border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              + Agregar tramo
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            ✅ Si un tramo cruza medianoche (ej: 23:00–06:00) está permitido.
          </p>

          <div className="mt-3 space-y-2">
            {tramos.map((t, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium mb-1">Inicio</label>
                  <input
                    type="time"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={t.inicio}
                    onChange={(e) => updateTramo(idx, "inicio", e.target.value)}
                    disabled={sinHoras}
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="block text-xs font-medium mb-1">Fin</label>
                  <input
                    type="time"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={t.fin}
                    onChange={(e) => updateTramo(idx, "fin", e.target.value)}
                    disabled={sinHoras}
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => removeTramo(idx)}
                    disabled={sinHoras || tramos.length === 1}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={upsertTurno}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear turno"}
          </button>

          {editingId && (
            <button
              type="button"
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
              {turnos.map((t) => {
                const tTramos = sanitizeTramos(t.tramos);
                // Recalculamos las horas basándonos en los tramos para asegurar precisión
                const horasReales = tTramos.length > 0 
                  ? Math.round(sumHorasTramos(tTramos) * 100) / 100 
                  : (t.horas_trabajadas ?? 0);
                return (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{t.nombre}</td>
                    <td className="px-3 py-2">{tramosToText(tTramos)}</td>
                    <td className="px-3 py-2">{horasReales}</td>
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
                );
              })}

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
