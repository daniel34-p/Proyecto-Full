'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface ProximamenteModuloProps {
  titulo?: string;
}

// Módulo "Alertas y Movimientos de inventario" deshabilitado temporalmente
// (ver lib/use-alertas-pendientes.ts y lib/use-movimientos-pendientes.ts,
// que ya no se invocan desde ninguna vista para evitar el polling).
export function ProximamenteModulo({ titulo }: ProximamenteModuloProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center text-center gap-3 py-16">
        <Construction className="h-10 w-10 text-gray-400" />
        <div className="space-y-1">
          {titulo && <p className="font-semibold text-gray-900">{titulo}</p>}
          <p className="text-gray-500">Próximamente estaremos trabajando en este módulo</p>
        </div>
      </CardContent>
    </Card>
  );
}
