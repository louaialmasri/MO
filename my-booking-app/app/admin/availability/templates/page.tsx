'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  fetchSalons, listStaffAssignmentsForSalon,
  fetchTemplates, createTemplateApi, updateTemplateApi, deleteTemplateApi, applyTemplateApi,
  type AvailabilityTemplate, type TemplateDay, type TemplateSegment
} from '@/services/api'
import {
  Container, Stack, Typography, Paper, Divider, TextField, MenuItem, Button, IconButton,
  List, ListItem, ListItemText, Tooltip, Snackbar, Alert, Chip, Box,
  ListItemButton
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

const WEEKDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa']

function emptyWeek(): TemplateDay[] {
  return Array.from({ length: 7 }, (_, i) => ({ weekday: i, segments: [] }))
}

export default function TemplatesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [salons, setSalons] = useState<{_id:string; name:string}[]>([])
  const [salonId, setSalonId] = useState<string>('')

  const [staff, setStaff] = useState<{_id:string; name?:string; email:string}[]>([])
  const [staffId, setStaffId] = useState<string>('')

  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const selected = useMemo(() => templates.find(t => t._id === selectedId) || null, [templates, selectedId])

  const [days, setDays] = useState<TemplateDay[]>(emptyWeek())
  const [tplName, setTplName] = useState('')

  // apply
  const [weekStart, setWeekStart] = useState<string>('') // yyyy-mm-dd (Montag)
  const [weeks, setWeeks] = useState<number>(1)
  const [replace, setReplace] = useState<boolean>(true)

  const [toast, setToast] = useState<{open:boolean; msg:string; sev:'success'|'error'}>({open:false,msg:'',sev:'success'})

  useEffect(() => {
      if (loading) return
      if (!user) return router.replace('/login')
      if (user.role !== 'admin') return router.replace('/')
    }, [user, loading])

  useEffect(() => {
    (async () => {
      const s = await fetchSalons()
      setSalons(s)
      if (s[0]?._id) setSalonId(s[0]._id)
    })()
  }, [])

  useEffect(() => {
    (async () => {
      if (!salonId) return
      const st = await listStaffAssignmentsForSalon(salonId)
      setStaff(st.map(u => ({ _id: u._id, name: (u as any).name, email: u.email })))
      if (st[0]?._id) setStaffId(st[0]._id)
    })()
  }, [salonId])

  useEffect(() => {
    (async () => {
      if (!staffId) { setTemplates([]); setSelectedId(''); setDays(emptyWeek()); setTplName(''); return }
      const list = await fetchTemplates(staffId)
      setTemplates(list)
      if (list[0]?._id) {
        setSelectedId(list[0]._id)
        setDays(list[0].days?.length ? list[0].days : emptyWeek())
        setTplName(list[0].name)
      } else {
        setSelectedId('')
        setDays(emptyWeek())
        setTplName('')
      }
    })()
  }, [staffId])

  const addSeg = (wd: number, type: 'work'|'break') => {
    setDays(prev => prev.map(d => d.weekday === wd
      ? { ...d, segments: [...d.segments, { start:'09:00', end:'17:00', type } as TemplateSegment] }
      : d
    ))
  }

  const setSeg = (wd: number, idx: number, patch: Partial<TemplateSegment>) => {
    setDays(prev => prev.map(d => {
      if (d.weekday !== wd) return d
      const segs = d.segments.slice()
      segs[idx] = { ...segs[idx], ...patch }
      return { ...d, segments: segs }
    }))
  }

  const delSeg = (wd: number, idx: number) => {
    setDays(prev => prev.map(d => {
      if (d.weekday !== wd) return d
      const segs = d.segments.slice()
      segs.splice(idx, 1)
      return { ...d, segments: segs }
    }))
  }

  const copyDayToAll = (src: number) => {
    const srcSegs = days.find(d => d.weekday === src)?.segments || []
    setDays(prev => prev.map(d => d.weekday === src ? d : { ...d, segments: srcSegs }))
    setToast({open:true,msg:`${WEEKDAYS[src]} auf alle Tage kopiert`,sev:'success'})
  }

  const saveTemplate = async () => {
    try {
      if (!staffId) { setToast({open:true,msg:'Bitte Mitarbeiter wählen',sev:'error'}); return }
      if (!tplName.trim()) { setToast({open:true,msg:'Name erforderlich',sev:'error'}); return }

      if (selected) {
        const upd = await updateTemplateApi(selected._id, { name: tplName.trim(), days })
        setTemplates(prev => prev.map(t => t._id === upd._id ? upd : t))
        setToast({open:true,msg:'Template gespeichert',sev:'success'})
      } else {
        const created = await createTemplateApi({ name: tplName.trim(), staff: staffId, days })
        setTemplates(prev => [created, ...prev])
        setSelectedId(created._id)
        setToast({open:true,msg:'Template erstellt',sev:'success'})
      }
    } catch {
      setToast({open:true,msg:'Speichern fehlgeschlagen',sev:'error'})
    }
  }

  const newTemplate = () => {
    setSelectedId('')
    setTplName('Neues Template')
    setDays(emptyWeek())
  }

  const removeTemplate = async (id: string) => {
    try {
      await deleteTemplateApi(id)
      const rest = templates.filter(t => t._id !== id)
      setTemplates(rest)
      if (selectedId === id) {
        if (rest[0]) {
          setSelectedId(rest[0]._id)
          setTplName(rest[0].name)
          setDays(rest[0].days)
        } else {
          setSelectedId(''); setTplName(''); setDays(emptyWeek())
        }
      }
      setToast({open:true,msg:'Template gelöscht',sev:'success'})
    } catch {
      setToast({open:true,msg:'Löschen fehlgeschlagen',sev:'error'})
    }
  }

  const applyNow = async () => {
    try {
      if (!selectedId) { setToast({open:true,msg:'Template wählen',sev:'error'}); return }
      if (!weekStart) { setToast({open:true,msg:'Start der Woche wählen',sev:'error'}); return }
      const res = await applyTemplateApi({ templateId: selectedId, weekStart, weeks, replace })
      setToast({open:true,msg:`Generiert: ${res.created} • Ersetzt: ${res.replaced}`,sev:'success'})
    } catch {
      setToast({open:true,msg:'Anwenden fehlgeschlagen',sev:'error'})
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{label:'Mein Salon', href:'/admin'}, {label:'Arbeitszeiten-Templates'}]} />
      <Typography variant="h4" fontWeight={800} gutterBottom>Arbeitszeiten-Templates</Typography>

      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select label="Salon" value={salonId} onChange={e=>setSalonId(e.target.value)} sx={{ minWidth: 240 }}>
          {salons.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
        </TextField>
        <TextField select label="Mitarbeiter" value={staffId} onChange={e=>setStaffId(e.target.value)} sx={{ minWidth: 280 }}>
          {staff.map(s => <MenuItem key={s._id} value={s._id}>{s.name || s.email}</MenuItem>)}
        </TextField>
        <Box flex={1} />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={newTemplate}>Neu</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={saveTemplate}>Speichern</Button>
      </Stack>

      <Stack direction={{ xs:'column', md:'row' }} spacing={2}>
        {/* Templates-Liste */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 280 }}>
          <Typography variant="h6" fontWeight={700}>Templates</Typography>
          <Divider sx={{ my: 1 }} />
          <List dense>
            {templates.map(t => (
                <ListItem
                key={t._id}
                secondaryAction={
                    <Tooltip title="Löschen">
                    <IconButton color="error" onClick={() => removeTemplate(t._id)}>
                        <DeleteIcon />
                    </IconButton>
                    </Tooltip>
                }
                disablePadding
                >
                <ListItemButton
                    selected={t._id === selectedId}
                    onClick={() => {
                    setSelectedId(t._id);
                    setTplName(t.name);
                    setDays(t.days);
                    }}
                >
                    <ListItemText primary={t.name} />
                </ListItemButton>
                </ListItem>
            ))}
            </List>
          <Divider sx={{ my: 1 }} />
          <TextField label="Template-Name" fullWidth value={tplName} onChange={e=>setTplName(e.target.value)} />
        </Paper>

        {/* Wochen-Editor */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>Woche bearbeiten</Typography>
            <Tooltip title="Mo → alle kopieren">
              <IconButton onClick={()=>copyDayToAll(1)}><ContentCopyIcon /></IconButton>
            </Tooltip>
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={1}>
            {days.map(d => (
              <Paper key={d.weekday} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs:'column', sm:'row' }} spacing={1} alignItems="center">
                  <Typography sx={{ minWidth: 48, fontWeight: 700 }}>{WEEKDAYS[d.weekday]}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {d.segments.map((seg, idx) => (
                      <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: .5 }}>
                        <Chip size="small" label={seg.type === 'work' ? 'Work' : 'Pause'} />
                        <TextField type="time" size="small" value={seg.start} onChange={e=>setSeg(d.weekday, idx, { start: e.target.value })} />
                        <TextField type="time" size="small" value={seg.end}   onChange={e=>setSeg(d.weekday, idx, { end: e.target.value })} />
                        <IconButton size="small" color="error" onClick={()=>delSeg(d.weekday, idx)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    ))}
                  </Stack>
                  <Box flex={1} />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={()=>addSeg(d.weekday,'work')}>+ Work</Button>
                    <Button size="small" variant="text" onClick={()=>addSeg(d.weekday,'break')}>+ Pause</Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>

        {/* Anwenden */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 320 }}>
          <Typography variant="h6" fontWeight={700}>Woche generieren</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={2}>
            <TextField label="Start (Montag)" type="date" value={weekStart} onChange={e=>setWeekStart(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Anzahl Wochen" type="number" value={weeks} onChange={e=>setWeeks(Number(e.target.value)||1)} inputProps={{ min:1, max:12 }} />
            <TextField select label="Ersetzen" value={replace ? 'yes' : 'no'} onChange={e=>setReplace(e.target.value==='yes')}>
              <MenuItem value="yes">Bestehende Work/Pause dieser Tage ersetzen</MenuItem>
              <MenuItem value="no">Nur hinzufügen (Konflikte werden übersprungen)</MenuItem>
            </TextField>
            <Button variant="contained" onClick={applyNow}>Jetzt anwenden</Button>
            <Typography variant="body2" color="text.secondary">
              Abwesenheiten (Urlaub/Krank/Frei) bleiben bestehen und blocken bei Bedarf die Slots.
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar open={toast.open} autoHideDuration={2200} onClose={()=>setToast(p=>({...p, open:false}))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Container>
  )
}
