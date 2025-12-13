"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    router.push("/dashboard");
    router.refresh(); // 👈 IMPORTANTE
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-sans">
      <div className="w-full max-w-md bg-white shadow-xl p-8 rounded-2xl border border-gray-100">
        
        {/* Logo */}
        <div className="text-center mb-4">
          <img
            src="https://cootaxconsota.com/wp-content/uploads/2024/07/logo-empresa-png2-1.png"
            alt="Logo Empresa"
            className="mx-auto w-40"
          />
        </div>

        <h2 className="text-center text-xl font-bold mb-4">
          B-Gestión
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label className="block font-medium mb-1">Correo</label>
          <input
            type="email"
            className="w-full p-2 mb-3 border rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block font-medium mb-1">Contraseña</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="w-full p-2 border rounded-md pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="absolute right-3 top-2 cursor-pointer select-none text-blue-500"
              onClick={() => setShowPass(!showPass)}
            >
              👁
            </span>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-md"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-gray-500 mt-4 text-sm">
          © {new Date().getFullYear()} Brayan Arroyave Gonzalez — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
