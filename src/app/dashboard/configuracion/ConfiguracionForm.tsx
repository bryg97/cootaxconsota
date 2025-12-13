// src/app/dashboard/configuracion/ConfiguracionForm.tsx
"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

type Configuracion = {
  id?: number;
  horas_mensuales?: number | null;
  horas_semanales?: number | null;
  recargo_nocturno_inicio?: string | null;
  recargo_nocturno_fin?: string | null;
  // aquí luego agregas los nuevos campos de recargos festivos/dominicales
};

interface Props {
  initialConfig: Configuracion | null;
}

export default function ConfiguracionForm({ initialConfig }: Props) {
  const [horasMensuales, setHorasMensuales] = useState<number | "">(
    initialConfig?.horas_mensuales ?? ""
  );
  const [horasSemanales, setHorasSemanales] = useState<number | "">(
    initialConfig?.horas_semanales ?? ""
  );
  const [salarioEjemplo, setSalarioEjemplo] = useState<number | "">(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Fórmulas ejemplo (para mostrar, no se graban)
  const valorHora = useMemo(() => {
    if (!salarioEjemplo || !horasMensuales || horasMensuales === 0) return 0;
    return Number(salarioEjemplo) / Number(horasMensuales);
  }, [salarioEjemplo, horasMensuales]);

  const valorDia = useMemo(() => {
    if (!salarioEjemplo) return 0;
    return Number(salarioEjemplo) / 30;
  }, [salarioEjemplo]);

  const recargos = useMemo(() => {
    const vh = valorHora;
    return {
      recargo_nocturno_ordinario: vh * 0.35,
      recargo_diurno_festivo: vh * 1.8,
      recargo_nocturno_festivo: vh * 2.15,
      recargo_diurno_domingo: vh * 0.8,
      recargo_nocturno_domingo: vh * 1.15,
      hora_extra_diurna: vh * 1.25,
      hora_extra_nocturna: vh * 1.75,
      hora_extra_diurna_dom_fest: vh * 2.0,
      hora_extra_nocturna_dom_fest: vh * 2.5,
    };
  }, [valorHora]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    const payload = {
      horas_mensuales:
        horasMensuales === "" ? null : Number(horasMensuales),
      horas_semanales:
        horasSemanales === "" ? null : Number(horasSemanales),
      // aquí luego agregarías los campos de horarios de recargos
    };

    let error;

    if (initialConfig?.id) {
      const res = await supabase
        .from("configuraciones")
        .update(payload)
        .eq("id", initialConfig.id);
      error = res.error;
    } else {
      const res = await supabase.from("configuraciones").insert(payload);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      setMsg("Error guardando configuración: " + error.message);
      return;
    }

    setMsg("Configuración guardada correctamente.");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Configuración</h1>

      {msg && (
        <div className="mb-4 bg-blue-100 text-blue-700 p-3 rounded text-sm">
          {msg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-xl bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tope horas mensuales
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={horasMensuales}
              onChange={(e) =>
                setHorasMensuales(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tope horas semanales
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={horasSemanales}
              onChange={(e) =>
                setHorasSemanales(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min={0}
            />
          </div>
        </div>

        {/* Bloque para probar fórmulas con un salario base de ejemplo */}
        <div className="mt-4 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">
            Simulación de fórmulas
          </h2>

          <p className="text-sm text-gray-500 mb-2">
            Ingresa un salario base de ejemplo para ver los valores
            calculados por hora, día y recargos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Salario base (ejemplo)
              </label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={salarioEjemplo}
                onChange={(e) =>
                  setSalarioEjemplo(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Valor hora
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
                {valorHora.toFixed(2)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Valor día (salario/30)
              </label>
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
                {valorDia.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Resumen de recargos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-md">
              <p>Recargo nocturno ordinario: {recargos.recargo_nocturno_ordinario.toFixed(2)}</p>
              <p>Recargo diurno festivo: {recargos.recargo_diurno_festivo.toFixed(2)}</p>
              <p>Recargo nocturno festivo: {recargos.recargo_nocturno_festivo.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p>Recargo diurno domingo: {recargos.recargo_diurno_domingo.toFixed(2)}</p>
              <p>Recargo nocturno domingo: {recargos.recargo_nocturno_domingo.toFixed(2)}</p>
              <p>Hora extra diurna: {recargos.hora_extra_diurna.toFixed(2)}</p>
              <p>Hora extra nocturna: {recargos.hora_extra_nocturna.toFixed(2)}</p>
              <p>Hora extra diurna dom/fest: {recargos.hora_extra_diurna_dom_fest.toFixed(2)}</p>
              <p>Hora extra nocturna dom/fest: {recargos.hora_extra_nocturna_dom_fest.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </form>
    </div>
  );
}
