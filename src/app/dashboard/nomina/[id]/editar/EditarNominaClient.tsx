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
  horas_recargo_nocturno: number;
  valor_recargo_nocturno: number;
  horas_recargo_festivo: number;
  valor_recargo_festivo: number;
  horas_recargo_dominical: number;
  valor_recargo_dominical: number;
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

type EmpleadoActivo = {
  id: string;
  nombre: string;
  email: string;
  salario_base: number;
};

type Props = {
  nomina: Nomina;
  detalles: Detalle[];
  empleadosActivos: EmpleadoActivo[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function EditarNominaClient({
  nomina,
  detalles: initialDetalles,
  empleadosActivos,
}: Props) {
  const router = useRouter();
  const [detalles, setDetalles] = useState(initialDetalles);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAgregar, setShowAgregar] = useState(false);

  // Estado para el formulario de edición
  const [editForm, setEditForm] = useState<Partial<Detalle>>({});

  // Estado para agregar empleado
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState("");

  const handleEdit = (detalle: Detalle) => {
    setEditingId(detalle.id);
    setEditForm({
      id: detalle.id,
      salario_base: detalle.salario_base,
      auxilio_transporte: detalle.auxilio_transporte,
      horas_extras: detalle.horas_extras,
      valor_horas_extras: detalle.valor_horas_extras,
      horas_recargo_nocturno: detalle.horas_recargo_nocturno,
      valor_recargo_nocturno: detalle.valor_recargo_nocturno,
      horas_recargo_festivo: detalle.horas_recargo_festivo,
      valor_recargo_festivo: detalle.valor_recargo_festivo,
      horas_recargo_dominical: detalle.horas_recargo_dominical,
      valor_recargo_dominical: detalle.valor_recargo_dominical,
      total_recargos: detalle.total_recargos,
      deduccion_salud: detalle.deduccion_salud,
      deduccion_pension: detalle.deduccion_pension,
      deduccion_fondo_solidario: detalle.deduccion_fondo_solidario,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const calculateTotals = (form: Partial<Detalle>) => {
    const totalDevengado =
      (form.salario_base || 0) +
      (form.auxilio_transporte || 0) +
      (form.valor_horas_extras || 0) +
      (form.total_recargos || 0);

    const totalDeducciones =
      (form.deduccion_salud || 0) +
      (form.deduccion_pension || 0) +
      (form.deduccion_fondo_solidario || 0);

    const netoPagar = totalDevengado - totalDeducciones;

    return { totalDevengado, totalDeducciones, netoPagar };
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;

    setLoading(true);
    try {
      const totals = calculateTotals(editForm);
      
      const response = await fetch(`/api/nomina/${nomina.id}/detalle/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          total_devengado: totals.totalDevengado,
          total_deducciones: totals.totalDeducciones,
          neto_pagar: totals.netoPagar,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setDetalles((prev) =>
          prev.map((d) => (d.id === editForm.id ? { ...d, ...updated } : d))
        );
        handleCancelEdit();
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "No se pudo actualizar"}`);
      }
    } catch (error) {
      alert("Error al actualizar el detalle");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (detalleId: number) => {
    if (!confirm("¿Está seguro de eliminar este empleado de la nómina?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/nomina/${nomina.id}/detalle/${detalleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDetalles((prev) => prev.filter((d) => d.id !== detalleId));
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "No se pudo eliminar"}`);
      }
    } catch (error) {
      alert("Error al eliminar el detalle");
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarEmpleado = async () => {
    if (!selectedEmpleadoId) {
      alert("Seleccione un empleado");
      return;
    }

    const empleado = empleadosActivos.find((e) => e.id === selectedEmpleadoId);
    if (!empleado) return;

    // Verificar si ya está agregado
    if (detalles.some((d) => d.usuario_id === selectedEmpleadoId)) {
      alert("Este empleado ya está en la nómina");
      return;
    }

    setLoading(true);
    try {
      // Calcular deducciones automáticas (4% salud, 4% pensión)
      const deduccionSalud = empleado.salario_base * 0.04;
      const deduccionPension = empleado.salario_base * 0.04;
      const totalDevengado = empleado.salario_base;
      const totalDeducciones = deduccionSalud + deduccionPension;
      const netoPagar = totalDevengado - totalDeducciones;

      const response = await fetch(`/api/nomina/${nomina.id}/detalle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: selectedEmpleadoId,
          salario_base: empleado.salario_base,
          auxilio_transporte: 0,
          horas_trabajadas: 0,
          horas_extras: 0,
          valor_horas_extras: 0,
          horas_recargo_nocturno: 0,
          valor_recargo_nocturno: 0,
          horas_recargo_festivo: 0,
          valor_recargo_festivo: 0,
          horas_recargo_dominical: 0,
          valor_recargo_dominical: 0,
          total_recargos: 0,
          total_devengado: totalDevengado,
          deduccion_salud: deduccionSalud,
          deduccion_pension: deduccionPension,
          deduccion_fondo_solidario: 0,
          total_deducciones: totalDeducciones,
          neto_pagar: netoPagar,
        }),
      });

      if (response.ok) {
        const newDetalle = await response.json();
        setDetalles((prev) => [...prev, { ...newDetalle, usuario: empleado }]);
        setSelectedEmpleadoId("");
        setShowAgregar(false);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "No se pudo agregar"}`);
      }
    } catch (error) {
      alert("Error al agregar el empleado");
    } finally {
      setLoading(false);
    }
  };

  const empleadosDisponibles = empleadosActivos.filter(
    (e) => !detalles.some((d) => d.usuario_id === e.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/dashboard/nomina/${nomina.id}`)}
            className="text-blue-600 hover:underline text-sm mb-2"
          >
            ← Volver al detalle
          </button>
          <h1 className="text-xl font-bold">
            Editar Nómina - {nomina.periodo}{" "}
            <span className="text-sm font-normal text-gray-500">
              (Estado: {nomina.estado})
            </span>
          </h1>
        </div>
        <button
          onClick={() => setShowAgregar(!showAgregar)}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
          disabled={loading}
        >
          + Agregar Empleado
        </button>
      </div>

      {/* Formulario para agregar empleado */}
      {showAgregar && (
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Agregar Empleado</h3>
          {empleadosDisponibles.length === 0 ? (
            <p className="text-sm text-gray-600">
              No hay empleados activos disponibles para agregar
            </p>
          ) : (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Seleccionar Empleado
                </label>
                <select
                  value={selectedEmpleadoId}
                  onChange={(e) => setSelectedEmpleadoId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">-- Seleccione --</option>
                  {empleadosDisponibles.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} - {emp.email} ({formatCurrency(emp.salario_base)})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAgregarEmpleado}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
                disabled={loading || !selectedEmpleadoId}
              >
                Agregar
              </button>
              <button
                onClick={() => {
                  setShowAgregar(false);
                  setSelectedEmpleadoId("");
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>
          )}
        </section>
      )}

      {/* Lista de empleados */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Empleados en la Nómina ({detalles.length})
        </h2>

        {detalles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay empleados en esta nómina. Use el botón "Agregar Empleado" para comenzar.
          </div>
        ) : (
          <div className="space-y-4">
            {detalles.map((detalle) => {
              const isEditing = editingId === detalle.id;

              return (
                <div
                  key={detalle.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">
                        {detalle.usuario?.nombre || "N/A"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {detalle.usuario?.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => handleEdit(detalle)}
                            className="text-blue-600 hover:underline text-sm"
                            disabled={loading}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(detalle.id)}
                            className="text-red-600 hover:underline text-sm"
                            disabled={loading}
                          >
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            disabled={loading}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                            disabled={loading}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Salario Base
                        </label>
                        <input
                          type="number"
                          value={editForm.salario_base || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              salario_base: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Auxilio Transporte
                        </label>
                        <input
                          type="number"
                          value={editForm.auxilio_transporte || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              auxilio_transporte: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Horas Extras
                        </label>
                        <input
                          type="number"
                          value={editForm.horas_extras || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              horas_extras: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Valor H. Extras
                        </label>
                        <input
                          type="number"
                          value={editForm.valor_horas_extras || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              valor_horas_extras: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Total Recargos
                        </label>
                        <input
                          type="number"
                          value={editForm.total_recargos || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              total_recargos: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Deducción Salud
                        </label>
                        <input
                          type="number"
                          value={editForm.deduccion_salud || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              deduccion_salud: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Deducción Pensión
                        </label>
                        <input
                          type="number"
                          value={editForm.deduccion_pension || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              deduccion_pension: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Fondo Solidaridad
                        </label>
                        <input
                          type="number"
                          value={editForm.deduccion_fondo_solidario || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              deduccion_fondo_solidario: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Salario Base:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(detalle.salario_base)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Auxilio Transporte:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(detalle.auxilio_transporte)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Valor H. Extras:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(detalle.valor_horas_extras)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Recargos:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(detalle.total_recargos)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tot. Devengado:</span>{" "}
                        <span className="font-semibold text-green-600">
                          {formatCurrency(detalle.total_devengado)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Salud:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(detalle.deduccion_salud)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pensión:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(detalle.deduccion_pension)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tot. Deducciones:</span>{" "}
                        <span className="font-semibold text-red-600">
                          {formatCurrency(detalle.total_deducciones)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Neto a Pagar:</span>{" "}
                        <span className="font-bold text-blue-600">
                          {formatCurrency(detalle.neto_pagar)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
