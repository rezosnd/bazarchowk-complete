const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

// The user's exact HTML template
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BazarChowk Email</title>
</head>

<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;padding:40px 24px;">

<tr>
<td style="height:4px;background:#FF8A00;border-radius:999px;"></td>
</tr>

<tr>
<td align="center" style="padding:36px 0;">
<img
src="https://bazarchowk.com/logo.png"
alt="BazarChowk"
width="180"
style="display:block;border:0;">
</td>
</tr>

<tr>
<td>

<h1 style="
margin:0 0 20px;
font-size:30px;
font-weight:700;
color:#111111;">
Weekly Settlement Paid
</h1>

<p style="
margin:0 0 20px;
font-size:16px;
line-height:28px;
color:#444444;">
Hello <strong>Desari Fresh Mart</strong>,
</p>

<p style="
margin:0;
font-size:16px;
line-height:30px;
color:#444444;">
Your weekly settlement of <strong>₹10,000.00</strong> has been successfully processed and transferred to your registered bank account via UPI. A formal PDF invoice of this transaction has been attached to this email for your tax and accounting records.
</p>

</td>
</tr>

<tr>
<td style="padding-top:40px;">

<a href="https://bazarchowk.in/partner-dashboard" style="
background:#FF8A00;
color:#ffffff;
text-decoration:none;
padding:14px 28px;
border-radius:8px;
display:inline-block;
font-size:15px;
font-weight:600;">
View Partner Dashboard
</a>

</td>
</tr>

<tr>
<td style="padding-top:40px;">

<p style="
margin:0;
font-size:15px;
line-height:28px;
color:#444444;">
Regards,<br>
<strong>Team BazarChowk</strong>
</p>

</td>
</tr>

<tr>
<td style="padding-top:40px;">
<hr style="border:none;border-top:1px solid #eeeeee;">
</td>
</tr>

<tr>
<td align="center" style="padding-top:20px;">

<p style="
margin:0;
font-size:13px;
color:#888888;">
BazarChowk — Everything Your Local Market Offers
</p>

<p style="
margin:8px 0 0;
font-size:13px;
color:#888888;">
support@bazarchowk.in
</p>

<p style="
margin:8px 0 0;
font-size:12px;
color:#aaaaaa;">
© 2026 BazarChowk. All Rights Reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

// Generate PDF in memory with actual Logo
function generatePDF() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Load Local Logo Image
    const logoPath = 'D:\\\\bazarchowk-complete\\\\bazarchowk-customer\\\\assets\\\\images\\\\logo.png';
    if (fs.existsSync(logoPath)) {
      // Draw image centered at the top
      // 180 width, centered on 595.28 width page
      doc.image(logoPath, (595.28 / 2) - 90, 50, { width: 180 });
      doc.moveDown(5); // Make space for the image
    } else {
      // Fallback if image not found
      doc.fillColor('#FF8A00').fontSize(24).text('BAZARCHOWK', { align: 'center', characterSpacing: 2 });
      doc.moveDown(2);
    }

    // PDF Styling
    doc.fillColor('#FF8A00').fontSize(16).text('Partner Settlement Invoice', { align: 'center' });
    doc.moveDown(2);

    doc.fillColor('#111827').fontSize(14).text('INVOICE TO:', { underline: true });
    doc.fontSize(12).text('Desari Fresh Mart');
    doc.text('Market ID: Desari Zone 1');
    doc.text('GSTIN: 10ABCD1234E1Z5');
    doc.moveDown(2);

    doc.fontSize(14).text('SETTLEMENT DETAILS:', { underline: true });
    doc.fontSize(12);

    const startY = doc.y;
    doc.text('Period:', 50, startY);
    doc.text('Oct 01, 2026 - Oct 07, 2026', 200, startY);

    doc.text('Settlement ID:', 50, startY + 20);
    doc.text('SET-1029-BC', 200, startY + 20);

    doc.text('Transaction Ref:', 50, startY + 40);
    doc.text('TXN9876543210ABC', 200, startY + 40);

    doc.text('Payment Method:', 50, startY + 60);
    doc.text('UPI (desarifresh@okicici)', 200, startY + 60);

    doc.moveDown(5);

    // Table Header
    doc.rect(50, doc.y, 495, 25).fill('#fff3e0').stroke('#FF8A00');
    doc.fillColor('#FF8A00').font('Helvetica-Bold');
    doc.text('Description', 60, doc.y - 18);
    doc.text('Amount (INR)', 400, doc.y - 18, { width: 135, align: 'right' });
    doc.moveDown(1);

    // Table Rows
    doc.font('Helvetica').fillColor('#111827');
    doc.text('Gross Sales (42 Orders)', 60, doc.y);
    doc.text('10,526.32', 400, doc.y, { width: 135, align: 'right' });
    doc.moveDown(1);

    doc.fillColor('#dc2626');
    doc.text('Platform Commission (5%)', 60, doc.y);
    doc.text('-526.32', 400, doc.y, { width: 135, align: 'right' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
    doc.moveDown(1);

    // Total
    doc.font('Helvetica-Bold').fillColor('#FF8A00').fontSize(16);
    doc.text('NET PAYOUT', 60, doc.y);
    doc.text('10,000.00', 400, doc.y, { width: 135, align: 'right' });

    doc.moveDown(4);
    doc.font('Helvetica').fillColor('#9ca3af').fontSize(10).text('This is a computer-generated invoice and does not require a physical signature.', { align: 'center' });

    doc.end();
  });
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail() {
  try {
    const pdfBuffer = await generatePDF();

    const info = await transporter.sendMail({
      from: '"' + process.env.FROM_NAME + '" <' + process.env.FROM_EMAIL + '>',
      to: 'admin@veritasco.tech',
      subject: 'Weekly Settlement Paid - BazarChowk',
      html: htmlContent,
      attachments: [
        {
          filename: 'Settlement_SET-1029-BC.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendMail();
