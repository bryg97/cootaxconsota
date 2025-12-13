import Link from "next/link";
import { LucideIcon } from "lucide-react";

export default function ModuleCard({
  title,
  icon: Icon,
  href,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-3"
    >
      <Icon size={32} className="text-blue-600" />
      <h3 className="font-medium text-gray-800">{title}</h3>
    </Link>
  );
}
