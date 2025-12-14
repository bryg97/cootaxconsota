"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Horario = {
  id: number;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas_trabajadas: number;
};

type Patron = {
  id: number;
  nombre: string;
  patrones_turnos_detalle?: { dia: number; horario_id: number | null }[];
};

type Usuario = {
  id: string;
  nombre: string | null;
  email?: string | null;
  estado?: string | null;
  rol_nombre?: string | null;
};

type TurnoDia = {
  fecha: string; // YYYY-MM-DD
  horario_id: number | null;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas: number;
};

const DIAS = [
  { dia: 1, label: "Lunes" },
  { dia: 2, label: "Martes" },
  { dia: 3, label: "Miércoles" },
  { dia: 4, label: "Jueves" },
  { dia: 5, label: "Viernes" },
  { dia: 6, label: "Sábado" },
  { dia: 7, label: "Domingo" },
];

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Devuelve el lunes de la semana del dateStr
function mondayOf(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0 domingo, 1 lunes...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function buildDetalleMap(detalle?: { dia: number; horario_id: number | null }[]) {
  const map: Record<number, number | null> = {};
  DIAS.forEach((x) => (map[x.dia] = null));
  (detalle ?? []).forEach((x) => (map[x.dia] = x.horario_id ?? null));
  return map;
}

export default function RotacionClient({
  sessionUserId,
  sessionUserName,
  isAdmin,
  topeHorasSemanales,
  initialHorarios,
  initialPatrones,
  initialUsuarios,
}: {
  sessionUserId: string;
  sessionUserName: string;
  isAdmin: boolean;
  topeHorasSemanales: number;
  initialHorarios: Horario[];
  initialPatrones: Patron[];
  initialUsuarios: Usuario[];
}) {
  const [horarios] = useState<Horario[]>(initialHorarios);
  const [patrones] = useState<Patron[]>(initialPatrones);
  const [usuarios] = useState<Usuario[]>(initialUsuarios);

  // Semana seleccionada (por defecto: hoy)
  const [weekPick, setWeekPick] = useState<string>(() => {
    const today = new Date();
    return toISODate(today);
  });

  const weekStart = useMemo(() => mondayOf(weekPick), [weekPick]);
  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart]);
  const weekEndISO = useMemo(() => toISODate(addDays(weekStart, 6)), [weekStart]);

  // Admin: usuario seleccionado
  const [selectedUserId, setSelectedUserId] = useState<string>(() => sessionUserId);
  const selectedUser = useMemo(() => {
    if (!isAdmin) return { id: sessionUserId, nombre: sessionUserName } as any;
    return usuarios.find((u) => u.id === selectedUserId) ?? null;
  }, [isAdmin, usuarios, selectedUserId, sessionUserId, sessionUserName]);

  // Admin: patrón
  const [selectedPatronId, setSelectedPatronId] = useState<number | "">("");
  const selectedPatron = useMemo(
    () => patrones.find((p) => p.id === selectedPatronId) ?? null,
    [patrones, selectedPatronId]
  );

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Turnos de la semana (leídos desde DB o previsualizados desde patrón)
  const [turnosSemana, setTurnosSemana] = useState<TurnoDia[]>([]);

  const horariosById = useMemo(() => {
    const m = new Map<number, Horario>();
    horarios.forEach((h) => m.set(h.id, h));
    return m;
  }, [horarios]);

  // Previsualización por patrón (admin)
  const previewFromPatron = useMemo(() => {
    if (!selectedPatron) return null;
    const detalleMap = buildDetalleMap(selectedPatron.patrones_turnos_detalle);

    const rows: TurnoDia[] = DIAS.map((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const horario_id = detalleMap[d.dia] ?? null;
      const h = horario_id ? horariosById.get(horario_id) : null;

      return {
        fecha,
        horario_id,
        nombre: h?.nombre ?? "—",
        hora_inicio: h?.hora_inicio ?? null,
        hora_fin: h?.hora_fin ?? null,
        horas: Number(h?.horas_trabajadas ?? 0),
      };
    });

    return rows;
  }, [selectedPatron, weekStart, horariosById]);

  const totalHoras = useMemo(
    () => turnosSemana.reduce((acc, x) => acc + (Number(x.horas) || 0), 0),
    [turnosSemana]
  );

  const extras = useMemo(() => {
    if (!topeHorasSemanales || topeHorasSemanales <= 0) return 0;
    return Math.max(0, totalHoras - topeHorasSemanales);
  }, [totalHoras, topeHorasSemanales]);

  // Cargar turnos reales del usuario en esa semana
  const loadSemana = async () => {
    setMsg("");

    const uid = isAdmin ? selectedUserId : sessionUserId;
    if (!uid) return;

    const { data, error } = await supabase
      .from("turnos")
      .select("fecha, hora_inicio, hora_fin, horas_trabajadas")
      .eq("usuario_id", uid)
      .gte("fecha", weekStartISO)
      .lte("fecha", weekEndISO)
      .order("fecha", { ascending: true });

    if (error) {
      setMsg("❌ Error cargando semana: " + error.message);
      return;
    }

    // Normalizar a L-D
    const map = new Map<string, any>();
    (data ?? []).forEach((t: any) => map.set(t.fecha, t));

    const rows: TurnoDia[] = DIAS.map((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const t = map.get(fecha);

      return {
        fecha,
        horario_id: null, // no lo guardamos en turnos hoy; luego lo podemos agregar
        nombre: t ? "Asignado" : "—",
        hora_inicio: t?.hora_inicio ?? null,
        hora_fin: t?.hora_fin ?? null,
        horas: Number(t?.horas_trabajadas ?? 0),
      };
    });

    setTurnosSemana(rows);
  };

  // Cuando cambia semana/usuario, recargar
  useEffect(() => {
    loadSemana();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, weekEndISO, selectedUserId]);

  // Si admin elige patrón: mostrar preview (sin guardar) para esa semana
  useEffect(() => {
    if (!isAdmin) return;
    if (previewFromPatron) setTurnosSemana(previewFromPatron);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatronId, weekStartISO]);

  const guardarAsignacion = async () => {
    setMsg("");

    if (!isAdmin) return;

    if (!selectedUserId) {
      setMsg("❌ Selecciona un usuario.");
      return;
    }

    if (!selectedPatronId) {
      setMsg("❌ Selecciona un patrón.");
      return;
    }

    const u = usuarios.find((x) => x.id === selectedUserId);
    if (u?.estado === "bloqueado") {
      setMsg("❌ Este usuario está bloqueado. Desbloquéalo para asignar rotación.");
      return;
    }

    // Validación “suave”: si pasa el tope, igual deja guardar (tú decides)
    // Aquí solo avisamos:
    if (topeHorasSemanales > 0 && totalHoras > topeHorasSemanales) {
      // no bloqueamos, solo warning
    }

    setSaving(true);

    // 1) Guardar rotación (upsert por unique(usuario_id, semana_inicio))
    const { error: rotErr } = await supabase
      .from("rotaciones")
      .upsert(
        { usuario_id: selectedUserId, semana_inicio: weekStartISO, patron_id: selectedPatronId },
        { onConflict: "usuario_id,semana_inicio" }
      );

    if (rotErr) {
      setSaving(false);
      setMsg("❌ Error guardando rotación: " + rotErr.message);
      return;
    }

    // 2) Reemplazar turnos en tabla turnos para esa semana
    // (borramos semana y volvemos a insertar)
    const { error: delErr } = await supabase
      .from("turnos")
      .delete()
      .eq("usuario_id", selectedUserId)
      .gte("fecha", weekStartISO)
      .lte("fecha", weekEndISO);

    if (delErr) {
      setSaving(false);
      setMsg("❌ Error limpiando turnos de la semana: " + delErr.message);
      return;
    }

    // 3) Insertar turnos diarios desde preview (patrón)
    const detalleMap = buildDetalleMap(selectedPatron?.patrones_turnos_detalle);

    const rowsToInsert = DIAS.map((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const horario_id = detalleMap[d.dia] ?? null;
      const h = horario_id ? horariosById.get(horario_id) : null;

      // si el patrón no asigna turno ese día, guardamos 0 horas (y horas null)
      return {
        usuario_id: selectedUserId,
        fecha,
        hora_inicio: h?.hora_inicio ?? null,
        hora_fin: h?.hora_fin ?? null,
        horas_trabajadas: Number(h?.horas_trabajadas ?? 0),
      };
    });

    const { error: insErr } = await supabase.from("turnos").insert(rowsToInsert);

    setSaving(false);

    if (insErr) {
      setMsg("❌ Error insertando turnos: " + insErr.message);
      return;
    }

    setMsg(
      `✅ Rotación guardada para la semana ${weekStartISO} → ${weekEndISO}. ` +
        (topeHorasSemanales > 0 && totalHoras > topeHorasSemanales
          ? `⚠️ Pasa el tope (${totalHoras}h > ${topeHorasSemanales}h). Extras: ${extras}h.`
          : "")
    );

    // recargar desde DB
    await loadSemana();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Rotación</h1>
      </div>

      {msg && <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>}

      {/* Controles */}
      <section className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Semana (elige cualquier día)</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={weekPick}
              onChange={(e) => setWeekPick(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Semana: <b>{weekStartISO}</b> a <b>{weekEndISO}</b> (Lun–Dom)
            </p>
          </div>

          {isAdmin ? (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Operador</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre ?? u.email ?? u.id} {u.estado === "bloqueado" ? "(bloqueado)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedUser?.rol_nombre ? `Rol: ${selectedUser.rol_nombre}` : ""}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Patrón semanal</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedPatronId}
                  onChange={(e) => setSelectedPatronId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— Seleccionar —</option>
                  {patrones.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Operador</label>
              <div className="border rounded-md px-3 py-2 text-sm bg-gray-50">
                {sessionUserName}
              </div>
              <p className="text-xs text-gray-500 mt-1">Solo visualización (operador).</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            Total semana: <b>{totalHoras}h</b>{" "}
            {topeHorasSemanales > 0 && (
              <>
                | Tope: <b>{topeHorasSemanales}h</b> | Extras:{" "}
                <b className={extras > 0 ? "text-red-600" : ""}>{extras}h</b>
              </>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={guardarAsignacion}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar rotación"}
            </button>
          )}
        </div>
      </section>

      {/* Calendario semanal */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Vista semanal</h2>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {turnosSemana.map((t, idx) => {
            const label = DIAS[idx]?.label ?? "";
            const hasShift = (t.horas ?? 0) > 0;

            return (
              <div
                key={t.fecha}
                className={`rounded-lg border p-3 ${
                  hasShift ? "border-gray-200" : "border-dashed border-gray-300"
                }`}
              >
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-sm font-semibold">{t.fecha}</div>

                <div className="mt-2 text-sm">
                  {hasShift ? (
                    <>
                      <div className="font-medium text-gray-900">{t.nombre}</div>
                      <div className="text-xs text-gray-600">
                        {t.hora_inicio ?? "—"} – {t.hora_fin ?? "—"}
                      </div>
                      <div className="text-xs mt-1">
                        Horas: <b>{t.horas}</b>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Sin turno</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {extras > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
            ⚠️ Esta semana supera el tope. Extras estimadas: <b>{extras}h</b>.
            <div className="text-xs mt-1">
              (En el siguiente paso calculamos extras por franja: diurna/nocturna/festivo/dominical.)
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
