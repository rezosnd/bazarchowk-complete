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
      subject: 'Your BazarChowk Order Receipt - 100% Production Ready',
      html: `<h3>Hi Rehan,</h3><p>Here is your highly detailed, production-ready order receipt containing the shop details, full item list, and the BazarChowk logo.</p>`,
      attachments: [{ filename: 'BazarChowk-Receipt.pdf', content: pdfBuffer }]
    });
    
    console.log('Demo email sent successfully!');
  });

  // Theme Colors
  const PRIMARY_COLOR = '#F97316'; // Orange-500
  const TEXT_DARK = '#111827';
  const TEXT_LIGHT = '#6B7280';
  const BORDER_COLOR = '#E5E7EB';

  // Helper Functions
  const drawLine = (y) => {
    doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
  };

  // --- HEADER & LOGO ---
  const logoPath = path.join(__dirname, 'src', 'email', 'templates', 'logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, { width: 140 });
  } else {
    doc.fillColor(PRIMARY_COLOR).fontSize(20).font('Helvetica-Bold').text('BAZARCHOWK', 50, 50);
  }

  doc.fillColor(TEXT_DARK).fontSize(24).font('Helvetica-Bold').text('INVOICE', 50, 50, { align: 'right' });
  doc.fillColor(TEXT_LIGHT).fontSize(10).font('Helvetica').text('Order ID: #BC-ORD-99382', { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });

  doc.moveDown(3);
  drawLine(doc.y);
  doc.moveDown(1.5);

  // --- SHOP & CUSTOMER INFO ---
  const startY = doc.y;

  // Billed To (Customer)
  doc.fillColor(TEXT_DARK).fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, startY);
  doc.fillColor(TEXT_LIGHT).fontSize(10).font('Helvetica')
     .text('Rehan Suman', 50, startY + 15)
     .text('rehansuman41008@gmail.com', 50, startY + 28)
     .text('123 Green Valley, Downtown', 50, startY + 41)
     .text('Patna, Bihar 800001', 50, startY + 54);

  // Fulfilled By (Shop)
  doc.fillColor(TEXT_DARK).fontSize(12).font('Helvetica-Bold').text('Fulfilled By (Shop):', 300, startY);
  doc.fillColor(TEXT_LIGHT).fontSize(10).font('Helvetica')
     .text('Sharma Fresh Mart (Verified)', 300, startY + 15)
     .text('GSTIN: 22AAAAA0000A1Z5', 300, startY + 28)
     .text('Shop No 4, Main Bazar Road', 300, startY + 41)
     .text('Patna, Bihar 800001', 300, startY + 54);

  doc.moveDown(4);

  // --- ITEMS TABLE ---
  const tableTop = doc.y;
  doc.fillColor(PRIMARY_COLOR).rect(50, tableTop, 495, 25).fill();
  
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
  doc.text('Item Description', 60, tableTop + 8);
  doc.text('Qty', 350, tableTop + 8, { width: 30, align: 'center' });
  doc.text('Unit Price', 400, tableTop + 8, { width: 60, align: 'right' });
  doc.text('Total', 480, tableTop + 8, { width: 55, align: 'right' });

  const items = [
    { name: 'Aashirvaad Whole Wheat Atta', qty: 2, price: 210, total: 420 },
    { name: 'Fortune Sunflower Oil (1L)', qty: 1, price: 145, total: 145 },
    { name: 'Tata Salt (1kg)', qty: 3, price: 25, total: 75 },
    { name: 'Amul Butter (500g)', qty: 1, price: 280, total: 280 },
  ];

  let itemY = tableTop + 35;
  doc.font('Helvetica').fillColor(TEXT_DARK).fontSize(10);

  items.forEach(item => {
    doc.text(item.name, 60, itemY);
    doc.text(item.qty.toString(), 350, itemY, { width: 30, align: 'center' });
    doc.text(`Rs. ${item.price.toFixed(2)}`, 400, itemY, { width: 60, align: 'right' });
    doc.text(`Rs. ${item.total.toFixed(2)}`, 480, itemY, { width: 55, align: 'right' });
    itemY += 25;
    drawLine(itemY - 10);
  });

  // --- TOTALS ---
  const totalsY = itemY + 15;
  
  doc.font('Helvetica').fillColor(TEXT_LIGHT);
  doc.text('Subtotal:', 350, totalsY, { width: 110, align: 'right' });
  doc.text('Rs. 920.00', 480, totalsY, { width: 55, align: 'right' });

  doc.text('Delivery Fee:', 350, totalsY + 20, { width: 110, align: 'right' });
  doc.text('Rs. 30.00', 480, totalsY + 20, { width: 55, align: 'right' });

  doc.text('GST (Platform):', 350, totalsY + 40, { width: 110, align: 'right' });
  doc.text('Rs. 15.00', 480, totalsY + 40, { width: 55, align: 'right' });

  doc.fillColor('#10B981').text('Discount (PROMO):', 350, totalsY + 60, { width: 110, align: 'right' });
  doc.text('- Rs. 50.00', 480, totalsY + 60, { width: 55, align: 'right' });

  drawLine(totalsY + 80);

  doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(12);
  doc.text('Grand Total:', 350, totalsY + 95, { width: 110, align: 'right' });
  doc.fillColor(PRIMARY_COLOR).text('Rs. 915.00', 480, totalsY + 95, { width: 55, align: 'right' });

  // --- FOOTER ---
  doc.moveDown(8);
  doc.fillColor(TEXT_LIGHT).font('Helvetica-Oblique').fontSize(10);
  doc.text('Thank you for shopping with BazarChowk!', 50, doc.y, { align: 'center' });
  doc.text('For any support, please reach out to support@bazarchowk.com', { align: 'center' });

  doc.end();
}

sendDemo().catch(console.error);
