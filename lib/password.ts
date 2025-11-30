import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica si una contraseña coincide con su hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}