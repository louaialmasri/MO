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
import availabilityRoutes from './routes/availability'
import timeslotRoutes from './routes/timeslots'
import { activeSalon } from './middlewares/activeSalon'
import salonRoutes from './routes/salons'

const app = express()
const PORT = 5000

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization', 'x-salon-id'],
  credentials: true,
}))
app.options('*', cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization', 'x-salon-id'],
  credentials: true,
}))

app.use(bodyParser.json())

app.use('/api', authRoutes)
app.use('/api', adminRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/users', userRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/timeslots', timeslotRoutes)
app.use('/api/salons', salonRoutes)
app.use('/api/services', activeSalon, serviceRoutes)
app.use('/api/users', activeSalon, userRoutes)
app.use('/api/bookings', activeSalon, bookingRoutes)
app.use('/api/availability', activeSalon, availabilityRoutes)
app.use('/api/timeslots', activeSalon, timeslotRoutes)
app.use('/api/salons', activeSalon, salonRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Backend läuft auf http://localhost:${PORT}`)
})

mongoose.connect('mongodb://localhost:27017/booking-app')
  .then(() => console.log('✅ MongoDB verbunden'))
  .catch((err) => console.error('❌ MongoDB-Fehler:', err))