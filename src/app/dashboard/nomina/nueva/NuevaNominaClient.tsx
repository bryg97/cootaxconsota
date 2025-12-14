"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Config = {
  horas_mensuales?: number;
  horas_semanales?: number;
  auxilio_transporte?: number;
  fondo_solidario?: number;
};

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  salario_base: number;
  tipo_descanso: string;
  roles: { nombre: string };
};

type Horario = {
  id: number;
  nombre: string;
  tramos: any[];
  horas_trabajadas: number;
};

type Festivo = {
  fecha: string;
};

type PatronSemanal = {
  id: number;
  lunes: number | null;
  martes: number | null;
  miercoles: number | null;
  jueves: number | null;
  viernes: number | null;
  sabado: number | null;
  domingo: number | null;
};

type Props = {
  config: Config;
  usuarios: Usuario[];
  horarios: Horario[];
  festivos: Festivo[];
  patrones: PatronSemanal[];
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function NuevaNominaClient({
  config,
  usuarios,
  horarios,
  festivos,
  patrones,
}: Props) {
  const router = useRouter();
  
  const [tipo, setTipo] = useState<"quincenal" | "mensual">("quincenal");
  const [periodo, setPeriodo] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  const [fechaInicio, setFechaInicio] = useState(isoDate(new Date()));
  const [fechaFin, setFechaFin] = useState(isoDate(new Date()));
  
  const [procesando, setProcesando] = useState(false);
  const [msg, setMsg] = useState("");

  const horasMensuales = config.horas_mensuales || 240;
  const auxilioTransporte = config.auxilio_transporte || 0;
  const fondoSolidario = config.fondo_solidario || 0;

  const festivosSet = useMemo(
    () => new Set(festivos.map((f) => f.fecha)),
    [festivos]
  );

  // Función para detectar si un tramo es nocturno (22:00-06:00)
  const calcularHorasNocturnas = (tramos: any[]) => {
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
      const nocheFin = 6 * 60; // 360 (del siguiente día)
      
      // Caso 1: Todo el tramo es nocturno (22:00-06:00)
      if (minIni >= nocheInicio || minFin <= nocheFin) {
        horasNocturnas += (minFin - minIni) / 60;
      }
      // Caso 2: El tramo cruza 22:00 (ej: 20:00-23:00)
      else if (minIni < nocheInicio && minFin > nocheInicio) {
        horasNocturnas += (minFin - nocheInicio) / 60;
      }
      // Caso 3: El tramo cruza 06:00 (ej: 04:00-08:00)
      else if (minIni < nocheFin && minFin > nocheFin) {
        horasNocturnas += (nocheFin - minIni) / 60;
      }
    });
    
    return horasNocturnas;
  };

  const horarioById = useMemo(() => {
    const map = new Map<number, Horario>();
    horarios.forEach((h) => map.set(h.id, h));
    return map;
  }, [horarios]);

  const [turnosPorUsuario, setTurnosPorUsuario] = useState<Record<string, any[]>>({});
  const [cargandoTurnos, setCargandoTurnos] = useState(false);

  // Cargar turnos del periodo
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    (async () => {
      setCargandoTurnos(true);
      const { data: turnos } = await supabase
        .from("turnos")
        .select("usuario_id, fecha, horario_id")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

      const porUsuario: Record<string, any[]> = {};
      (turnos || []).forEach((t) => {
        if (!porUsuario[t.usuario_id]) porUsuario[t.usuario_id] = [];
        porUsuario[t.usuario_id].push(t);
      });

      setTurnosPorUsuario(porUsuario);
      setCargandoTurnos(false);
    })();
  }, [fechaInicio, fechaFin]);

  // Calcular nómina para cada usuario
  const nominaCalculada = useMemo(() => {
    return usuarios.map((u) => {
      const salarioBase = u.salario_base || 0;
      const salarioPeriodo = tipo === "quincenal" ? salarioBase / 2 : salarioBase;
      const auxilioPeriodo = tipo === "quincenal" ? auxilioTransporte / 2 : auxilioTransporte;
      const fondoPeriodo = tipo === "quincenal" ? fondoSolidario / 2 : fondoSolidario;
      const valorHora = salarioBase / horasMensuales;
      const valorDia = salarioBase / 30;

      const turnosUsuario = turnosPorUsuario[u.id] || [];
      
      // Agrupar turnos por semana
      const turnosPorSemana: Record<string, any[]> = {};
      turnosUsuario.forEach((turno) => {
        const fecha = new Date(turno.fecha + "T00:00:00");
        const lunes = new Date(fecha);
        lunes.setDate(fecha.getDate() - fecha.getDay() + (fecha.getDay() === 0 ? -6 : 1));
        const semanaKey = lunes.toISOString().slice(0, 10);
        if (!turnosPorSemana[semanaKey]) turnosPorSemana[semanaKey] = [];
        turnosPorSemana[semanaKey].push(turno);
      });

      let horasTrabajadas = 0;
      let horasExtras = 0;
      let horasRecargoNocturno = 0;
      let horasRecargoFestivo = 0;
      let horasRecargoDominical = 0;
      let diasAdicionalesDescanso = 0;

      const horasSemanales = config.horas_semanales || 48;

      // Procesar cada semana individualmente
      Object.entries(turnosPorSemana).forEach(([semanaKey, turnosSemana]) => {
        // Determinar día de descanso obligatorio
        let diaDescansoObligatorio = 0; // 0 = domingo
        
        if (u.tipo_descanso === "aleatorio") {
          // Buscar en patrones semanales el día de descanso
          // Por simplicidad, tomamos el primer patrón (puedes mejorar esto)
          const patron = patrones[0];
          if (patron) {
            const diasPatron = [
              patron.domingo,
              patron.lunes,
              patron.martes,
              patron.miercoles,
              patron.jueves,
              patron.viernes,
              patron.sabado,
            ];
            // Buscar el primer día sin turno asignado (null) como descanso
            const indiceDescanso = diasPatron.findIndex((h) => h === null);
            if (indiceDescanso !== -1) {
              diaDescansoObligatorio = indiceDescanso;
            }
          }
        } else {
          // fijo_domingo
          diaDescansoObligatorio = 0;
        }

        // Verificar si tuvo descanso en la semana
        const fechasSemana = turnosSemana.map((t) => t.fecha);
        const diasConTurno = new Set(
          fechasSemana.map((f) => new Date(f + "T00:00:00").getDay())
        );
        
        const tuvoDescansoObligatorio = !diasConTurno.has(diaDescansoObligatorio);
        
        // Calcular horas de la semana
        let horasSemana = 0;
        let horasExtrasSemana = 0;
        
        turnosSemana.forEach((turno) => {
          const horario = horarioById.get(turno.horario_id);
          if (!horario) return;

          const fecha = turno.fecha;
          const esFestivo = festivosSet.has(fecha);
          const diaNumero = new Date(fecha + "T00:00:00").getDay();
          const esDiaDescanso = diaNumero === diaDescansoObligatorio;
          
          const horasTurno = horario.horas_trabajadas || 0;
          const horasNocturnasTurno = calcularHorasNocturnas(horario.tramos || []);

          // Si trabajó en día de descanso obligatorio, se trata como festivo
          if (esDiaDescanso) {
            horasRecargoFestivo += horasTurno;
            horasSemana += horasTurno;
          } else if (esFestivo) {
            horasRecargoFestivo += horasTurno;
            horasSemana += horasTurno;
          } else if (diaNumero === 0) { // Domingo pero no es día de descanso obligatorio
            horasRecargoDominical += horasTurno;
            horasSemana += horasTurno;
          } else if (horasNocturnasTurno > 0) {
            horasRecargoNocturno += horasNocturnasTurno;
            horasSemana += horasTurno;
          } else {
            horasSemana += horasTurno;
          }
        });

        // Calcular extras de la semana
        if (horasSemana > horasSemanales) {
          horasExtrasSemana = horasSemana - horasSemanales;
          horasExtras += horasExtrasSemana;
        }

        horasTrabajadas += horasSemana;

        // Si no tuvo descanso obligatorio, pagar un día adicional
        if (!tuvoDescansoObligatorio && turnosSemana.length >= 6) {
          diasAdicionalesDescanso += 1;
        }
      });

      // Calcular valores monetarios
      const valorHorasExtras = horasExtras * valorHora * 1.25;
      const valorRecargoNocturno = horasRecargoNocturno * valorHora * 0.35;
      const valorRecargoFestivo = horasRecargoFestivo * valorHora * 0.75;
      const valorRecargoDominical = horasRecargoDominical * valorHora * 0.75;
      const valorDiasAdicionales = diasAdicionalesDescanso * valorDia;

      const totalRecargos =
        valorRecargoNocturno + valorRecargoFestivo + valorRecargoDominical;

      const totalDevengado =
        salarioPeriodo + auxilioPeriodo + valorHorasExtras + totalRecargos + valorDiasAdicionales;

      // Deducciones: 4% salud + 4% pensión
      // Base: salario + extras + recargos + días adicionales (NO incluye auxilio)
      const baseDeduccion = salarioPeriodo + valorHorasExtras + totalRecargos + valorDiasAdicionales;
      const deduccionSalud = baseDeduccion * 0.04;
      const deduccionPension = baseDeduccion * 0.04;
      const deduccionFondo = fondoPeriodo;

      const totalDeducciones =
        deduccionSalud + deduccionPension + deduccionFondo;

      const netoPagar = totalDevengado - totalDeducciones;

      return {
        usuario_id: u.id,
        nombre: u.nombre,
        salario_base: salarioPeriodo,
        auxilio_transporte: auxilioPeriodo,
        horas_trabajadas: horasTrabajadas,
        horas_extras: horasExtras,
        valor_horas_extras: valorHorasExtras,
        horas_recargo_nocturno: horasRecargoNocturno,
        valor_recargo_nocturno: valorRecargoNocturno,
        horas_recargo_festivo: horasRecargoFestivo,
        valor_recargo_festivo: valorRecargoFestivo,
        horas_recargo_dominical: horasRecargoDominical,
        valor_recargo_dominical: valorRecargoDominical,
        dias_adicionales_descanso: diasAdicionalesDescanso,
        valor_dias_adicionales: valorDiasAdicionales,
        total_recargos: totalRecargos,
        total_devengado: totalDevengado,
        deduccion_salud: deduccionSalud,
        deduccion_pension: deduccionPension,
        deduccion_fondo_solidario: deduccionFondo,
        total_deducciones: totalDeducciones,
        neto_pagar: netoPagar,
      };
    });
  }, [usuarios, tipo, auxilioTransporte, fondoSolidario, horasMensuales, config.horas_semanales, fechaInicio, fechaFin, festivosSet, turnosPorUsuario, horarioById, patrones]);

  const totales = useMemo(() => {
    return nominaCalculada.reduce(
      (acc, n) => ({
        devengado: acc.devengado + n.total_devengado,
        deducciones: acc.deducciones + n.total_deducciones,
        neto: acc.neto + n.neto_pagar,
      }),
      { devengado: 0, deducciones: 0, neto: 0 }
    );
  }, [nominaCalculada]);

  const procesarNomina = async () => {
    if (!periodo || !fechaInicio || !fechaFin) {
      setMsg("❌ Completa todos los campos");
      return;
    }

    setProcesando(true);
    setMsg("");

    try {
      // 1. Crear la nómina (cabecera)
      const { data: nominaData, error: nominaError } = await supabase
        .from("nominas")
        .insert({
          periodo: tipo === "quincenal" ? `${periodo}-Q1` : periodo,
          tipo,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado: "procesada",
          total_devengado: totales.devengado,
          total_deducciones: totales.deducciones,
          total_neto: totales.neto,
          procesada_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (nominaError) throw new Error(nominaError.message);

      const nominaId = nominaData.id;

      // 2. Insertar detalles por empleado
      const detalles = nominaCalculada.map((n) => ({
        nomina_id: nominaId,
        ...n,
      }));

      const { error: detalleError } = await supabase
        .from("nominas_detalle")
        .insert(detalles);

      if (detalleError) throw new Error(detalleError.message);

      setMsg("✅ Nómina procesada correctamente");
      
      setTimeout(() => {
        router.push("/dashboard/nomina");
      }, 2000);
    } catch (e: any) {
      setMsg(`❌ Error: ${e.message}`);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nueva Nómina</h1>
        <button
          onClick={() => router.push("/dashboard/nomina")}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Volver
        </button>
      </div>

      {msg && (
        <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>
      )}

      {/* Configuración del periodo */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Configuración del periodo</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Tipo</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "quincenal" | "mensual")}
            >
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Periodo (Mes)</label>
            <input
              type="month"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Fecha inicio</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Fecha fin</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium">Información:</p>
          <ul className="list-disc list-inside text-xs mt-1 space-y-1">
            <li>Los meses se calculan en base a 30 días</li>
            <li>Salario quincenal = Salario base / 2</li>
            <li>Auxilio de transporte: {formatCurrency(tipo === "quincenal" ? auxilioTransporte / 2 : auxilioTransporte)}</li>
            <li>Fondo solidario: {formatCurrency(tipo === "quincenal" ? fondoSolidario / 2 : fondoSolidario)}</li>
            <li>Deducciones: 4% salud + 4% pensión (sobre salario + extras, NO auxilio)</li>
          </ul>
        </div>
      </section>

      {/* Resumen de totales */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Devengado</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totales.devengado)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {nominaCalculada.length} empleados
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Deducciones</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totales.deducciones)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Neto a Pagar</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(totales.neto)}
          </div>
        </div>
      </section>

      {/* Detalle por empleado */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Detalle por empleado</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-2 py-2 text-left">Empleado</th>
                <th className="px-2 py-2 text-right">Salario Base</th>
                <th className="px-2 py-2 text-right">Auxilio</th>
                <th className="px-2 py-2 text-right">H. Extras</th>
                <th className="px-2 py-2 text-right">Recargos</th>
                <th className="px-2 py-2 text-right">Días Adic.</th>
                <th className="px-2 py-2 text-right">Total Dev.</th>
                <th className="px-2 py-2 text-right">Deducciones</th>
                <th className="px-2 py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {nominaCalculada.map((n) => (
                <tr key={n.usuario_id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2 font-medium">{n.nombre}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(n.salario_base)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(n.auxilio_transporte)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(n.valor_horas_extras)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(n.total_recargos)}</td>
                  <td className="px-2 py-2 text-right">
                    {n.dias_adicionales_descanso > 0 ? (
                      <span className="text-orange-600" title={`${n.dias_adicionales_descanso} días adicionales por descanso no tomado`}>
                        {formatCurrency(n.valor_dias_adicionales)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-green-600">
                    {formatCurrency(n.total_devengado)}
                  </td>
                  <td className="px-2 py-2 text-right text-red-600">
                    {formatCurrency(n.total_deducciones)}
                  </td>
                  <td className="px-2 py-2 text-right font-bold text-blue-600">
                    {formatCurrency(n.neto_pagar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Botón procesar */}
      <div className="flex justify-end">
        <button
          onClick={procesarNomina}
          disabled={procesando || cargandoTurnos}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-3 rounded-md disabled:opacity-50"
        >
          {cargandoTurnos ? "Cargando turnos..." : procesando ? "Procesando..." : "Procesar Nómina"}
        </button>
      </div>
    </div>
  );
}
