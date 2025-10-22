import { model, Schema, Document } from "mongoose";

// Interface für Social Media Links
interface ISocialMedia extends Document {
  instagram?: string;
  facebook?: string;
  // Weitere Plattformen können hier hinzugefügt werden
}

// Interface für Buchungsregeln
interface IBookingRules extends Document {
  cancellationDeadlineHours?: number; // Stornierungsfrist in Stunden vor dem Termin
  bookingLeadTimeMinutes?: number; // Mindestvorlaufzeit für Buchungen in Minuten
  bookingHorizonDays?: number; // Wie viele Tage im Voraus gebucht werden kann
  sendReminderEmails?: boolean; // Ob automatische Erinnerungen gesendet werden sollen
}

// Interface für Rechnungseinstellungen
interface IInvoiceSettings extends Document {
    footerText?: string; // Text für die Fußzeile der Rechnung
}

// Schema für Social Media Links
const socialMediaSchema = new Schema<ISocialMedia>({
  instagram: { type: String, trim: true },
  facebook: { type: String, trim: true },
}, { _id: false });

// Schema für Buchungsregeln
const bookingRulesSchema = new Schema<IBookingRules>({
  cancellationDeadlineHours: { type: Number, default: 24, min: 0 },
  bookingLeadTimeMinutes: { type: Number, default: 60, min: 0 },
  bookingHorizonDays: { type: Number, default: 90, min: 1 },
  sendReminderEmails: { type: Boolean, default: true },
}, { _id: false });

// Schema für Rechnungseinstellungen
const invoiceSettingsSchema = new Schema<IInvoiceSettings>({
    footerText: { type: String, trim: true },
}, { _id: false });

// Schema für Öffnungszeiten (unverändert)
const openingHoursSchema = new Schema({
  weekday: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sonntag, 6 = Samstag
  isOpen: { type: Boolean, default: true },
  open: { type: String, default: '09:00' }, // Format "HH:mm"
  close: { type: String, default: '18:00' } // Format "HH:mm"
}, { _id: false });

// Haupt-Salon-Schema
const salonSchema = new Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  websiteUrl: { type: String, trim: true }, // NEU
  logoUrl: { type: String, trim: true }, // NEU (war vorher nur in API-Payload)
  socialMedia: { type: socialMediaSchema, default: {} }, // NEU
  bookingRules: { type: bookingRulesSchema, default: {} }, // NEU
  invoiceSettings: { type: invoiceSettingsSchema, default: {} }, // NEU
  openingHours: {
    type: [openingHoursSchema],
    default: () => Array.from({length: 7}, (_, i) => ({
      weekday: i,
      isOpen: i > 0 && i < 6, // Mo-Fr standardmäßig geöffnet
      open: '09:00',
      close: '18:00'
    }))
  },
  datevSettings: {
    revenueAccountServices: { type: String, default: '8400' }, // Erlöse 19%
    revenueAccountProducts: { type: String, default: '8400' }, // Erlöse 19%
    cashAccount: { type: String, default: '1000' }, // Kasse
    cardAccount: { type: String, default: '1360' }, // Geldtransit
    consultantNumber: { type: String },
    clientNumber: { type: String },
  }
}, { timestamps: true });

// Interface für das Salon-Dokument (inkl. neuer Felder)
export interface ISalon extends Document {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  logoUrl?: string;
  socialMedia: ISocialMedia;
  bookingRules: IBookingRules;
  invoiceSettings: IInvoiceSettings;
  openingHours: {
    weekday: number;
    isOpen: boolean;
    open: string;
    close: string;
  }[];
  datevSettings?: {
    revenueAccountServices?: string;
    revenueAccountProducts?: string;
    cashAccount?: string;
    cardAccount?: string;
    consultantNumber?: string;
    clientNumber?: string;
  };
}


export const Salon = model<ISalon>('Salon', salonSchema);
