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

  const horariosById = useMemo(() => {
    const m = new Map<number, Horario>();
    horarios.forEach((h) => m.set(h.id, h));
    return m;
  }, [horarios]);

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [turnosSemana, setTurnosSemana] = useState<TurnoDia[]>([]);

  // Modal edición día
  const [editFecha, setEditFecha] = useState<string | null>(null);
  const [editHorarioId, setEditHorarioId] = useState<number | "">("");

  const previewFromPatron = useMemo(() => {
    if (!selectedPatron) return null;
    const detalleMap = buildDetalleMap(selectedPatron.patrones_turnos_detalle);

    return DIAS.map((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const horario_id = detalleMap[d.dia] ?? null;
      const h = horario_id ? horariosById.get(horario_id) : null;

      return {
        fecha,
        horario_id,
        nombre: h?.nombre ?? "Sin turno",
        hora_inicio: h?.hora_inicio ?? null,
        hora_fin: h?.hora_fin ?? null,
        horas: Number(h?.horas_trabajadas ?? 0),
      } as TurnoDia;
    });
  }, [selectedPatron, weekStart, horariosById]);

  const totalHoras = useMemo(
    () => turnosSemana.reduce((acc, x) => acc + (Number(x.horas) || 0), 0),
    [turnosSemana]
  );

  const extras = useMemo(() => {
    if (!topeHorasSemanales || topeHorasSemanales <= 0) return 0;
    return Math.max(0, totalHoras - topeHorasSemanales);
  }, [totalHoras, topeHorasSemanales]);

  const uidActual = isAdmin ? selectedUserId : sessionUserId;

  // Cargar semana desde DB
  const loadSemana = async () => {
    setMsg("");
    if (!uidActual) return;

    const { data, error } = await supabase
      .from("turnos")
      .select("fecha, horario_id, hora_inicio, hora_fin, horas_trabajadas")
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

      return {
        fecha,
        horario_id: hid,
        nombre: h?.nombre ?? (t ? "Asignado" : "Sin turno"),
        hora_inicio: t?.hora_inicio ?? null,
        hora_fin: t?.hora_fin ?? null,
        horas: Number(t?.horas_trabajadas ?? 0),
      };
    });

    setTurnosSemana(rows);
  };

  useEffect(() => {
    loadSemana();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO, weekEndISO, selectedUserId]);

  // Si admin selecciona patrón: preview
  useEffect(() => {
    if (!isAdmin) return;
    if (previewFromPatron) setTurnosSemana(previewFromPatron);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatronId, weekStartISO]);

  // Guardar rotación (genera los 7 días)
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

    // 2) borrar semana previa (para regenerar)
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

    // 3) insertar los 7 días
    const detalleMap = buildDetalleMap(selectedPatron?.patrones_turnos_detalle);

    const rowsToInsert = DIAS.map((d, idx) => {
      const fecha = toISODate(addDays(weekStart, idx));
      const horario_id = detalleMap[d.dia] ?? null;
      const h = horario_id ? horariosById.get(horario_id) : null;

      return {
        usuario_id: selectedUserId,
        fecha,
        horario_id,
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
      `✅ Rotación guardada (${weekStartISO} → ${weekEndISO}).` +
        (topeHorasSemanales > 0 && totalHoras > topeHorasSemanales
          ? ` ⚠️ Extras: ${extras}h.`
          : "")
    );

    await loadSemana();
  };

  // Abrir edición por día
  const abrirEditarDia = (t: TurnoDia) => {
    if (!isAdmin) return; // solo admin edita
    setEditFecha(t.fecha);
    setEditHorarioId(t.horario_id ?? "");
    setMsg("");
  };

  // Guardar edición de un día
  const guardarDia = async () => {
    if (!isAdmin) return;
    if (!editFecha) return;

    const horario_id = editHorarioId === "" ? null : Number(editHorarioId);
    const h = horario_id ? horariosById.get(horario_id) : null;

    setSaving(true);

    // upsert por (usuario_id, fecha) gracias al índice unique
    const { error } = await supabase
      .from("turnos")
      .upsert(
        {
          usuario_id: uidActual,
          fecha: editFecha,
          horario_id,
          hora_inicio: h?.hora_inicio ?? null,
          hora_fin: h?.hora_fin ?? null,
          horas_trabajadas: Number(h?.horas_trabajadas ?? 0),
        },
        { onConflict: "usuario_id,fecha" }
      );

    setSaving(false);

    if (error) {
      setMsg("❌ Error guardando día: " + error.message);
      return;
    }

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
              <div className="border rounded-md px-3 py-2 text-sm bg-gray-50">
                {sessionUserName}
              </div>
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
                className={`text-left rounded-lg border p-3 transition ${
                  hasShift ? "border-gray-200 hover:bg-gray-50" : "border-dashed border-gray-300 hover:bg-gray-50"
                } ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
                disabled={!isAdmin}
                title={isAdmin ? "Click para editar este día" : ""}
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
                    <>
                      <div className="text-sm text-gray-500">Sin turno</div>
                      <div className="text-xs mt-1">Horas: <b>0</b></div>
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
                  {h.nombre} {h.hora_inicio && h.hora_fin ? `(${h.hora_inicio}–${h.hora_fin})` : ""} - {h.horas_trabajadas}h
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
          </div>
        </div>
      )}
    </div>
  );
}
