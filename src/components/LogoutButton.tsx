"use client";
import React from "react";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      Cerrar sesión
    </button>
  );
}
