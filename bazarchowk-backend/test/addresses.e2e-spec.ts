import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AddressesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/addresses (GET) - fails without auth token', () => {
    return request(app.getHttpServer())
      .get('/addresses')
      .expect(401); // Unauthorized
  });

  it('/addresses (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/addresses')
      .send({
        title: 'Home',
        addressLine1: '123 Main St',
        city: 'Kolkata',
        state: 'WB',
        pincode: '700001',
        latitude: 22.5,
        longitude: 88.3
      })
      .expect(401); // Unauthorized
  });
});
