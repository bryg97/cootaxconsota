import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function DELETE(
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

    // Verificar que la nómina no esté pagada
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

    if (nomina.estado === "pagada") {
      return NextResponse.json(
        { message: "No se pueden eliminar nóminas pagadas" },
        { status: 400 }
      );
    }

    // Primero eliminar los detalles
    const { error: detallesError } = await supabase
      .from("nomina_detalles")
      .delete()
      .eq("nomina_id", id);

    if (detallesError) {
      return NextResponse.json(
        { message: "Error al eliminar detalles de la nómina", error: detallesError.message },
        { status: 500 }
      );
    }

    // Luego eliminar la nómina
    const { error: deleteError } = await supabase
      .from("nominas")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { message: "Error al eliminar la nómina", error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Nómina eliminada exitosamente" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
