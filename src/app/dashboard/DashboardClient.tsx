"use client";

import { useMemo } from "react";

type Turno = {
  fecha: string;
  horario_id: number;
  horarios: {
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    horas_trabajadas: number;
  };
};

type Festivo = {
  fecha: string;
  descripcion: string;
};

type Props = {
  userName: string;
  turnos: Turno[];
  festivos: Festivo[];
  tipoDescanso: string | null;
};

function getSaludo() {
  const hora = new Date().getHours();
  
  if (hora >= 5 && hora < 12) {
    return "Buenos días";
  } else if (hora >= 12 && hora < 19) {
    return "Buenas tardes";
  } else {
    return "Buenas noches";
  }
}

function getNombreMes(mes: number) {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return meses[mes];
}

function getNombreDia(dia: number) {
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return dias[dia];
}

export default function DashboardClient({ userName, turnos, festivos, tipoDescanso }: Props) {
  const saludo = getSaludo();
  const now = new Date();
  const mesActual = now.getMonth();
  const añoActual = now.getFullYear();
  const diaActual = now.getDate();

  // Crear mapa de turnos por fecha
  const turnosPorFecha = useMemo(() => {
    const mapa = new Map<string, Turno>();
    turnos.forEach((t) => mapa.set(t.fecha, t));
    return mapa;
  }, [turnos]);

  // Crear set de festivos
  const festivosSet = useMemo(() => {
    const set = new Set<string>();
    festivos.forEach((f) => set.add(f.fecha));
    return set;
  }, [festivos]);

  // Crear mapa de descripciones de festivos
  const festivosDesc = useMemo(() => {
    const mapa = new Map<string, string>();
    festivos.forEach((f) => mapa.set(f.fecha, f.descripcion));
    return mapa;
  }, [festivos]);

  // Calcular días del mes
  const primerDia = new Date(añoActual, mesActual, 1);
  const ultimoDia = new Date(añoActual, mesActual + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay(); // 0 = Domingo

  // Crear array de días
  const dias = [];
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push(i);
  }

  // Espacios vacíos antes del primer día
  const espaciosVacios = Array(primerDiaSemana).fill(null);

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          {saludo}, {userName}! 👋
        </h1>
        <p className="text-rose-100">
          Aquí está tu calendario del mes de {getNombreMes(mesActual)}
        </p>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {getNombreMes(mesActual)} {añoActual}
        </h2>

        {/* Encabezado días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia, idx) => (
            <div
              key={idx}
              className={`text-center font-semibold text-sm py-2 ${
                idx === 0 ? "text-red-600" : "text-gray-600"
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
            const esDomingo = diaSemana === 0;
            const esFestivo = festivosSet.has(fechaStr);
            const esHoy = dia === diaActual;
            const turno = turnosPorFecha.get(fechaStr);
            const descripcionFestivo = festivosDesc.get(fechaStr);
            const esDescansoObligatorio = 
              (tipoDescanso === "fijo_domingo" && esDomingo) ||
              (tipoDescanso === "aleatorio" && !turno && esDomingo);

            let bgColor = "bg-gray-50 hover:bg-gray-100";
            let textColor = "text-gray-800";
            let borderColor = "border-gray-200";

            if (esHoy) {
              borderColor = "border-blue-500 border-2";
            }

            // Festivos SIEMPRE morados (prioridad máxima)
            if (esFestivo) {
              bgColor = "bg-purple-100 hover:bg-purple-200";
              textColor = "text-purple-800";
            }
            // Descanso obligatorio en rojo
            else if (esDescansoObligatorio) {
              bgColor = "bg-red-50 hover:bg-red-100";
              textColor = "text-red-700";
            }
            // Turno asignado en verde
            else if (turno) {
              bgColor = "bg-green-100 hover:bg-green-200";
              textColor = "text-green-800";
            }
            // Domingo sin turno (pero no es descanso obligatorio)
            else if (esDomingo) {
              bgColor = "bg-red-50 hover:bg-red-100";
              textColor = "text-red-700";
            }

            return (
              <div
                key={dia}
                className={`aspect-square border ${borderColor} ${bgColor} rounded-lg p-2 transition-all cursor-pointer relative group`}
                title={
                  esFestivo
                    ? descripcionFestivo || "Festivo"
                    : turno
                    ? `${turno.horarios.nombre} (${turno.horarios.hora_inicio} - ${turno.horarios.hora_fin})`
                    : esDomingo
                    ? "Domingo"
                    : ""
                }
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm font-semibold ${textColor} mb-1`}>
                    {dia}
                  </div>
                  
                  {turno && (
                    <div className="text-[10px] leading-tight text-green-700 font-medium">
                      {turno.horarios.nombre}
                    </div>
                  )}

                  {esFestivo && (
                    <div className="absolute top-1 right-1">
                      <span className="text-purple-500 text-xs">🎉</span>
                    </div>
                  )}

                  {esDescansoObligatorio && (
                    <div className="text-[10px] text-red-500 font-medium">
                      Descanso
                    </div>
                  )}
                </div>

                {/* Tooltip en hover */}
                {(turno || esFestivo) && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    {esFestivo && (
                      <div className="font-semibold">{descripcionFestivo}</div>
                    )}
                    {turno && (
                      <>
                        <div className="font-semibold">{turno.horarios.nombre}</div>
                        <div className="text-gray-300">
                          {turno.horarios.hora_inicio} - {turno.horarios.hora_fin}
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

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span className="text-gray-600">Con turno asignado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span className="text-gray-600">Descanso obligatorio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
            <span className="text-gray-600">Festivo (prioridad sobre turno)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Turnos este mes</div>
          <div className="text-3xl font-bold text-green-600">{turnos.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Festivos</div>
          <div className="text-3xl font-bold text-purple-600">{festivos.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Días del mes</div>
          <div className="text-3xl font-bold text-blue-600">{diasEnMes}</div>
        </div>
      </div>
    </div>
  );
}
