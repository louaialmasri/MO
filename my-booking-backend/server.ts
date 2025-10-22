import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import mongoose from 'mongoose' // Importiere mongoose vollständig
import serviceRoutes from './routes/service'
import bookingRoutes from './routes/booking'
import userRoutes from './routes/user'
import availabilityRoutes from './routes/availability'
import timeslotRoutes from './routes/timeslots'
import { activeSalon } from './middlewares/activeSalon'
import salonRoutes from './routes/salons'
import assignmentRoutes from './routes/assignments'
import adminCatalogRoutes from './routes/adminCatalog'
import availabilityTemplateRoutes from './routes/availabilityTemplates'
import staffRoutes from './routes/staff';
import invoiceRoutes from './routes/invoice';
import cashClosingRoutes from './routes/cashClosing';
import productCategoryRoutes from './routes/productCategories';
import productRoutes from './routes/products';
import serviceCategoryRoutes from './routes/serviceCategories';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';
import voucherRoutes from './routes/voucher';
import cron from 'node-cron'
import dayjs from 'dayjs'
import { Booking } from './models/Booking'
import { Salon, ISalon } from './models/Salon' // ISalon importieren
import { sendEmail } from './utils/email'
import de from 'dayjs/locale/de'; // Deutsche Lokalisierung importieren

dayjs.locale(de); // Dayjs auf Deutsch setzen

const app = express()
const PORT = process.env.PORT || 5000; // Port aus Umgebungsvariablen oder Standard 5000

// CORS-Konfiguration (Frontend-URL aus Umgebungsvariablen)
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // Erlaube Anfragen ohne 'origin' (z.B. mobile Apps, curl) oder von erlaubten URLs
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST','PATCH','DELETE','OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type','Authorization', 'x-salon-id'],
  credentials: true,
}))
app.options('*', cors({ // Preflight-Requests erlauben
   origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST','PATCH','DELETE','OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type','Authorization', 'x-salon-id'],
  credentials: true,
}))

app.use(bodyParser.json())

// --- Routen ---
// Reihenfolge beachten: activeSalon Middleware *vor* den Routen, die sie benötigen.
app.use('/api', authRoutes) // Auth hat keine Salon-Abhängigkeit per se
app.use('/api', adminRoutes) // Admin-spezifische, nicht Salon-gebundene Routen

// Routen, die potenziell eine aktive Salon-ID benötigen
app.use('/api/services', activeSalon, serviceRoutes)
app.use('/api/bookings', activeSalon, bookingRoutes)
app.use('/api/users', activeSalon, userRoutes)
app.use('/api/availability', activeSalon, availabilityRoutes)
app.use('/api/timeslots', activeSalon, timeslotRoutes)
app.use('/api/salons', activeSalon, salonRoutes) // Auch Salon-Routen brauchen ggf. den Kontext
app.use('/api/assignments', activeSalon, assignmentRoutes)
app.use('/api/admin', activeSalon, adminCatalogRoutes) // Admin-Katalog braucht Salon-Kontext
app.use('/api/availability-templates', activeSalon, availabilityTemplateRoutes)
app.use('/api/staff', activeSalon, staffRoutes);
app.use('/api/invoices', activeSalon, invoiceRoutes);
app.use('/api/cash-closings', activeSalon, cashClosingRoutes);
app.use('/api/product-categories', activeSalon, productCategoryRoutes);
app.use('/api/products', activeSalon, productRoutes);
app.use('/api/service-categories', activeSalon, serviceCategoryRoutes);
app.use('/api/dashboard', activeSalon, dashboardRoutes);
app.use('/api/export', activeSalon, exportRoutes);
app.use('/api/vouchers', activeSalon, voucherRoutes);

// --- CRONJOB FÜR TERMINERINNERUNGEN (ANGEPASST) ---
cron.schedule('0 * * * *', async () => {
  console.log('[Cronjob] Suche nach anstehenden Terminen für Erinnerungen...');

  const now = dayjs();
  const reminderWindowStart = now.add(24, 'hour').toDate();
  const reminderWindowEnd = now.add(25, 'hour').toDate();

  try {
    // 1. Finde alle Salons, bei denen Erinnerungen aktiviert sind
    // KORREKTUR: Typ explizit angeben
    const salonsToSendReminders: Pick<ISalon, '_id' | 'name'>[] = await Salon.find({ 'bookingRules.sendReminderEmails': true }).select('_id name').lean();
    const salonIdsToSend = salonsToSendReminders.map(s => s._id);

    if (salonIdsToSend.length === 0) {
        console.log('[Cronjob] Keine Salons mit aktivierten Erinnerungen gefunden.');
        return;
    }

    // 2. Finde anstehende Buchungen *nur* für diese Salons
    //    Wir müssen über den 'staff' populieren, um an die Salon-ID zu kommen.
    const upcomingBookings = await Booking.find({
      dateTime: {
        $gte: reminderWindowStart,
        $lt: reminderWindowEnd,
      },
      status: 'confirmed',
      reminderSent: false,
    })
    .populate<{ user: { firstName: string, email: string } }>('user', 'firstName email')
    .populate<{ service: { title: string } }>('service', 'title')
    .populate<{ staff: { firstName: string, lastName: string, salon: mongoose.Types.ObjectId } }>('staff', 'firstName lastName salon'); // Wichtig: 'salon' hinzufügen

    if (upcomingBookings.length > 0) {
      console.log(`[Cronjob] ${upcomingBookings.length} potenzielle Erinnerungen gefunden...`);
    }

    let sentCount = 0;
    for (const booking of upcomingBookings) {
      // Prüfen, ob der Salon der Buchung Erinnerungen senden soll
      const staffSalonId = booking.staff?.salon?.toString();
      // KORREKTUR: Typ-sicherer Zugriff auf _id
      const salonConfig = salonsToSendReminders.find(s => (s._id as mongoose.Types.ObjectId).toString() === staffSalonId);

      if (salonConfig && booking.user.email) {
          const salonName = salonConfig.name || "Ihrem Salon"; // Fallback-Name
          const subject = `Terminerinnerung für morgen bei ${salonName}`;
          const html = `
            <h1>Hallo ${booking.user.firstName},</h1>
            <p>dies ist eine freundliche Erinnerung an Ihren morgigen Termin.</p>
            <p><strong>Service:</strong> ${booking.service.title}</p>
            <p><strong>Mitarbeiter:</strong> ${booking.staff.firstName} ${booking.staff.lastName}</p>
            <p><strong>Wann:</strong> ${dayjs(booking.dateTime).locale('de').format('dddd, DD. MMMM YYYY [um] HH:mm [Uhr]')}</p>
            <p>Falls Sie den Termin nicht wahrnehmen können, stornieren Sie ihn bitte rechtzeitig über Ihr Kundenkonto.</p>
            <p>Wir freuen uns auf Sie!</p>
            <p>Ihr Team von ${salonName}</p>
          `;

         try {
             await sendEmail({ to: booking.user.email, subject, html });
             await Booking.updateOne({ _id: booking._id }, { $set: { reminderSent: true } });
             sentCount++;
         } catch (emailError) {
             console.error(`[Cronjob] Fehler beim Senden der E-Mail für Buchung ${booking._id}:`, emailError);
             // Nicht abbrechen, nur loggen
         }
      }
    }
     if (sentCount > 0) {
        console.log(`[Cronjob] ${sentCount} Erinnerungen erfolgreich gesendet.`);
    }

  } catch (error) {
    console.error('[Cronjob] Kritischer Fehler im Erinnerungs-Job:', error);
  }
});


// --- Server Start & DB Verbindung ---
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-app';
mongoose.connect(mongoUri)
  .then(() => {
      console.log('✅ MongoDB verbunden');
      app.listen(PORT, () => {
        console.log(`🚀 Backend läuft auf http://localhost:${PORT}`);
      });
  })
  .catch((err) => {
      console.error('❌ MongoDB Verbindungsfehler:', err);
      process.exit(1); // Beendet den Prozess bei DB-Fehler
  });

