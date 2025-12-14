"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tramo = { inicio: string; fin: string };

type Horario = {
  id: number;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas_trabajadas: number;
  tramos: Tramo[];
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
  tramos: Tramo[];
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

function mondayOf(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0 domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function diffHoras(inicio: string, fin: string) {
  const a = minutos(inicio);
  const b = minutos(fin);
  const mins = b >= a ? b - a : 24 * 60 - a + b;
  return Math.round((mins / 60) * 100) / 100;
}

function horasTramos(tramos: Tramo[]) {
  let total = 0;
  for (const t of tramos) {
    if (!t?.inicio || !t?.fin) continue;
    total += diffHoras(t.inicio, t.fin);
  }
  return Math.round(total * 100) / 100;
}

function buildDetalleMap(detalle?: { dia: number; horario_id: number | null }[]) {
  const map: Record<number, number | null> = {};
  DIAS.forEach((x) => (map[x.dia] = null));
  (detalle ?? []).forEach((x) => (map[x.dia] = x.horario_id ?? null));
  return map;
}

/**
 * Divide tramos que cruzan medianoche en 2:
 *  - fecha: inicio -> 00:00
 *  - fecha+1: 00:00 -> fin
 */
function splitTramosPorDia(fechaISO: string, tramos: Tramo[]) {
  const out: { fecha: string; tramo: Tramo }[] = [];
  const base = new Date(fechaISO + "T00:00:00");

  for (const t of tramos ?? []) {
    const a = t.inicio;
    const b = t.fin;
    if (!a || !b) continue;

    // No cruza
    if (b > a) {
      out.push({ fecha: fechaISO, tramo: { inicio: a, fin: b } });
      continue;
    }

    // Cruza medianoche
    out.push({ fecha: fechaISO, tramo: { inicio: a, fin: "00:00" } });

    const next = new Date(base);
    next.setDate(next.getDate() + 1);
    const nextISO = toISODate(next);

    out.push({ fecha: nextISO, tramo: { inicio: "00:00", fin: b } });
  }

  return out;
}

function normalizeTramos(value: any): Tramo[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x.inicio === "string" && typeof x.fin === "string")
    .map((x) => ({ inicio: x.inicio, fin: x.fin }));
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
  initialHorarios: any[];
  initialPatrones: Patron[];
  initialUsuarios: Usuario[];
}) {
  const horarios: Horario[] = useMemo(() => {
    return (initialHorarios ?? []).map((h: any) => ({
      id: h.id,
      nombre: h.nombre,
      hora_inicio: h.hora_inicio ?? null,
      hora_fin: h.hora_fin ?? null,
      horas_trabajadas: Number(h.horas_trabajadas ?? 0),
      tramos: normalizeTramos(h.tramos),
    }));
  }, [initialHorarios]);

  const [patrones] = useState<Patron[]>(initialPatrones);
  const [usuarios] = useState<Usuario[]>(initialUsuarios);

  const horariosById = useMemo(() => {
    const m = new Map<number, Horario>();
    horarios.forEach((h) => m.set(h.id, h));
    return m;
  }, [horarios]);

  const [weekPick, setWeekPick] = useState<string>(() => toISODate(new Date()));
  const weekStart = useMemo(() => mondayOf(weekPick), [weekPick]);
  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart]);
  const weekEndISO = useMemo(() => toISODate(addDays(weekStart, 6)), [weekStart]);

  const [selectedUserId, setSelectedUserId] = useState<string>(() => sessionUserId);

  const [selectedPatronId, setSelectedPatronId] = useState<number | "">("");
  const selectedPatron = useMemo(
    () => patrones.find((p) => p.id === selectedPatronId) ?? null,
    [patrones, selectedPatronId]
  );

  const uidActual = isAdmin ? selectedUserId : sessionUserId;

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [turnosSemana, setTurnosSemana] = useState<TurnoDia[]>([]);

  // Modal edición día
  const [editFecha, setEditFecha] = useState<string | null>(null);
  const [editHorarioId, setEditHorarioId] = useState<number | "">("");

  const totalHoras = useMemo(
    () => turnosSemana.reduce((acc, x) => acc + (Number(x.horas) || 0), 0),
    [turnosSemana]
  );

  const extras = useMemo(() => {
    if (!topeHorasSemanales || topeHorasSemanales <= 0) return 0;
    return Math.max(0, totalHoras - topeHorasSemanales);
  }, [totalHoras, topeHorasSemanales]);

  // Cargar semana desde DB (1 fila por día con tramos)
  const loadSemana = async () => {
    setMsg("");
    if (!uidActual) return;

    const { data, error } = await supabase
      .from("turnos")
      .select("fecha, horario_id, tramos, horas_trabajadas")
      .eq("usuario_id", uidActual)
      .gte("fecha", weekStartISO)
      .lte("fecha", weekEndISO)
      .order("fecha", { ascending: true });

    if (error) {
      setMsg("❌ Error cargando semana: " + error.message);
      return;
    }

    const map = new Map<string, any>();
    (data ?? []).forEach((t: any) => map.set(t.fecha, t));

    const rows: TurnoDia[] = DIAS.map((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const t = map.get(fecha);

      const hid = (t?.horario_id ?? null) as number | null;
      const h = hid ? horariosById.get(hid) : null;

      const tr = normalizeTramos(t?.tramos);
      const horas = Number(t?.horas_trabajadas ?? horasTramos(tr));

      return {
        fecha,
        horario_id: hid,
        nombre: h?.nombre ?? (horas > 0 ? "Asignado" : "Sin turno"),
        tramos: tr,
        horas,
      };
    });

    setTurnosSemana(rows);
  };

  useEffect(() => {
    loadSemana();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, weekEndISO, selectedUserId]);

  // Preview del patrón (sin guardar todavía) con splits de medianoche + merge a día siguiente
  useEffect(() => {
    if (!isAdmin) return;
    if (!selectedPatron) return;

    const detalleMap = buildDetalleMap(selectedPatron.patrones_turnos_detalle);

    // Map fecha -> { horario_id base, tramos[] }
    const m = new Map<string, { horario_id: number | null; tramos: Tramo[] }>();

    // Inicializa semana con vacío
    DIAS.forEach((_, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      m.set(fecha, { horario_id: null, tramos: [] });
    });

    // Aplica por día del patrón
    DIAS.forEach((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const horario_id = detalleMap[d.dia] ?? null;
      const h = horario_id ? horariosById.get(horario_id) : null;

      const baseTramos = h?.tramos?.length
        ? h.tramos
        : h?.hora_inicio && h?.hora_fin
        ? [{ inicio: h.hora_inicio, fin: h.hora_fin }]
        : [];

      const splitted = splitTramosPorDia(fecha, baseTramos);

      for (const s of splitted) {
        if (!m.has(s.fecha)) {
          // si cae en semana siguiente (domingo 23->lunes 00) lo ignoramos aquí
          continue;
        }
        const obj = m.get(s.fecha)!;
        obj.tramos.push(s.tramo);
        // horario_id: sólo conservamos el del día original si no cruza,
        // si se mezclan, lo dejamos null y el nombre será "Asignado"
        obj.horario_id = horario_id;
      }
    });

    const rows: TurnoDia[] = DIAS.map((_, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const obj = m.get(fecha)!;

      const horas = horasTramos(obj.tramos);
      const h = obj.horario_id ? horariosById.get(obj.horario_id) : null;

      return {
        fecha,
        horario_id: obj.horario_id,
        nombre: h?.nombre ?? (horas > 0 ? "Asignado" : "Sin turno"),
        tramos: obj.tramos,
        horas,
      };
    });

    setTurnosSemana(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatronId, weekStartISO]);

  // Guardar rotación (genera 1 fila por día con tramos)
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
      setMsg("❌ Este usuario está bloqueado.");
      return;
    }

    setSaving(true);

    // 1) upsert rotación
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

    // 2) borrar semana previa
    const { error: delErr } = await supabase
      .from("turnos")
      .delete()
      .eq("usuario_id", selectedUserId)
      .gte("fecha", weekStartISO)
      .lte("fecha", weekEndISO);

    if (delErr) {
      setSaving(false);
      setMsg("❌ Error limpiando turnos: " + delErr.message);
      return;
    }

    // 3) generar mapa fecha->tramos con split y merge
    const detalleMap = buildDetalleMap(selectedPatron?.patrones_turnos_detalle);

    const weekMap = new Map<string, { horario_id: number | null; tramos: Tramo[] }>();
    DIAS.forEach((_, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      weekMap.set(fecha, { horario_id: null, tramos: [] });
    });

    DIAS.forEach((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const horario_id = detalleMap[d.dia] ?? null;
      const h = horario_id ? horariosById.get(horario_id) : null;

      const baseTramos = h?.tramos?.length
        ? h.tramos
        : h?.hora_inicio && h?.hora_fin
        ? [{ inicio: h.hora_inicio, fin: h.hora_fin }]
        : [];

      const splitted = splitTramosPorDia(fecha, baseTramos);

      for (const s of splitted) {
        if (!weekMap.has(s.fecha)) continue; // cae fuera de esta semana
        const obj = weekMap.get(s.fecha)!;
        obj.tramos.push(s.tramo);

        // si se mezclan tramos por arrastre, dejar horario_id null para evitar nombre incorrecto
        if (s.fecha === fecha) obj.horario_id = horario_id;
        else obj.horario_id = null;
      }
    });

    // 4) insertar 7 filas (una por día)
    const rowsToInsert = DIAS.map((_, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const obj = weekMap.get(fecha)!;

      const tr = obj.tramos;
      const horas = horasTramos(tr);

      // compat: primer tramo como hora_inicio/hora_fin
      const first = tr[0] ?? null;

      return {
        usuario_id: selectedUserId,
        fecha,
        horario_id: obj.horario_id,
        tramos: tr,
        horas_trabajadas: horas,
        hora_inicio: first ? first.inicio : null,
        hora_fin: first ? first.fin : null,
      };
    });

    const { error: insErr } = await supabase.from("turnos").insert(rowsToInsert);

    setSaving(false);

    if (insErr) {
      setMsg("❌ Error insertando turnos: " + insErr.message);
      return;
    }

    setMsg(
      `✅ Rotación guardada (${weekStartISO} → ${weekEndISO}).` +
        (topeHorasSemanales > 0 && totalHoras > topeHorasSemanales ? ` ⚠️ Extras: ${extras}h.` : "")
    );

    await loadSemana();
  };

  // Abrir edición por día (admin)
  const abrirEditarDia = (t: TurnoDia) => {
    if (!isAdmin) return;
    setEditFecha(t.fecha);
    setEditHorarioId(t.horario_id ?? "");
    setMsg("");
  };

  // Guardar edición día (reemplaza tramos del día, y si cruza medianoche aplica arrastre al siguiente día)
  const guardarDia = async () => {
    if (!isAdmin) return;
    if (!editFecha) return;

    const horario_id = editHorarioId === "" ? null : Number(editHorarioId);
    const h = horario_id ? horariosById.get(horario_id) : null;

    const baseTramos = h?.tramos?.length
      ? h.tramos
      : h?.hora_inicio && h?.hora_fin
      ? [{ inicio: h.hora_inicio, fin: h.hora_fin }]
      : [];

    // split por día (puede devolver 2 fechas)
    const splitted = splitTramosPorDia(editFecha, baseTramos);

    // Para este día: tramos asignados que caen en editFecha
    const trHoy = splitted.filter((x) => x.fecha === editFecha).map((x) => x.tramo);
    const horasHoy = horasTramos(trHoy);
    const firstHoy = trHoy[0] ?? null;

    setSaving(true);

    // 1) upsert día actual
    const { error: e1 } = await supabase
      .from("turnos")
      .upsert(
        {
          usuario_id: uidActual,
          fecha: editFecha,
          horario_id,
          tramos: trHoy,
          horas_trabajadas: horasHoy,
          hora_inicio: firstHoy ? firstHoy.inicio : null,
          hora_fin: firstHoy ? firstHoy.fin : null,
        },
        { onConflict: "usuario_id,fecha" }
      );

    if (e1) {
      setSaving(false);
      setMsg("❌ Error guardando día: " + e1.message);
      return;
    }

    // 2) Si hay arrastre al día siguiente, lo MERGE con lo que ya tenga ese día
    const nextPart = splitted.find((x) => x.fecha !== editFecha);
    if (nextPart) {
      const nextFecha = nextPart.fecha;

      // Solo si el día siguiente está dentro de la misma semana visible, hacemos merge
      // (si está fuera, igual lo guardamos para consistencia)
      const { data: nextRow, error: e2r } = await supabase
        .from("turnos")
        .select("tramos")
        .eq("usuario_id", uidActual)
        .eq("fecha", nextFecha)
        .maybeSingle();

      if (e2r) {
        setSaving(false);
        setMsg("❌ Error leyendo día siguiente: " + e2r.message);
        return;
      }

      const existing = normalizeTramos((nextRow as any)?.tramos);
      const merged = [...existing, nextPart.tramo];

      const horasNext = horasTramos(merged);
      const firstNext = merged[0] ?? null;

      const { error: e2 } = await supabase
        .from("turnos")
        .upsert(
          {
            usuario_id: uidActual,
            fecha: nextFecha,
            horario_id: null, // ya está mezclado, evitamos "nombre" engañoso
            tramos: merged,
            horas_trabajadas: horasNext,
            hora_inicio: firstNext ? firstNext.inicio : null,
            hora_fin: firstNext ? firstNext.fin : null,
          },
          { onConflict: "usuario_id,fecha" }
        );

      if (e2) {
        setSaving(false);
        setMsg("❌ Error guardando arrastre al día siguiente: " + e2.message);
        return;
      }
    }

    setSaving(false);
    setMsg("✅ Día actualizado.");
    setEditFecha(null);
    setEditHorarioId("");
    await loadSemana();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Rotación</h1>
      </div>

      {msg && <div className="bg-white rounded-lg shadow p-3 text-sm">{msg}</div>}

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
              <div className="border rounded-md px-3 py-2 text-sm bg-gray-50">{sessionUserName}</div>
              <p className="text-xs text-gray-500 mt-1">Solo visualización.</p>
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

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-3">Vista semanal</h2>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {turnosSemana.map((t, idx) => {
            const label = DIAS[idx]?.label ?? "";
            const hasShift = (t.horas ?? 0) > 0;

            return (
              <button
                key={t.fecha}
                onClick={() => abrirEditarDia(t)}
                disabled={!isAdmin}
                className={`text-left rounded-lg border p-3 transition ${
                  hasShift ? "border-gray-200 hover:bg-gray-50" : "border-dashed border-gray-300 hover:bg-gray-50"
                } ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
                title={isAdmin ? "Click para editar este día" : ""}
              >
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-sm font-semibold">{t.fecha}</div>

                <div className="mt-2 text-sm">
                  {hasShift ? (
                    <>
                      <div className="font-medium text-gray-900">{t.nombre}</div>
                      <div className="text-xs text-gray-600">
                        {t.tramos.map((x, i) => (
                          <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 rounded bg-gray-100">
                            {x.inicio}–{x.fin}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs mt-1">
                        Horas: <b>{t.horas}</b>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-500">Sin turno</div>
                      <div className="text-xs mt-1">
                        Horas: <b>0</b>
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {extras > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
            ⚠️ Esta semana supera el tope. Extras estimadas: <b>{extras}h</b>.
          </div>
        )}
      </section>

      {/* Modal edición */}
      {isAdmin && editFecha && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
            <h3 className="text-lg font-bold mb-2">Editar día: {editFecha}</h3>

            <label className="block text-xs font-medium mb-1">Turno</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={editHorarioId}
              onChange={(e) => setEditHorarioId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— Sin turno —</option>
              {horarios.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre}{" "}
                  {h.tramos?.length
                    ? `(${h.tramos.map((t) => `${t.inicio}-${t.fin}`).join(" | ")})`
                    : ""}
                  {" - "}
                  {h.horas_trabajadas}h
                </option>
              ))}
            </select>

            <div className="mt-4 flex gap-2">
              <button
                onClick={guardarDia}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>

              <button
                onClick={() => {
                  setEditFecha(null);
                  setEditHorarioId("");
                }}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Nota: si el turno cruza medianoche (23:00–06:00), se dividirá y se
              agregará automáticamente el tramo 00:00–06:00 al día siguiente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
