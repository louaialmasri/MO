'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { fetchSalons, createSalonApi } from '@/services/api'
import { Container, Typography, Stack, TextField, Button, Card, CardContent, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'
import DeleteIcon from '@mui/icons-material/Delete'
import { deleteSalonApi } from '@/services/api'

export default function AdminSalonsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [salons, setSalons] = useState<{_id:string; name:string; logoUrl?:string}[]>([])
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [toast, setToast] = useState<{open:boolean; msg:string; sev:'success'|'error'}>({open:false,msg:'',sev:'success'})
  const [confirmId, setConfirmId] = useState<string|null>(null)

  useEffect(() => {
    if (!user) return router.replace('/login')
    if (user.role !== 'admin') return router.replace('/')
    ;(async () => setSalons(await fetchSalons()))()
  }, [user])

    const [activeSalonId, setActiveSalonId] = useState<string|null>(null)

  const createSalon = async () => {
    if (!name.trim()) { setToast({open:true,msg:'Name erforderlich',sev:'error'}); return }
    try {
      const salon = await createSalonApi({ name, logoUrl: logoUrl || undefined })
      setSalons(prev => [...prev, salon])
      setName(''); setLogoUrl('')
      setToast({open:true,msg:'Salon erstellt',sev:'success'})
    } catch { setToast({open:true,msg:'Fehler beim Erstellen',sev:'error'}) }
  }

  const doDelete = async () => {
    if (!confirmId) return
    try {
      await deleteSalonApi(confirmId)
      setSalons(prev => prev.filter(s => s._id !== confirmId))

      // Wenn der aktive Salon gelöscht wurde -> auf anderen umschalten
      if (activeSalonId === confirmId) {
        const fallback = salons.find(s => s._id !== confirmId)?._id || null
        if (fallback) {
          localStorage.setItem('activeSalonId', fallback)
          setActiveSalonId(fallback)
        } else {
          localStorage.removeItem('activeSalonId')
          setActiveSalonId(null)
        }
        // optional: Router-Refresh, damit Header sofort greifen
        router.refresh?.()
      }

      setConfirmId(null)
      setToast({open:true, msg:'Salon gelöscht', sev:'success'})
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Löschen fehlgeschlagen'
      setToast({open:true, msg, sev:'error'})
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{label:'Mein Salon', href:'/admin'}, {label:'Salons'}]} />
      <Typography variant="h4" fontWeight={800} gutterBottom>Salons</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField label="Name" value={name} onChange={e=>setName(e.target.value)} />
        <TextField label="Logo URL (optional)" value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} sx={{ minWidth: 360 }} />
        <Button variant="contained" onClick={createSalon}>Neuen Salon anlegen</Button>
      </Stack>

      <Stack spacing={2}>
          {salons.map(s => (
            <Card key={s._id} variant="outlined">
              <CardContent style={{ display:'flex', alignItems:'center', gap:12 }}>
                <Typography fontWeight={700} style={{ flex:1 }}>
                  {s.name}
                </Typography>
                <IconButton color="error" onClick={() => setConfirmId(s._id)}>
                  <DeleteIcon />
                </IconButton>
              </CardContent>
            </Card>
          ))}
      </Stack>

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)}>
        <DialogTitle>Salon löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Dies kann nur erfolgen, wenn keine Mitarbeiter, Services, Buchungen oder Abwesenheiten mehr mit dem Salon verknüpft sind.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>Abbrechen</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Löschen</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2200} onClose={()=>setToast(p=>({...p, open:false}))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Container>
  )
}
