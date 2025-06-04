import mongoose, { Document } from 'mongoose'

export type Role = 'user' | 'admin' | 'staff'

export interface IUser extends Document {
  email: string
  password: string
  role: Role
}

const userSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'staff'], default: 'user' }
})

export const User = mongoose.model<IUser>('User', userSchema)
