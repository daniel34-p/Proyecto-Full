import { NextResponse } from 'next/server';

// Endpoint deliberadamente mínimo: solo lee una variable de entorno, sin
// tocar la base de datos ni requerir autenticación. Lo consulta
// VersionWatcher cuando la pestaña vuelve a estar visible, para detectar
// si hubo un despliegue nuevo desde que se cargó la página.
export async function GET() {
  return NextResponse.json({
    buildId: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  });
}
