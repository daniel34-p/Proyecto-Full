import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const SESSION_EXPIRATION = parseInt(process.env.SESSION_EXPIRATION || '86400'); // 24 horas por defecto

interface TokenPayload {
  userId: string;
  email: string;
  rol: string;
}

/**
 * Genera un token JWT
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: SESSION_EXPIRATION,
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('Error verificando token:', error);
    return null;
  }
}

/**
 * Extrae el token del header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}