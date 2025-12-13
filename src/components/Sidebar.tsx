"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, UserCircle2 } from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mi Perfil", href: "/dashboard/perfil", icon: UserCircle2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 border-r bg-white px-6 py-8 hidden md:flex flex-col">
      <div className="text-2xl font-bold mb-10 tracking-tight">
        <span className="text-blue-600">Cootax</span>Consota
      </div>

      <nav className="flex-1 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
              ${active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/logout"
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
      >
        <LogOut size={18} />
        Cerrar sesión
      </Link>
    </aside>
  );
}
