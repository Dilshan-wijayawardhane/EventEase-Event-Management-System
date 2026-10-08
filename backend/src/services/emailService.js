const nodemailer = require('nodemailer');
const { generateQRImage } = require('../utils/ticketGenerator');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '2525'),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@eventease.com',
            to,
            subject,
            html
        });
        console.log(`📧 Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
};

const sendBookingConfirmation = async (user, event, booking, tickets) => {
    const ticketsWithQR = await Promise.all(
        tickets.slice(0, 3).map(async (t) => ({
            ...t.toJSON(),
            qrImage: await generateQRImage(t.qr_data)
        }))
    );

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">🎉 Booking Confirmed!</h1>
            <p>Hi ${user.full_name},</p>
            <p>Your booking for <strong>${event.title}</strong> is confirmed.</p>
            <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                <p><strong>Event Date:</strong> ${event.event_date} at ${event.start_time}</p>
                <p><strong>Venue:</strong> ${event.venue}</p>
                <p><strong>Total Paid:</strong> $${booking.total_amount}</p>
            </div>
            <h2>Your Tickets (${tickets.length})</h2>
            ${ticketsWithQR.map(t => `
                <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 12px 0;">
                    <p><strong>${t.ticket_type_name}</strong></p>
                    <p>Ticket Code: <code>${t.ticket_code}</code></p>
                    <img src="${t.qrImage}" alt="QR Code" width="200" />
                </div>
            `).join('')}
            <p>Present these QR codes at the event entrance.</p>
            <p>See you there! 🎊</p>
        </div>
    `;

    return sendEmail({
        to: user.email,
        subject: `🎫 Booking Confirmed: ${event.title}`,
        html
    });
};

const sendEventCancellation = async (user, event) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h1 style="color: #DC2626;">Event Cancelled</h1>
            <p>Hi ${user.full_name},</p>
            <p>We're sorry to inform you that <strong>${event.title}</strong> has been cancelled.</p>
            <p>A full refund will be processed to your original payment method within 5-7 business days.</p>
            <p>We apologize for the inconvenience.</p>
        </div>
    `;
    return sendEmail({ to: user.email, subject: `Event Cancelled: ${event.title}`, html });
};

const sendEventReminder = async (user, event) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h1 style="color: #4F46E5;">⏰ Event Reminder</h1>
            <p>Hi ${user.full_name},</p>
            <p><strong>${event.title}</strong> is happening tomorrow!</p>
            <p>📍 ${event.venue}<br/>🕐 ${event.start_time}</p>
            <p>Don't forget your QR ticket!</p>
        </div>
    `;
    return sendEmail({ to: user.email, subject: `Reminder: ${event.title} tomorrow!`, html });
};

module.exports = { sendEmail, sendBookingConfirmation, sendEventCancellation, sendEventReminder };