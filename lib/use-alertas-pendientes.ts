'use client';

import { useEffect, useState } from 'react';

// Cuántas alertas (precio por debajo del costo) están pendientes - para
// mostrar el número directamente sobre la pestaña "Alertas", sin un ícono
// de campana aparte. Hace polling liviano cada 60s a un endpoint que solo
// hace un count() ya indexado - no trae filas, no pesa en el servidor.
export function useAlertasPendientes(): number {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let cancelado = false;

    const actualizar = () => {
      const token = localStorage.getItem('token');
      fetch('/api/historial-alertas/contador', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      })
        .then((res) => (res.ok ? res.json() : { pendientes: 0 }))
        .then((data) => {
          if (!cancelado) setPendientes(data.pendientes || 0);
        })
        .catch(() => {});
    };

    actualizar();
    const intervalo = setInterval(actualizar, 60000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  return pendientes;
}
