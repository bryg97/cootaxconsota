import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que la nómina esté procesada
    const { data: nomina, error: nominaError } = await supabase
      .from("nominas")
      .select("estado")
      .eq("id", id)
      .single();

    if (nominaError || !nomina) {
      return NextResponse.json(
        { message: "Nómina no encontrada" },
        { status: 404 }
      );
    }

    if (nomina.estado !== "procesada") {
      return NextResponse.json(
        { message: "Solo se pueden marcar como pagadas las nóminas procesadas" },
        { status: 400 }
      );
    }

    // Marcar como pagada
    const { error: updateError } = await supabase
      .from("nominas")
      .update({
        estado: "pagada",
        pagada_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { message: "Error al marcar como pagada", error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Nómina marcada como pagada" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
