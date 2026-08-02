import jwt from 'jsonwebtoken';

// No fallback on purpose - a silently-applied default secret would let anyone forge
// staff tokens if this env var is ever missing in a deployment.
const SECRET: string =
  process.env.JWT_SECRET ??
  (() => {
    throw new Error('JWT_SECRET environment variable must be set');
  })();

export interface AuthTokenPayload {
  userId: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, SECRET) as AuthTokenPayload;
}
