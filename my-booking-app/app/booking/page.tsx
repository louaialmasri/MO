'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import api, { fetchServices, fetchAllUsers, createBooking, fetchTimeslots } from '@/services/api'
import { TextField, MenuItem, Button, Snackbar, Alert, FormControl, InputLabel, Select } from '@mui/material'

type User = { _id: string; email: string; role: 'user' | 'staff' | 'admin'; name?: string }
type Service = { _id: string; title: string; duration?: number; price?: number }
type Staff = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; skills?: (string | { _id: string })[] }

export default function BookingPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const isPrivileged = user?.role === 'admin' || user?.role === 'staff'

  const [services, setServices] = useState<Service[]>([])
  const [staffForService, setStaffForService] = useState<Staff[]>([])
  const [customers, setCustomers] = useState<User[]>([])

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [date, setDate] = useState<string>('')           // YYYY-MM-DD
  const [slots, setSlots] = useState<string[]>([])       // ISO strings
  const [slot, setSlot] = useState<string>('')           // chosen ISO

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{open:boolean; msg:string; sev:'success'|'error'}>({open:false,msg:'',sev:'success'})

  useEffect(() => { if (!user) router.push('/login') }, [user])

  useEffect(() => {
    (async () => {
      try {
        const svc = await fetchServices()
        setServices(svc)
        if (isPrivileged && token) {
          const all = await fetchAllUsers(token)
          setCustomers(all.filter((u:User)=>u.role==='user'))
        }
      } catch {
        setToast({open:true, msg:'Fehler beim Laden der Daten', sev:'error'})
      }
    })()
  }, [isPrivileged, token])

  // Lade die Mitarbeiter, die den Service können
  useEffect(() => {
    setSelectedStaffId('')
    setSlots([])
    setSlot('')
    setStaffForService([])
    if (!selectedServiceId) return
    (async () => {
      try {
        const res = await api.get(`/staff/service/${selectedServiceId}`)
        setStaffForService(res.data)
      } catch (error) {
        setToast({open:true, msg:'Fehler beim Laden der Mitarbeiter für den Service', sev:'error'})
      }
    })()
  }, [selectedServiceId])

  // Timeslots laden, sobald Service + Staff + Date gesetzt
  useEffect(() => {
    setSlots([]); setSlot('')
    if (!token || !selectedServiceId || !selectedStaffId || !date) return
    (async () => {
      try {
        const { slots: s } = await fetchTimeslots({ staffId: selectedStaffId, serviceId: selectedServiceId, date }, token)
        setSlots(s)
      } catch {
        setToast({open:true, msg:'Fehler beim Laden der Zeit-Slots', sev:'error'})
      }
    })()
  }, [token, selectedServiceId, selectedStaffId, date])

  const handleBook = async () => {
    if (!token) { setToast({open:true,msg:'Bitte logge dich ein',sev:'error'}); return }
    if (!selectedServiceId || !selectedStaffId || !date || !slot || (isPrivileged && !selectedCustomerId)) {
      setToast({open:true, msg:'Bitte alle Felder ausfüllen', sev:'error'}); return
    }
    try {
      setLoading(true)
      await createBooking(
        selectedServiceId,
        slot, // ISO vom Slot
        selectedStaffId,
        token,
        isPrivileged ? selectedCustomerId : undefined
      )
      setToast({open:true, msg:'Termin gebucht', sev:'success'})
      router.push('/dashboard')
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Buchung fehlgeschlagen'
      setToast({open:true, msg, sev:'error'})
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 560, margin: '24px auto' }}>
      <h1>Termin buchen</h1>

      {isPrivileged && (
        <TextField select label="Kunde" value={selectedCustomerId}
          onChange={(e)=> setSelectedCustomerId(e.target.value)} fullWidth margin="normal" required>
          {customers.map(c => <MenuItem key={c._id} value={c._id}>{c.name ? `${c.name} – ${c.email}` : c.email}</MenuItem>)}
        </TextField>
      )}

      <TextField select label="Service" value={selectedServiceId}
        onChange={(e)=> setSelectedServiceId(e.target.value)}
        fullWidth margin="normal" required>
        {services.map(s => <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>)}
      </TextField>

      <FormControl fullWidth margin="normal">
        <InputLabel>Mitarbeiter</InputLabel>
        <Select
          value={selectedStaffId}
          onChange={e => setSelectedStaffId(e.target.value)}
          disabled={!selectedServiceId || staffForService.length === 0}
          required
        >
          {staffForService.map((staff) => (
            <MenuItem key={staff._id} value={staff._id}>
              {staff.firstName && staff.lastName
                ? `${staff.firstName} ${staff.lastName}`
                : staff.name || staff.email}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField type="date" label="Datum" value={date}
        onChange={(e)=> setDate(e.target.value)} fullWidth margin="normal"
        InputLabelProps={{ shrink: true }} required />

      <TextField select label="Zeit-Slot" value={slot}
        onChange={(e)=> setSlot(e.target.value)} fullWidth margin="normal"
        helperText={(!date || slots.length === 0) ? 'Keine freien Zeiten' : undefined}
        disabled={!date || slots.length === 0} required>
        {slots.map(sIso => {
          const dt = new Date(sIso)
          const label = dt.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })
          return <MenuItem key={sIso} value={sIso}>{label}</MenuItem>
        })}
      </TextField>

      <Button variant="contained" onClick={handleBook} disabled={
        loading || !selectedServiceId || !selectedStaffId || !date || !slot || (isPrivileged && !selectedCustomerId)
      } sx={{ mt: 2 }}>
        Termin buchen
      </Button>

      <Snackbar open={toast.open} autoHideDuration={2200} onClose={() => setToast(p=>({...p, open:false}))}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast(p=>({...p, open:false}))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </div>
  )
}