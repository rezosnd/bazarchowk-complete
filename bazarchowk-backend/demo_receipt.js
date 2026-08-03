const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendDemo() {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: 'veritasco.tech@gmail.com',
        pass: 'udmd fcse murp gmdg'
      }
    });

    await transporter.sendMail({
      from: '"Team BazarChowk" <veritasco.tech@gmail.com>',
      to: 'rehansuman41008@gmail.com',
      subject: 'Demo Invoice with Logo - BazarChowk',
      html: `<h3>Hi Rehan,</h3><p>Please find attached the demo invoice. It now embeds the BazarChowk logo at the top.</p>`,
      attachments: [{ filename: 'INV-DEMO.pdf', content: pdfBuffer }]
    });
    
    console.log('Demo email sent successfully!');
  });

  doc.fillColor('#FF8A00').fontSize(16).text('Customer Order Invoice', { align: 'center' });
  doc.moveDown(2);

  // Use the exact same path that production uses
  const logoPath = path.join(__dirname, 'src', 'email', 'templates', 'logo.png');
  if (fs.existsSync(logoPath)) {
    console.log('Logo found at:', logoPath);
    doc.image(logoPath, (595.28 / 2) - 90, doc.y, { width: 180 });
    doc.moveDown(6);
  } else {
    console.log('LOGO NOT FOUND AT:', logoPath);
    doc.fillColor('#FF8A00').fontSize(24).text('BAZARCHOWK', { align: 'center', characterSpacing: 2 });
    doc.moveDown(2);
  }

  doc.fillColor('#111827').fontSize(14).text('BILLED TO:', { underline: true });
  doc.fontSize(12).text('Rehan Suman');
  doc.moveDown(2);
  
  doc.fontSize(14).text('ORDER DETAILS:', { underline: true });
  doc.fontSize(12);
  doc.text('Order ID:', 50, doc.y);
  doc.text('INV-DEMO-777', 200, doc.y - 12);
  
  doc.end();
}

sendDemo().catch(console.error);
