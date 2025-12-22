"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
};

type Turno = {
  id: number;
  fecha: string;
  usuario_id: string;
  horario_id: number;
  usuarios: {
    id: string;
    nombre: string;
  };
  horarios: {
    id: number;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    horas_trabajadas: number;
    tramos: any;
  };
};

type Festivo = {
  fecha: string;
  descripcion: string;
};

type Props = {
  sessionUserId: string;
  sessionUserName: string;
  roleName: string;
  soloLectura: boolean;
  usuarios: Usuario[];
  turnos: Turno[];
  festivos: Festivo[];
};

function getNombreMes(mes: number) {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return meses[mes];
}

function getNombreDiaCompleto(dia: number) {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return dias[dia];
}

function getNombreDiaCorto(dia: number) {
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return dias[dia];
}

export default function CalendarioRotacionClient({
  sessionUserId,
  sessionUserName,
  roleName,
  soloLectura,
  usuarios,
  turnos,
  festivos,
}: Props) {
  const router = useRouter();
  const now = new Date();
  const mesActual = now.getMonth();
  const añoActual = now.getFullYear();
  const diaActual = now.getDate();

  // Crear mapa de turnos por fecha y usuario
  const turnosPorFechaUsuario = useMemo(() => {
    const mapa = new Map<string, Turno>();
    if (turnos && Array.isArray(turnos)) {
      turnos.forEach((t) => {
        if (t && t.fecha && t.usuario_id && t.horarios) {
          const key = `${t.fecha}-${t.usuario_id}`;
          mapa.set(key, t);
        }
      });
    }
    return mapa;
  }, [turnos]);

  // Crear set de festivos
  const festivosSet = useMemo(() => {
    const set = new Set<string>();
    if (festivos && Array.isArray(festivos)) {
      festivos.forEach((f) => {
        if (f && f.fecha) set.add(f.fecha);
      });
    }
    return set;
  }, [festivos]);

  // Crear mapa de descripciones de festivos
  const festivosDesc = useMemo(() => {
    const mapa = new Map<string, string>();
    if (festivos && Array.isArray(festivos)) {
      festivos.forEach((f) => {
        if (f && f.fecha && f.descripcion) {
          mapa.set(f.fecha, f.descripcion);
        }
      });
    }
    return mapa;
  }, [festivos]);

  // Calcular días del mes
  const primerDia = new Date(añoActual, mesActual, 1);
  const ultimoDia = new Date(añoActual, mesActual + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay();

  // Crear array de días
  const dias: number[] = [];
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push(i);
  }

  // Espacios vacíos antes del primer día
  const espaciosVacios = Array(primerDiaSemana).fill(null);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            📅 Calendario de Rotación - {roleName}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Turnos del equipo para {getNombreMes(mesActual)} {añoActual}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/rotacion")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ← Volver a Rotación
        </button>
      </div>

      {soloLectura && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4">
          <p className="text-sm font-medium">
            📋 Vista de solo lectura - Visualizando turnos del equipo {roleName}
          </p>
        </div>
      )}

      {/* Calendario por Usuario */}
      {usuarios.map((usuario) => (
        <div key={usuario.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          {/* Encabezado del Usuario */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              👤 {usuario.nombre}
              {usuario.id === sessionUserId && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Tú
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{usuario.email}</p>
          </div>

          {/* Encabezado días de la semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia, idx) => (
              <div
                key={idx}
                className={`text-center font-bold text-sm py-2 ${
                  idx === 0 ? "text-red-600" : "text-gray-700"
                }`}
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-2">
            {/* Espacios vacíos */}
            {espaciosVacios.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {/* Días reales */}
            {dias.map((dia) => {
              const fecha = new Date(añoActual, mesActual, dia);
              const fechaStr = fecha.toISOString().split("T")[0];
              const diaSemana = fecha.getDay();
              const nombreDia = getNombreDiaCompleto(diaSemana);
              const esDomingo = diaSemana === 0;
              const esFestivo = festivosSet.has(fechaStr);
              const esHoy = dia === diaActual;
              const descripcionFestivo = festivosDesc.get(fechaStr);

              const key = `${fechaStr}-${usuario.id}`;
              const turno = turnosPorFechaUsuario.get(key);

              // Identificar si es descanso obligatorio (prioridad: nombre con "descanso")
              const esTurnoDescanso = turno && 
                turno.horarios &&
                turno.horarios.nombre &&
                turno.horarios.nombre.toLowerCase().includes("descanso");

              // Días libres: turnos con 0h pero que NO son descanso obligatorio
              const esDiaLibre = turno && 
                turno.horarios &&
                turno.horarios.horas_trabajadas === 0 && 
                !esTurnoDescanso;

              let bgColor = "bg-gray-50 hover:bg-gray-100";
              let textColor = "text-gray-800";
              let borderColor = "border-gray-200";

              if (esHoy) {
                borderColor = "border-blue-500 border-2";
              }

              // Prioridad 1: Festivos en morado
              if (esFestivo) {
                bgColor = "bg-purple-100 hover:bg-purple-200";
                textColor = "text-purple-900";
              }
              // Prioridad 2: Descanso obligatorio en rojo (aunque sea 0h)
              else if (esTurnoDescanso) {
                bgColor = "bg-red-100 hover:bg-red-200";
                textColor = "text-red-800";
              }
              // Prioridad 3: Día libre (0h pero no es descanso) en amarillo
              else if (esDiaLibre) {
                bgColor = "bg-yellow-100 hover:bg-yellow-200";
                textColor = "text-yellow-900";
              }
              // Prioridad 4: Turno asignado con horas en verde
              else if (turno && turno.horarios && turno.horarios.horas_trabajadas > 0) {
                bgColor = "bg-green-100 hover:bg-green-200";
                textColor = "text-green-900";
              }
              // Prioridad 5: Domingo sin turno en rojo claro
              else if (esDomingo) {
                bgColor = "bg-red-50 hover:bg-red-100";
                textColor = "text-red-600";
              }

              return (
                <div
                  key={dia}
                  className={`border ${borderColor} ${bgColor} rounded-lg p-2 transition-all min-h-[100px] relative group`}
                >
                  <div className="flex flex-col h-full gap-1">
                    {/* Número del día y nombre del día */}
                    <div className="flex items-start justify-between">
                      <div className={`text-base font-bold ${textColor}`}>
                        {dia}
                      </div>
                      {esFestivo && (
                        <span className="text-purple-600 text-sm">🎉</span>
                      )}
                    </div>
                    
                    <div className={`text-[10px] font-semibold uppercase ${textColor} opacity-70`}>
                      {getNombreDiaCorto(diaSemana)}
                    </div>

                    {/* Festivo - Prioridad máxima */}
                    {esFestivo && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-[10px] font-bold text-purple-700 text-center leading-tight">
                          {descripcionFestivo}
                        </div>
                      </div>
                    )}

                    {/* Descanso obligatorio - Solo si tiene turno y no es festivo */}
                    {!esFestivo && esTurnoDescanso && turno && turno.horarios && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-xs font-bold text-red-600 text-center">
                          {turno.horarios.nombre || 'Descanso'}
                        </div>
                      </div>
                    )}

                    {/* Día libre (0h pero no descanso) - Solo si no es festivo ni descanso */}
                    {!esFestivo && !esTurnoDescanso && esDiaLibre && turno && turno.horarios && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-xs font-bold text-yellow-700 text-center leading-tight">
                          {turno.horarios.nombre || 'Día libre'}
                        </div>
                      </div>
                    )}

                    {/* Turno normal con horas - Solo si no es festivo, ni descanso, ni día libre */}
                    {!esFestivo && !esTurnoDescanso && !esDiaLibre && turno && turno.horarios && (
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="text-xs font-bold text-green-800 leading-tight mb-1">
                          {turno.horarios.nombre || 'Sin nombre'}
                        </div>
                        <div className="text-[11px] text-green-700 font-medium">
                          {turno.horarios.hora_inicio ? turno.horarios.hora_inicio.slice(0, 5) : '--:--'} - {turno.horarios.hora_fin ? turno.horarios.hora_fin.slice(0, 5) : '--:--'}
                        </div>
                        <div className="text-[11px] text-green-600 font-bold mt-1">
                          {turno.horarios.horas_trabajadas !== null && turno.horarios.horas_trabajadas !== undefined ? turno.horarios.horas_trabajadas : 0}h
                        </div>
                      </div>
                    )}

                    {/* Sin turno domingo */}
                    {!turno && esDomingo && !esFestivo && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-xs text-red-500 font-medium">
                          Descanso
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tooltip en hover */}
                  {turno && turno.horarios && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                      <div className="font-bold">{nombreDia} {dia}</div>
                      {esFestivo && descripcionFestivo && (
                        <div className="text-purple-300 font-semibold mt-1">{descripcionFestivo}</div>
                      )}
                      {turno.horarios && (
                        <>
                          <div className="font-semibold mt-1">{turno.horarios.nombre || 'Sin nombre'}</div>
                          <div className="text-gray-300">
                            {turno.horarios.hora_inicio ? turno.horarios.hora_inicio.slice(0, 5) : '--:--'} - {turno.horarios.hora_fin ? turno.horarios.hora_fin.slice(0, 5) : '--:--'}
                          </div>
                          <div className="text-green-300 font-bold">
                            {turno.horarios.horas_trabajadas || 0} horas
                          </div>
                        </>
                      )}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumen del usuario */}
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 font-medium">Turnos</div>
              <div className="text-lg font-bold text-green-600">
                {turnos.filter(t => 
                  t && t.usuario_id === usuario.id && 
                  t.horarios && t.horarios.nombre && 
                  !t.horarios.nombre.toLowerCase().includes("descanso")
                ).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 font-medium">Horas Total</div>
              <div className="text-lg font-bold text-blue-600">
                {turnos
                  .filter(t => t && t.usuario_id === usuario.id && t.horarios)
                  .reduce((sum, t) => sum + (t.horarios?.horas_trabajadas || 0), 0)}h
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 font-medium">Descansos</div>
              <div className="text-lg font-bold text-red-600">
                {turnos.filter(t => 
                  t && t.usuario_id === usuario.id && 
                  t.horarios && t.horarios.nombre && 
                  t.horarios.nombre.toLowerCase().includes("descanso")
                ).length}
              </div>
            </div>
          </div>
        </div>
      ))}

      {usuarios.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No hay usuarios en el rol {roleName}</p>
        </div>
      )}

      {/* Leyenda Global */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Leyenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-700 text-xs font-medium">Turno con horas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-700 text-xs font-medium">Descanso obligatorio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-700 text-xs font-medium">Día libre / Ausencia (0h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-100 border border-purple-300 rounded"></div>
            <span className="text-gray-700 text-xs font-medium">Festivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 rounded"></div>
            <span className="text-gray-700 text-xs font-medium">Hoy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
