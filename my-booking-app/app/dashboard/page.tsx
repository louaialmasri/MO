'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getUserBookings, fetchServices, deleteBooking } from '@/services/api'
import styles from './dashboard.module.css'
import { motion } from 'framer-motion'
import Tooltip from '@mui/material/Tooltip'

type Booking = {
  _id: string
  serviceId: string
  dateTime: string
}

type Service = {
  _id: string
  name: string
}

export default function DashboardPage() {
  const { user, token, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const userBookings = await getUserBookings(token)
      setBookings(userBookings)
    } catch (error) {
      console.error('Fehler beim Laden:', error)
    } finally {
      setLoading(false)
    }
  }

  if (user) loadData()
}, [user])


  const handleCancel = async (bookingId: string) => {
    try {
      const success = await deleteBooking(bookingId, token!)
      if (success) {
        setBookings(prev => prev.filter(b => b._id !== bookingId))
      }
    } catch (err) {
      alert('Fehler beim Stornieren!')
    }
  }

  if (loading) return <p>Lade deine Buchungen...</p>

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={styles.container}
    >
      <h1>Willkommen zurück, {user?.email} 👋</h1>

      <button onClick={logout} className={styles.logoutBtn}>
        Logout
      </button>

      <h2>Deine Buchungen</h2>

      {bookings.length === 0 ? (
        <p>Du hast noch keine Termine gebucht.</p>
      ) : (
        <ul className={styles.bookingList}>
          {bookings.map((b) => {
            const now = new Date()
            const bookingDate = new Date(b.dateTime)
            const diffInHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
            const isTooLate = diffInHours < 24
            const isDisabled = user?.role === 'user' && isTooLate
            const service = services.find((s) => s._id === b.serviceId)
            return (
              <li key={b._id} className={styles.bookingItem}>
                <strong>{service?.name}</strong> <br />
                📅 {new Date(b.dateTime).toLocaleString('de-DE')} <br />
                <Tooltip
                  title={
                    isDisabled
                      ? 'Stornierung nur bis 24 Stunden vor Termin möglich'
                      : 'Buchung stornieren'
                  }
                  arrow
                >
                  <span> {}
                    <button
                      onClick={() => handleCancel(b._id)}
                      disabled={isDisabled}
                      style={{
                        backgroundColor: isDisabled ? '#ccc' : '#ef4444',
                        color: isDisabled ? '#666' : 'white',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        marginTop: '0.5rem',
                      }}
                    >
                      Stornieren
                    </button>
                  </span>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      )}
    </motion.div>
  )
}
