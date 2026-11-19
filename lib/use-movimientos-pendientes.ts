'use client';

import { useEffect, useState } from 'react';

// Cuántos movimientos de costo están sin revisar - para mostrar el número
// directamente sobre la pestaña "Movimientos". Hace polling liviano cada
// 60s a un endpoint que solo hace un count() ya indexado.
export function useMovimientosPendientes(): number {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let cancelado = false;

    const actualizar = () => {
      const token = localStorage.getItem('token');
      fetch('/api/movimientos-inventario/contador', {
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
