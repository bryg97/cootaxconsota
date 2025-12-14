// src/app/dashboard/usuarios/nuevo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("operador");
  const [salarioBase, setSalarioBase] = useState<number | "">("");
  const [tipoDescanso, setTipoDescanso] = useState("fijo_domingo");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          email,
          password,
          rol,
          salario_base:
            salarioBase === "" ? null : Number(salarioBase),
          tipo_descanso: tipoDescanso,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Error creando usuario");
        setLoading(false);
        return;
      }

      // Todo OK
      router.push("/dashboard/usuarios");
      router.refresh();
    } catch (err: any) {
      setErrorMsg("Error de red o servidor");
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Agregar usuario</h1>

      {errorMsg && (
        <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-md bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre
          </label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Correo
          </label>
          <input
            type="email"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contraseña
          </label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Rol
          </label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          >
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
            {/* luego podemos rellenar esto dinámicamente desde la tabla roles */}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Salario base
          </label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={salarioBase}
            onChange={(e) =>
              setSalarioBase(e.target.value === "" ? "" : Number(e.target.value))
            }
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo de descanso obligatorio
          </label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={tipoDescanso}
            onChange={(e) => setTipoDescanso(e.target.value)}
          >
            <option value="fijo_domingo">Fijo (Domingo)</option>
            <option value="aleatorio">Aleatorio (Según patrón)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Fijo: Siempre descansa domingo. Aleatorio: Según patrón semanal
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/usuarios")}
            className="border border-gray-300 text-sm px-4 py-2 rounded-md hover:bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
