import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OrdersController (e2e)', () => {
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

  it('/orders (POST) - fails to place order without auth', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ shopId: '123' })
      .expect(401);
  });

  it('/orders/my-orders (GET) - fails without auth', () => {
    return request(app.getHttpServer())
      .get('/orders/my-orders')
      .expect(401);
  });
});
