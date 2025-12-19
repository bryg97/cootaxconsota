import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; detalleId: string }> }
) {
  const { id, detalleId } = await params;
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    // Actualizar el detalle
    const { data: detalle, error } = await supabase
      .from("nominas_detalle")
      .update({
        salario_base: body.salario_base,
        horas_extras: body.horas_extras,
        bonificaciones: body.bonificaciones,
        otros_devengados: body.otros_devengados,
        total_devengado: body.total_devengado,
        salud: body.salud,
        pension: body.pension,
        fondo_solidaridad: body.fondo_solidaridad,
        retencion_fuente: body.retencion_fuente,
        otras_deducciones: body.otras_deducciones,
        total_deducciones: body.total_deducciones,
        neto_pagar: body.neto_pagar,
      })
      .eq("id", detalleId)
      .eq("nomina_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: "Error al actualizar", error: error.message },
        { status: 500 }
      );
    }

    // Recalcular totales de la nómina
    const { data: detalles } = await supabase
      .from("nomina_detalles")
      .select("total_devengado, total_deducciones, neto_pagar")
      .eq("nomina_id", id);

    if (detalles) {
      const totals = detalles.reduce(
        (acc, d) => ({
          total_devengado: acc.total_devengado + (d.total_devengado || 0),
          total_deducciones: acc.total_deducciones + (d.total_deducciones || 0),
          total_neto: acc.total_neto + (d.neto_pagar || 0),
        }),
        { total_devengado: 0, total_deducciones: 0, total_neto: 0 }
      );

      await supabase
        .from("nominas")
        .update(totals)
        .eq("id", id);
    }

    return NextResponse.json(detalle);
  } catch (error) {
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; detalleId: string }> }
) {
  const { id, detalleId } = await params;
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Eliminar el detalle
    const { error } = await supabase
      .from("nominas_detalle")
      .delete()
      .eq("id", detalleId)
      .eq("nomina_id", id);

    if (error) {
      return NextResponse.json(
        { message: "Error al eliminar", error: error.message },
        { status: 500 }
      );
    }

    // Recalcular totales de la nómina
    const { data: detalles } = await supabase
      .from("nomina_detalles")
      .select("total_devengado, total_deducciones, neto_pagar")
      .eq("nomina_id", id);

    if (detalles) {
      const totals = detalles.reduce(
        (acc, d) => ({
          total_devengado: acc.total_devengado + (d.total_devengado || 0),
          total_deducciones: acc.total_deducciones + (d.total_deducciones || 0),
          total_neto: acc.total_neto + (d.neto_pagar || 0),
        }),
        { total_devengado: 0, total_deducciones: 0, total_neto: 0 }
      );

      await supabase
        .from("nominas")
        .update(totals)
        .eq("id", id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
