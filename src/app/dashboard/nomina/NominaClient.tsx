"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type Props = {
  sessionUserId: string;
  sessionUserName: string;
  isAdmin: boolean;
  initialNominas: Nomina[];
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

export default function NominaClient({
  sessionUserId,
  sessionUserName,
  isAdmin,
  initialNominas,
}: Props) {
  const router = useRouter();
  const [nominas, setNominas] = useState<Nomina[]>(initialNominas);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (nominaId: number) => {
    if (!confirm("¿Está seguro de eliminar esta nómina? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/nomina/${nominaId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNominas((prev) => prev.filter((n) => n.id !== nominaId));
        alert("Nómina eliminada exitosamente");
        router.refresh();
      } else {
        const error = await response.json();
        console.error("Error al eliminar:", error);
        const errorMsg = error.message || "No se pudo eliminar la nómina";
        const errorDetails = error.error ? `\n\nDetalles: ${error.error}` : "";
        alert(`Error: ${errorMsg}${errorDetails}\n\nSi el problema persiste, debe ejecutar el script fix-eliminar-nominas-rls.sql en Supabase.`);
      }
    } catch (error) {
      console.error("Error catch:", error);
      alert("Error al eliminar la nómina. Verifique la consola para más detalles.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nómina</h1>
        {isAdmin && (
          <button
            onClick={() => router.push("/dashboard/nomina/nueva")}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
          >
            + Nueva nómina
          </button>
        )}
      </div>

      {/* Listado de nóminas */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Nóminas procesadas</h2>

        {nominas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay nóminas registradas</p>
            {isAdmin && (
              <button
                onClick={() => router.push("/dashboard/nomina/nueva")}
                className="mt-4 text-red-600 hover:underline"
              >
                Crear la primera nómina
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Periodo</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Fechas</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Total Devengado</th>
                  <th className="px-3 py-2 text-right">Total Deducciones</th>
                  <th className="px-3 py-2 text-right">Neto a Pagar</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {nominas.map((n) => (
                  <tr key={n.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{n.periodo}</td>
                    <td className="px-3 py-2 capitalize">{n.tipo}</td>
                    <td className="px-3 py-2 text-xs">
                      {formatDate(n.fecha_inicio)} - {formatDate(n.fecha_fin)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getEstadoBadge(
                          n.estado
                        )}`}
                      >
                        {n.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(n.total_devengado)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatCurrency(n.total_deducciones)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-green-600">
                      {formatCurrency(n.total_neto)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/nomina/${n.id}`)
                          }
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Ver detalle
                        </button>
                        {isAdmin && n.estado !== "pagada" && (
                          <>
                            <button
                              onClick={() =>
                                router.push(`/dashboard/nomina/${n.id}/editar`)
                              }
                              className="text-green-600 hover:underline text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(n.id)}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Estadísticas rápidas */}
      {nominas.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Devengado (Todas)</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                nominas.reduce((acc, n) => acc + (n.total_devengado || 0), 0)
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Deducciones</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                nominas.reduce((acc, n) => acc + (n.total_deducciones || 0), 0)
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Neto Total</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                nominas.reduce((acc, n) => acc + (n.total_neto || 0), 0)
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
