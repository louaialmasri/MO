import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: MailOptions) => {
  // 1. Transporter erstellen (das Objekt, das die E-Mail tatsächlich sendet)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. E-Mail-Optionen definieren
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  // 3. E-Mail senden
  try {
    await transporter.sendMail(mailOptions);
    console.log('E-Mail erfolgreich versendet an:', options.to);
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error);
    // Wir werfen hier absichtlich keinen Fehler, damit die Buchung nicht fehlschlägt,
    // nur weil die E-Mail nicht gesendet werden konnte.
  }
};