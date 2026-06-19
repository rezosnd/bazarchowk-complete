import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ReviewsController (e2e)', () => {
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

  it('/reviews (POST) - fails without auth token', () => {
    return request(app.getHttpServer())
      .post('/reviews')
      .send({ shopId: '123', rating: 5 })
      .expect(401);
  });

  it('/reviews/shop/:shopId (GET) - fetches reviews successfully', () => {
    return request(app.getHttpServer())
      .get('/reviews/shop/some-shop-id')
      .expect(200);
  });
});
