import { adminResolvers } from '../graphql/resolvers/administrateurResolvers';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake-jwt-token'),
  verify: jest.fn(() => ({ email: 'admin@example.com' })),
}));

const mockPool = {
  request: jest.fn().mockReturnThis(),
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
};

describe('adminResolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mutation: loginAdministrateur', () => {
    it('should login successfully with correct credentials', async () => {
      const admin = {
        idAdministrateur: '1',
        nom_administrateur: 'Admin',
        email_administrateur: 'admin@example.com',
        password_administrateur: 'hashed-password',
        role: 'ADMIN',
      };
      mockPool.query.mockResolvedValueOnce({ recordset: [admin] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await adminResolvers.Mutation.loginAdministrateur(
        null,
        { email_administrateur: 'admin@example.com', password_administrateur: 'password' },
        { pool: mockPool as any }
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connexion réussie');
      expect(result.administrateur).not.toBeNull();
      expect(result.administrateur!.email_administrateur).toBe('admin@example.com');
      expect(result.token).toBe('fake-jwt-token');
    });

    it('should fail login with wrong password', async () => {
      const admin = {
        idAdministrateur: '1',
        nom_administrateur: 'Admin',
        email_administrateur: 'admin@example.com',
        password_administrateur: 'hashed-password',
        role: 'ADMIN',
      };
      mockPool.query.mockResolvedValueOnce({ recordset: [admin] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await adminResolvers.Mutation.loginAdministrateur(
        null,
        { email_administrateur: 'admin@example.com', password_administrateur: 'wrong' },
        { pool: mockPool as any }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email ou mot de passe incorrect');
      expect(result.administrateur).toBeNull();
      expect(result.token).toBeNull();
    });

    it('should fail login if admin not found', async () => {
      mockPool.query.mockResolvedValueOnce({ recordset: [] });

      const result = await adminResolvers.Mutation.loginAdministrateur(
        null,
        { email_administrateur: 'notfound@example.com', password_administrateur: 'password' },
        { pool: mockPool as any }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email ou mot de passe incorrect');
      expect(result.administrateur).toBeNull();
      expect(result.token).toBeNull();
    });
  });
});