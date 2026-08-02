const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const htmlPath = path.join('C:\\Users\\KIIT0001\\.gemini\\antigravity\\brain\\dc7cd543-9821-44a7-a9cf-93daad80191f', 'email-preview.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail() {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: 'admin@veritasco.tech',
      subject: 'Weekly Settlement Completed - ₹10,000.00',
      html: htmlContent,
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendMail();
