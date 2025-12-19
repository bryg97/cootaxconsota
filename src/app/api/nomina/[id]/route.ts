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

    // Verificar si hay detalles para eliminar
    const { data: detallesExistentes, error: checkError } = await supabase
      .from("nominas_detalle")
      .select("id")
      .eq("nomina_id", id);

    if (checkError) {
      console.error("Error al verificar detalles:", checkError);
    }

    // Eliminar los detalles si existen
    if (detallesExistentes && detallesExistentes.length > 0) {
      const { error: detallesError } = await supabase
        .from("nominas_detalle")
        .delete()
        .eq("nomina_id", id);

      if (detallesError) {
        console.error("Error al eliminar detalles:", detallesError);
        return NextResponse.json(
          { 
            message: "Error al eliminar detalles de la nómina. Verifique los permisos en Supabase.", 
            error: detallesError.message,
            details: detallesError 
          },
          { status: 500 }
        );
      }
    }

    // Luego eliminar la nómina
    const { error: deleteError } = await supabase
      .from("nominas")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error al eliminar nómina:", deleteError);
      return NextResponse.json(
        { 
          message: "Error al eliminar la nómina. Verifique los permisos en Supabase.", 
          error: deleteError.message,
          details: deleteError 
        },
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
