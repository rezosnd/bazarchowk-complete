import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('NotificationsController (e2e)', () => {
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

  it('/notifications (GET) - fails without auth token', () => {
    return request(app.getHttpServer())
      .get('/notifications')
      .expect(401);
  });

  it('/notifications/device (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/notifications/device')
      .send({ token: 'test-token', deviceOs: 'android' })
      .expect(401);
  });
});
