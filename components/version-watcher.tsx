'use client';

import { useEffect, useRef } from 'react';
import { hayCambiosSinGuardar } from '@/lib/unsaved-changes';

// No renderiza nada - solo vigila en segundo plano si hubo un despliegue
// nuevo desde que se cargó la página, y si lo hubo, recarga sola cuando la
// pestaña vuelve a estar visible (al volver de otra pestaña/app, o al
// desbloquear el celular) en vez de interrumpir a alguien a mitad de algo.
//
// Costo: nada mientras la pestaña está oculta (no hay temporizador). Al
// volver a estar visible, una sola petición muy liviana a /api/version
// (no toca la base de datos). Si coincide con la versión ya cargada, no
// pasa nada más.
export function VersionWatcher() {
  const recargando = useRef(false);

  useEffect(() => {
    const buildIdActual = process.env.NEXT_PUBLIC_BUILD_ID;

    const revisarVersion = async () => {
      if (document.visibilityState !== 'visible' || recargando.current) return;

      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();

        if (data.buildId && data.buildId !== buildIdActual) {
          if (hayCambiosSinGuardar()) {
            // No se recarga a mitad de un formulario sin guardar - se
            // vuelve a intentar la próxima vez que la pestaña vuelva a
            // estar visible (por ejemplo, cuando ya lo haya guardado).
            return;
          }
          recargando.current = true;
          window.location.reload();
        }
      } catch {
        // Sin conexión momentánea u otro problema de red: no pasa nada,
        // simplemente se revisa de nuevo la próxima vez que la pestaña
        // vuelva a estar visible.
      }
    };

    document.addEventListener('visibilitychange', revisarVersion);
    return () => document.removeEventListener('visibilitychange', revisarVersion);
  }, []);

  return null;
}
