'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { fetchServices, fetchStaff, fetchAllUsers, createBooking, fetchTimeslots } from '@/services/api'
import { TextField, MenuItem, Button, Snackbar, Alert } from '@mui/material'

type User = { _id: string; email: string; role: 'user' | 'staff' | 'admin'; name?: string }
type Service = { _id: string; title: string; duration?: number; price?: number }
type Staff = { _id: string; email: string; name?: string; skills?: (string | { _id: string })[] }

export default function BookingPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const isPrivileged = user?.role === 'admin' || user?.role === 'staff'

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
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
        const [svc, stf] = await Promise.all([fetchServices(), fetchStaff()])
        setServices(svc); setStaff(stf)
        if (isPrivileged && token) {
          const all = await fetchAllUsers(token)
          setCustomers(all.filter((u:User)=>u.role==='user'))
        }
      } catch {
        setToast({open:true, msg:'Fehler beim Laden der Daten', sev:'error'})
      }
    })()
  }, [isPrivileged, token])

  // Staff-Skill-Filter
  const filteredStaff = useMemo(() => {
    if (!selectedServiceId) return staff
    return staff.filter(s =>
      (s.skills ?? []).some((k:any) => (typeof k === 'string' ? k : k._id) === selectedServiceId)
    )
  }, [staff, selectedServiceId])

  // Timeslots laden, sobald Service + Staff + Date gesetzt
  useEffect(() => {
    (async () => {
      setSlots([]); setSlot('')
      if (!token || !selectedServiceId || !selectedStaffId || !date) return
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
        onChange={(e)=> { setSelectedServiceId(e.target.value); setSelectedStaffId(''); setSlots([]); setSlot('') }}
        fullWidth margin="normal" required>
        {services.map(s => <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>)}
      </TextField>

      <TextField select label="Mitarbeiter" value={selectedStaffId}
        onChange={(e)=> { setSelectedStaffId(e.target.value); setSlots([]); setSlot('') }}
        fullWidth margin="normal" required disabled={!selectedServiceId}
        helperText={!selectedServiceId ? 'Bitte zuerst Service wählen' : undefined}>
        {filteredStaff.map(s => <MenuItem key={s._id} value={s._id}>{s.name || s.email}</MenuItem>)}
      </TextField>

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
