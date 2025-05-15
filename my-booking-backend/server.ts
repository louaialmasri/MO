import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'

const app = express()
const PORT = 5000

app.use(cors())
app.use(bodyParser.json())

app.use('/api', authRoutes)
app.use('/api', adminRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Backend läuft auf http://localhost:${PORT}`)
})
