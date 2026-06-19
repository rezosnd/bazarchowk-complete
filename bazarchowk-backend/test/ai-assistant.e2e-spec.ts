import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AiAssistantController (e2e)', () => {
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

  it('/ai-assistant/ticket (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/ai-assistant/ticket')
      .send({ subject: 'Help', category: 'GENERAL', message: 'I need help' })
      .expect(401);
  });
});
