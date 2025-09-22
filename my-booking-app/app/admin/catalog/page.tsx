'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  fetchSalons, createSalonApi, deleteSalonApi,
  fetchGlobalStaff, createGlobalStaff, deleteGlobalUser,
  fetchGlobalServices, createGlobalService, deleteGlobalService,
  listStaffAssignmentsForSalon, assignStaffToSalon, unassignStaffFromSalon,
  listServiceAssignmentsForSalon, assignServiceToSalon, unassignServiceFromSalon, updateGlobalService,
  fetchServiceCategories, createServiceCategory, updateServiceCategory, deleteServiceCategory,
  type Salon, type GlobalStaff, type GlobalService, type ServiceCategory,
  SalonGuard,
  fetchSalonsWithGuards, updateUserRole,
  updateUserSkills,
} from '@/services/api'

import {
  Container, Paper, Tabs, Tab, Divider, Stack, Box, Typography, TextField, MenuItem,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, Tooltip, Snackbar, Alert, Select, FormControl, InputLabel, FormGroup, FormControlLabel, Checkbox, Chip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import EditIcon from '@mui/icons-material/Edit';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

function fuzzy(txt: string, q: string) { return txt.toLowerCase().includes(q.toLowerCase()) }

export default function AdminCatalogPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'staff' | 'services' | 'salons'>('staff')
  const [salons, setSalons] = useState<Salon[]>([])
  const [salonId, setSalonId] = useState<string>('')

  // global catalogs
  const [gStaff, setGStaff] = useState<GlobalStaff[]>([])
  const [gServices, setGServices] = useState<GlobalService[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);

  // assignments
  const [assignedStaff, setAssignedStaff] = useState<GlobalStaff[]>([])
  const [assignedServices, setAssignedServices] = useState<(GlobalService & { price: number; duration: number })[]>([])

  // search and filter
  const [qLeft, setQLeft] = useState('')
  const [qRight, setQRight] = useState('')
  const [staffFilter, setStaffFilter] = useState<'all' | 'admin' | 'staff' | 'user'>('all');


  // dialogs
  const [dlgStaffOpen, setDlgStaffOpen] = useState(false)
  const [dlgEditStaffOpen, setDlgEditStaffOpen] = useState(false);
  const [dlgServiceOpen, setDlgServiceOpen] = useState(false)
  const [dlgServiceCategoryOpen, setDlgServiceCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [dlgSalonOpen, setDlgSalonOpen] = useState(false)
  const [ovrOpen, setOvrOpen] = useState(false)
  const [ovrSvc, setOvrSvc] = useState<GlobalService | null>(null)
  const [ovrPrice, setOvrPrice] = useState<number | ''>('')
  const [ovrDur, setOvrDur] = useState<number | ''>('')
  const [skillDlgOpen, setSkillDlgOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<GlobalStaff | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  // forms
  const [formStaff, setFormStaff] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [formEditStaff, setFormEditStaff] = useState<GlobalStaff | null>(null);
  const [formService, setFormService] = useState({ title: '', description: '', price: '', duration: '', category: '' })
  const [newServiceCategoryName, setNewServiceCategoryName] = useState('');
  const [formSalon, setFormSalon] = useState({ name: '', logoUrl: '' })

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' })

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return
    if (!user) return router.replace('/login')
    if (user.role !== 'admin') return router.replace('/')
  }, [user, loading])

  useEffect(() => {
    (async () => {
      if (!token) return;
      const [salonList, staffList, svcList, serviceCatList] = await Promise.all([
        fetchSalons(), fetchGlobalStaff(), fetchGlobalServices(), fetchServiceCategories(token)
      ])
      setSalons(salonList)
      if (salonList[0]?._id) setSalonId(salonList[0]._id)
      setGStaff(staffList)
      setGServices(svcList)
      setServiceCategories(serviceCatList);
    })().catch(() => { })
  }, [token])

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
    const roleOrder = { admin: 1, staff: 2, user: 3 };

    if (tab === 'staff') {
      let filteredStaff = gStaff;

      if (staffFilter !== 'all') {
        filteredStaff = filteredStaff.filter(s => s.role === staffFilter);
      }

      if (qLeft) {
        filteredStaff = filteredStaff.filter(s => fuzzy(`${s.firstName || ''} ${s.lastName || ''} ${s.email}`, qLeft));
      }

      return filteredStaff.sort((a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4));
    }
    if (tab === 'services') {
      return qLeft ? gServices.filter(s => fuzzy(`${s.title} ${s.description || ''}`, qLeft)) : gServices
    }
    return salons
  }, [tab, qLeft, gStaff, gServices, salons, staffFilter])

  const rightList = useMemo(() => {
    if (tab === 'staff') {
      return qRight ? assignedStaff.filter(s => fuzzy(`${s.firstName || ''} ${s.lastName || ''} ${s.email}`, qRight)) : assignedStaff
    }
    if (tab === 'services') {
      return qRight ? assignedServices.filter(s => fuzzy(`${s.price}`, qRight)) : assignedServices
    }
    return [] // Salons-Tab hat keine rechte Spalte
  }, [tab, qRight, assignedStaff, assignedServices])


  // actions
  const onAssign = async (id: string) => {
    if (!salonId) return
    if (tab === 'staff') {
      await assignStaffToSalon(id, salonId)
      setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
      setToast({ open: true, msg: 'Mitarbeiter zugeordnet', sev: 'success' })
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
    setToast({ open: true, msg: 'Service zugeordnet', sev: 'success' })
    await reloadGuards()
  }
  const onUnassign = async (id: string) => {
    if (!salonId) return
    if (tab === 'staff') {
      await unassignStaffFromSalon(id, salonId)
      setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
      setToast({ open: true, msg: 'Mitarbeiter entfernt', sev: 'success' })
      await reloadGuards()
    } else if (tab === 'services') {
      await unassignServiceFromSalon(id, salonId)
      setAssignedServices(await listServiceAssignmentsForSalon(salonId))
      setToast({ open: true, msg: 'Service entfernt', sev: 'success' })
    }
  }

  // create global
  const createStaff = async () => {
    if (!formStaff.email || !formStaff.password || !formStaff.firstName || !formStaff.lastName) {
      setToast({ open: true, msg: 'Bitte alle Felder ausfüllen', sev: 'error' })
      return
    }
    try {
      await createGlobalStaff(formStaff) // sendet das ganze formStaff Objekt
      setGStaff(await fetchGlobalStaff());
      setDlgStaffOpen(false)
      setToast({ open: true, msg: 'Mitarbeiter angelegt', sev: 'success' })
      await reloadGuards() // neu laden
    } catch (e) {
      console.error('Fehler beim Anlegen des Staff-Mitglieds', e)
      setToast({ open: true, msg: 'Mitarbeiter konnte nicht angelegt werden', sev: 'error' })
    }
  }

  const createService = async () => {
    const { title, price, duration, category } = formService
    if (!title || !price || !duration) { setToast({ open: true, msg: 'Titel, Preis, Dauer erforderlich', sev: 'error' }); return }
    await createGlobalService({ title, description: formService.description || undefined, price: Number(price), duration: Number(duration), category: category || undefined })
    setGServices(await fetchGlobalServices())
    setDlgServiceOpen(false); setFormService({ title: '', description: '', price: '', duration: '', category: '' })
    setToast({ open: true, msg: 'Service angelegt', sev: 'success' })
  }

  const updateService = async () => {
    if (!editingServiceId) return;

    try {
      const { title, price, duration, category } = formService;
      if (!title || !price || !duration) {
        setToast({ open: true, msg: 'Titel, Preis, Dauer erforderlich', sev: 'error' });
        return;
      }
      await updateGlobalService(editingServiceId, {
        title,
        description: formService.description || undefined,
        price: Number(price),
        duration: Number(duration),
        category: category || undefined,
      });

      setGServices(await fetchGlobalServices()); // Liste aktualisieren
      setDlgServiceOpen(false); // Dialog schließen
      setToast({ open: true, msg: 'Service erfolgreich aktualisiert', sev: 'success' });
    } catch (e: any) {
      setToast({ open: true, msg: 'Fehler beim Speichern', sev: 'error' });
    }
  };

  const handleCreateServiceCategory = async () => {
    if (!newServiceCategoryName.trim()) {
      setToast({ open: true, msg: 'Kategoriename darf nicht leer sein', sev: 'error' });
      return;
    }
    try {
      if (editingCategory) {
        await updateServiceCategory(editingCategory._id, newServiceCategoryName, token!);
        setToast({ open: true, msg: 'Service-Kategorie erfolgreich aktualisiert', sev: 'success' });
      } else {
        await createServiceCategory(newServiceCategoryName, token!);
        setToast({ open: true, msg: 'Service-Kategorie erfolgreich erstellt', sev: 'success' });
      }
      setDlgServiceCategoryOpen(false);
      setNewServiceCategoryName('');
      setEditingCategory(null);
      setServiceCategories(await fetchServiceCategories(token!)); // Reload categories
    } catch (error) {
      setToast({ open: true, msg: 'Fehler beim Speichern der Service-Kategorie', sev: 'error' });
    }
  };

  const handleDeleteServiceCategory = async (id: string) => {
    try {
      await deleteServiceCategory(id, token!);
      setToast({ open: true, msg: 'Service-Kategorie erfolgreich gelöscht', sev: 'success' });
      setServiceCategories(await fetchServiceCategories(token!)); // Reload categories
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Fehler beim Löschen der Kategorie';
      setToast({ open: true, msg, sev: 'error' });
    }
  };

  const openEditCategoryDialog = (category: ServiceCategory) => {
    setEditingCategory(category);
    setNewServiceCategoryName(category.name);
    setDlgServiceCategoryOpen(true);
  };


  const createSalon = async () => {
    if (!formSalon.name) { setToast({ open: true, msg: 'Name erforderlich', sev: 'error' }); return }
    const s = await createSalonApi({ name: formSalon.name, logoUrl: formSalon.logoUrl || undefined })
    const list = await fetchSalons()
    setSalons(list)
    setSalonId(s._id) // direkt zum neuen Salon springen
    setDlgSalonOpen(false); setFormSalon({ name: '', logoUrl: '' })
    setToast({ open: true, msg: 'Salon angelegt', sev: 'success' })
    await reloadGuards()
  }

  // delete global
  const deleteStaff = async (id: string) => {
    await deleteGlobalUser(id)
    setGStaff(await fetchGlobalStaff())
    // entfernt sich ggf. auch aus Zuweisungsliste beim Reload
    if (salonId) setAssignedStaff(await listStaffAssignmentsForSalon(salonId))
    setToast({ open: true, msg: 'Staff gelöscht', sev: 'success' })
  }
  const deleteService = async (id: string) => {
    await deleteGlobalService(id)
    setGServices(await fetchGlobalServices())
    if (salonId) setAssignedServices(await listServiceAssignmentsForSalon(salonId))
    setToast({ open: true, msg: 'Service gelöscht', sev: 'success' })
  }
  const deleteSalon = async (id: string) => {
    try {
      await deleteSalonApi(id)
      const list = await fetchSalons()
      setSalons(list)
      if (salonId === id) setSalonId(list[0]?._id || '')
      await reloadGuards()
      setToast({ open: true, msg: 'Salon gelöscht', sev: 'success' })
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Löschen fehlgeschlagen'
      setToast({ open: true, msg, sev: 'error' })
      await reloadGuards() // Status aktualisieren (falls sich was geändert hat)
    }
  }

  const openSkillDialog = (staff: GlobalStaff) => {
    setCurrentStaff(staff);
    const staffSkillIds = new Set((staff.skills || []).map(skill => typeof skill === 'string' ? skill : skill._id));
    setSelectedServices(staffSkillIds);
    setSkillDlgOpen(true);
  };

  const handleSkillToggle = (serviceId: string) => {
    const newSelection = new Set(selectedServices);
    if (newSelection.has(serviceId)) {
      newSelection.delete(serviceId);
    } else {
      newSelection.add(serviceId);
    }
    setSelectedServices(newSelection);
  };

  const handleSaveSkills = async () => {
    if (!currentStaff || !token) return;
    try {
      const skillsArray = Array.from(selectedServices);
      await updateUserSkills(currentStaff._id, skillsArray, token);
      setGStaff(prevStaff =>
        prevStaff.map(s =>
          s._id === currentStaff._id
            ? { ...s, skills: skillsArray.map(id => ({ _id: id })) }
            : s
        )
      );
      setSkillDlgOpen(false);
      setToast({ open: true, msg: 'Fähigkeiten gespeichert', sev: 'success' });
    } catch {
      setToast({ open: true, msg: 'Fehler beim Speichern der Fähigkeiten', sev: 'error' });
    }
  };


  // Delete-Button letzter Salon
  const [salonGuards, setSalonGuards] = useState<Record<string, SalonGuard>>({})
  useEffect(() => {
    (async () => {
      const guards = await fetchSalonsWithGuards()
      setSalonGuards(Object.fromEntries(guards.map(g => [g._id, g])))
    })().catch(() => { })
  }, [])

  // nach Create/Delete unbedingt Guards neu laden:
  const reloadGuards = async () => {
    const guards = await fetchSalonsWithGuards()
    setSalonGuards(Object.fromEntries(guards.map(g => [g._id, g])))
  }

  const handleOpenEditStaff = (staff: GlobalStaff) => {
    setFormEditStaff(staff);
    setDlgEditStaffOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!formEditStaff || !token) return;
    try {
      await updateUserRole(formEditStaff._id, formEditStaff.role, token);
      setGStaff(await fetchGlobalStaff());
      setDlgEditStaffOpen(false);
      setToast({ open: true, msg: 'Benutzer aktualisiert', sev: 'success' });
    } catch (error) {
      setToast({ open: true, msg: 'Fehler beim Aktualisieren', sev: 'error' });
    }
  };

  const renderServicesTab = () => (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, flex: 2, borderRadius: 2 }}>
        {/* Globale Service-Liste */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <TextField size="small" placeholder="Suchen…" value={qLeft} onChange={(e) => setQLeft(e.target.value)} />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            setEditingServiceId(null);
            setFormService({ title: '', description: '', price: '', duration: '', category: '' });
            setDlgServiceOpen(true);
          }}>
            Service anlegen
          </Button>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <List dense>
          {(leftList as GlobalService[]).map(item => {
            const id = item._id;
            const already = assignedServices.some(s => s._id === id);
            return (
              <ListItem key={id} secondaryAction={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title="Service bearbeiten"><IconButton onClick={() => {
                    setEditingServiceId(id);
                    setFormService({
                      title: item.title,
                      description: item.description || '',
                      price: String(item.price),
                      duration: String(item.duration),
                      category: (item as any).category?._id || ''
                    });
                    setDlgServiceOpen(true);
                  }}><TuneIcon /></IconButton></Tooltip>
                  <Tooltip title={already ? 'Schon zugeordnet' : 'Zum Salon zuordnen'}><span><IconButton disabled={already} onClick={() => onAssign(id)}><AddIcon /></IconButton></span></Tooltip>
                  <Tooltip title="Global löschen"><IconButton color="error" onClick={() => deleteService(id)}><DeleteIcon /></IconButton></Tooltip>
                </Stack>
              }>
                <ListItemText primary={item.title} secondary={`${item.price}€ • ${item.duration} Min`} />
              </ListItem>
            );
          })}
        </List>
      </Paper>
  
      <Paper variant="outlined" sx={{ p: 2, flex: 2, borderRadius: 2 }}>
        {/* Zugeordnete Services */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>Zugeordnet: {salons.find(s => s._id === salonId)?.name || ''}</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField size="small" placeholder="Suchen…" value={qRight} onChange={(e) => setQRight(e.target.value)} />
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <List dense>
          {(rightList as any[]).map(item => (
            <ListItem key={item._id} secondaryAction={
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Overrides setzen"><IconButton onClick={() => {
                  const svc = gServices.find(s => s._id === item._id) || null;
                  setOvrSvc(svc);
                  const cur = assignedServices.find(s => s._id === item._id);
                  setOvrPrice(cur?.price ?? '');
                  setOvrDur(cur?.duration ?? '');
                  setOvrOpen(true);
                }}><TuneIcon /></IconButton></Tooltip>
                <Tooltip title="Zuordnung entfernen"><IconButton color="error" onClick={() => onUnassign(item._id)}><DeleteIcon /></IconButton></Tooltip>
              </Stack>
            }>
              <ListItemText primary={item.title} secondary={`${item.price}€ • ${item.duration} Min`} />
            </ListItem>
          ))}
        </List>
      </Paper>
  
      <Paper variant="outlined" sx={{ p: 2, flex: 1, borderRadius: 2 }}>
        {/* Service-Kategorien */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>Kategorien</Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setEditingCategory(null); setNewServiceCategoryName(''); setDlgServiceCategoryOpen(true); }}>
            Neu
          </Button>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <List dense>
          {serviceCategories.map(cat => (
            <ListItem key={cat._id} secondaryAction={
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => openEditCategoryDialog(cat)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleDeleteServiceCategory(cat._id)}><DeleteIcon fontSize="small" /></IconButton>
              </Stack>
            }>
              <ListItemText primary={cat.name} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Stack>
  );

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
                   {tab === 'staff' && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Rolle</InputLabel>
                            <Select
                                value={staffFilter}
                                label="Rolle"
                                onChange={(e) => setStaffFilter(e.target.value as any)}
                            >
                                <MenuItem value="all">Alle</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="staff">Staff</MenuItem>
                                <MenuItem value="user">User</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                  <Box sx={{ flex:1 }} />
                  {tab === 'staff' ? (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={()=> setDlgStaffOpen(true)}>Staff anlegen</Button>
                  ) : (
                    <>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDlgServiceCategoryOpen(true)}>Neue Kategorie</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                      setEditingServiceId(null); // Wichtig: Bearbeitungsmodus ausschalten
                      setFormService({ title: '', description: '', price: '', duration: '', category: ''}); // Formular leeren
                      setDlgServiceOpen(true);
                    }}>
                      Service anlegen
                    </Button>
                    </>
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
                                <>
                                    {(item as GlobalStaff).role === 'staff' && (
                                        <Tooltip title="Fähigkeiten bearbeiten">
                                            <IconButton onClick={() => openSkillDialog(item as GlobalStaff)}>
                                                <TuneIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Benutzer bearbeiten">
                                        <IconButton onClick={() => handleOpenEditStaff(item as GlobalStaff)}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}

                            {tab === 'services' && (
                              <Tooltip title="Service bearbeiten">
                                <IconButton onClick={() => {
                                  const serviceToEdit = gServices.find(s => s._id === id);
                                  if (serviceToEdit) {
                                    setEditingServiceId(id);
                                    setFormService({
                                      title: serviceToEdit.title,
                                      description: serviceToEdit.description || '', // Stellt sicher, dass es immer ein String ist
                                      price: String(serviceToEdit.price),          // Konvertiert number zu string
                                      duration: String(serviceToEdit.duration),    // Konvertiert number zu string
                                      category: (serviceToEdit as any).category?._id || '' // NEU
                                    });
                                    setDlgServiceOpen(true);
                                  }
                                }}>
                                  <TuneIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            <Tooltip title={already ? 'Schon zugeordnet' : 'Zum Salon zuordnen'}>
                              <span>
                                <IconButton disabled={already || (tab === 'staff' && (item as GlobalStaff).role !== 'staff')} onClick={() => onAssign(id)}><AddIcon /></IconButton>
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
                                ? <Chip label={(item as GlobalStaff).role} size="small" color={
                                    (item as GlobalStaff).role === 'admin' ? 'secondary' : (item as GlobalStaff).role === 'staff' ? 'primary' : 'default'
                                  } />
                                : `${(item as GlobalService).price}€ • ${(item as GlobalService).duration} Min`
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    )
                  })}
                </List>
              </Paper>
              <Paper variant="outlined" sx={{ p:2, flex:1, borderRadius:2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography fontWeight={700}>Service-Kategorien</Typography>
                      <Box sx={{ flex:1 }} />
                      <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setEditingCategory(null); setNewServiceCategoryName(''); setDlgServiceCategoryOpen(true); }}>
                          Neu
                      </Button>
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                  <List dense>
                      {serviceCategories.map(cat => (
                          <ListItem
                              key={cat._id}
                              secondaryAction={
                                  <Stack direction="row" spacing={0.5}>
                                      <IconButton size="small" onClick={() => openEditCategoryDialog(cat)}><EditIcon fontSize="small" /></IconButton>
                                      <IconButton size="small" color="error" onClick={() => handleDeleteServiceCategory(cat._id)}><DeleteIcon fontSize="small" /></IconButton>
                                  </Stack>
                              }
                          >
                              <ListItemText primary={cat.name} />
                          </ListItem>
                      ))}
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
                                ? <Chip label={(item as GlobalStaff).role} size="small" color={
                                    (item as GlobalStaff).role === 'admin' ? 'secondary' : (item as GlobalStaff).role === 'staff' ? 'primary' : 'default'
                                  } />
                                : `${(item as any).price}€ • ${(item as any).duration} Min`
                            }
                            secondaryTypographyProps={{ component: 'div' }}
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
        <Dialog open={dlgEditStaffOpen} onClose={() => setDlgEditStaffOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                <TextField 
                    label="Vorname" 
                    value={formEditStaff?.firstName || ''} 
                    onChange={e => setFormEditStaff(p => p ? { ...p, firstName: e.target.value } : null)} 
                />
                <TextField 
                    label="Nachname" 
                    value={formEditStaff?.lastName || ''} 
                    onChange={e => setFormEditStaff(p => p ? { ...p, lastName: e.target.value } : null)} 
                />
                <TextField 
                    label="E-Mail" 
                    type="email" 
                    value={formEditStaff?.email || ''} 
                    onChange={e => setFormEditStaff(p => p ? { ...p, email: e.target.value } : null)} 
                />
                <TextField 
                    select 
                    label="Rolle" 
                    value={formEditStaff?.role || 'user'} 
                    onChange={e => setFormEditStaff(p => p ? { ...p, role: e.target.value as any } : null)}
                >
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                </TextField>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDlgEditStaffOpen(false)}>Abbrechen</Button>
                <Button variant="contained" onClick={handleUpdateStaff}>Speichern</Button>
            </DialogActions>
        </Dialog>
      <Dialog open={skillDlgOpen} onClose={() => setSkillDlgOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Fähigkeiten für {currentStaff?.firstName} {currentStaff?.lastName}</DialogTitle>
        <DialogContent>
            <FormGroup>
                {gServices.map((service) => (
                    <FormControlLabel
                        key={service._id}
                        control={
                            <Checkbox
                                checked={selectedServices.has(service._id)}
                                onChange={() => handleSkillToggle(service._id)}
                            />
                        }
                        label={service.title}
                    />
                ))}
            </FormGroup>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setSkillDlgOpen(false)}>Abbrechen</Button>
            <Button variant="contained" onClick={handleSaveSkills}>Speichern</Button>
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
          <TextField label="Titel" value={formService.title || ''} onChange={e => setFormService({ ...formService, title: e.target.value })} />
          <TextField label="Beschreibung" value={formService.description || ''} onChange={e=>setFormService({...formService, description:e.target.value})} />
          <TextField label="Preis (€)" type="number" value={formService.price || ''} onChange={e=>setFormService({...formService, price:e.target.value})} />
          <TextField label="Dauer (Minuten)" type="number" value={formService.duration || ''} onChange={e=>setFormService({...formService, duration:e.target.value})} />
          <TextField select label="Kategorie" value={formService.category} onChange={e => setFormService({...formService, category: e.target.value})} fullWidth>
            {serviceCategories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                    {cat.name}
                </MenuItem>
            ))}
          </TextField>
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
      
      {/* NEUER DIALOG */}
     <Dialog open={dlgServiceCategoryOpen} onClose={() => { setDlgServiceCategoryOpen(false); setEditingCategory(null); }}>
        <DialogTitle>{editingCategory ? 'Kategorie bearbeiten' : 'Neue Service-Kategorie'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Kategoriename" type="text" fullWidth variant="standard" value={newServiceCategoryName} onChange={(e) => setNewServiceCategoryName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDlgServiceCategoryOpen(false); setEditingCategory(null); }}>Abbrechen</Button>
          <Button onClick={handleCreateServiceCategory}>Speichern</Button>
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