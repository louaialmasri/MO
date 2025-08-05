import jwt from 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET as string

export function generateToken(payload: object): string {
  if (!SECRET_KEY) throw new Error('JWT_SECRET ist nicht gesetzt')
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '2h' })
}

export function verifyToken(token: string): any {
  if (!SECRET_KEY) throw new Error('JWT_SECRET ist nicht gesetzt')
  return jwt.verify(token, SECRET_KEY)
}