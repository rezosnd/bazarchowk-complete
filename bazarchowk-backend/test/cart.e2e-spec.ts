import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CartController (e2e)', () => {
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

  it('/cart (GET) - fails without auth token', () => {
    return request(app.getHttpServer())
      .get('/cart')
      .expect(401);
  });

  it('/cart/items (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/cart/items')
      .send({
        productVariantId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 2
      })
      .expect(401);
  });
});
