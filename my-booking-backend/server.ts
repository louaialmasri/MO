import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import mongoose from 'mongoose'
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
import { sendEmail } from './utils/email'

const app = express()
const PORT = 5000

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type','Authorization', 'x-salon-id'],
  credentials: true,
}))
app.options('*', cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type','Authorization', 'x-salon-id'],
  credentials: true,
}))

app.use(bodyParser.json())

app.use('/api', activeSalon, authRoutes)
app.use('/api', adminRoutes)

// WICHTIG: nur noch EIN Mount pro Router, MIT activeSalon davor
app.use('/api/services', activeSalon, serviceRoutes)
app.use('/api/bookings', activeSalon, bookingRoutes)
app.use('/api/users', activeSalon, userRoutes)
app.use('/api/availability', activeSalon, availabilityRoutes)
app.use('/api/timeslots', activeSalon, timeslotRoutes)
app.use('/api/salons', activeSalon, salonRoutes)
app.use('/api/assignments', activeSalon, assignmentRoutes)
app.use('/api/admin', adminCatalogRoutes)
app.use('/api/availability-templates', availabilityTemplateRoutes)
app.use('/api/staff', activeSalon, staffRoutes);
app.use('/api/invoices', activeSalon, invoiceRoutes);
app.use('/api/cash-closings', cashClosingRoutes);
app.use('/api/product-categories', activeSalon, productCategoryRoutes); // NEU
app.use('/api/products', activeSalon, productRoutes); // NEU
app.use('/api/service-categories', activeSalon, serviceCategoryRoutes); // NEU
app.use('/api/invoices', activeSalon, invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/vouchers', voucherRoutes);

// --- NEU: CRONJOB FÜR TERMINERINNERUNGEN ---
// Führt die Aufgabe zu jeder vollen Stunde aus ('0 * * * *')
cron.schedule('0 * * * *', async () => {
  console.log('[Cronjob] Suche nach anstehenden Terminen für Erinnerungen...');

  const now = dayjs();
  // Wir suchen nach Terminen, die in 24 bis 25 Stunden stattfinden
  const reminderWindowStart = now.add(24, 'hour').toDate();
  const reminderWindowEnd = now.add(25, 'hour').toDate();

  try {
    const upcomingBookings = await Booking.find({
      dateTime: {
        $gte: reminderWindowStart,
        $lt: reminderWindowEnd,
      },
      status: 'confirmed', // Nur für bestätigte Termine
      reminderSent: false, // Nur wenn noch keine Erinnerung gesendet wurde
    })
    .populate<{ user: { firstName: string, email: string } }>('user', 'firstName email')
    .populate<{ service: { title: string } }>('service', 'title')
    .populate<{ staff: { firstName: string, lastName: string } }>('staff', 'firstName lastName');

    if (upcomingBookings.length > 0) {
      console.log(`[Cronjob] ${upcomingBookings.length} Erinnerungen werden gesendet...`);
    }

    for (const booking of upcomingBookings) {
      const subject = `Terminerinnerung für morgen bei Mo's Barbershop`;
      const html = `
        <h1>Hallo ${booking.user.firstName},</h1>
        <p>dies ist eine freundliche Erinnerung an Ihren morgigen Termin.</p>
        <p><strong>Service:</strong> ${booking.service.title}</p>
        <p><strong>Mitarbeiter:</strong> ${booking.staff.firstName} ${booking.staff.lastName}</p>
        <p><strong>Wann:</strong> ${dayjs(booking.dateTime).locale('de').format('dddd, DD. MMMM YYYY [um] HH:mm [Uhr]')}</p>
        <p>Falls Sie den Termin nicht wahrnehmen können, stornieren Sie ihn bitte rechtzeitig über Ihr Kundenkonto.</p>
        <p>Wir freuen uns auf Sie!</p>
        <p>Ihr Team von Mo's Barbershop</p>
      `;

      if (booking.user.email) {
        await sendEmail({
          to: booking.user.email,
          subject,
          html,
        });

        // WICHTIG: Markiere die Buchung als "Erinnerung gesendet"
        await Booking.updateOne({ _id: booking._id }, { $set: { reminderSent: true } });
      }
    }
  } catch (error) {
    console.error('[Cronjob] Fehler beim Senden der Terminerinnerungen:', error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend läuft auf http://localhost:${PORT}`)
})

mongoose.connect('mongodb://localhost:27017/booking-app')
  .then(() => console.log('✅ MongoDB verbunden'))
  .catch((err) => console.error('❌ MongoDB-Fehler:', err))