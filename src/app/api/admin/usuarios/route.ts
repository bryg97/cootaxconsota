// src/app/api/admin/usuarios/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, // por si acaso
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, email, password, rol, salario_base } = body;

    if (!email || !password || !nombre) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // 1) Crear usuario en Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Error creando usuario de autenticación" },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // 2) Crear perfil en public.usuarios
    const { error: perfilError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: userId,
        nombre,
        email,
        rol, // recuerda: también tienes rol_id si luego lo quieres usar
        salario_base: salario_base ?? 0,
      });

    if (perfilError) {
      return NextResponse.json(
        { error: perfilError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Error inesperado en el servidor" },
      { status: 500 }
    );
  }
}
