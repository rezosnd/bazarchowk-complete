import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ShopsController (e2e)', () => {
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

  it('/shops (GET) - fetch all shops', () => {
    return request(app.getHttpServer())
      .get('/shops')
      .expect(200);
  });

  it('/shops (POST) - fails to create without auth token', () => {
    return request(app.getHttpServer())
      .post('/shops')
      .send({
        name: 'Test Shop',
        address: '123 Test St',
        city: 'Kolkata',
        state: 'WB',
        latitude: 22.5,
        longitude: 88.3,
      })
      .expect(401);
  });
});
