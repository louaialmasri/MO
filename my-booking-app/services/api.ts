import axios from 'axios'

// --- Types ---
export type User = {
  _id: string
  email: string
  role: 'user' | 'admin' | 'staff'
}

export type Service = {
  _id: string
  title: string
  description?: string
  price: number
  duration: number
  salon?: string | null
}

export type Booking = {
  _id: string
  user: string
  serviceId: string
  dateTime: string
}

export type StaffBooking  = {
  _id: string
  user: {
    email: string
  }
  service: {
    _id: string
    title: string
    duration?: number
  }
  dateTime: string
}

export type Availability = {
  _id: string
  staff: string | { _id: string; name?: string; email?: string }
  type: 'absence' | 'work' | 'break'
  start: string
  end: string
  note?: string
}

// --- Global Types ---
export type Salon = { _id: string; name: string; logoUrl?: string }

export type GlobalStaff = {
  _id: string
  email: string
  role: 'user' | 'staff' | 'admin'
  name?: string
  skills?: Array<string | { _id: string; title?: string }>
}

export type GlobalService = {
  _id: string
  title: string
  description?: string
  price: number
  duration: number
}

export type ServiceAssignment = {
  service: string
  salon: string
  active: boolean
  priceOverride?: number | null
  durationOverride?: number | null
}

export type StaffAssignment = {
  staff: string
  salon: string
  active: boolean
}

export type SalonGuard = {
  _id: string
  name: string
  logoUrl?: string | null
  deletable: boolean
  reasons: string[]
  counts: { staff: number; services: number; futureBookings: number; availabilities: number }
}

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5000/api'; 

// --- Axios Interceptor ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // salon header nur setzen, wenn gewünscht (global-Calls brauchen ihn NICHT)
  if (!(config as any).noSalonHeader) {
    const salonId = localStorage.getItem('activeSalonId')
    if (salonId) (config.headers as any)['x-salon-id'] = salonId
  }
  return config
})

// SERVICE API
export const fetchServices = async (token: string | null) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await api.get('/services', { headers });
    // KORREKTUR: Array aus res.data.services extrahieren
    if (res.data && Array.isArray(res.data.services)) {
      return res.data.services;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("API Error in fetchServices:", error);
    return [];
  }
};

export async function createService(
  payload: { title: string; description?: string; price: number; duration: number; salonId?: string | null },
  token: string
) {
  const res = await api.post('/services', payload, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.service
}

export async function deleteServiceById(id: string, token: string) {
  const res = await api.delete(`/services/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return res.data
}

export async function updateServiceById(
  id: string,
  body: { title?: string; description?: string; price?: number; duration?: number; salonId?: string | null },
  token: string
) {
  const res = await api.patch(`/services/${id}`, body, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.service
}


// BOOKING API
export async function createBooking(serviceId: string, dateTime: string, staffId: string, token: string, userId?: string) {
  const res = await api.post('/bookings', {
    serviceId,
    dateTime,
    staffId,
    userId
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return res.data
}

export async function getUserBookings(token: string): Promise<Booking[]> {
  const res = await api.get('/bookings/user', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return res.data?.bookings || [];
}

export const getAllBookings = async (token: string) => {
  try {
    const res = await api.get('/bookings', { headers: { Authorization: `Bearer ${token}` } });
    return res.data?.bookings || []; // Immer ein Array zurückgeben
  } catch (error) {
    console.error("API Error in getAllBookings:", error);
    return []; // Auch bei Fehler ein leeres Array zurückgeben
  }
};

export async function deleteBooking(id: string, token: string) {
  const res = await api.delete(`/bookings/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return res.data
}

// AUTH API
export async function login(email: string, password: string) {
  const res = await api.post('/login', { email, password })
  return res.data // { token, user: { email, role } }
}

export async function register(
  email: string,
  password: string,
  name?: string,
  address?: string,
  phone?: string,
  role: 'user' | 'staff' | 'admin' = 'user'
) {
  const res = await api.post('/register', {
    email,
    password,
    name,
    address,
    phone,
    role,
  });
  return res.data;
}

const authHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : {};

// ➡ Alle Mitarbeiter abrufen
export async function fetchStaff(token?: string) {
  const res = await api.get('/users', { params: { role: 'staff' }, headers: authHeaders(token) })
  return res.data.users
}

// ➡ Buchungen für Mitarbeiter abrufen
export async function getStaffBookings(token: string): Promise<StaffBooking[]> {
  const res = await api.get('/bookings/staff', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return res.data.bookings
}

export const updateStaffSkills = async (staffId: string, skills: string[], token: string) => {
  const res = await api.put(`/staff/${staffId}/skills`, { skills }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export async function createUserManually(
  email: string,
  password: string,
  name?: string,
  address?: string,
  phone?: string,
  role: 'user' | 'staff' | 'admin' = 'user',
  token?: string
) {
  const res = await api.post('/users/create', {
    email, password, name, address, phone, role
  }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
  return res.data.user
}

// ➡ Alle Nutzer abrufen
export const fetchAllUsers = async (token: string, role?: string) => {
    try {
        const url = role ? `/users?role=${role}` : '/users';
        const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && Array.isArray(res.data.users)) {
            return res.data.users;
        }
        return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
        console.error("API Error in fetchAllUsers:", error);
        return [];
    }
};

// ➡ Mitarbeiterrolle aktualisieren
export async function updateUserRole(userId: string, role: string, token: string) {
  const res = await api.patch(`/users/${userId}/role`, { role }, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.user
}

export async function updateUserSkills(userId: string, skills: string[], token: string) {
  const res = await api.patch(`/users/${userId}/skills`, { skills }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.user;
}

export async function deleteUserById(id: string, token: string) {
  const res = await api.delete(`/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

// ➡ Buchungen bearbeiten
export async function updateBooking(
  id: string,
  data: { serviceId?: string; dateTime?: string, staffId?: string },
  token: string
) {
  const res = await api.patch(`/bookings/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.booking
}

// --- Availability API ---
export async function getAvailability(
  params: { staffId?: string; from?: string; to?: string },
  token: string
): Promise<Availability[]> {
  const res = await api.get('/availability', {
    params,
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.availability
}

export async function createAvailabilityApi(
  payload: { staffId: string; type: 'absence'|'work'|'break'; start: string; end: string; note?: string },
  token: string
): Promise<Availability> {
  const res = await api.post('/availability', payload, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.availability
}

export async function updateAvailabilityApi(
  id: string,
  payload: Partial<{ staffId: string; type: 'absence'|'work'|'break'; start: string; end: string; note?: string }>,
  token: string
): Promise<Availability> {
  const res = await api.patch(`/availability/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.availability
}

export async function deleteAvailabilityApi(id: string, token: string) {
  const res = await api.delete(`/availability/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

// Timeslots API
export async function fetchTimeslots(
  params: { staffId: string; serviceId: string; date: string; step?: number },
  token: string
): Promise<{ slots: string[]; duration: number }> {
  const res = await api.get('/timeslots', {
    params,
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

// -- Salon API
export async function fetchSalons(): Promise<Salon[]> {
  const res = await api.get('/salons')
  return res.data.salons
}

export async function createSalonApi(payload: { name: string; logoUrl?: string }) {
  const res = await api.post('/salons', payload)
  return res.data.salon
}

export async function deleteSalonApi(id: string) {
  const res = await api.delete(`/salons/${id}`)
  return res.data
}

// --- Globale Listen (ohne Salon-Header) ---
export async function fetchGlobalStaff(): Promise<GlobalStaff[]> {
  const res = await api.get('/admin/staff-all', { } as any);
  (res.config as any).noSalonHeader = true;
  return res.data.users
}

export async function fetchGlobalServices(): Promise<GlobalService[]> {
  const res = await api.get('/admin/services-all', { } as any);
  (res.config as any).noSalonHeader = true;
  return res.data.services
}

// --- Assignments: Staff <-> Salon ---
export async function listStaffAssignmentsForSalon(salonId: string): Promise<GlobalStaff[]> {
  const res = await api.get('/assignments/staff', { params: { salonId } })
  return res.data.users
}

export async function assignStaffToSalon(staffId: string, salonId: string) {
  const res = await api.post('/assignments/staff', { staffId, salonId })
  return res.data.assignment as StaffAssignment
}

export async function unassignStaffFromSalon(staffId: string, salonId: string) {
  const res = await api.delete('/assignments/staff', { data: { staffId, salonId } })
  return res.data
}

// --- Assignments: Service <-> Salon ---
export async function listServiceAssignmentsForSalon(salonId: string): Promise<
  Array<GlobalService & { price: number; duration: number }>
> {
  const res = await api.get('/assignments/services', { params: { salonId } })
  return res.data.services
}

export async function assignServiceToSalon(payload: {
  serviceId: string
  salonId: string
  priceOverride?: number | null
  durationOverride?: number | null
}) {
  const res = await api.post('/assignments/services', payload)
  return res.data.assignment as ServiceAssignment
}

export async function unassignServiceFromSalon(serviceId: string, salonId: string) {
  const res = await api.delete('/assignments/services', { data: { serviceId, salonId } })
  return res.data
}


export async function createGlobalStaff(payload: { email: string; password: string; name?: string }) {
  const res = await api.post('/admin/staff', payload, {} as any);
  (res.config as any).noSalonHeader = true;
  return res.data.user as GlobalStaff
}

export async function deleteGlobalUser(id: string) {
  const config = {} as any;
  config.noSalonHeader = true;
  const res = await api.delete(`/admin/users/${id}`, config);
  return res.data
}

export async function createGlobalService(payload: { title: string; description?: string; price: number; duration: number }) {
  const config = {} as any;
  config.noSalonHeader = true;
  const res = await api.post('/admin/services', payload, config);
  return res.data.service as GlobalService
}

export async function deleteGlobalService(id: string) {
  const config = {} as any;
  config.noSalonHeader = true;
  const res = await api.delete(`/admin/services/${id}`, config);
  return res.data
}

export async function updateGlobalService(id: string, payload: { title: string; description?: string; price: number; duration: number }) {
  const config = {} as any;
  config.noSalonHeader = true; // Wichtig für globale Admin-Funktionen
  const res = await api.patch(`/admin/services/${id}`, payload, config);
  return res.data.service as GlobalService;
}

export async function fetchSalonsWithGuards(): Promise<SalonGuard[]> {
  const config = {} as any;
  config.noSalonHeader = true;
  const res = await api.get('/salons/guards', config);
  return res.data.salons;
}


export type TemplateSegment = { start: string; end: string; type: 'work'|'break' }
export type TemplateDay = { weekday: number; segments: TemplateSegment[] }
export type AvailabilityTemplate = {
  _id: string; name: string; staff: string; salon: string; days: TemplateDay[]
}

export async function fetchTemplates(staffId?: string): Promise<AvailabilityTemplate[]> {
  const res = await api.get('/availability-templates', { params: staffId ? { staffId } : {} })
  return res.data.templates
}

export async function createTemplateApi(payload: { name: string; staff: string; days: TemplateDay[] }) {
  const res = await api.post('/availability-templates', payload)
  return res.data.template as AvailabilityTemplate
}

export async function updateTemplateApi(id: string, patch: Partial<Pick<AvailabilityTemplate,'name'|'days'>>) {
  const res = await api.patch(`/availability-templates/${id}`, patch)
  return res.data.template as AvailabilityTemplate
}

export async function deleteTemplateApi(id: string) {
  const res = await api.delete(`/availability-templates/${id}`)
  return res.data
}

export async function applyTemplateApi(payload: { templateId: string; weekStart: string; weeks?: number; replace?: boolean }) {
  const res = await api.post(`/availability-templates/apply`, payload)
  return res.data as { success: boolean; created: number; replaced: number }
}

export default api