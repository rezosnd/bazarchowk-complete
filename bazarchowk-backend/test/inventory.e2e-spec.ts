import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('InventoryController (e2e)', () => {
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

  it('/inventory/:id (GET) - fails without auth token', () => {
    return request(app.getHttpServer())
      .get('/inventory/123')
      .expect(401);
  });

  it('/inventory/:id/update (PATCH) - fails without auth token', () => {
    return request(app.getHttpServer())
      .patch('/inventory/123/update')
      .send({
        delta: 10,
        type: 'RESTOCK'
      })
      .expect(401);
  });
});
