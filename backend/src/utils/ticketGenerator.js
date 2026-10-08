const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Generate a unique ticket code.
 * Format: EVT-{eventId}-{bookingId}-{random}-{timestamp}
 */
const generateTicketCode = (eventId, bookingId, index) => {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `EVT-${eventId}-${bookingId}-${random}-${timestamp}${index}`;
};

/**
 * Generate QR data (secure identifier, not sensitive info).
 * Format: signature:code — signature prevents tampering.
 */
const generateQRData = (ticketCode) => {
    const secret = process.env.QR_SECRET || 'default_qr_secret';
    const signature = crypto
        .createHmac('sha256', secret)
        .update(ticketCode)
        .digest('hex')
        .substring(0, 16);
    return `${signature}:${ticketCode}`;
};

/**
 * Verify QR data signature.
 */
const verifyQRData = (qrData) => {
    if (!qrData || !qrData.includes(':')) return null;
    const [signature, ticketCode] = qrData.split(':');
    const expectedSignature = crypto
        .createHmac('sha256', process.env.QR_SECRET || 'default_qr_secret')
        .update(ticketCode)
        .digest('hex')
        .substring(0, 16);
    return signature === expectedSignature ? ticketCode : null;
};

/**
 * Generate QR code as data URL (for embedding in emails/PDFs).
 */
const generateQRImage = async (qrData) => {
    return await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 2,
        width: 300,
        color: { dark: '#000000', light: '#FFFFFF' }
    });
};

/**
 * Generate QR code as buffer (for PDF generation).
 */
const generateQRBuffer = async (qrData) => {
    return await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 300
    });
};

module.exports = {
    generateTicketCode,
    generateQRData,
    verifyQRData,
    generateQRImage,
    generateQRBuffer
};