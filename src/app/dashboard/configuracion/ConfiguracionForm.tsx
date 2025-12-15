// src/app/dashboard/configuracion/ConfiguracionForm.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Configuracion = {
  id?: number;
  horas_mensuales?: number | null;
  horas_semanales?: number | null;
  recargo_nocturno_inicio?: string | null;
  recargo_nocturno_fin?: string | null;
  auxilio_transporte?: number | null; // Valor mensual
  fondo_solidario?: number | null; // Valor mensual
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
  const [auxilioTransporte, setAuxilioTransporte] = useState<number | "">(
    initialConfig?.auxilio_transporte ?? ""
  );
  const [fondoSolidario, setFondoSolidario] = useState<number | "">(
    initialConfig?.fondo_solidario ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    const payload = {
      horas_mensuales:
        horasMensuales === "" ? null : Number(horasMensuales),
      horas_semanales:
        horasSemanales === "" ? null : Number(horasSemanales),
      auxilio_transporte:
        auxilioTransporte === "" ? null : Number(auxilioTransporte),
      fondo_solidario:
        fondoSolidario === "" ? null : Number(fondoSolidario),
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

        <div className="mt-4 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">
            Nómina - Valores fijos mensuales
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Auxilio de transporte (mensual)
              </label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={auxilioTransporte}
                onChange={(e) =>
                  setAuxilioTransporte(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                min={0}
                placeholder="Ej: 200000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se divide entre 2 para nómina quincenal
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Fondo solidario (mensual)
              </label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={fondoSolidario}
                onChange={(e) =>
                  setFondoSolidario(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                min={0}
                placeholder="Ej: 50000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se divide entre 2 para nómina quincenal (deducción)
              </p>
            </div>
          </div>
        </div>

        {/* Fórmulas de cálculo */}
        <div className="mt-4 border-t pt-4">
          <h2 className="text-lg font-semibold mb-3">
            📊 Fórmulas de cálculo
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Estas son las fórmulas utilizadas para calcular nómina según la legislación colombiana.
          </p>

          <div className="space-y-3">
            {/* Fórmulas básicas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-blue-900 mb-3">Valores base</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-blue-100">
                  <span className="font-medium text-blue-800">Valor hora</span>
                  <span className="text-blue-600 font-mono">Salario base ÷ Horas mensuales</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-blue-800">Valor día</span>
                  <span className="text-blue-600 font-mono">Salario base ÷ 30</span>
                </div>
              </div>
            </div>

            {/* Recargos */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-purple-900 mb-3">Recargos ordinarios</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-purple-100">
                  <span className="font-medium text-purple-800">Recargo nocturno ordinario</span>
                  <span className="text-purple-600 font-mono">Valor hora × 35%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-purple-100">
                  <span className="font-medium text-purple-800">Recargo diurno festivo</span>
                  <span className="text-purple-600 font-mono">Valor hora × 75%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-purple-100">
                  <span className="font-medium text-purple-800">Recargo nocturno festivo</span>
                  <span className="text-purple-600 font-mono">Valor hora × 110%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-purple-100">
                  <span className="font-medium text-purple-800">Recargo diurno domingo</span>
                  <span className="text-purple-600 font-mono">Valor hora × 75%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-purple-800">Recargo nocturno domingo</span>
                  <span className="text-purple-600 font-mono">Valor hora × 110%</span>
                </div>
              </div>
            </div>

            {/* Horas extras */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-green-900 mb-3">Horas extras</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-green-100">
                  <span className="font-medium text-green-800">Hora extra diurna</span>
                  <span className="text-green-600 font-mono">Valor hora × 25%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-green-100">
                  <span className="font-medium text-green-800">Hora extra nocturna</span>
                  <span className="text-green-600 font-mono">Valor hora × 75%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-green-100">
                  <span className="font-medium text-green-800">Hora extra diurna festivo/dominical</span>
                  <span className="text-green-600 font-mono">Valor hora × 100%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-green-800">Hora extra nocturna festivo/dominical</span>
                  <span className="text-green-600 font-mono">Valor hora × 150%</span>
                </div>
              </div>
            </div>

            {/* Deducciones */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-red-900 mb-3">Deducciones</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-red-100">
                  <span className="font-medium text-red-800">Salud</span>
                  <span className="text-red-600 font-mono">(Salario + Extras + Recargos) × 4%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-red-100">
                  <span className="font-medium text-red-800">Pensión</span>
                  <span className="text-red-600 font-mono">(Salario + Extras + Recargos) × 4%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-red-800">Fondo solidario</span>
                  <span className="text-red-600 font-mono">Valor fijo mensual</span>
                </div>
              </div>
            </div>

            {/* Nota importante */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>📌 Nota:</strong> El auxilio de transporte NO se incluye en la base de deducciones (salud y pensión).
              </p>
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
