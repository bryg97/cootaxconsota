"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tramo = { inicio: string; fin: string };

type Usuario = {
  id: string;
  nombre: string | null;
  rol: string | null;
};

type Horario = {
  id: number;
  nombre: string;
  tramos: Tramo[] | null;
  horas_trabajadas: number | null;
};

type Patron = {
  id: number;
  nombre: string;
  // tu patrón debe guardar por día algo como:
  // { lunes: horario_id, martes: horario_id, ... } ó similar
  // aquí lo tratamos genérico:
  dias: any;
};

type Config = {
  horas_semanales: number | null;
};

function toHHMM(v: string) {
  return v?.slice(0, 5) ?? "";
}

function minutes(hhmm: string) {
  const [h, m] = toHHMM(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function diffHoras(inicio: string, fin: string) {
  const a = minutes(inicio);
  const b = minutes(fin);
  const mins = b >= a ? b - a : 24 * 60 - a + b;
  return Math.round((mins / 60) * 100) / 100;
}

function sanitizeTramos(input: any): Tramo[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(Boolean)
    .map((t) => ({
      inicio: toHHMM(String(t?.inicio ?? "")),
      fin: toHHMM(String(t?.fin ?? "")),
    }))
    .filter((t) => t.inicio && t.fin);
}

function sumHorasTramos(tramos: Tramo[]) {
  return tramos.reduce((acc, t) => acc + diffHoras(t.inicio, t.fin), 0);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateISO: string, delta: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

function startOfWeekMonday(anyDateISO: string) {
  const d = new Date(anyDateISO + "T00:00:00");
  const day = d.getDay(); // 0 dom, 1 lun...
  const diff = (day === 0 ? -6 : 1 - day); // lunes
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

/**
 * Parte un tramo si cruza medianoche, devolviendo segmentos con fecha.
 * Ej:
 * 2026-01-18 (domingo) + 22:00–06:00 =>
 *   [{fecha: 2026-01-18, 22:00–00:00}, {fecha: 2026-01-19, 00:00–06:00}]
 */
function splitTramoByMidnight(fechaISO: string, tramo: Tramo) {
  const a = minutes(tramo.inicio);
  const b = minutes(tramo.fin);

  if (b >= a) {
    return [{ fecha: fechaISO, inicio: tramo.inicio, fin: tramo.fin }];
  }

  // cruza medianoche
  return [
    { fecha: fechaISO, inicio: tramo.inicio, fin: "00:00" },
    { fecha: addDays(fechaISO, 1), inicio: "00:00", fin: tramo.fin },
  ];
}

function tramosForDayWithSplit(fechaISO: string, tramos: Tramo[]) {
  const segments: Array<{ fecha: string; inicio: string; fin: string }> = [];
  for (const t of tramos) segments.push(...splitTramoByMidnight(fechaISO, t));
  return segments;
}

function dayLabel(i: number) {
  return ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i];
}

export default function RotacionClient() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [patrones, setPatrones] = useState<Patron[]>([]);
  const [config, setConfig] = useState<Config>({ horas_semanales: 44 });

  // UI state
  const [fechaPick, setFechaPick] = useState<string>(isoDate(new Date()));
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [patronId, setPatronId] = useState<string>("");

  // Mapa editable por día: fecha -> horario_id
  const [weekMap, setWeekMap] = useState<Record<string, number | null>>({});

  const weekStart = useMemo(() => startOfWeekMonday(fechaPick), [fechaPick]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const [{ data: u }, { data: h }, { data: p }, { data: c }] = await Promise.all([
        supabase.from("usuarios").select("id, nombre, rol").order("nombre", { ascending: true }),
        supabase
          .from("horarios")
          .select("id, nombre, tramos, horas_trabajadas")
          .order("nombre", { ascending: true }),
        supabase.from("patrones_semanales").select("*").order("nombre", { ascending: true }),
        supabase.from("configuraciones").select("horas_semanales").order("id", { ascending: true }).limit(1).maybeSingle(),
      ]);

      setUsuarios((u as any) ?? []);
      setHorarios(((h as any) ?? []).map((x: any) => ({ ...x, tramos: sanitizeTramos(x.tramos) })));
      setPatrones((p as any) ?? []);
      setConfig({ horas_semanales: (c as any)?.horas_semanales ?? 44 });

      if ((u as any)?.[0]?.id) setUsuarioId((u as any)[0].id);
      setLoading(false);
    })();
  }, []);

  // Cargar rotación existente de esa semana/usuario
  useEffect(() => {
    if (!usuarioId) return;

    (async () => {
      setMsg("");

      const { data, error } = await supabase
        .from("turnos")
        .select("fecha, horario_id")
        .eq("usuario_id", usuarioId)
        .gte("fecha", weekStart)
        .lte("fecha", weekDays[6]);

      if (error) {
        setMsg("❌ Error cargando rotación: " + error.message);
        return;
      }

      const m: Record<string, number | null> = {};
      for (const d of weekDays) m[d] = null;
      (data ?? []).forEach((r: any) => {
        m[r.fecha] = r.horario_id ?? null;
      });
      setWeekMap(m);
    })();
  }, [usuarioId, weekStart, weekDays]);

  const horarioById = useMemo(() => {
    const m = new Map<number, Horario>();
    horarios.forEach((h) => m.set(h.id, h));
    return m;
  }, [horarios]);

  // Construye vista semanal con split por medianoche (solo para mostrar/cálculo)
  const weekView = useMemo(() => {
    // Para esta semana, armamos segmentos por fecha DENTRO de la semana.
    // Lo que caiga en lunes de la siguiente semana NO se suma aquí.
    const perDay: Record<string, { nombre: string; segmentos: Array<{ inicio: string; fin: string }>; horas: number }> = {};

    for (const date of weekDays) {
      const horarioId = weekMap[date] ?? null;
      if (!horarioId) {
        perDay[date] = { nombre: "Sin turno", segmentos: [], horas: 0 };
        continue;
      }

      const h = horarioById.get(horarioId);
      const tramos = sanitizeTramos(h?.tramos);
      const segs = tramosForDayWithSplit(date, tramos);

      // dejamos SOLO segmentos del mismo date (lo de 00:00–xx que cae en date+1 se ignora en esta semana)
      const sameDaySegs = segs.filter((s) => s.fecha === date);

      const horas = Math.round(
        sameDaySegs.reduce((acc, s) => acc + diffHoras(s.inicio, s.fin), 0) * 100
      ) / 100;

      perDay[date] = {
        nombre: h?.nombre ?? "Turno",
        segmentos: sameDaySegs.map((s) => ({ inicio: s.inicio, fin: s.fin })),
        horas,
      };
    }

    return perDay;
  }, [weekDays, weekMap, horarioById]);

  const totalSemana = useMemo(() => {
    return Math.round(weekDays.reduce((acc, d) => acc + (weekView[d]?.horas ?? 0), 0) * 100) / 100;
  }, [weekDays, weekView]);

  const tope = Number(config?.horas_semanales ?? 44);
  const extras = useMemo(() => Math.max(0, Math.round((totalSemana - tope) * 100) / 100), [totalSemana, tope]);

  const applyPatron = async () => {
    setMsg("");
    if (!patronId) return;

    const patron = patrones.find((p) => String(p.id) === String(patronId));
    if (!patron) return;

    // Se asume que patron.dias tiene algo como:
    // { lunes: horario_id, martes: horario_id, ..., domingo: horario_id }
    // Si tu estructura difiere, me dices cómo guardas el patrón y lo ajusto.
    const dias = (patron as any).dias ?? {};

    const mapCopy: Record<string, number | null> = { ...weekMap };

    const keys = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
    for (let i = 0; i < 7; i++) {
      const k = keys[i];
      const date = weekDays[i];
      const horarioId = dias?.[k] ?? null;
      mapCopy[date] = horarioId ? Number(horarioId) : null;
    }

    setWeekMap(mapCopy);
  };

  const saveRotacion = async () => {
    setMsg("");
    if (!usuarioId) {
      setMsg("❌ Selecciona un operador.");
      return;
    }

    // guardamos 1 fila por día (si no hay horario, borramos fila)
    // NOTA: si el turno cruza medianoche, igualmente se guarda en el día que inicia.
    // El “split” se hace al calcular/mostrar.
    try {
      // 1) borrar filas de la semana
      const del = await supabase
        .from("turnos")
        .delete()
        .eq("usuario_id", usuarioId)
        .gte("fecha", weekStart)
        .lte("fecha", weekDays[6]);

      if (del.error) throw new Error(del.error.message);

      // 2) insertar filas seleccionadas
      const rows: any[] = [];
      for (const date of weekDays) {
        const horarioId = weekMap[date] ?? null;
        if (!horarioId) continue;
        rows.push({
          usuario_id: usuarioId,
          fecha: date,
          horario_id: horarioId,
        });
      }

      if (rows.length) {
        const ins = await supabase.from("turnos").insert(rows);
        if (ins.error) throw new Error(ins.error.message);
      }

      setMsg("✅ Rotación guardada.");
    } catch (e: any) {
      setMsg("❌ " + (e?.message ?? "Error guardando rotación"));
    }
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Rotación</h1>

      {msg && <div className="bg-white shadow rounded-lg p-3 text-sm">{msg}</div>}

      <section className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Semana (elige cualquier día)</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={fechaPick}
              onChange={(e) => setFechaPick(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Semana: {weekStart} a {weekDays[6]} (Lun–Dom)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Operador</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
            >
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre ?? u.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Patrón semanal</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={patronId}
              onChange={(e) => setPatronId(e.target.value)}
              onBlur={applyPatron}
            >
              <option value="">— Seleccionar —</option>
              {patrones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            Total semana: <b>{totalSemana}h</b> | Tope: <b>{tope}h</b> | Extras:{" "}
            <b className={extras > 0 ? "text-red-600" : ""}>{extras}h</b>
          </div>

          <button
            onClick={saveRotacion}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md"
          >
            Guardar rotación
          </button>
        </div>

        {extras > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
            ⚠️ Esta semana supera el tope. Extras estimadas: <b>{extras}h</b>.
            <div className="text-xs mt-1 text-red-600">
              Nota: si un turno cruza medianoche en domingo, las horas después de las 00:00 van al lunes (otra semana).
            </div>
          </div>
        )}
      </section>

      {/* Vista semanal + edición por día */}
      <section className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Vista semanal</h2>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((d, idx) => {
            const horarioId = weekMap[d] ?? null;
            const h = horarioId ? horarioById.get(horarioId) : null;
            const view = weekView[d];

            return (
              <div key={d} className="border rounded-lg p-3">
                <div className="text-xs text-gray-500">{dayLabel(idx)}</div>
                <div className="font-semibold">{d}</div>

                <div className="mt-2">
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm"
                    value={horarioId ?? ""}
                    onChange={(e) =>
                      setWeekMap((prev) => ({
                        ...prev,
                        [d]: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">Sin turno</option>
                    {horarios.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 text-sm">
                  <div className="font-medium">{h?.nombre ?? "Sin turno"}</div>

                  {view?.segmentos?.length ? (
                    <div className="mt-1 space-y-1">
                      {view.segmentos.map((s, i) => (
                        <div key={i} className="text-xs bg-gray-100 inline-block px-2 py-1 rounded">
                          {s.inicio}–{s.fin}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">—</div>
                  )}

                  <div className="mt-2">
                    Horas: <b>{view?.horas ?? 0}</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
