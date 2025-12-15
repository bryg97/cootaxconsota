"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Sesion = {
  id: string;
  session_token: string;
  device_info: string | null;
  ip_address: string | null;
  ultima_actividad: string;
  created_at: string;
};

export default function SessionControl() {
  const router = useRouter();
  const [sesionesActivas, setSesionesActivas] = useState<Sesion[]>([]);
  const [sesionActual, setSesionActual] = useState<string>("");
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    verificarSesiones();
    
    // Registrar o actualizar la sesión actual
    registrarSesion();

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      actualizarSesion();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const registrarSesion = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const sessionToken = session.access_token;
      setSesionActual(sessionToken);

      const deviceInfo = navigator.userAgent;
      
      // Verificar si la sesión ya existe
      const { data: sesionExistente } = await supabase
        .from("sesiones_activas")
        .select("*")
        .eq("session_token", sessionToken)
        .single();

      if (!sesionExistente) {
        // Insertar nueva sesión
        await supabase.from("sesiones_activas").insert({
          usuario_id: session.user.id,
          session_token: sessionToken,
          device_info: deviceInfo,
          ip_address: null, // Se puede obtener del servidor si es necesario
        });
      } else {
        // Actualizar última actividad
        await supabase
          .from("sesiones_activas")
          .update({ ultima_actividad: new Date().toISOString() })
          .eq("session_token", sessionToken);
      }
    } catch (error) {
      console.error("Error registrando sesión:", error);
    }
  };

  const actualizarSesion = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("sesiones_activas")
        .update({ ultima_actividad: new Date().toISOString() })
        .eq("session_token", session.access_token);
    } catch (error) {
      console.error("Error actualizando sesión:", error);
    }
  };

  const verificarSesiones = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: sesiones } = await supabase
        .from("sesiones_activas")
        .select("*")
        .eq("usuario_id", session.user.id)
        .order("created_at", { ascending: false });

      if (sesiones && sesiones.length > 1) {
        setSesionesActivas(sesiones);
        setMostrarAlerta(true);
      }
    } catch (error) {
      console.error("Error verificando sesiones:", error);
    }
  };

  const cerrarOtrasSesiones = async () => {
    setCerrando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Eliminar todas las sesiones excepto la actual
      await supabase
        .from("sesiones_activas")
        .delete()
        .eq("usuario_id", session.user.id)
        .neq("session_token", session.access_token);

      setMostrarAlerta(false);
      setSesionesActivas([]);
    } catch (error) {
      console.error("Error cerrando sesiones:", error);
    } finally {
      setCerrando(false);
    }
  };

  const cerrarEstaYOtras = async () => {
    setCerrando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Eliminar TODAS las sesiones incluyendo la actual
      await supabase
        .from("sesiones_activas")
        .delete()
        .eq("usuario_id", session.user.id);

      // Cerrar sesión actual
      await supabase.auth.signOut();
      
      router.push("/login");
    } catch (error) {
      console.error("Error cerrando todas las sesiones:", error);
    } finally {
      setCerrando(false);
    }
  };

  if (!mostrarAlerta) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              ⚠️ Múltiples sesiones detectadas
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Tienes <strong>{sesionesActivas.length}</strong> sesiones activas. 
                Por seguridad, te recomendamos cerrar las sesiones anteriores.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={cerrarOtrasSesiones}
                disabled={cerrando}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {cerrando ? "Cerrando..." : "Cerrar las otras sesiones y continuar"}
              </button>
              <button
                onClick={cerrarEstaYOtras}
                disabled={cerrando}
                className="w-full border border-yellow-600 text-yellow-700 hover:bg-yellow-100 text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cerrar todas las sesiones (incluyendo esta)
              </button>
              <button
                onClick={() => setMostrarAlerta(false)}
                className="text-sm text-yellow-600 hover:text-yellow-800 underline"
              >
                Continuar de todos modos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
