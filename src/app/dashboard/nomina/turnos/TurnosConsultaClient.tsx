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
  tramos?: any[];
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
    tramos?: any[];
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

// Función para calcular horas nocturnas de un turno
function calcularHorasNocturnas(tramos: any[]): number {
  if (!tramos || !Array.isArray(tramos)) return 0;
  
  let horasNocturnas = 0;
  
  tramos.forEach((tramo) => {
    const inicio = tramo.inicio || "";
    const fin = tramo.fin || "";
    
    const [hIni, mIni] = inicio.split(":").map(Number);
    const [hFin, mFin] = fin.split(":").map(Number);
    
    if (isNaN(hIni) || isNaN(mIni) || isNaN(hFin) || isNaN(mFin)) return;
    
    const minIni = hIni * 60 + mIni;
    let minFin = hFin * 60 + mFin;
    
    // Si cruza medianoche
    if (minFin < minIni) minFin += 24 * 60;
    
    // Horario nocturno: 22:00 (1320 min) hasta 06:00 (360 min del día siguiente)
    const nocheInicio = 22 * 60; // 1320
    const nocheFin = 6 * 60; // 360
    
    // Calcular intersección con horario nocturno
    if (minIni >= nocheInicio || minFin <= nocheFin) {
      horasNocturnas += (minFin - minIni) / 60;
    } else if (minIni < nocheInicio && minFin > nocheInicio) {
      horasNocturnas += (minFin - nocheInicio) / 60;
    } else if (minIni < nocheFin && minFin > nocheFin) {
      horasNocturnas += (nocheFin - minIni) / 60;
    }
  });
  
  return horasNocturnas;
}

// Verificar si una fecha es domingo
function esDomingo(fecha: string): boolean {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() === 0;
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
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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
          <div className="space-y-3">
            {Object.values(turnosPorUsuario).map((grupo) => {
              const isExpanded = expandedUser === grupo.usuario?.email;
              
              // Ordenar turnos por fecha DESC
              const turnosOrdenados = [...grupo.turnos].sort((a, b) => 
                b.fecha.localeCompare(a.fecha)
              );
              
              return (
                <div key={grupo.usuario?.email} className="border rounded-lg overflow-hidden">
                  {/* Header expandible */}
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : grupo.usuario?.email || null)}
                    className="w-full bg-gray-50 hover:bg-gray-100 transition-colors p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{grupo.usuario?.nombre}</h3>
                        <p className="text-sm text-gray-600">{grupo.usuario?.email}</p>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {grupo.turnos.length} turnos
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {grupo.totalHoras.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Contenido expandible */}
                  {isExpanded && (
                    <div className="p-4 space-y-2">
                      {turnosOrdenados.map((turno) => {
                        const horasNocturnas = calcularHorasNocturnas(turno.horario?.tramos || []);
                        const isDomingo = esDomingo(turno.fecha);
                        const tieneRecargos = horasNocturnas > 0 || isDomingo;
                        
                        return (
                          <div
                            key={turno.id}
                            className={`border rounded-lg p-3 ${tieneRecargos ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900">
                                    {formatDate(turno.fecha)}
                                  </span>
                                  {isDomingo && (
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                      Domingo
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {turno.horario?.nombre || "N/A"}
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="font-bold text-lg text-gray-900">
                                  {turno.horario?.horas_trabajadas || 0}h
                                </div>
                                {tieneRecargos && (
                                  <div className="flex flex-col gap-1 mt-1">
                                    {horasNocturnas > 0 && (
                                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                        🌙 {horasNocturnas.toFixed(1)}h nocturnas
                                      </span>
                                    )}
                                    {isDomingo && (
                                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                        📅 Dominical
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
