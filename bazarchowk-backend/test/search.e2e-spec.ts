import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('SearchController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/search (GET) - successful query', () => {
    return request(app.getHttpServer())
      .get('/search?query=apple&type=ALL')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('results');
        expect(res.body.results).toHaveProperty('products');
        expect(res.body.results).toHaveProperty('shops');
      });
  });

  it('/search (GET) - query with geofencing', () => {
    return request(app.getHttpServer())
      .get('/search?query=milk&latitude=22.5&longitude=88.3&radius=5')
      .expect(200);
  });
});
