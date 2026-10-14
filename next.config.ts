import type { NextConfig } from "next";

// Identificador de este build, horneado en el bundle del navegador en el
// momento de compilar (no en cada request). En Vercel, VERCEL_GIT_COMMIT_SHA
// ya viene puesto por la plataforma y es el mismo para todas las instancias
// de un mismo despliegue - por eso sirve para detectar cuándo hay uno nuevo
// (ver /api/version y components/version-watcher.tsx). En local cae a "dev".
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default nextConfig;
