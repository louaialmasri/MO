// my-booking-app/app/admin/catalog/page.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  fetchSalons, createSalonApi, deleteSalonApi,
  fetchGlobalStaff, createGlobalStaff, deleteGlobalUser,
  fetchGlobalServices, createGlobalService, deleteGlobalService,
  listStaffAssignmentsForSalon, assignStaffToSalon, unassignStaffFromSalon,
  listServiceAssignmentsForSalon, assignServiceToSalon, unassignServiceFromSalon,
  type Salon, type GlobalStaff, type GlobalService,
  SalonGuard,
  fetchSalonsWithGuards, updateUserRole, 
  updateGlobalService
} from '@/services/api'

import {
  Container, Paper, Tabs, Tab, Divider, Stack, Box, Typography, TextField, MenuItem,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, Tooltip, Snackbar, Alert, Select, FormControl, InputLabel
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

function fuzzy(txt: string, q: string) { return txt.toLowerCase().includes(q.toLowerCase()) }

export default function AdminCatalogPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'staff'|'services'|'salons'>('staff')
  const [salons, setSalons] = useState<Salon[]>([])
  const [salonId, setSalonId] = useState<string>('')

  // global catalogs
  const [gStaff, setGStaff] = useState<GlobalStaff[]>([])
  const [gServices, setGServices] = useState<GlobalService[]>([])

  // assignments
  const [assignedStaff, setAssignedStaff] = useState<GlobalStaff[]>([])
  const [assignedServices, setAssignedServices] = useState<(GlobalService & { price:number; duration:number })[]>([])

  // search
  const [qLeft, setQLeft] = useState('')
  const [qRight, setQRight] = useState('')

  // dialogs
  const [dlgStaffOpen, setDlgStaffOpen] = useState(false)
  const [dlgServiceOpen, setDlgServiceOpen] = useState(false)
  const [dlgSalonOpen, setDlgSalonOpen] = useState(false)
  const [ovrOpen, setOvrOpen] = useState(false)
  const [ovrSvc, setOvrSvc] = useState<GlobalService | null>(null)
  const [ovrPrice, setOvrPrice] = useState<number | ''>('')
  const [ovrDur, setOvrDur] = useState<number | ''>('')

  // forms
  const [formStaff, setFormStaff] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [formService, setFormService] = useState({ title: '', description: '', price: '', duration: '' } as any)
  const [formSalon, setFormSalon] = useState({ name: '', logoUrl: '' })

  const [toast, setToast] = useState<{open:boolean; msg:string; sev:'success'|'error'}>({open:false,msg:'',sev:'success'})

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  useEffect(() => {
      if (loading) return
      if (!user) return router.replace('/login')
      if (user.role !== 'admin') return router.replace('/')
    }, [user, loading])

  useEffect(() => {
    (async () => {
      const [salonList, staffList, svcList] = await Promise.all([
        fetchSalons(), fetchGlobalStaff(), fetchGlobalServices()
      ])
      setSalons(salonList)
      if (salonList[0]?._id) setSalonId(salonList[0]._id)
      setGStaff(staffList)
      setGServices(svcList)
    })().catch(() => {})
  }, [])

  useEffect(() => {
    (async () => {
      if (!salonId) return
      if (tab === 'staff') {
        setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
      } else if (tab === 'services') {
        setAssignedServices(await listServiceAssignmentsForSalon(salonId))
      }
    })()
  }, [salonId, tab])

  const leftList = useMemo(() => {
    if (tab === 'staff') {
      return qLeft ? gStaff.filter(s => fuzzy(`${s.firstName||''} ${s.lastName||''} ${s.email}`, qLeft)) : gStaff
    }
    if (tab === 'services') {
      return qLeft ? gServices.filter(s => fuzzy(`${s.title} ${s.description||''}`, qLeft)) : gServices
    }
    return salons
  }, [tab, qLeft, gStaff, gServices, salons])

  const rightList = useMemo(() => {
    if (tab === 'staff') {
      return qRight ? assignedStaff.filter(s => fuzzy(`${s.firstName||''} ${s.lastName||''} ${s.email}`, qRight)) : assignedStaff
    }
    if (tab === 'services') {
      return qRight ? assignedServices.filter(s => fuzzy(`${s.title} ${s.price}`, qRight)) : assignedServices
    }
    return [] // Salons-Tab hat keine rechte Spalte
  }, [tab, qRight, assignedStaff, assignedServices])


  // actions
  const onAssign = async (id: string) => {
    if (!salonId) return
    if (tab === 'staff') {
      await assignStaffToSalon(id, salonId)
      setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
      setToast({open:true,msg:'Mitarbeiter zugeordnet',sev:'success'})
      await reloadGuards()
    } else if (tab === 'services') {
      const svc = gServices.find(s => s._id === id) || null
      setOvrSvc(svc); setOvrPrice(''); setOvrDur(''); setOvrOpen(true)
    }
  }
  const onApplyOverrides = async () => {
    if (!ovrSvc || !salonId) return
    await assignServiceToSalon({
      serviceId: ovrSvc._id, salonId,
      priceOverride: ovrPrice === '' ? null : Number(ovrPrice),
      durationOverride: ovrDur === '' ? null : Number(ovrDur),
    })
    setAssignedServices(await listServiceAssignmentsForSalon(salonId))
    setOvrOpen(false)
    setToast({open:true,msg:'Service zugeordnet',sev:'success'})
    await reloadGuards()
  }
  const onUnassign = async (id: string) => {
    if (!salonId) return
    if (tab === 'staff') {
      await unassignStaffFromSalon(id, salonId)
      setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
      setToast({open:true,msg:'Mitarbeiter entfernt',sev:'success'})
      await reloadGuards()
    } else if (tab === 'services') {
      await unassignServiceFromSalon(id, salonId)
      setAssignedServices(await listServiceAssignmentsForSalon(salonId))
      setToast({open:true,msg:'Service entfernt',sev:'success'})
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
  try {
    const token = localStorage.getItem('token') || ''
    await updateUserRole(userId, newRole, token);
    setGStaff(await fetchGlobalStaff()); // Wichtig: Liste neu laden, um die Änderung zu sehen
    setToast({ open: true, msg: 'Benutzerrolle erfolgreich aktualisiert', sev: 'success' });
  } catch (e: any) {
    const errorMsg = e?.response?.data?.message || 'Fehler beim Aktualisieren der Rolle.';
    setToast({ open: true, msg: errorMsg, sev: 'error' });
  }
};

  // create global
  const createStaff = async () => {
    if (!formStaff.email || !formStaff.password || !formStaff.firstName || !formStaff.lastName) {
      setToast({ open: true, msg: 'Bitte alle Felder ausfüllen', sev: 'error' })
      return
    }
    try {
      await createGlobalStaff(formStaff) // sendet das ganze formStaff Objekt
      setDlgStaffOpen(false)
      setToast({ open: true, msg: 'Mitarbeiter angelegt', sev: 'success' })
      await reloadGuards() // neu laden
    } catch (e) {
      console.error('Fehler beim Anlegen des Staff-Mitglieds', e)
      setToast({ open: true, msg: 'Mitarbeiter konnte nicht angelegt werden', sev: 'error' })
    }
  }

  const createService = async () => {
    const { title, price, duration } = formService
    if (!title || !price || !duration) { setToast({open:true,msg:'Titel, Preis, Dauer erforderlich',sev:'error'}); return }
    await createGlobalService({ title, description: formService.description || undefined, price: Number(price), duration: Number(duration) })
    setGServices(await fetchGlobalServices())
    setDlgServiceOpen(false); setFormService({ title:'', description:'', price:'', duration:'' })
    setToast({open:true,msg:'Service angelegt',sev:'success'})
  }

  const updateService = async () => {
  if (!editingServiceId) return;

  try {
    const { title, price, duration } = formService;
    if (!title || !price || !duration) {
      setToast({ open: true, msg: 'Titel, Preis, Dauer erforderlich', sev: 'error' });
      return;
    }
    await updateGlobalService(editingServiceId, {
      title,
      description: formService.description || undefined,
      price: Number(price),
      duration: Number(duration),
    });

    setGServices(await fetchGlobalServices()); // Liste aktualisieren
    setDlgServiceOpen(false); // Dialog schließen
    setToast({ open: true, msg: 'Service erfolgreich aktualisiert', sev: 'success' });
  } catch (e: any) {
    setToast({ open: true, msg: 'Fehler beim Speichern', sev: 'error' });
  }
};

  const createSalon = async () => {
    if (!formSalon.name) { setToast({open:true,msg:'Name erforderlich',sev:'error'}); return }
    const s = await createSalonApi({ name: formSalon.name, logoUrl: formSalon.logoUrl || undefined })
    const list = await fetchSalons()
    setSalons(list)
    setSalonId(s._id) // direkt zum neuen Salon springen
    setDlgSalonOpen(false); setFormSalon({ name:'', logoUrl:'' })
    setToast({open:true,msg:'Salon angelegt',sev:'success'})
    await reloadGuards()
  }

  // delete global
  const deleteStaff = async (id: string) => {
    await deleteGlobalUser(id)
    setGStaff(await fetchGlobalStaff())
    // entfernt sich ggf. auch aus Zuweisungsliste beim Reload
    if (salonId) setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
    setToast({open:true,msg:'Staff gelöscht',sev:'success'})
  }
  const deleteService = async (id: string) => {
    await deleteGlobalService(id)
    setGServices(await fetchGlobalServices())
    if (salonId) setAssignedServices(await listServiceAssignmentsForSalon(salonId))
    setToast({open:true,msg:'Service gelöscht',sev:'success'})
  }
  const deleteSalon = async (id: string) => {
    try {
      await deleteSalonApi(id)
      const list = await fetchSalons()
      setSalons(list)
      if (salonId === id) setSalonId(list[0]?._id || '')
      await reloadGuards()
      setToast({open:true,msg:'Salon gelöscht',sev:'success'})
    } catch (e:any) {
      const msg = e?.response?.data?.message || 'Löschen fehlgeschlagen'
      setToast({open:true,msg,sev:'error'})
      await reloadGuards() // Status aktualisieren (falls sich was geändert hat)
    }
  }
  // Delete-Button letzter Salon
  const [salonGuards, setSalonGuards] = useState<Record<string, SalonGuard>>({})
  useEffect(() => {
    (async () => {
      const guards = await fetchSalonsWithGuards()
      setSalonGuards(Object.fromEntries(guards.map(g => [g._id, g])))
    })().catch(() => {})
  }, [])

  // nach Create/Delete unbedingt Guards neu laden:
  const reloadGuards = async () => {
    const guards = await fetchSalonsWithGuards()
    setSalonGuards(Object.fromEntries(guards.map(g => [g._id, g])))
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{label:'Mein Salon', href:'/admin'}, {label:'Katalog & Zuordnungen'}]} />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={800} sx={{ flex:1 }}>Katalog & Zuordnungen</Typography>
        {tab !== 'salons' && (
          <TextField select size="small" label="Salon" value={salonId} onChange={(e)=> setSalonId(e.target.value)} sx={{ minWidth: 220 }}>
            {salons.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} aria-label="tabs">
          <Tab value="staff" label="Staff (global → zuordnen)" />
          <Tab value="services" label="Services (global → zuordnen)" />
          <Tab value="salons" label="Salons (global)" />
        </Tabs>
        <Divider />
        <Box sx={{ p: 2 }}>
          {tab === 'salons' ? (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TextField size="small" placeholder="Suchen…" value={qLeft} onChange={(e)=> setQLeft(e.target.value)} />
                <Box sx={{ flex:1 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={()=> setDlgSalonOpen(true)}>Salon anlegen</Button>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <List dense>
                {(qLeft ? salons.filter(s=>fuzzy(`${s.name} ${s.logoUrl||''}`, qLeft)) : salons).map(s => (
                  <ListItem
                    key={s._id}
                    secondaryAction={
                      (() => {
                        const guard = salonGuards[s._id]
                        const disabled = guard ? !guard.deletable : false
                        const title = guard
                          ? (disabled ? guard.reasons.join(' • ') : 'Salon löschen')
                          : 'Salon löschen'
                        return (
                          <Tooltip title={title}>
                            <span>
                              <IconButton color="error" onClick={()=> deleteSalon(s._id)} disabled={disabled}>
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )
                      })()
                    }
                  >
                    <ListItemText primary={s.name} secondary={s.logoUrl} />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Stack direction={{ xs:'column', md:'row' }} spacing={2}>
              {/* LEFT: global katalog */}
              <Paper variant="outlined" sx={{ p:2, flex:1, borderRadius:2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <TextField size="small" placeholder="Suchen…" value={qLeft} onChange={(e)=> setQLeft(e.target.value)} />
                  <Box sx={{ flex:1 }} />
                  {tab === 'staff' ? (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={()=> setDlgStaffOpen(true)}>Staff anlegen</Button>
                  ) : (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                      setEditingServiceId(null); // Wichtig: Bearbeitungsmodus ausschalten
                      setFormService({ title: '', description: '', price: '', duration: '' }); // Formular leeren
                      setDlgServiceOpen(true);
                    }}>
                      Service anlegen
                    </Button>
                  )}
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <List dense>
                  {(leftList as Array<GlobalStaff | GlobalService>).map(item => {
                    const id = (item as any)._id
                    const already = tab === 'staff'
                      ? assignedStaff.some(s => s._id === id)
                      : assignedServices.some(s => s._id === id)
                    return (
                      <ListItem key={id}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            
                            {tab === 'staff' && (
                              <FormControl size="small" sx={{ minWidth: 100 }}>
                                <Select
                                  value={(item as GlobalStaff).role}
                                  onChange={(e) => handleRoleChange(id, e.target.value)}
                                >
                                  <MenuItem value="user">user</MenuItem>
                                  <MenuItem value="staff">staff</MenuItem>
                                  <MenuItem value="admin">admin</MenuItem>
                                </Select>
                              </FormControl>
                            )}

                            {tab === 'services' && (
                              <Tooltip title="Service bearbeiten">
                                <IconButton onClick={() => {
                                  const serviceToEdit = gServices.find(s => s._id === id);
                                  if (serviceToEdit) {
                                    setEditingServiceId(id);
                                    setFormService(serviceToEdit);
                                    setDlgServiceOpen(true);
                                  }
                                }}>
                                  <TuneIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            <Tooltip title={already ? 'Schon zugeordnet' : 'Zum Salon zuordnen'}>
                              <span>
                                <IconButton disabled={already} onClick={() => onAssign(id)}><AddIcon /></IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Global löschen">
                              <IconButton color="error" onClick={() => tab === 'staff' ? deleteStaff(id) : deleteService(id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        }>
                        <ListItemText
                          primary={tab === 'staff' ? `${(item as GlobalStaff).firstName} ${(item as GlobalStaff).lastName}` : (item as GlobalService).title}
                          secondary={
                            tab === 'staff'
                              ? `${(item as GlobalStaff).email} • Rolle: ${(item as GlobalStaff).role}`
                              : `${(item as GlobalService).price}€ • ${(item as GlobalService).duration} Min`
                          }
                        />
                      </ListItem>
                    )
                  })}
                </List>
              </Paper>

              {/* RIGHT: zugeordnet im Salon */}
              <Paper variant="outlined" sx={{ p:2, flex:1, borderRadius:2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography fontWeight={700}>Zugeordnet: {salons.find(s=>s._id===salonId)?.name || ''}</Typography>
                  <Box sx={{ flex:1 }} />
                  <TextField size="small" placeholder="Suchen…" value={qRight} onChange={(e)=> setQRight(e.target.value)} />
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <List dense>
                  {(rightList as Array<GlobalStaff | GlobalService>).map(item => {
                    const id = (item as any)._id
                    return (
                      <ListItem key={id}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            {tab==='services' && (
                              <Tooltip title="Overrides setzen">
                                <IconButton onClick={() => {
                                  const svc = gServices.find(s => s._id === id) || null
                                  setOvrSvc(svc)
                                  const cur = assignedServices.find(s => s._id === id)
                                  setOvrPrice(cur?.price ?? '')
                                  setOvrDur(cur?.duration ?? '')
                                  setOvrOpen(true)
                                }}>
                                  <TuneIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Zuordnung entfernen">
                              <IconButton color="error" onClick={()=> onUnassign(id)}><DeleteIcon /></IconButton>
                            </Tooltip>
                          </Stack>
                        }>
                        <ListItemText
                          primary={tab === 'staff' ? `${(item as GlobalStaff).firstName} ${(item as GlobalStaff).lastName}` : (item as GlobalService).title}
                          secondary={
                            tab === 'staff'
                              ? `${(item as GlobalStaff).email} • Rolle: ${(item as GlobalStaff).role}`
                              : `${(item as GlobalService).price}€ • ${(item as GlobalService).duration} Min`
                          }
                        />
                      </ListItem>
                    )
                  })}
                </List>
              </Paper>
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Dialogs */}
      <Dialog open={dlgStaffOpen} onClose={() => setDlgStaffOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Neuen Staff-Mitarbeiter anlegen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Neue Felder für Vor- und Nachname hinzufügen */}
          <TextField label="Vorname" value={formStaff.firstName} onChange={e => setFormStaff(p => ({ ...p, firstName: e.target.value }))} />
          <TextField label="Nachname" value={formStaff.lastName} onChange={e => setFormStaff(p => ({ ...p, lastName: e.target.value }))} />
          <TextField label="E-Mail" type="email" value={formStaff.email} onChange={e => setFormStaff(p => ({ ...p, email: e.target.value }))} />
          <TextField label="Passwort" type="password" value={formStaff.password} onChange={e => setFormStaff(p => ({ ...p, password: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgStaffOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={createStaff}>Anlegen</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={dlgServiceOpen} 
        onClose={() => {
          setDlgServiceOpen(false); 
          setEditingServiceId(null); // Bearbeitungsmodus beim Schließen zurücksetzen
        }} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>
          {editingServiceId ? 'Service bearbeiten' : 'Service anlegen (global)'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Die TextFields bleiben unverändert */}
          <TextField label="Titel" value={formService.title} onChange={e => setFormService({ ...formService, title: e.target.value })} />
          {/* ... andere TextFields ... */}
          <TextField label="Beschreibung" value={formService.description} onChange={e=>setFormService({...formService, description:e.target.value})} />
          <TextField label="Preis (€)" type="number" value={formService.price} onChange={e=>setFormService({...formService, price:e.target.value})} />
          <TextField label="Dauer (Minuten)" type="number" value={formService.duration} onChange={e=>setFormService({...formService, duration:e.target.value})} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDlgServiceOpen(false); setEditingServiceId(null); }}>Abbrechen</Button>
          <Button 
            variant="contained" 
            onClick={editingServiceId ? updateService : createService}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dlgSalonOpen} onClose={()=> setDlgSalonOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Salon anlegen</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:2 }}>
          <TextField label="Name" value={formSalon.name} onChange={e=>setFormSalon({...formSalon, name:e.target.value})} />
          <TextField label="Logo URL (optional)" value={formSalon.logoUrl} onChange={e=>setFormSalon({...formSalon, logoUrl:e.target.value})} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setDlgSalonOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={createSalon}>Anlegen</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ovrOpen} onClose={()=> setOvrOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Overrides für Service {ovrSvc?.title}</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:2 }}>
          <TextField type="number" label="Preis (optional Override)" value={ovrPrice} onChange={e=>setOvrPrice(e.target.value === '' ? '' : Number(e.target.value))} />
          <TextField type="number" label="Dauer in Minuten (optional Override)" value={ovrDur} onChange={e=>setOvrDur(e.target.value === '' ? '' : Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setOvrOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={onApplyOverrides}>Speichern</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2200} onClose={()=>setToast(p=>({...p, open:false}))}
        anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={toast.sev} variant="filled" onClose={()=>setToast(p=>({...p, open:false}))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Container>
  )
}