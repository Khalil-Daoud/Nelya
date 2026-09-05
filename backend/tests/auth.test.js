const request = require('supertest');
const app = require('../src/app');
const models = require('../src/models');

jest.mock('../src/models', () => {
  const mockUser = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  return {
    User: mockUser,
    sequelize: {
      sync: jest.fn(),
    }
  };
});

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should validate missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Tous les champs');
    });

    it('should validate invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          first_name: 'John',
          last_name: 'Doe'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('email invalide');
    });

    it('should validate short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          first_name: 'John',
          last_name: 'Doe'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('au moins 6 caractères');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should validate missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Email et mot de passe requis');
    });
  });
});
