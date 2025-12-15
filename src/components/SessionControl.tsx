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
        // Automáticamente cerrar todas las sesiones anteriores
        await cerrarOtrasSesionesAutomatico(session);
        
        // Mostrar notificación temporal
        setMostrarAlerta(true);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
          setMostrarAlerta(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Error verificando sesiones:", error);
    }
  };

  const cerrarOtrasSesionesAutomatico = async (session: any) => {
    try {
      // Eliminar todas las sesiones excepto la actual
      await supabase
        .from("sesiones_activas")
        .delete()
        .eq("usuario_id", session.user.id)
        .neq("session_token", session.access_token);
    } catch (error) {
      console.error("Error cerrando sesiones anteriores:", error);
    }
  };

  if (!mostrarAlerta) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-green-800">
              ✓ Sesión única activada
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                Se detectó otra sesión activa y fue cerrada automáticamente.
                Solo puedes tener una sesión activa por seguridad.
              </p>
            </div>
          </div>
          <button
            onClick={() => setMostrarAlerta(false)}
            className="ml-4 text-green-400 hover:text-green-600"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
