"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Nomina = {
  id: number;
  periodo: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  created_at: string;
  procesada_at?: string | null;
  pagada_at?: string | null;
};

type Detalle = {
  id: number;
  nomina_id: number;
  empleado_id: string;
  salario_base: number;
  horas_extras: number;
  bonificaciones: number;
  otros_devengados: number;
  total_devengado: number;
  salud: number;
  pension: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  otras_deducciones: number;
  total_deducciones: number;
  neto_pagar: number;
  empleado?: {
    id: string;
    nombre_completo: string;
    numero_documento: string;
    cargo: string;
  };
};

type Props = {
  nomina: Nomina;
  detalles: Detalle[];
  isAdmin: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO");
}

function getEstadoBadge(estado: string) {
  const badges: Record<string, string> = {
    borrador: "bg-gray-200 text-gray-700",
    procesada: "bg-blue-200 text-blue-700",
    pagada: "bg-green-200 text-green-700",
  };
  return badges[estado] || badges.borrador;
}

export default function NominaDetalleClient({
  nomina,
  detalles,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleProcesar = async () => {
    if (!confirm("¿Está seguro de procesar esta nómina?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/nomina/${nomina.id}/procesar`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Nómina procesada exitosamente");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "No se pudo procesar la nómina"}`);
      }
    } catch (error) {
      alert("Error al procesar la nómina");
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async () => {
    if (!confirm("¿Está seguro de marcar esta nómina como pagada?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/nomina/${nomina.id}/pagar`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Nómina marcada como pagada");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "No se pudo marcar como pagada"}`);
      }
    } catch (error) {
      alert("Error al marcar como pagada");
    } finally {
      setLoading(false);
    }
  };

  const handleDescartar = async () => {
    if (!confirm("¿Está seguro de devolver esta nómina a estado borrador?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/nomina/${nomina.id}/descartar`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Nómina devuelta a borrador");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "No se pudo devolver a borrador"}`);
      }
    } catch (error) {
      alert("Error al devolver a borrador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard/nomina")}
            className="text-blue-600 hover:underline text-sm mb-2"
          >
            ← Volver a nóminas
          </button>
          <h1 className="text-xl font-bold">Detalle de Nómina - {nomina.periodo}</h1>
        </div>
        <div className="flex gap-2">
          {isAdmin && nomina.estado !== "pagada" && (
            <button
              onClick={() => router.push(`/dashboard/nomina/${nomina.id}/editar`)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
              disabled={loading}
            >
              Editar
            </button>
          )}
          {isAdmin && nomina.estado === "borrador" && (
            <button
              onClick={handleProcesar}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
              disabled={loading}
            >
              Procesar
            </button>
          )}
          {isAdmin && nomina.estado === "procesada" && (
            <>
              <button
                onClick={handlePagar}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
                disabled={loading}
              >
                Marcar como pagada
              </button>
              <button
                onClick={handleDescartar}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
                disabled={loading}
              >
                Devolver a Borrador
              </button>
            </>
          )}
        </div>
      </div>

      {/* Información general */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Periodo</div>
            <div className="font-semibold">{nomina.periodo}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Tipo</div>
            <div className="font-semibold capitalize">{nomina.tipo}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Estado</div>
            <div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${getEstadoBadge(
                  nomina.estado
                )}`}
              >
                {nomina.estado}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Fechas</div>
            <div className="text-sm">
              {formatDate(nomina.fecha_inicio)} - {formatDate(nomina.fecha_fin)}
            </div>
          </div>
        </div>
      </section>

      {/* Resumen financiero */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Devengado</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(nomina.total_devengado)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Deducciones</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(nomina.total_deducciones)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Neto a Pagar</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(nomina.total_neto)}
          </div>
        </div>
      </section>

      {/* Detalle por empleado */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Detalle por Empleado ({detalles.length})
        </h2>
        
        {detalles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay empleados registrados en esta nómina
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Empleado</th>
                  <th className="px-3 py-2 text-left">Documento</th>
                  <th className="px-3 py-2 text-left">Cargo</th>
                  <th className="px-3 py-2 text-right">Salario Base</th>
                  <th className="px-3 py-2 text-right">H. Extras</th>
                  <th className="px-3 py-2 text-right">Bonificaciones</th>
                  <th className="px-3 py-2 text-right">Tot. Devengado</th>
                  <th className="px-3 py-2 text-right">Salud</th>
                  <th className="px-3 py-2 text-right">Pensión</th>
                  <th className="px-3 py-2 text-right">Tot. Deducciones</th>
                  <th className="px-3 py-2 text-right font-bold">Neto</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detalle) => (
                  <tr key={detalle.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">
                      {detalle.empleado?.nombre_completo || "N/A"}
                    </td>
                    <td className="px-3 py-2">
                      {detalle.empleado?.numero_documento || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {detalle.empleado?.cargo || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(detalle.salario_base)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(detalle.horas_extras)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(detalle.bonificaciones)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">
                      {formatCurrency(detalle.total_devengado)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatCurrency(detalle.salud)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatCurrency(detalle.pension)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-red-600">
                      {formatCurrency(detalle.total_deducciones)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-blue-600">
                      {formatCurrency(detalle.neto_pagar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
