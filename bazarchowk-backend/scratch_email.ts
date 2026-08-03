import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailService } from './src/email/email.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);
  
  const to = 'rehansuman41008@gmail.com';
  const name = 'Rehan Suman';
  const invoiceNumber = 'INV-DEMO-777';
  const items = [
    { name: 'Demo Product 1', qty: 2, price: 500 },
    { name: 'Demo Product 2', qty: 1, price: 1500 }
  ];
  const totalAmt = 2500;

  console.log(`Sending demo receipt to ${to}...`);
  await emailService.sendOrderInvoice(to, name, invoiceNumber, items, totalAmt);
  console.log('Demo receipt sent successfully!');
  
  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
