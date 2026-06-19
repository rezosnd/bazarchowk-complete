import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/payments/create (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/payments/create')
      .send({ orderId: '123' })
      .expect(401);
  });

  it('/payments/verify (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/payments/verify')
      .send({ razorpayOrderId: 'order_123', razorpayPaymentId: 'pay_123', razorpaySignature: 'sig_123' })
      .expect(401);
  });
});
