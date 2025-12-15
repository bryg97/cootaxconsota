"use client";

import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SessionControl from "@/components/SessionControl";

type Props = {
  children: ReactNode;
  userName: string;
  roleName: string;
  permisos: string[];
};

const NAV_ITEMS: { label: string; href: string; permiso?: string }[] = [
  { label: "Panel principal", href: "/dashboard" },
  { label: "Usuarios", href: "/dashboard/usuarios", permiso: "usuarios" },
  { label: "Roles", href: "/dashboard/roles", permiso: "roles" },
  { label: "Configuración", href: "/dashboard/configuracion", permiso: "configuracion" },
  { label: "Turnos", href: "/dashboard/turnos", permiso: "turnos" },
  { label: "Rotación", href: "/dashboard/rotacion", permiso: "rotacion" },
  { label: "Nómina", href: "/dashboard/nomina", permiso: "nomina" },
];

export default function DashboardLayoutClient({
  children,
  userName,
  roleName,
  permisos,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const can = (permiso?: string) => !permiso || permisos.includes(permiso);

  const navButtonClass = (active: boolean) =>
    `w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
      active
        ? "bg-red-600 text-white"
        : "text-gray-200 hover:bg-gray-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-[#0b1220] text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold">Cootaxconsota</h1>
          <p className="text-sm mt-1">{userName}</p>
          <p className="text-xs text-gray-400">Rol: {roleName}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.filter((it) => can(it.permiso)).map((it) => {
            const active =
              it.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(it.href);

            return (
              <button
                key={it.href}
                onClick={() => router.push(it.href)}
                className={navButtonClass(active)}
              >
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-3 rounded-md"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-[#f3f4f6]">
        <SessionControl />
        {children}
      </main>
    </div>
  );
}
