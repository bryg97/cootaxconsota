// src/app/dashboard/configuracion/ConfiguracionClient.tsx
"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

type Formulas = {
  // divisores
  valor_hora_divisor_mensual: number; // normalmente 240
  valor_dia_divisor: number; // normalmente 30

  // recargos
  recargo_nocturno_ordinario: number; // 0.35
  recargo_diurno_festivo: number; // 1.80
  recargo_nocturno_festivo: number; // 2.15
  recargo_diurno_domingo: number; // 0.80
  recargo_nocturno_domingo: number; // 1.15

  // extras
  extra_diurna_ordinaria: number; // 1.25
  extra_nocturna_ordinaria: number; // 1.75
  extra_diurna_festivo_domingo: number; // 2.00
  extra_nocturna_festivo_domingo: number; // 2.50
};

const DEFAULT_FORMULAS: Formulas = {
  valor_hora_divisor_mensual: 240,
  valor_dia_divisor: 30,

  recargo_nocturno_ordinario: 0.35,
  recargo_diurno_festivo: 1.8,
  recargo_nocturno_festivo: 2.15,
  recargo_diurno_domingo: 0.8,
  recargo_nocturno_domingo: 1.15,

  extra_diurna_ordinaria: 1.25,
  extra_nocturna_ordinaria: 1.75,
  extra_diurna_festivo_domingo: 2.0,
  extra_nocturna_festivo_domingo: 2.5,
};

function toNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFormulas(raw: any): Formulas {
  const f = raw ?? {};
  return {
    valor_hora_divisor_mensual: toNum(
      f.valor_hora_divisor_mensual,
      DEFAULT_FORMULAS.valor_hora_divisor_mensual
    ),
    valor_dia_divisor: toNum(f.valor_dia_divisor, DEFAULT_FORMULAS.valor_dia_divisor),

    recargo_nocturno_ordinario: toNum(
      f.recargo_nocturno_ordinario,
      DEFAULT_FORMULAS.recargo_nocturno_ordinario
    ),
    recargo_diurno_festivo: toNum(f.recargo_diurno_festivo, DEFAULT_FORMULAS.recargo_diurno_festivo),
    recargo_nocturno_festivo: toNum(
      f.recargo_nocturno_festivo,
      DEFAULT_FORMULAS.recargo_nocturno_festivo
    ),
    recargo_diurno_domingo: toNum(f.recargo_diurno_domingo, DEFAULT_FORMULAS.recargo_diurno_domingo),
    recargo_nocturno_domingo: toNum(f.recargo_nocturno_domingo, DEFAULT_FORMULAS.recargo_nocturno_domingo),

    extra_diurna_ordinaria: toNum(f.extra_diurna_ordinaria, DEFAULT_FORMULAS.extra_diurna_ordinaria),
    extra_nocturna_ordinaria: toNum(f.extra_nocturna_ordinaria, DEFAULT_FORMULAS.extra_nocturna_ordinaria),
    extra_diurna_festivo_domingo: toNum(
      f.extra_diurna_festivo_domingo,
      DEFAULT_FORMULAS.extra_diurna_festivo_domingo
    ),
    extra_nocturna_festivo_domingo: toNum(
      f.extra_nocturna_festivo_domingo,
      DEFAULT_FORMULAS.extra_nocturna_festivo_domingo
    ),
  };
}

type Configuracion = {
  id: number;
  horas_mensuales?: number | null;
  horas_semanales?: number | null;
  auxilio_transporte?: number | null;
  fondo_solidario?: number | null;

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

  // NUEVO (jsonb)
  formulas?: any;
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

  // Fórmulas editables (jsonb)
  const [formulas, setFormulas] = useState<Formulas>(() =>
    normalizeFormulas(initialConfig?.formulas)
  );

  // Simulación con salario
  const [salarioEjemplo, setSalarioEjemplo] = useState<number | "">("");

  const valorHora = useMemo(() => {
    if (salarioEjemplo === "" || !Number(salarioEjemplo)) return 0;
    const divisor = formulas.valor_hora_divisor_mensual || (config?.horas_mensuales ?? 0) || 240;
    if (!divisor) return 0;
    return Number(salarioEjemplo) / Number(divisor);
  }, [salarioEjemplo, formulas.valor_hora_divisor_mensual, config?.horas_mensuales]);

  const valorDia = useMemo(() => {
    if (salarioEjemplo === "" || !Number(salarioEjemplo)) return 0;
    const divisor = formulas.valor_dia_divisor || 30;
    return Number(salarioEjemplo) / Number(divisor);
  }, [salarioEjemplo, formulas.valor_dia_divisor]);

  const recargosPreview = useMemo(() => {
    const vh = valorHora;
    return {
      recargo_nocturno_ordinario: vh * formulas.recargo_nocturno_ordinario,
      recargo_diurno_festivo: vh * formulas.recargo_diurno_festivo,
      recargo_nocturno_festivo: vh * formulas.recargo_nocturno_festivo,
      recargo_diurno_domingo: vh * formulas.recargo_diurno_domingo,
      recargo_nocturno_domingo: vh * formulas.recargo_nocturno_domingo,
      extra_diurna_ordinaria: vh * formulas.extra_diurna_ordinaria,
      extra_nocturna_ordinaria: vh * formulas.extra_nocturna_ordinaria,
      extra_diurna_festivo_domingo: vh * formulas.extra_diurna_festivo_domingo,
      extra_nocturna_festivo_domingo: vh * formulas.extra_nocturna_festivo_domingo,
    };
  }, [valorHora, formulas]);

  const ensureConfig = async () => {
    if (config) return config;

    const { data, error } = await supabase
      .from("configuraciones")
      .insert({})
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "No existe configuración y no se pudo crear automáticamente. " + error.message
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

      // Validaciones mínimas
      if ((cfg.horas_mensuales ?? 0) !== 0 && cfg.horas_mensuales !== null && (cfg.horas_mensuales ?? 0) < 0) {
        throw new Error("Las horas mensuales no pueden ser negativas.");
      }
      if ((cfg.horas_semanales ?? 0) !== 0 && cfg.horas_semanales !== null && (cfg.horas_semanales ?? 0) < 0) {
        throw new Error("Las horas semanales no pueden ser negativas.");
      }
      if (!formulas.valor_hora_divisor_mensual || formulas.valor_hora_divisor_mensual <= 0) {
        throw new Error("El divisor mensual (valor hora) debe ser > 0.");
      }
      if (!formulas.valor_dia_divisor || formulas.valor_dia_divisor <= 0) {
        throw new Error("El divisor día debe ser > 0.");
      }

      const { error } = await supabase
        .from("configuraciones")
        .update({
          horas_mensuales: cfg.horas_mensuales ?? null,
          horas_semanales: cfg.horas_semanales ?? null,
          auxilio_transporte: cfg.auxilio_transporte ?? null,
          fondo_solidario: cfg.fondo_solidario ?? null,

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

          // ✅ Guardar formulas (jsonb)
          formulas,
        })
        .eq("id", cfg.id);

      if (error) throw new Error(error.message);

      setMsg("✅ Configuración guardada correctamente (incluye fórmulas).");
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

    setFestivos((prev) =>
      [...prev, data as Festivo].sort((a, b) => a.fecha.localeCompare(b.fecha))
    );
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

  const setFormula = (key: keyof Formulas, value: string) => {
    setFormulas((prev) => ({
      ...prev,
      [key]: toNum(value, prev[key]),
    }));
  };

  const FormulaField = ({
    label,
    k,
    hint,
    step = "0.01",
  }: {
    label: string;
    k: keyof Formulas;
    hint?: string;
    step?: string;
  }) => (
    <div className="border rounded-lg p-3">
      <p className="text-xs font-semibold mb-1">{label}</p>
      {hint && <p className="text-[11px] text-gray-500 mb-2">{hint}</p>}
      <input
        type="number"
        step={step}
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={String(formulas[k])}
        onChange={(e) => setFormula(k, e.target.value)}
      />
    </div>
  );

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

      {msg && <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>}

      {/* Configuración general */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Parámetros</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Tope horas semanales</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={config?.horas_semanales ?? ""}
              onChange={(e) =>
                setField("horas_semanales", e.target.value === "" ? null : Number(e.target.value))
              }
              min={0}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Tope horas mensuales</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={config?.horas_mensuales ?? ""}
              onChange={(e) =>
                setField("horas_mensuales", e.target.value === "" ? null : Number(e.target.value))
              }
              min={0}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Auxilio de transporte (mensual)</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={config?.auxilio_transporte ?? ""}
              onChange={(e) =>
                setField("auxilio_transporte", e.target.value === "" ? null : Number(e.target.value))
              }
              min={0}
              placeholder="Ej: 200000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Fondo solidario (mensual)</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={config?.fondo_solidario ?? ""}
              onChange={(e) =>
                setField("fondo_solidario", e.target.value === "" ? null : Number(e.target.value))
              }
              min={0}
              placeholder="Ej: 50000"
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

          {/* Festivo */}
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

          {/* Dominical */}
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

      {/* ✅ NUEVO: Editor de fórmulas */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Fórmulas (editables)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormulaField
            label="Divisor mensual (valor hora)"
            k="valor_hora_divisor_mensual"
            step="1"
            hint="Salario base / este valor. Normalmente 240."
          />
          <FormulaField
            label="Divisor día (valor día)"
            k="valor_dia_divisor"
            step="1"
            hint="Salario base / este valor. Normalmente 30."
          />

          <FormulaField label="Recargo nocturno ordinario" k="recargo_nocturno_ordinario" hint="Ej: 0.35 = 35%" />
          <FormulaField label="Recargo diurno festivo" k="recargo_diurno_festivo" hint="Ej: 1.80" />
          <FormulaField label="Recargo nocturno festivo" k="recargo_nocturno_festivo" hint="Ej: 2.15" />
          <FormulaField label="Recargo diurno domingo" k="recargo_diurno_domingo" hint="Ej: 0.80" />
          <FormulaField label="Recargo nocturno domingo" k="recargo_nocturno_domingo" hint="Ej: 1.15" />
          <FormulaField label="Hora extra diurna ordinaria" k="extra_diurna_ordinaria" hint="Ej: 1.25" />
          <FormulaField label="Hora extra nocturna ordinaria" k="extra_nocturna_ordinaria" hint="Ej: 1.75" />
          <FormulaField label="Hora extra diurna (dom/fest)" k="extra_diurna_festivo_domingo" hint="Ej: 2.00" />
          <FormulaField label="Hora extra nocturna (dom/fest)" k="extra_nocturna_festivo_domingo" hint="Ej: 2.50" />
        </div>

        {/* Simulación */}
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Simulación rápida</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Salario base (ejemplo)</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={salarioEjemplo}
                onChange={(e) => setSalarioEjemplo(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Valor hora</label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
                {valorHora.toFixed(2)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Valor día</label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
                {valorDia.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-md">
              <p>Recargo nocturno ordinario: {recargosPreview.recargo_nocturno_ordinario.toFixed(2)}</p>
              <p>Recargo diurno festivo: {recargosPreview.recargo_diurno_festivo.toFixed(2)}</p>
              <p>Recargo nocturno festivo: {recargosPreview.recargo_nocturno_festivo.toFixed(2)}</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p>Recargo diurno domingo: {recargosPreview.recargo_diurno_domingo.toFixed(2)}</p>
              <p>Recargo nocturno domingo: {recargosPreview.recargo_nocturno_domingo.toFixed(2)}</p>
              <p>Extra diurna ordinaria: {recargosPreview.extra_diurna_ordinaria.toFixed(2)}</p>
              <p>Extra nocturna ordinaria: {recargosPreview.extra_nocturna_ordinaria.toFixed(2)}</p>
              <p>Extra diurna dom/fest: {recargosPreview.extra_diurna_festivo_domingo.toFixed(2)}</p>
              <p>Extra nocturna dom/fest: {recargosPreview.extra_nocturna_festivo_domingo.toFixed(2)}</p>
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

      {/* Fórmulas de cálculo de nómina */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-4">Fórmulas de cálculo de nómina</h2>

        <div className="space-y-4">
          {/* Valores base */}
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="text-sm font-bold text-blue-900 mb-2">📊 Valores Base</h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                <strong>Valor hora:</strong> Salario base ÷ {formulas.valor_hora_divisor_mensual}
              </li>
              <li>
                <strong>Valor día:</strong> Salario base ÷ {formulas.valor_dia_divisor}
              </li>
            </ul>
          </div>

          {/* Recargos ordinarios */}
          <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
            <h3 className="text-sm font-bold text-purple-900 mb-2">🌙 Recargos Ordinarios</h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                <strong>Nocturno (lun-sáb):</strong> Valor hora × {formulas.recargo_nocturno_ordinario} (
                {(formulas.recargo_nocturno_ordinario * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Diurno festivo:</strong> Valor hora × {formulas.recargo_diurno_festivo} (
                {(formulas.recargo_diurno_festivo * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Nocturno festivo:</strong> Valor hora × {formulas.recargo_nocturno_festivo} (
                {(formulas.recargo_nocturno_festivo * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Diurno domingo:</strong> Valor hora × {formulas.recargo_diurno_domingo} (
                {(formulas.recargo_diurno_domingo * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Nocturno domingo:</strong> Valor hora × {formulas.recargo_nocturno_domingo} (
                {(formulas.recargo_nocturno_domingo * 100).toFixed(0)}%)
              </li>
            </ul>
          </div>

          {/* Horas extras */}
          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
            <h3 className="text-sm font-bold text-green-900 mb-2">⏰ Horas Extras</h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                <strong>Extra diurna (lun-sáb):</strong> Valor hora × {formulas.extra_diurna_ordinaria} (
                {(formulas.extra_diurna_ordinaria * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Extra nocturna (lun-sáb):</strong> Valor hora × {formulas.extra_nocturna_ordinaria} (
                {(formulas.extra_nocturna_ordinaria * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Extra diurna (dom/fest):</strong> Valor hora × {formulas.extra_diurna_festivo_domingo} (
                {(formulas.extra_diurna_festivo_domingo * 100).toFixed(0)}%)
              </li>
              <li>
                <strong>Extra nocturna (dom/fest):</strong> Valor hora × {formulas.extra_nocturna_festivo_domingo} (
                {(formulas.extra_nocturna_festivo_domingo * 100).toFixed(0)}%)
              </li>
            </ul>
          </div>

          {/* Deducciones */}
          <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
            <h3 className="text-sm font-bold text-red-900 mb-2">💰 Deducciones</h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                <strong>Salud:</strong> Salario base × 4%
              </li>
              <li>
                <strong>Pensión:</strong> Salario base × 4%
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
