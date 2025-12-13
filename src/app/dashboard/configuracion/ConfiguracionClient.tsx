// src/app/dashboard/configuracion/ConfiguracionClient.tsx
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Configuracion = {
  id: number;
  horas_mensuales?: number | null;
  horas_semanales?: number | null;

  recargo_nocturno_inicio?: string | null;
  recargo_nocturno_fin?: string | null;

  recargo_diurno_festivo_inicio?: string | null;
  recargo_diurno_festivo_fin?: string | null;
  recargo_nocturno_festivo_inicio?: string | null;
  recargo_nocturno_festivo_fin?: string | null;

  recargo_diurno_dominical_inicio?: string | null;
  recargo_diurno_dominical_fin?: string | null;
  recargo_nocturno_dominical_inicio?: string | null;
  recargo_nocturno_dominical_fin?: string | null;
};

type Festivo = {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  descripcion: string | null;
};

export default function ConfiguracionClient({
  initialConfig,
  initialFestivos,
}: {
  initialConfig: Configuracion | null;
  initialFestivos: Festivo[];
}) {
  const [config, setConfig] = useState<Configuracion | null>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Festivos
  const [festivos, setFestivos] = useState<Festivo[]>(initialFestivos);
  const [nuevoFestivoFecha, setNuevoFestivoFecha] = useState("");
  const [nuevoFestivoDesc, setNuevoFestivoDesc] = useState("");

  const formulas = useMemo(
    () => [
      "Valor de la hora = salario base / tope horas mensuales",
      "Valor día = salario base / 30",
      "Recargo nocturno ordinario (lun-sáb, no festivo) = valor hora * 0.35",
      "Recargo diurno festivo = valor hora * 1.80",
      "Recargo nocturno festivo = valor hora * 2.15",
      "Recargo diurno domingo = valor hora * 0.80",
      "Recargo nocturno domingo = valor hora * 1.15",
      "Hora extra diurna (lun-sáb no festivo) = valor hora * 1.25",
      "Hora extra nocturna (lun-sáb no festivo) = valor hora * 1.75",
      "Hora extra diurna (domingos o festivos) = valor hora * 2.0",
      "Hora extra nocturna (domingos o festivos) = valor hora * 2.5",
    ],
    []
  );

  const ensureConfig = async () => {
    if (config) return config;

    // Intentar crear una fila si no existe (usa defaults)
    const { data, error } = await supabase
      .from("configuraciones")
      .insert({})
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "No existe configuración y no se pudo crear automáticamente. " +
          error.message
      );
    }

    setConfig(data as Configuracion);
    return data as Configuracion;
  };

  const saveConfig = async () => {
    try {
      setMsg("");
      setSaving(true);

      const cfg = await ensureConfig();

      const { error } = await supabase
        .from("configuraciones")
        .update({
          horas_mensuales: cfg.horas_mensuales ?? null,
          horas_semanales: cfg.horas_semanales ?? null,

          recargo_nocturno_inicio: cfg.recargo_nocturno_inicio ?? null,
          recargo_nocturno_fin: cfg.recargo_nocturno_fin ?? null,

          recargo_diurno_festivo_inicio: cfg.recargo_diurno_festivo_inicio ?? null,
          recargo_diurno_festivo_fin: cfg.recargo_diurno_festivo_fin ?? null,
          recargo_nocturno_festivo_inicio: cfg.recargo_nocturno_festivo_inicio ?? null,
          recargo_nocturno_festivo_fin: cfg.recargo_nocturno_festivo_fin ?? null,

          recargo_diurno_dominical_inicio: cfg.recargo_diurno_dominical_inicio ?? null,
          recargo_diurno_dominical_fin: cfg.recargo_diurno_dominical_fin ?? null,
          recargo_nocturno_dominical_inicio: cfg.recargo_nocturno_dominical_inicio ?? null,
          recargo_nocturno_dominical_fin: cfg.recargo_nocturno_dominical_fin ?? null,
        })
        .eq("id", cfg.id);

      if (error) throw new Error(error.message);

      setMsg("✅ Configuración guardada correctamente.");
    } catch (e: any) {
      setMsg("❌ " + (e?.message ?? "Error guardando configuración"));
    } finally {
      setSaving(false);
    }
  };

  const addFestivo = async () => {
    setMsg("");

    if (!nuevoFestivoFecha) {
      setMsg("❌ Debes seleccionar una fecha.");
      return;
    }

    const { data, error } = await supabase
      .from("festivos")
      .insert({
        fecha: nuevoFestivoFecha,
        descripcion: nuevoFestivoDesc || null,
      })
      .select("id, fecha, descripcion")
      .single();

    if (error) {
      setMsg("❌ Error agregando festivo: " + error.message);
      return;
    }

    setFestivos((prev) => [...prev, data as Festivo].sort((a, b) => a.fecha.localeCompare(b.fecha)));
    setNuevoFestivoFecha("");
    setNuevoFestivoDesc("");
    setMsg("✅ Festivo agregado.");
  };

  const deleteFestivo = async (f: Festivo) => {
    if (!confirm(`¿Eliminar festivo ${f.fecha}?`)) return;

    const { error } = await supabase.from("festivos").delete().eq("id", f.id);

    if (error) {
      setMsg("❌ Error eliminando festivo: " + error.message);
      return;
    }

    setFestivos((prev) => prev.filter((x) => x.id !== f.id));
    setMsg("✅ Festivo eliminado.");
  };

  const setField = (key: keyof Configuracion, value: any) => {
    setConfig((prev) => {
      const base = prev ?? ({ id: 0 } as Configuracion);
      return { ...base, [key]: value };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Configuración</h1>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {msg && (
        <div className="bg-white rounded-lg shadow p-3 text-sm">
          {msg}
        </div>
      )}

      {/* Configuración general */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Parámetros</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Tope horas semanales
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={config?.horas_semanales ?? ""}
              onChange={(e) => setField("horas_semanales", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Tope horas mensuales
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={config?.horas_mensuales ?? ""}
              onChange={(e) => setField("horas_mensuales", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Nocturno ordinario */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold mb-2">Recargo nocturno ordinario</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Inicio</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_nocturno_inicio ?? ""}
                  onChange={(e) => setField("recargo_nocturno_inicio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Fin</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_nocturno_fin ?? ""}
                  onChange={(e) => setField("recargo_nocturno_fin", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Festivo diurno/nocturno */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold mb-2">Festivo</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Diurno inicio</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_diurno_festivo_inicio ?? ""}
                  onChange={(e) => setField("recargo_diurno_festivo_inicio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Diurno fin</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_diurno_festivo_fin ?? ""}
                  onChange={(e) => setField("recargo_diurno_festivo_fin", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Nocturno inicio</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_nocturno_festivo_inicio ?? ""}
                  onChange={(e) => setField("recargo_nocturno_festivo_inicio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Nocturno fin</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_nocturno_festivo_fin ?? ""}
                  onChange={(e) => setField("recargo_nocturno_festivo_fin", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dominical diurno/nocturno */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold mb-2">Dominical</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Diurno inicio</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_diurno_dominical_inicio ?? ""}
                  onChange={(e) => setField("recargo_diurno_dominical_inicio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Diurno fin</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_diurno_dominical_fin ?? ""}
                  onChange={(e) => setField("recargo_diurno_dominical_fin", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Nocturno inicio</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_nocturno_dominical_inicio ?? ""}
                  onChange={(e) => setField("recargo_nocturno_dominical_inicio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Nocturno fin</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-2 py-2 text-sm"
                  value={config?.recargo_nocturno_dominical_fin ?? ""}
                  onChange={(e) => setField("recargo_nocturno_dominical_fin", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Festivos */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Festivos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1">Fecha</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={nuevoFestivoFecha}
              onChange={(e) => setNuevoFestivoFecha(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Descripción</label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={nuevoFestivoDesc}
              onChange={(e) => setNuevoFestivoDesc(e.target.value)}
              placeholder="Ej: Año Nuevo, Día del Trabajo..."
            />
          </div>
        </div>

        <button
          onClick={addFestivo}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
        >
          + Agregar festivo
        </button>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {festivos.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{f.fecha}</td>
                  <td className="px-3 py-2">{f.descripcion ?? "-"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteFestivo(f)}
                      className="px-3 py-1 rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {festivos.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                    No hay festivos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fórmulas */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Fórmulas (referencia)</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {formulas.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
