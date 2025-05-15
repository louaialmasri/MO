export type User = {
    id: number
    email: string
    password: string
    role: 'user' | 'admin'
  }
  
  // In-Memory-Datenbank
  export const users: User[] = []
  
  let userIdCounter = 1
  
  export function getNextUserId(): number {
    return userIdCounter++
  }
  