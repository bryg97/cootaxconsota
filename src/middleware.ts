import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MODULE_BY_PATH: { prefix: string; permiso: string }[] = [
  { prefix: "/dashboard/usuarios", permiso: "usuarios" },
  { prefix: "/dashboard/roles", permiso: "roles" },
  { prefix: "/dashboard/configuracion", permiso: "configuracion" },
  { prefix: "/dashboard/turnos", permiso: "turnos" },
  { prefix: "/dashboard/rotacion", permiso: "rotacion" },
  { prefix: "/dashboard/nomina", permiso: "nomina" },
];

function toStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (!req.nextUrl.pathname.startsWith("/dashboard")) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 1) Sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2) Perfil + permisos (roles.permisos = jsonb)
  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("estado, rol_id, roles(nombre, permisos)")
    .eq("id", user.id)
    .single();

  if (error || !perfil) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 3) Bloqueado => fuera
  if ((perfil as any).estado === "bloqueado") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("blocked", "1");
    return NextResponse.redirect(url);
  }

  const permisos = toStringArray((perfil as any)?.roles?.permisos);

  // 4) Chequear permiso del módulo
  const path = req.nextUrl.pathname;
  const regla = MODULE_BY_PATH.find((r) => path.startsWith(r.prefix));
  if (regla && !permisos.includes(regla.permiso)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
