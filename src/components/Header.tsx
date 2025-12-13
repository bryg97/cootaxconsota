"use client";

export default function Header({ usuario }: { usuario: string }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <h1 className="text-lg font-semibold tracking-tight">
        Panel de Control
      </h1>

      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          Hola, <span className="font-medium text-gray-800">{usuario}</span>
        </div>

        <img
          src="https://cootaxconsota.com/wp-content/uploads/2021/01/cropped-logo-consota-1024x1024-1.png"
          className="w-9 h-9 rounded-md shadow-sm"
          alt="logo"
        />
      </div>
    </header>
  );
}
