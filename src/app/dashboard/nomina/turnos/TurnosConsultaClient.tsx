"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
};

type Horario = {
  id: number;
  nombre: string;
  horas_trabajadas: number;
};

type Turno = {
  id: number;
  usuario_id: string;
  fecha: string;
  horario_id: number;
  created_at: string;
  usuario?: {
    nombre: string;
    email: string;
  };
  horario?: {
    nombre: string;
    horas_trabajadas: number;
  };
};

type Props = {
  isAdmin: boolean;
  usuarios: Usuario[];
  horarios: Horario[];
  sessionUserId: string;
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function TurnosConsultaClient({
  isAdmin,
  usuarios,
  horarios,
  sessionUserId,
}: Props) {
  const router = useRouter();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primer día del mes
    return date.toISOString().slice(0, 10);
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const date = new Date();
    return date.toISOString().slice(0, 10);
  });
  const [usuarioId, setUsuarioId] = useState(isAdmin ? "" : sessionUserId);
  const [horarioId, setHorarioId] = useState("");

  // Estadísticas
  const [stats, setStats] = useState({
    totalTurnos: 0,
    totalHoras: 0,
    promedioHoras: 0,
  });

  const cargarTurnos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("turnos")
        .select(`
          *,
          usuario:usuarios(nombre, email),
          horario:horarios(nombre, horas_trabajadas)
        `)
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)
        .order("fecha", { ascending: false });

      if (usuarioId) {
        query = query.eq("usuario_id", usuarioId);
      }

      if (horarioId) {
        query = query.eq("horario_id", parseInt(horarioId));
      }

      const { data, error } = await query;

      if (error) throw error;

      setTurnos(data || []);

      // Calcular estadísticas
      const totalHoras = (data || []).reduce(
        (sum, t) => sum + (t.horario?.horas_trabajadas || 0),
        0
      );
      setStats({
        totalTurnos: data?.length || 0,
        totalHoras,
        promedioHoras: data?.length ? totalHoras / data.length : 0,
      });
    } catch (error: any) {
      console.error("Error cargando turnos:", error);
      alert("Error al cargar turnos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTurnos();
  }, [fechaInicio, fechaFin, usuarioId, horarioId]);

  // Agrupar turnos por usuario
  const turnosPorUsuario = turnos.reduce((acc, turno) => {
    const userId = turno.usuario_id;
    if (!acc[userId]) {
      acc[userId] = {
        usuario: turno.usuario,
        turnos: [],
        totalHoras: 0,
      };
    }
    acc[userId].turnos.push(turno);
    acc[userId].totalHoras += turno.horario?.horas_trabajadas || 0;
    return acc;
  }, {} as Record<string, { usuario: any; turnos: Turno[]; totalHoras: number }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Consulta de Turnos</h1>
        <button
          onClick={() => router.push("/dashboard/nomina")}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Volver a nóminas
        </button>
      </div>

      {/* Filtros */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          {isAdmin && (
            <div>
              <label className="block text-xs font-medium mb-1">Usuario</label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Horario</label>
            <select
              value={horarioId}
              onChange={(e) => setHorarioId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {horarios.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre} ({h.horas_trabajadas}h)
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Turnos</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalTurnos}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Horas</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.totalHoras.toFixed(2)}h
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Promedio Horas/Turno</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.promedioHoras.toFixed(2)}h
          </div>
        </div>
      </section>

      {/* Turnos agrupados por usuario */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Turnos por Usuario ({Object.keys(turnosPorUsuario).length} usuarios)
        </h2>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : Object.keys(turnosPorUsuario).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay turnos en el rango de fechas seleccionado
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(turnosPorUsuario).map((grupo) => (
              <div key={grupo.usuario?.nombre} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{grupo.usuario?.nombre}</h3>
                    <p className="text-sm text-gray-600">{grupo.usuario?.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Horas</div>
                    <div className="text-xl font-bold text-green-600">
                      {grupo.totalHoras.toFixed(2)}h
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Horario</th>
                        <th className="px-3 py-2 text-right">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.turnos.map((turno) => (
                        <tr key={turno.id} className="border-b">
                          <td className="px-3 py-2">{formatDate(turno.fecha)}</td>
                          <td className="px-3 py-2">{turno.horario?.nombre || "N/A"}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {turno.horario?.horas_trabajadas || 0}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
