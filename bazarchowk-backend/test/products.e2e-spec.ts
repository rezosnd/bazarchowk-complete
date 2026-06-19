import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProductsController (e2e)', () => {
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

  it('/products (GET) - search/list products', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200);
  });

  it('/products (POST) - fails to create without auth token', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send({
        shopId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Organic Milk',
        description: 'Fresh milk from village',
        basePrice: 50.0
      })
      .expect(401);
  });
});
