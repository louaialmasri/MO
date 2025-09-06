(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/services/api.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "createBooking": (()=>createBooking),
    "createService": (()=>createService),
    "deleteBooking": (()=>deleteBooking),
    "deleteServiceById": (()=>deleteServiceById),
    "fetchAllUsers": (()=>fetchAllUsers),
    "fetchServices": (()=>fetchServices),
    "fetchStaff": (()=>fetchStaff),
    "getAllBookings": (()=>getAllBookings),
    "getStaffBookings": (()=>getStaffBookings),
    "getUserBookings": (()=>getUserBookings),
    "login": (()=>login),
    "register": (()=>register),
    "updateBooking": (()=>updateBooking),
    "updateServiceById": (()=>updateServiceById),
    "updateUserRole": (()=>updateUserRole)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
;
const api = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});
// Token automatisch mitschicken
api.interceptors.request.use((config)=>{
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
async function fetchServices() {
    const res = await api.get('/services');
    return res.data.services;
}
async function createService(name, duration, token) {
    const res = await api.post('/services', {
        name,
        duration
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}
async function deleteServiceById(id, token) {
    const res = await api.delete(`/services/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}
async function updateServiceById(id, body, token) {
    const res = await api.patch(`/services/${id}`, body, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.service;
}
async function createBooking(serviceId, dateTime, staffId, token) {
    const res = await api.post('/bookings', {
        serviceId,
        dateTime,
        staffId
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}
async function getUserBookings(token) {
    const res = await api.get('/bookings/user', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.bookings;
}
async function getAllBookings(token) {
    const res = await api.get('/bookings/all', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.bookings;
}
async function deleteBooking(id, token) {
    const res = await api.delete(`/bookings/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}
async function login(email, password) {
    const res = await api.post('/login', {
        email,
        password
    });
    return res.data // { token, user: { email, role } }
    ;
}
async function register(email, password, name, address, phone, role = 'user') {
    const res = await api.post('/register', {
        email,
        password,
        name,
        address,
        phone,
        role
    });
    return res.data;
}
async function fetchStaff() {
    const res = await api.get('/users/staff');
    return res.data.users;
}
async function getStaffBookings(token) {
    const res = await api.get('/bookings/staff', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.bookings;
}
async function fetchAllUsers(token) {
    const res = await api.get('/users', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.users;
}
async function updateUserRole(userId, role, token) {
    const res = await api.patch(`/users/${userId}/role`, {
        role
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.user;
}
async function updateBooking(id, data, token) {
    const res = await api.patch(`/bookings/bookings/${id}`, data, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data.booking;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/app/admin/admin.module.css [app-client] (css module)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.v({
  "bookingItem": "admin-module__aXBbkG__bookingItem",
  "bookingList": "admin-module__aXBbkG__bookingList",
  "container": "admin-module__aXBbkG__container",
});
}}),
"[project]/app/admin/page.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/context/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$admin$2f$admin$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/app/admin/admin.module.css [app-client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-hook-form/dist/index.esm.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Box/Box.js [app-client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Chip$2f$Chip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Chip$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Chip/Chip.js [app-client] (ecmascript) <export default as Chip>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Dialog$2f$Dialog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Dialog/Dialog.js [app-client] (ecmascript) <export default as Dialog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/DialogTitle/DialogTitle.js [app-client] (ecmascript) <export default as DialogTitle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogContent$2f$DialogContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/DialogContent/DialogContent.js [app-client] (ecmascript) <export default as DialogContent>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogActions$2f$DialogActions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/DialogActions/DialogActions.js [app-client] (ecmascript) <export default as DialogActions>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/TextField/TextField.js [app-client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/MenuItem/MenuItem.js [app-client] (ecmascript) <export default as MenuItem>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Typography/Typography.js [app-client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fullcalendar$2f$react$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@fullcalendar/react/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fullcalendar$2f$timegrid$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@fullcalendar/timegrid/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fullcalendar$2f$interaction$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@fullcalendar/interaction/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dayjs/dayjs.min.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
;
;
function formatDateTimeLocal(date) {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
}
function AdminPage() {
    _s();
    const { user, token } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [bookings, setBookings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [services, setServices] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [users, setUsers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [successMessage, setSuccessMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showUserDialog, setShowUserDialog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [userRoleFilter, setUserRoleFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [selectedBooking, setSelectedBooking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editMode, setEditMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editForm, setEditForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        serviceId: '',
        dateTime: ''
    });
    const [openEvent, setOpenEvent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeBooking, setActiveBooking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [edit, setEdit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        dateTime: '',
        serviceId: '',
        staffId: ''
    });
    const [editOpen, setEditOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editing, setEditing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        open: false,
        msg: '',
        sev: 'success'
    });
    const openDialogFor = (bookingId)=>{
        const b = bookings.find((x)=>x._id === bookingId);
        if (!b) return;
        setActiveBooking(b);
        setEdit({
            dateTime: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(b.dateTime).format('YYYY-MM-DDTHH:mm'),
            serviceId: b.service?._id || b.serviceId || '',
            staffId: b.staff?._id || ''
        });
        setOpenEvent(true);
    };
    const closeDialog = ()=>{
        setOpenEvent(false);
        setActiveBooking(null);
    };
    const { register, handleSubmit, reset, formState: { errors } } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            if (!user || user.role !== 'admin') {
                router.push('/login');
                return;
            }
            const fetchData = {
                "AdminPage.useEffect.fetchData": async ()=>{
                    try {
                        const all = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAllBookings"])(token);
                        setBookings(all);
                        await loadServices();
                        await fetchUsers();
                    } catch (err) {
                        console.error('Fehler beim Laden der Buchungen oder Nutzer:', err);
                    }
                }
            }["AdminPage.useEffect.fetchData"];
            fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["AdminPage.useEffect"], [
        user,
        token
    ]);
    const loadServices = async ()=>{
        try {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchServices"])();
            setServices(data);
        } catch (err) {
            console.error('Fehler beim Laden der Services:', err);
        }
    };
    const fetchUsers = async ()=>{
        try {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchAllUsers"])(token);
            setUsers(data);
        } catch (err) {
            console.error('Fehler beim Laden der Nutzer:', err);
        }
    };
    const handleDeleteService = async (id)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteServiceById"])(id, token);
            loadServices();
        } catch (err) {
            console.error('Fehler beim Löschen:', err);
        }
    };
    const handleCancel = async (bookingId)=>{
        try {
            const success = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteBooking"])(bookingId, token);
            if (success) {
                setBookings((prev)=>prev.filter((b)=>b._id !== bookingId));
            }
        } catch (err) {
            console.error('Fehler beim Stornieren:', err);
        }
    };
    const handleMakeStaff = async (userId)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateUserRole"])(userId, 'staff', token);
            fetchUsers();
        } catch (err) {
            console.error('Fehler beim Ändern der Rolle:', err);
        }
    };
    const [openDialog, setOpenDialog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        address: '',
        phone: '',
        email: '',
        password: '',
        role: 'user'
    });
    const handleOpenDialog = ()=>setOpenDialog(true);
    const handleCloseDialog = ()=>{
        setOpenDialog(false);
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            password: '',
            role: 'user'
        });
    };
    const handleCreateUser = async ()=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["register"])(formData.email, formData.password, formData.name, formData.address, formData.phone, formData.role);
            alert('Benutzer erfolgreich erstellt!');
            handleCloseDialog();
            fetchUsers();
        } catch (err) {
            console.error('Fehler beim Erstellen des Benutzers:', err);
            alert('Fehler beim Erstellen des Benutzers.');
        }
    };
    const calendarEvents = bookings.filter((b)=>typeof b.user === 'object') // Safety
    .map((b)=>{
        const service = services.find((s)=>s._id === b.serviceId);
        const start = new Date(b.dateTime);
        const duration = (service?.duration ?? 30) * 60000;
        const end = new Date(start.getTime() + duration);
        return {
            id: b._id,
            title: `${service?.name} – ${b.user?.email ?? 'Unbekannt'} (Staff: ${b.staff?.email ?? '???'})`,
            start: start.toISOString(),
            end: end.toISOString()
        };
    });
    // Beim Klick auf einen Termin im Kalender
    const handleBookingClick = (booking)=>{
        setSelectedBooking(booking);
        setEditForm({
            serviceId: booking.serviceId || (services[0]?._id ?? ''),
            dateTime: formatDateTimeLocal(new Date(booking.dateTime))
        });
        setEditMode(false);
    };
    const handleEditSave = async ()=>{
        if (!selectedBooking) return;
        try {
            // updateBooking muss im Admin-API-Service existieren!
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateBooking"])(selectedBooking._id, {
                serviceId: editForm.serviceId,
                dateTime: editForm.dateTime
            }, token);
            setBookings((prev)=>prev.map((b)=>b._id === selectedBooking._id ? {
                        ...b,
                        serviceId: editForm.serviceId,
                        dateTime: editForm.dateTime
                    } : b));
            setSelectedBooking(null);
            setEditMode(false);
        } catch (err) {
            alert('Fehler beim Speichern der Änderungen.');
        }
    };
    // Gefilterte User-Liste
    const filteredUsers = userRoleFilter === 'all' ? users : users.filter((u)=>u.role === userRoleFilter);
    // Datum & Sichtbarkeit
    const [currentDate, setCurrentDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date());
    // Nur Mitarbeiter (aus deiner users-Liste)
    const staffUsers = users.filter((u)=>u.role === 'staff');
    // Ausgewählte Mitarbeiter (standard: alle)
    const [visibleStaffIds, setVisibleStaffIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(staffUsers.map({
        "AdminPage.useState": (s)=>s._id
    }["AdminPage.useState"]));
    // Wenn sich staffUsers ändert, setze Standard neu
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            setVisibleStaffIds(staffUsers.map({
                "AdminPage.useEffect": (s)=>s._id
            }["AdminPage.useEffect"]));
        }
    }["AdminPage.useEffect"], [
        users
    ]);
    const staffColor = (id)=>{
        const palette = [
            '#3b82f6',
            '#ef4444',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#06b6d4',
            '#ec4899',
            '#84cc16'
        ];
        const idx = Math.abs([
            ...id
        ].reduce((a, c)=>a + c.charCodeAt(0), 0)) % palette.length;
        return palette[idx];
    };
    // Events je Staff vorbereiten
    const eventsByStaff = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AdminPage.useMemo[eventsByStaff]": ()=>{
            const map = {};
            // Hilfsfunktion: Dauer holen (service.duration oder Fallback 30)
            const getDuration = {
                "AdminPage.useMemo[eventsByStaff].getDuration": (b)=>{
                    if (b.service?.duration) return b.service.duration;
                    const s = services.find({
                        "AdminPage.useMemo[eventsByStaff].getDuration.s": (x)=>x._id === (b.service?._id || b.serviceId)
                    }["AdminPage.useMemo[eventsByStaff].getDuration.s"]);
                    return s?.duration ?? 30;
                }
            }["AdminPage.useMemo[eventsByStaff].getDuration"];
            bookings.forEach({
                "AdminPage.useMemo[eventsByStaff]": (b)=>{
                    const staffId = b.staff?._id;
                    if (!staffId) return; // ohne staff nicht darstellbar
                    const start = new Date(b.dateTime);
                    // Nur Events des aktuellen Tages zeigen
                    const sameDay = {
                        "AdminPage.useMemo[eventsByStaff].sameDay": (d)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(d).isSame((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(currentDate), 'day')
                    }["AdminPage.useMemo[eventsByStaff].sameDay"];
                    if (!staffId || !sameDay(b.dateTime)) return;
                    const duration = getDuration(b);
                    const end = new Date(start.getTime() + duration * 60000);
                    if (!map[staffId]) map[staffId] = [];
                    map[staffId].push({
                        id: b._id,
                        title: `${b.service?.name ?? 'Service'} – ${typeof b.user === 'object' && b.user?.email ? b.user.email : String(b.user)}`,
                        start: start.toISOString(),
                        end: end.toISOString(),
                        color: staffColor(staffId)
                    });
                }
            }["AdminPage.useMemo[eventsByStaff]"]);
            return map;
        }
    }["AdminPage.useMemo[eventsByStaff]"], [
        bookings,
        services,
        currentDate
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                opacity: 0
            },
            animate: {
                opacity: 1
            },
            exit: {
                opacity: 0
            },
            transition: {
                duration: 0.3
            },
            className: __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$admin$2f$admin$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].container,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    children: "Admin Dashboard"
                }, void 0, false, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 341,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        "Angemeldet als: ",
                        user?.email
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 342,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    children: "Kalenderübersicht"
                }, void 0, false, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 343,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                    maxWidth: "900px",
                    margin: "auto",
                    mt: 5,
                    p: 2,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                            variant: "h4",
                            gutterBottom: true,
                            children: "Kalender – Deine Buchungen"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 345,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                            direction: {
                                xs: 'column',
                                md: 'row'
                            },
                            spacing: 2,
                            alignItems: "center",
                            sx: {
                                mt: 3,
                                mb: 2
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                                    direction: "row",
                                    spacing: 1,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            variant: "outlined",
                                            onClick: ()=>setCurrentDate((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(currentDate).subtract(1, 'day').toDate()),
                                            children: "◀"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 350,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            variant: "outlined",
                                            onClick: ()=>setCurrentDate(new Date()),
                                            children: "Heute"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 351,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            variant: "outlined",
                                            onClick: ()=>setCurrentDate((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(currentDate).add(1, 'day').toDate()),
                                            children: "▶"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 352,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 349,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                    sx: {
                                        fontWeight: 700
                                    },
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(currentDate).format('ddd, DD. MMM YYYY')
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 355,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                                    direction: "row",
                                    spacing: 1,
                                    sx: {
                                        flexWrap: 'wrap'
                                    },
                                    children: staffUsers.map((s)=>{
                                        const active = visibleStaffIds.includes(s._id);
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Chip$2f$Chip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Chip$3e$__["Chip"], {
                                            label: s.name || s.email,
                                            color: active ? 'primary' : 'default',
                                            variant: active ? 'filled' : 'outlined',
                                            onClick: ()=>{
                                                setVisibleStaffIds((prev)=>active ? prev.filter((id)=>id !== s._id) : [
                                                        ...prev,
                                                        s._id
                                                    ]);
                                            }
                                        }, s._id, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 363,
                                            columnNumber: 21
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 359,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 348,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                            sx: {
                                display: 'grid',
                                gridAutoFlow: 'column',
                                gridAutoColumns: {
                                    xs: '100%',
                                    md: '420px'
                                },
                                gap: 2,
                                overflowX: 'auto',
                                pb: 2
                            },
                            children: staffUsers.filter((s)=>visibleStaffIds.includes(s._id)).map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                    sx: {
                                        p: 2,
                                        bgcolor: 'white',
                                        borderRadius: 3,
                                        boxShadow: 1
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                            sx: {
                                                fontWeight: 700,
                                                mb: 1
                                            },
                                            children: s.name || s.email
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 390,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fullcalendar$2f$react$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            plugins: [
                                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fullcalendar$2f$timegrid$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fullcalendar$2f$interaction$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
                                            ],
                                            initialView: "timeGridDay",
                                            locale: "de",
                                            headerToolbar: false,
                                            height: "auto",
                                            allDaySlot: false,
                                            slotMinTime: "08:00:00",
                                            slotMaxTime: "20:00:00",
                                            nowIndicator: true,
                                            initialDate: currentDate,
                                            events: eventsByStaff[s._id] ?? [],
                                            eventClick: (info)=>openDialogFor(info.event.id),
                                            editable: true,
                                            eventDrop: async (info)=>{
                                                try {
                                                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateBooking"])(info.event.id, {
                                                        dateTime: info.event.start?.toISOString()
                                                    }, token);
                                                    setBookings((prev)=>prev.map((b)=>b._id === info.event.id ? {
                                                                ...b,
                                                                dateTime: info.event.start.toISOString()
                                                            } : b));
                                                } catch (e) {
                                                    info.revert();
                                                }
                                            }
                                        }, `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(currentDate).format('YYYY-MM-DD')}-${s._id}`, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 391,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, s._id, true, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 389,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 378,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 344,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Dialog$2f$Dialog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__["Dialog"], {
                    open: !!selectedBooking,
                    onClose: ()=>{
                        setSelectedBooking(null);
                        setEditMode(false);
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__["DialogTitle"], {
                            children: editMode ? 'Buchung bearbeiten' : 'Buchungsdetails'
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 421,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogContent$2f$DialogContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__["DialogContent"], {
                            sx: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2
                            },
                            children: editMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        select: true,
                                        label: "Service",
                                        value: editForm.serviceId || '',
                                        onChange: (e)=>setEditForm((f)=>({
                                                    ...f,
                                                    serviceId: e.target.value
                                                })),
                                        fullWidth: true,
                                        children: services.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                value: s._id,
                                                children: s.name
                                            }, s._id, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 435,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        label: "Datum & Uhrzeit",
                                        type: "datetime-local",
                                        value: editForm.dateTime,
                                        onChange: (e)=>setEditForm((f)=>({
                                                    ...f,
                                                    dateTime: e.target.value
                                                })),
                                        fullWidth: true,
                                        InputLabelProps: {
                                            shrink: true
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 438,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: selectedBooking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                            gutterBottom: true,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Service:"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 452,
                                                    columnNumber: 21
                                                }, this),
                                                " ",
                                                services.find((s)=>s._id === selectedBooking.serviceId)?.name || 'Unbekannt'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 451,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                            gutterBottom: true,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Kunde:"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 455,
                                                    columnNumber: 21
                                                }, this),
                                                " ",
                                                typeof selectedBooking.user === 'object' ? selectedBooking.user.email : users.find((u)=>u._id === selectedBooking.user)?.email || 'Unbekannt'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 454,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                            gutterBottom: true,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: "Datum:"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 462,
                                                    columnNumber: 21
                                                }, this),
                                                " ",
                                                new Date(selectedBooking.dateTime).toLocaleString('de-DE')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 461,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false)
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 424,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogActions$2f$DialogActions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__["DialogActions"], {
                            children: editMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        onClick: ()=>setEditMode(false),
                                        children: "Abbrechen"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 472,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "contained",
                                        onClick: handleEditSave,
                                        children: "Speichern"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 473,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        onClick: ()=>setEditMode(true),
                                        variant: "contained",
                                        color: "primary",
                                        children: "Bearbeiten"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 477,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        onClick: ()=>setSelectedBooking(null),
                                        children: "Schließen"
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 480,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 469,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 420,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Dialog$2f$Dialog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__["Dialog"], {
                    open: openEvent,
                    onClose: closeDialog,
                    fullWidth: true,
                    maxWidth: "sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__["DialogTitle"], {
                            children: "Buchung bearbeiten"
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 486,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogContent$2f$DialogContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__["DialogContent"], {
                            sx: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                pt: 2
                            },
                            children: activeBooking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                        variant: "body2",
                                        color: "text.secondary",
                                        children: [
                                            "Kunde: ",
                                            typeof activeBooking.user === 'object' && activeBooking.user?.email ? activeBooking.user.email : String(activeBooking.user)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 490,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        label: "Datum & Uhrzeit",
                                        type: "datetime-local",
                                        value: edit.dateTime,
                                        onChange: (e)=>setEdit({
                                                ...edit,
                                                dateTime: e.target.value
                                            }),
                                        InputLabelProps: {
                                            shrink: true
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 494,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        select: true,
                                        label: "Service",
                                        value: edit.serviceId,
                                        onChange: (e)=>setEdit({
                                                ...edit,
                                                serviceId: e.target.value
                                            }),
                                        children: services.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                value: s._id,
                                                children: s.name
                                            }, s._id, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 509,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 502,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                        select: true,
                                        label: "Mitarbeiter",
                                        value: edit.staffId,
                                        onChange: (e)=>setEdit({
                                                ...edit,
                                                staffId: e.target.value
                                            }),
                                        children: staffUsers.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                value: s._id,
                                                children: s.name || s.email
                                            }, s._id, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 520,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 513,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 487,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$DialogActions$2f$DialogActions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__["DialogActions"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                    onClick: closeDialog,
                                    children: "Abbrechen"
                                }, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 527,
                                    columnNumber: 11
                                }, this),
                                activeBooking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            color: "error",
                                            onClick: async ()=>{
                                                try {
                                                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteBooking"])(activeBooking._id, token);
                                                    setBookings((prev)=>prev.filter((b)=>b._id !== activeBooking._id));
                                                    closeDialog();
                                                } catch  {}
                                            },
                                            children: "Löschen"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 530,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            variant: "contained",
                                            onClick: async ()=>{
                                                if (!activeBooking) return;
                                                try {
                                                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateBooking"])(activeBooking._id, {
                                                        dateTime: new Date(edit.dateTime).toISOString(),
                                                        serviceId: edit.serviceId,
                                                        staffId: edit.staffId
                                                    }, token);
                                                    // lokal aktualisieren
                                                    setBookings((prev)=>prev.map((b)=>b._id === activeBooking._id ? {
                                                                ...b,
                                                                dateTime: new Date(edit.dateTime).toISOString(),
                                                                service: {
                                                                    ...b.service,
                                                                    _id: edit.serviceId
                                                                },
                                                                staff: {
                                                                    ...b.staff,
                                                                    _id: edit.staffId
                                                                }
                                                            } : b));
                                                    closeDialog();
                                                } catch  {}
                                            },
                                            children: "Speichern"
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 542,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 526,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 485,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/admin/page.tsx",
            lineNumber: 334,
            columnNumber: 7
        }, this)
    }, void 0, false);
}
_s(AdminPage, "iAHeiVBNqdZY1624wneJdc8HhQE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"]
    ];
});
_c = AdminPage;
const __TURBOPACK__default__export__ = _c2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(_c1 = ()=>Promise.resolve(AdminPage), {
    ssr: false
});
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "AdminPage");
__turbopack_context__.k.register(_c1, "%default%$dynamic");
__turbopack_context__.k.register(_c2, "%default%");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=_70478543._.js.map