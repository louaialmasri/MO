// my-booking-app/app/admin/availability/page.tsx

'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import {
  getAvailability, createAvailabilityApi, updateAvailabilityApi, deleteAvailabilityApi,
  fetchAllUsers
} from '@/services/api'
import {
  Container, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Chip, Snackbar, Alert
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

type User = { _id: string; email: string; role: 'user'|'staff'|'admin'; name?: string }
type AvailType = 'absence'|'work'|'break'
type Availability = {
  _id: string
  staff: string | { _id: string; name?: string; email?: string }
  type: AvailType
  start: string
  end: string
  note?: string
}

export default function AdminAvailabilityPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const [staffUsers, setStaffUsers] = useState<User[]>([])
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [items, setItems] = useState<Availability[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Availability | null>(null)
  const [form, setForm] = useState<{staffId:string; type:AvailType; start:string; end:string; note?:string}>({
    staffId:'', type:'absence', start:'', end:'', note:''
  })
  const [toast, setToast] = useState<{open:boolean; msg:string; sev:'success'|'error'}>({open:false,msg:'',sev:'success'})

  useEffect(() => {
    if (loading) return
    if (!user) return router.replace('/login')
    if (user.role !== 'admin') return router.replace('/')
  }, [user, loading])

  useEffect(() => {
    (async () => {
      if (!token) return
      const all = await fetchAllUsers(token)
      setStaffUsers(all.filter((u:User)=>u.role==='staff'))
    })()
  }, [token])

  const loadDay = async () => {
    if (!token) return
    const from = dayjs(currentDate).startOf('day').toISOString()
    const to   = dayjs(currentDate).endOf('day').toISOString()
    const data = await getAvailability({ from, to }, token)
    setItems(data)
  }

  useEffect(() => { loadDay() }, [currentDate, token])

  const openCreate = () => {
    setEditing(null)
    setForm({
      staffId: staffUsers[0]?._id || '',
      type: 'absence',
      start: dayjs(currentDate).format('YYYY-MM-DD'),
      end:   dayjs(currentDate).format('YYYY-MM-DD'),
      note: ''
    })
    setDialogOpen(true)
  }

  const openEdit = (a: Availability) => {
    setEditing(a)
    const sid = typeof a.staff === 'string' ? a.staff : a.staff._id
    setForm({
      staffId: sid,
      type: a.type,
      start: a.type === 'absence' ? dayjs(a.start).format('YYYY-MM-DD') : dayjs(a.start).format('YYYY-MM-DDTHH:mm'),
      end:   a.type === 'absence' ? dayjs(a.end).format('YYYY-MM-DD')   : dayjs(a.end).format('YYYY-MM-DDTHH:mm'),
      note: a.note || ''
    })
    setDialogOpen(true)
  }

  const save = async () => {
    try {
      if (!token) return
      let start = form.start, end = form.end
      if (form.type === 'absence') {
        // Setze Uhrzeit auf Tagesgrenzen
        start = dayjs(form.start).startOf('day').toISOString()
        end   = dayjs(form.end).endOf('day').toISOString()
      } else {
        start = new Date(form.start).toISOString()
        end   = new Date(form.end).toISOString()
      }
      if (editing) {
        await updateAvailabilityApi(editing._id, {
          staffId: form.staffId,
          type: form.type,
          start,
          end,
          note: form.note
        }, token)
        setToast({open:true,msg:'Eintrag aktualisiert',sev:'success'})
      } else {
        await createAvailabilityApi({
          staffId: form.staffId,
          type: form.type,
          start,
          end,
          note: form.note
        }, token)
        setToast({open:true,msg:'Eintrag erstellt',sev:'success'})
      }
      setDialogOpen(false)
      await loadDay()
    } catch {
      setToast({open:true,msg:'Fehler beim Speichern',sev:'error'})
    }
  }

  const remove = async (id: string) => {
    try {
      if (!token) return
      await deleteAvailabilityApi(id, token)
      setToast({open:true,msg:'Eintrag gelöscht',sev:'success'})
      await loadDay()
    } catch {
      setToast({open:true,msg:'Fehler beim Löschen',sev:'error'})
    }
  }

  // Gruppiert je Staff für die Tagesliste
  const grouped = useMemo(() => {
    const m: Record<string, { staff:User; items:Availability[] }> = {}
    for (const a of items) {
      if (!a.staff) continue; // KORREKTUR: Überspringt Einträge ohne gültigen Mitarbeiter
      const sid = typeof a.staff === 'string' ? a.staff : a.staff._id
      const staff = staffUsers.find(s => s._id === sid)
      if (!staff) continue
      if (!m[sid]) m[sid] = { staff, items: [] }
      m[sid].items.push(a)
    }
    return Object.values(m)
  }, [items, staffUsers])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[
        { label: 'Mein Salon', href: '/admin' },
        { label: 'Abwesenheiten & Arbeitszeiten' },
      ]} />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={() => setCurrentDate(dayjs(currentDate).subtract(1,'day').toDate())}>◀</Button>
        <Button variant="outlined" onClick={() => setCurrentDate(new Date())}>Heute</Button>
        <Typography sx={{ fontWeight: 700 }}>{dayjs(currentDate).format('ddd, DD. MMM YYYY')}</Typography>
        <Button variant="outlined" onClick={() => setCurrentDate(dayjs(currentDate).add(1,'day').toDate())}>▶</Button>
        <Button variant="contained" onClick={openCreate} sx={{ ml: 'auto' }}>
          Block hinzufügen
        </Button>
      </Stack>

      {grouped.map(g => (
        <div key={g.staff._id} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginBottom:12 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{g.staff.name || g.staff.email}</Typography>
          </Stack>
          {g.items.length === 0 && <Typography color="text.secondary">Keine Einträge</Typography>}
          {g.items.map(a => (
            <Stack key={a._id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
              <Chip
                label={a.type === 'absence' ? 'Abwesenheit' : a.type === 'break' ? 'Pause' : 'Arbeitszeit'}
                color={a.type === 'work' ? 'success' : 'default'}
                size="small"
              />
              <Typography>
                {dayjs(a.start).format('HH:mm')} – {dayjs(a.end).format('HH:mm')}
                {a.note ? ` • ${a.note}` : ''}
              </Typography>
              <span style={{ flex: 1 }} />
              <IconButton onClick={() => openEdit(a)}><EditIcon /></IconButton>
              <IconButton color="error" onClick={() => remove(a._id)}><DeleteIcon /></IconButton>
            </Stack>
          ))}
        </div>
      ))}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Eintrag bearbeiten' : 'Neuen Eintrag anlegen'}</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:2 }}>
          <TextField
            select label="Mitarbeiter" value={form.staffId}
            onChange={e=> setForm(p=>({...p, staffId: e.target.value}))}
          >
            {staffUsers.map(s => <MenuItem key={s._id} value={s._id}>{s.name || s.email}</MenuItem>)}
          </TextField>
          <TextField
            select label="Typ" value={form.type}
            onChange={e=> setForm(p=>({...p, type: e.target.value as AvailType}))}
          >
            <MenuItem value="absence">Abwesenheit</MenuItem>
            <MenuItem value="break">Pause</MenuItem>
            <MenuItem value="work">Arbeitszeit</MenuItem>
          </TextField>
          {form.type === 'absence' ? (
            <>
              <TextField type="date" label="Start" value={form.start} onChange={e=> setForm(p=>({...p, start: e.target.value}))} InputLabelProps={{shrink:true}} />
              <TextField type="date" label="Ende"  value={form.end}   onChange={e=> setForm(p=>({...p, end: e.target.value}))}   InputLabelProps={{shrink:true}} />
            </>
          ) : (
            <>
              <TextField type="datetime-local" label="Start" value={form.start} onChange={e=> setForm(p=>({...p, start: e.target.value}))} InputLabelProps={{shrink:true}} />
              <TextField type="datetime-local" label="Ende"  value={form.end}   onChange={e=> setForm(p=>({...p, end: e.target.value}))}   InputLabelProps={{shrink:true}} />
            </>
          )}
          <TextField label="Notiz (optional)" value={form.note || ''} onChange={e=> setForm(p=>({...p, note: e.target.value}))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={save}>Speichern</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={() => setToast(p=>({...p, open:false}))}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={()=> setToast(p=>({...p, open:false}))}>{toast.msg}</Alert>
      </Snackbar>
    </Container>
  )
}