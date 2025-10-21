import axios from 'axios'

// --- Types ---

export type OpeningHours = {
  weekday: number;
  isOpen: boolean;
  open: string;
  close: string;
}

export type User = {
  _id: string
  email: string
  role: 'user' | 'admin' | 'staff'
  firstName?: string;
  lastName?: string;
  address?: string;
  phone?: string;
  skills?: { _id: string; title?: string }[];
  salons?: Salon[];
}

export type Service = {
  _id: string
  title: string
  description?: string
  price: number
  duration: number
  salon?: string | null
  category?: { _id: string; name: string; };
}

export type Booking = {
  _id: string
  user: string
  serviceId: string
  dateTime: string
  service: Service;
  staff: User;
}

export type StaffBooking  = {
  _id: string
  user: {
    email: string
    firstName?: string
    lastName?: string
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

export type InvoiceItem = {
  type: 'product' | 'voucher' | 'service'; // 'service' hinzugefügt
  id?: string; // Wird für Services und Produkte verwendet
  value?: number; // Wird für Gutscheine verwendet
}

export type InvoicePayload = {
  customerId: string;
  paymentMethod: 'cash' | 'card';
  staffId?: string;
  items: {
    type: 'product' | 'voucher' | 'service';
    id?: string;
    value?: number;
  }[];
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  voucherCode?: string;
  amountGiven?: number;
};

export type Invoice = {
  _id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'voucher';
  voucherPayment?: VoucherPaymentDetails;
  customer: { firstName: string; lastName: string; email: string; };
  items: {
    description: string;
    price: number;
  }[];
  service: { title: string; price: number; duration: number; };
  staff: { firstName: string; lastName: string; };
  salon: { name: string; address?: string; phone?: string; email?: string; };
  booking: string;
  amountGiven?: number;
  change?: number;
};

// KORREKTUR: Die Eigenschaft 'service' wurde durch 'itemsSummary' ersetzt.
export type InvoiceListItem = {
  _id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  customer: { firstName: string; lastName: string; email: string; };
  salon: { name: string; };
  staff: { firstName: string; lastName: string; };
  itemsSummary: string; // Ersetzt das 'service'-Objekt
}

export type CashClosing = {
  _id: string;
  date: string;
  employee: { 
    firstName: string; 
    lastName: string; 
  };
  revenueServices: number;
  revenueProducts: number;
  soldVouchers: number;
  redeemedVouchers: number;
  calculatedCashOnHand: number;
  // Alte Felder für die Listenansicht:
  expectedAmount: number; // Bleibt für Kompatibilität
  finalExpectedAmount: number; // Bleibt für Kompatibilität
  // Felder für die Detailansicht:
  withdrawals: { 
    reason: string; 
    amount: number 
  }[];
  notes?: string;
  cashDeposit: number;
  bankWithdrawal: number;
  tipsWithdrawal: number;
  otherWithdrawal: number;
  actualCashOnHand: number;
  difference: number;
  status: 'completed' | 'cancelled'; 
}

// Definiert, wie ein Gutschein-Objekt aussieht
export type Voucher = {
  _id: string;
  code: string;
  initialValue: number;
  currentValue: number;
  expiryDate: string;
  isActive: boolean;
};

// Definiert die Rückgabe nach erfolgreicher Gutschein-Zahlung
export interface VoucherRedemptionResult {
  message: string;
  initialBalance: number;
  remainingBalance: number;
  redeemedAmount: number;
  voucherCode: string;
}

// NEU: Definiert die Gutschein-Details für die Rechnung
export type VoucherPaymentDetails = {
  code: string;
  initialBalance: number;
  paidAmount: number;
  remainingBalance: number;
};


export type ServiceCategory = {
  _id: string;
  name: string;
};

export type ProductCategory = {
  _id: string;
  name: string;
};

export type Product = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  salon: string;
};

// --- Global Types ---
export type Salon = { _id: string; name: string; logoUrl?: string; openingHours: OpeningHours[]; }

export type GlobalStaff = {
  _id: string
  email: string
  role: 'user' | 'staff' | 'admin'
  firstName?: string;
  lastName?: string;
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

// --- Axios Interceptor ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // KORREKTUR: Die Salon-ID wird nun immer gesendet, wenn sie vorhanden ist,
  // unabhängig vom Login-Status. Dies ist entscheidend für Gäste-Buchungen.
  const salonId = localStorage.getItem('activeSalonId')
  if (salonId) {
    (config.headers as any)['x-salon-id'] = salonId
  }
  
  return config
})

// SERVICE API
export const fetchServices = async (token?: string | null, options: { global?: boolean } = {}) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const url = options.global ? '/services?view=global' : '/services';
    const res = await api.get(url, { headers });

    if (res.data && Array.isArray(res.data.services)) {
      return res.data.services;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("API Error in fetchServices:", error);
    return [];
  }
};

// Funktion zum Abrufen von Mitarbeitern für einen bestimmten Service
export const fetchStaffForService = async (serviceId: string): Promise<User[]> => {
  try {
    // Diese Route benötigt keinen Token und ist öffentlich
    const res = await api.get(`/staff/service/${serviceId}`);
    return res.data || [];
  } catch (error) {
    console.error("API Error in fetchStaffForService:", error);
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
    return res.data?.bookings || [];
  } catch (error) {
    console.error("API Error in getAllBookings:", error);
    return []; 
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

// Funktion zum Abrufen des letzten Termins
export async function fetchLastBookingForUser(userId: string, token: string) {
  const res = await api.get(`/users/${userId}/last-booking`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// AUTH API
export async function login(email: string, password: string) {
  const res = await api.post('/login', { email, password })
  return res.data
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  address?: string,
  phone?: string,
  role: 'user' | 'staff' | 'admin' = 'user'
) {
  const res = await api.post('/register', {
    email,
    password,
    firstName,
    lastName,
    address,
    phone,
    role,
  });
  return res.data;
}

const authHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : {};


export async function fetchStaff(token?: string) {
  const res = await api.get('/users', { params: { role: 'staff' }, headers: authHeaders(token) })
  return res.data.users
}


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


export const fetchAllUsers = async (token: string, role?: string): Promise<User[]> => {
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

export const fetchAllUsersForAdmin = async (): Promise<User[]> => {
  try {
    const res = await api.get('/admin/users-all');
    return res.data.users || [];
  } catch (error) {
    console.error("API Error in fetchAllUsersForAdmin:", error);
    return [];
  }
};


export async function updateUserRole(userId: string, role: string, token: string) {
  const res = await api.patch(`/users/${userId}/role`, { role }, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.user
}

export async function updateUserSkills(userId: string, skills: string[], token: string) {
  const res = await api.put(`/staff/${userId}/skills`, { skills }, {
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

export async function getWalkInCustomer(token: string): Promise<User> {
  const res = await api.get('/users/walk-in', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}


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
  token?: string | null
): Promise<{ slots: string[]; duration: number }> {
  const res = await api.get('/timeslots', {
    params,
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

export const getActiveSalon = async (token: string) => {
  const res = await api.get('/salons/current', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

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


export async function createGlobalStaff(payload: { email: string; password: string; name?: string, firstName: string, lastName: string, phone: string }) {
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

export async function createGlobalService(payload: { title: string; description?: string; price: number; duration: number; category?: string | null }) {
  const config = {} as any;
  config.noSalonHeader = true;
  const res = await api.post('/admin/g-services', payload, config);
  return res.data.service as GlobalService
}

export async function deleteGlobalService(id: string) {
  const config = {} as any;
  config.noSalonHeader = true;
  const res = await api.delete(`/admin/g-services/${id}`, config);
  return res.data
}

export async function updateGlobalService(id: string, payload: { title: string; description?: string; price: number; duration: number; category?: string | null }) {
  const config = {} as any;
  config.noSalonHeader = true; // Wichtig für globale Admin-Funktionen
  const res = await api.put(`/admin/g-services/${id}`, payload, config);
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

export async function markBookingAsPaid(bookingId: string, paymentMethod: 'cash', amountGiven: number, token: string) {
  const res = await api.post(`/bookings/${bookingId}/pay`, { paymentMethod, amountGiven }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function fetchInvoiceById(invoiceId: string, token: string): Promise<Invoice> {
  const res = await api.get(`/invoices/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function fetchUserInvoices(token: string): Promise<Invoice[]> {
  const res = await api.get('/invoices/user', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function updateSalon(id: string, data: Partial<Salon>) {
  const res = await api.patch(`/salons/${id}`, data);
  return res.data.salon as Salon;
}

export async function createInvoice(token: string, invoiceData: any, salonId: string): Promise<Invoice> {
  const res = await api.post('/invoices', invoiceData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'x-salon-id': salonId
    }
  });
  return res.data;
}

export async function fetchAllInvoices(token: string): Promise<InvoiceListItem[]> {
  const res = await api.get('/invoices/all', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Holt die Liste aller bisherigen Abschlüsse
export const listCashClosings = async (token: string): Promise<any> => { 
  const res = await api.get('/cash-closings', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.closings;
};

export const getCashClosingPreview = async (token: string) => {
  const res = await api.get('/cash-closings/preview', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const createCashClosing = async (payload: any, token: string) => {
  const res = await api.post('/cash-closings', payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Funktion zum Stornieren eines Kassenabschlusses
export const cancelCashClosing = async (id: string, token: string): Promise<CashClosing> => {
  const res = await api.patch(`/cash-closings/${id}/cancel`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.closing;
};

export async function fetchCashClosingById(token: string, id: string): Promise<CashClosing> {
  const res = await api.get(`/cash-closings/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.closing;
}

export async function payBooking(token: string, bookingId: string) {
  const res = await api.post('/bookings/pay', {
    bookingId,
    paymentMethod: 'cash',
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// Service Categories
export const fetchServiceCategories = async (token: string): Promise<ServiceCategory[]> => {
  const res = await api.get('/service-categories', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const createServiceCategory = async (name: string, token: string): Promise<ServiceCategory> => {
  const res = await api.post('/service-categories', { name }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// Product Categories
export const fetchProductCategories = async (token: string): Promise<ProductCategory[]> => {
  const res = await api.get('/product-categories', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const createProductCategory = async (name: string, token: string): Promise<ProductCategory> => {
  const res = await api.post('/product-categories', { name }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const updateServiceCategory = async (id: string, name: string, token: string): Promise<ServiceCategory> => {
  const res = await api.patch(`/service-categories/${id}`, { name }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const deleteServiceCategory = async (id: string, token: string): Promise<void> => {
  await api.delete(`/service-categories/${id}`, { headers: { Authorization: `Bearer ${token}` } });
};


// Products
export const fetchProducts = async (token: string): Promise<Product[]> => {
  const res = await api.get('/products', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export async function createProduct(payload: { name: string; price: number; description?: string; category: string; stock: number; }) {
  const res = await api.post('/products', payload);
  return res.data;
}

export async function updateProduct(id: string, payload: { name: string; price: number; description?: string; category: string; stock: number; }) {
  const res = await api.put(`/products/${id}`, payload);
  return res.data;
}

export async function deleteProduct(id: string) {
  const res = await api.delete(`/products/${id}`);
  return res.data;
}

// PIN Management for Admin Dashboard
export const setDashboardPin = async (password: string, pin: string, token: string) => {
  const res = await api.post('/users/set-pin', { password, pin }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const verifyDashboardPin = async (pin: string, token: string) => {
  const res = await api.post('/users/verify-pin', { pin }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getDashboardStats = async (from: string, to: string, token: string) => {
  const res = await api.get('/dashboard/stats', {
    params: { from, to },
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Export Data
export const updateDatevSettings = async (settings: any, token: string) => {
  // Annahme: Es gibt eine Route, um den aktuellen Salon zu aktualisieren.
  // Wir nutzen hier die /api/salons/:id Route. Du musst evtl. die ID des aktiven Salons übergeben.
  // Fürs Erste gehen wir davon aus, dass das Backend den aktiven Salon aus dem Token kennt.
  const res = await api.patch('/salons/current', { datevSettings: settings }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const downloadDatevExport = async (from: string, to: string, token: string) => {
  const res = await api.get('/export/datev', {
    params: { from, to },
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob', // WICHTIG: Sagt Axios, dass eine Datei erwartet wird
  });

  // Logik zum Auslösen des Downloads im Browser
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  const filename = `DATEV_Export_${from}_-_${to}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
};

// Voucher API
export const validateVoucher = async (code: string, token: string) => {
  const res = await api.get(`/vouchers/validate/${code}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data; // Erwarten { success: true, voucher: { ... } }
};

/**
 * LÖST einen Gutschein für einen bestimmten Betrag ein (BEZAHLVORGANG).
 * Reduziert das Guthaben des Gutscheins.
 */
export async function redeemVoucher(token: string, code: string, amount: number): Promise<VoucherRedemptionResult> {
  const res = await api.post('/voucher/redeem', { code, amount }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// --- User Profile API ---
export const fetchMyProfile = async (token: string): Promise<User> => {
  const res = await api.get('/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.user;
};

export const updateMyProfile = async (data: Partial<User>, token: string): Promise<User> => {
  const res = await api.patch('/users/me', data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.user;
};

export const changePassword = async (data: any, token: string) => {
  const res = await api.post('/users/change-password', data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export default api
