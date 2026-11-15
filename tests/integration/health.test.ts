import request from 'supertest';
import { app } from '../../src/app';

describe('health endpoint', () => {
  it('returns healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('rejects protected chat requests without a token', async () => {
    const response = await request(app).post('/chat/create').send({});
    expect(response.status).toBe(401);
  });
});
