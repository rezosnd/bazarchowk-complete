import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppointmentsController (e2e)', () => {
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

  it('/appointments (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/appointments')
      .send({ serviceOfferingId: '123', providerId: '123', timeSlotId: '123' })
      .expect(401);
  });

  it('/appointments/my-appointments (GET) - fails without auth token', () => {
    return request(app.getHttpServer())
      .get('/appointments/my-appointments')
      .expect(401);
  });
});
