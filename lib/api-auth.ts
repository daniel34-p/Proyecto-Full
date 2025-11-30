import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './jwt';

export function requireAuth(handler: Function, requiredRole?: 'admin' | 'asesor') {
  return async (request: NextRequest, context?: any) => {
    // Extraer token del header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado - Token requerido' },
        { status: 401 }
      );
    }

    // Verificar token
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'No autorizado - Token inválido' },
        { status: 401 }
      );
    }

    // Verificar rol si es requerido
    if (requiredRole && payload.rol !== requiredRole) {
      return NextResponse.json(
        { error: 'No autorizado - Permisos insuficientes' },
        { status: 403 }
      );
    }

    // Agregar usuario al request
    (request as any).user = payload;

    // Ejecutar el handler
    return handler(request, context);
  };
}