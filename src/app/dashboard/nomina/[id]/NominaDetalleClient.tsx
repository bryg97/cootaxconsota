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
  usuario_id: string;
  salario_base: number;
  auxilio_transporte: number;
  horas_trabajadas: number;
  horas_extras: number;
  valor_horas_extras: number;
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  horas_extras_diurnas_domingo: number;
  horas_extras_nocturnas_domingo: number;
  valor_extras_diurnas: number;
  valor_extras_nocturnas: number;
  valor_extras_diurnas_domingo: number;
  valor_extras_nocturnas_domingo: number;
  horas_recargo_nocturno: number;
  valor_recargo_nocturno: number;
  horas_recargo_festivo: number;
  valor_recargo_festivo: number;
  horas_recargo_dominical: number;
  valor_recargo_dominical: number;
  dias_adicionales_descanso: number;
  valor_dias_adicionales: number;
  total_recargos: number;
  total_devengado: number;
  deduccion_salud: number;
  deduccion_pension: number;
  deduccion_fondo_solidario: number;
  total_deducciones: number;
  neto_pagar: number;
  observaciones?: string;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
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
  // Crear fecha local sin conversión de timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO");
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
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

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
          <div className="space-y-3">
            {detalles.map((detalle) => (
              <div key={detalle.id} className="border rounded-lg">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedUser(expandedUser === detalle.id ? null : detalle.id)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">
                      {detalle.usuario?.nombre || "N/A"}
                    </h3>
                    <p className="text-sm text-gray-600">{detalle.usuario?.email}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Devengado</div>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(detalle.total_devengado)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Deducciones</div>
                      <div className="font-semibold text-red-600">
                        {formatCurrency(detalle.total_deducciones)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Neto</div>
                      <div className="font-bold text-blue-600 text-lg">
                        {formatCurrency(detalle.neto_pagar)}
                      </div>
                    </div>
                    <button className="text-gray-400">
                      {expandedUser === detalle.id ? "▼" : "▶"}
                    </button>
                  </div>
                </div>

                {expandedUser === detalle.id && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Salario Base</div>
                        <div className="font-semibold">{formatCurrency(detalle.salario_base)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Auxilio Transporte</div>
                        <div className="font-semibold">{formatCurrency(detalle.auxilio_transporte)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Horas Trabajadas</div>
                        <div className="font-semibold">{detalle.horas_trabajadas || 0}h</div>
                      </div>
                      {detalle.dias_adicionales_descanso > 0 && (
                        <div>
                          <div className="text-xs text-gray-500">Días Adicionales</div>
                          <div className="font-semibold">
                            {detalle.dias_adicionales_descanso} = {formatCurrency(detalle.valor_dias_adicionales)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Horas Extras */}
                    {detalle.horas_extras > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2">Horas Extras ({detalle.horas_extras.toFixed(2)}h = {formatCurrency(detalle.valor_horas_extras)})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {detalle.horas_extras_diurnas > 0 && (
                            <div className="bg-yellow-50 p-2 rounded">
                              <div className="text-xs font-semibold">Extras Diurnas</div>
                              <div className="text-sm">{detalle.horas_extras_diurnas.toFixed(2)}h = {formatCurrency(detalle.valor_extras_diurnas)}</div>
                            </div>
                          )}
                          {detalle.horas_extras_nocturnas > 0 && (
                            <div className="bg-indigo-50 p-2 rounded">
                              <div className="text-xs font-semibold">Extras Nocturnas</div>
                              <div className="text-sm">{detalle.horas_extras_nocturnas.toFixed(2)}h = {formatCurrency(detalle.valor_extras_nocturnas)}</div>
                            </div>
                          )}
                          {detalle.horas_extras_diurnas_domingo > 0 && (
                            <div className="bg-orange-50 p-2 rounded">
                              <div className="text-xs font-semibold">Extras Dom. Diurnas</div>
                              <div className="text-sm">{detalle.horas_extras_diurnas_domingo.toFixed(2)}h = {formatCurrency(detalle.valor_extras_diurnas_domingo)}</div>
                            </div>
                          )}
                          {detalle.horas_extras_nocturnas_domingo > 0 && (
                            <div className="bg-purple-50 p-2 rounded">
                              <div className="text-xs font-semibold">Extras Dom. Nocturnas</div>
                              <div className="text-sm">{detalle.horas_extras_nocturnas_domingo.toFixed(2)}h = {formatCurrency(detalle.valor_extras_nocturnas_domingo)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recargos */}
                    {detalle.total_recargos > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2">Recargos (Total: {formatCurrency(detalle.total_recargos)})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {detalle.horas_recargo_nocturno > 0 && (
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-xs font-semibold">Recargo Nocturno</div>
                              <div className="text-sm">{detalle.horas_recargo_nocturno.toFixed(2)}h = {formatCurrency(detalle.valor_recargo_nocturno)}</div>
                            </div>
                          )}
                          {detalle.horas_recargo_festivo > 0 && (
                            <div className="bg-pink-50 p-2 rounded">
                              <div className="text-xs font-semibold">Recargo Festivo</div>
                              <div className="text-sm">{detalle.horas_recargo_festivo.toFixed(2)}h = {formatCurrency(detalle.valor_recargo_festivo)}</div>
                            </div>
                          )}
                          {detalle.horas_recargo_dominical > 0 && (
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-xs font-semibold">Recargo Dominical</div>
                              <div className="text-sm">{detalle.horas_recargo_dominical.toFixed(2)}h = {formatCurrency(detalle.valor_recargo_dominical)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deducciones */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Deducciones (Total: {formatCurrency(detalle.total_deducciones)})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-red-50 p-2 rounded">
                          <div className="text-xs font-semibold">Salud (4%)</div>
                          <div className="text-sm">{formatCurrency(detalle.deduccion_salud)}</div>
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <div className="text-xs font-semibold">Pensión (4%)</div>
                          <div className="text-sm">{formatCurrency(detalle.deduccion_pension)}</div>
                        </div>
                        {detalle.deduccion_fondo_solidario > 0 && (
                          <div className="bg-red-50 p-2 rounded">
                            <div className="text-xs font-semibold">Fondo Solidario</div>
                            <div className="text-sm">{formatCurrency(detalle.deduccion_fondo_solidario)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
