import jwt from 'jsonwebtoken'

const SECRET_KEY = 'supersecretkey123' // ⚠️ später in .env Datei verschieben

export function generateToken(payload: object): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '2h' })
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, SECRET_KEY)
  } catch {
    return null
  }
}
