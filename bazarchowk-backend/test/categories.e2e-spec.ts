import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CategoriesController (e2e)', () => {
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

  it('/categories (GET) - fetch all categories', () => {
    return request(app.getHttpServer())
      .get('/categories')
      .expect(200);
  });

  it('/categories (POST) - should fail without admin auth token', () => {
    return request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'Groceries' })
      .expect(401);
  });
});
