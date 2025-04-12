import { adminResolvers } from '../graphql/resolvers/administrateurResolvers';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { OAuth2Client } from 'google-auth-library';

jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  const OAuth2Client = jest.fn().mockImplementation(() => {
    return { verifyIdToken };
  });
  return { OAuth2Client, verifyIdToken };
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "onssbenamara3@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ons123";

// Simule la méthode pool.request()
const mockRequest = jest.fn(() => ({
  input: jest.fn().mockReturnThis(),
  query: jest.fn().mockResolvedValue({ recordset: [] }) // Default mock
}));

const pool = {
  request: mockRequest
} as unknown as sql.ConnectionPool;

describe('adminResolvers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mutation.loginAdministrateur', () => {
    it('✅ devrait retourner un token et l\'admin si les infos sont valides', async () => {
      const fakeAdmin = {
        idAdministrateur: '123',
        nom_administrateur: 'Admin',
        email_administrateur: ADMIN_EMAIL,
        role: 'ADMIN',
      };

      mockRequest().query.mockResolvedValueOnce({
        recordset: [fakeAdmin] // Ensure the mock returns the expected admin data
      });

      (jwt.sign as jest.Mock).mockReturnValue('fake-jwt-token');

      const result = await adminResolvers.Mutation.loginAdministrateur(
        {},
        {
          email_administrateur: ADMIN_EMAIL,
          password_administrateur: ADMIN_PASSWORD
        },
        { pool }
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connexion réussie');
      expect(result.token).toBe('fake-jwt-token');
      expect(result.administrateur.email_administrateur).toBe(ADMIN_EMAIL);
    });

    it('❌ devrait échouer si l\'email ou le mot de passe est incorrect', async () => {
      const result = await adminResolvers.Mutation.loginAdministrateur(
        {},
        {
          email_administrateur: 'wrong@email.com',
          password_administrateur: 'wrongpass'
        },
        { pool }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Accès refusé');
      expect(result.token).toBeNull();
    });
  });

  describe('Query.getAdministrateur', () => {
    it('✅ devrait retourner un administrateur existant', async () => {
      const fakeAdmin = {
        idAdministrateur: '123',
        nom_administrateur: 'Admin',
        email_administrateur: ADMIN_EMAIL,
        role: 'ADMIN',
      };

      mockRequest().query.mockResolvedValueOnce({
        recordset: [fakeAdmin] // Ensure the mock returns the expected admin data
      });

      const result = await adminResolvers.Query.getAdministrateur(
        {},
        { email_administrateur: ADMIN_EMAIL },
        { pool }
      );

      expect(result.success).toBe(true);
      expect(result.administrateur).toEqual(fakeAdmin);
    });

    it('❌ devrait retourner une erreur si aucun admin trouvé', async () => {
      mockRequest().query.mockResolvedValueOnce({ recordset: [] });

      const result = await adminResolvers.Query.getAdministrateur(
        {},
        { email_administrateur: 'notfound@email.com' },
        { pool }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Administrateur non trouvé');
      expect(result.administrateur).toBeNull();
    });
  });

  describe('Mutation.loginWithGoogle', () => {
    it('✅ devrait réussir l\'authentification Google et retourner un token', async () => {
      const fakeGooglePayload = {
        email: ADMIN_EMAIL,
        name: 'Admin Name',
      };

      // Simule la réponse de Google
      const verifyIdTokenMock = (OAuth2Client.prototype.verifyIdToken as jest.Mock);
      verifyIdTokenMock.mockResolvedValueOnce({
        getPayload: () => fakeGooglePayload
      });

      const fakeAdmin = {
        idAdministrateur: '123',
        nom_administrateur: 'Admin Name',
        email_administrateur: ADMIN_EMAIL,
        role: 'ADMIN',
      };

      mockRequest().query.mockResolvedValueOnce({
        recordset: [fakeAdmin] // Ensure the mock returns the expected admin data
      });

      (jwt.sign as jest.Mock).mockReturnValue('fake-jwt-token-google');

      const result = await adminResolvers.Mutation.loginWithGoogle(
        {},
        { googleIdToken: 'valid-google-id-token' },
        { pool }
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connexion réussie');
      expect(result.administrateur.email_administrateur).toBe(ADMIN_EMAIL);
      expect(result.token).toBe('fake-jwt-token-google');
    });

    it('❌ devrait refuser si l\'email Google n\'est pas autorisé', async () => {
      const verifyIdTokenMock = (OAuth2Client.prototype.verifyIdToken as jest.Mock);
      verifyIdTokenMock.mockResolvedValueOnce({
        getPayload: () => ({ email: 'unauthorized@email.com' })
      });

      const result = await adminResolvers.Mutation.loginWithGoogle(
        {},
        { googleIdToken: 'invalid-id-token' },
        { pool }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Accès refusé');
      expect(result.token).toBeNull();
    });

    it('❌ devrait gérer une erreur Google', async () => {
      const verifyIdTokenMock = (OAuth2Client.prototype.verifyIdToken as jest.Mock);
      verifyIdTokenMock.mockRejectedValueOnce(new Error('Google error'));

      const result = await adminResolvers.Mutation.loginWithGoogle(
        {},
        { googleIdToken: 'error-token' },
        { pool }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erreur d\'authentification');
      expect(result.token).toBeNull();
    });
  });
});
