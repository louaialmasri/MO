import dotenv from 'dotenv'
dotenv.config()


import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import mongoose from 'mongoose'
import serviceRoutes from './routes/service'
import bookingRoutes from './routes/booking'
import userRoutes from './routes/user'

const app = express()
const PORT = 5000

app.use(cors())
app.use(bodyParser.json())

app.use('/api', authRoutes)
app.use('/api', adminRoutes)

app.use('/api/services', serviceRoutes)

app.use('/api/bookings', bookingRoutes)
app.use('/api/users', userRoutes)



app.listen(PORT, () => {
  console.log(`🚀 Backend läuft auf http://localhost:${PORT}`)
})

mongoose.connect('mongodb://localhost:27017/booking-app')
  .then(() => console.log('✅ MongoDB verbunden'))
  .catch((err) => console.error('❌ MongoDB-Fehler:', err))