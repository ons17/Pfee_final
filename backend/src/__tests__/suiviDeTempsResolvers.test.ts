import { Kind } from 'graphql';
import { UserInputError, ApolloError } from 'apollo-server-express';
import { suiviDeTempsResolvers, tacheResolvers } from '../graphql/resolvers/suiviDeTempsResolvers';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

// --- Mocks ---
jest.mock('mssql');
jest.mock('uuid');

// Use namespace import for mssql (no default export)
const mockPool = {
  request: jest.fn().mockReturnThis(),
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
};

// Create a dedicated mock for transactions
const mockTransaction = {
  begin: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  request: jest.fn().mockReturnThis(),
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
};

// Override sql.Transaction to always return our mockTransaction
(sql.Transaction as unknown as jest.Mock).mockImplementation(() => mockTransaction);

describe('suiviDeTempsResolvers - Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Prevent console.error from spamming test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // -------------------------------
  // SCALAR: DateTimeISO
  // -------------------------------
  describe('Scalar: DateTimeISO', () => {
    const { DateTimeISO } = suiviDeTempsResolvers;

    it('parseValue should return ISO string for valid date string', () => {
      expect(DateTimeISO.parseValue('2024-03-31')).toBe(new Date('2024-03-31').toISOString());
    });

    it('parseValue should return ISO string for valid Date object', () => {
      expect(DateTimeISO.parseValue(new Date('2024-03-31')))
        .toBe(new Date('2024-03-31').toISOString());
    });

    it('parseValue should throw UserInputError for invalid type', () => {
      expect(() => DateTimeISO.parseValue({})).toThrow(UserInputError);
      expect(() => DateTimeISO.parseValue(null)).toThrow(UserInputError);
    });

    it('parseValue should throw UserInputError for invalid date format', () => {
      expect(() => DateTimeISO.parseValue('invalid-date')).toThrow(UserInputError);
    });

    it('parseLiteral should return ISO string for valid AST literal', () => {
      const ast = { kind: Kind.STRING, value: '2024-03-31' } as any;
      expect(DateTimeISO.parseLiteral(ast, {}))
        .toBe(new Date('2024-03-31').toISOString());
    });

    it('parseLiteral should throw UserInputError for non-string AST kind', () => {
      const invalidAst = { kind: Kind.INT, value: '12345' } as any;
      expect(() => DateTimeISO.parseLiteral(invalidAst, {}))
        .toThrow(UserInputError);
    });

    it('serialize should return the passed ISO string', () => {
      const isoDate = new Date('2024-03-31').toISOString();
      expect(DateTimeISO.serialize(isoDate)).toBe(isoDate);
    });
  });

  // -------------------------------
  // QUERY: suivisDeTemp
  // -------------------------------
  describe('Query: suivisDeTemp', () => {
    it('should fetch time entries with provided filters', async () => {
      const mockRow = {
        idsuivi: '1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z',
        // Test branch: if no value then map to null
        heure_fin_suivi: undefined,
        duree_suivi: 120,
        idEmployee: 'emp1',
        idTache: 'task1',
        nom_employee: 'John Doe',
        email_employee: 'john@example.com',
        titre_tache: 'Task 1',
        statut_tache: 'In Progress',
        idProjet: 'proj1',
        nom_projet: 'Project 1',
        statut_projet: 'Active'
      };

      // Simulate pool.request() chain to return our row
      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [mockRow] })
      });

      const filters = { startDate: '2024-03-01', endDate: '2024-03-31', employeeId: 'emp1' };
      const result = await suiviDeTempsResolvers.Query.suivisDeTemp(
        null,
        { filters },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(result).toEqual([{
        idsuivi: '1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z',
        heure_fin_suivi: null,
        duree_suivi: 120,
        description: null, // Include description
        employee: {
          idEmployee: 'emp1',
          nomEmployee: 'John Doe',
          emailEmployee: 'john@example.com',
        },
        tache: {
          idTache: 'task1',
          titreTache: 'Task 1',
          statutTache: 'In Progress',
          idProjet: 'proj1',
          projet: {
            idProjet: 'proj1',
            nom_projet: 'Project 1',
            statutProjet: 'Active',
          },
        },
      }]);
    });

    it('should throw an ApolloError when query fails', async () => {
      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockRejectedValueOnce(new Error('DB error'))
      });

      await expect(
        suiviDeTempsResolvers.Query.suivisDeTemp(
          null,
          { filters: {} },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow(ApolloError);
    });
  });

  // -------------------------------
  // QUERY: getActiveSuivi
  // -------------------------------
  describe('Query: getActiveSuivi', () => {
    it('should return an active time entry', async () => {
      const mockActive = {
        idsuivi: '1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z',
        idTache: 'task1',
        titre_tache: 'Task 1',
        idProjet: 'proj1',
        nom_projet: 'Project 1'
      };

      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [mockActive] })
      });

      const result = await suiviDeTempsResolvers.Query.getActiveSuivi(
        null,
        { employeeId: 'emp1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(result).toEqual({
        idsuivi: '1',
        heureDebutSuivi: '2024-03-31T08:00:00.000Z',
        tache: {
          idTache: 'task1',
          idProjet: 'proj1',
          titreTache: 'Task 1',
          nomProjet: 'Project 1'
        }
      });
    });

    it('should return null if no active entry is found', async () => {
      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [] })
      });

      const result = await suiviDeTempsResolvers.Query.getActiveSuivi(
        null,
        { employeeId: 'emp1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );
      expect(result).toBeNull();
    });
  });

  // -------------------------------
  // MUTATION: createSuiviDeTemp
  // -------------------------------
  describe('Mutation: createSuiviDeTemp', () => {
    it('should create a new time entry successfully', async () => {
      const validInput = {
        idEmployee: 'emp1',
        idTache: 'task1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z',
      };

      const mockCreatedRow = {
        idsuivi: '1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z',
        heure_fin_suivi: null,
        duree_suivi: null,
        description: null, // Include description
        idEmployee: 'emp1',
        idTache: 'task1',
        nom_employee: 'John Doe',
        email_employee: 'john@example.com',
        titre_tache: 'Task 1',
        statut_tache: 'In Progress',
        idProjet: 'proj1',
        nom_projet: 'Project 1',
        statut_projet: 'Active',
      };

      // Simulate transaction and database behavior
      mockTransaction.begin.mockResolvedValue(undefined);
      mockTransaction.commit.mockResolvedValue(undefined);

      (sql.Request as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          input: jest.fn().mockReturnThis(),
          query: jest.fn().mockResolvedValueOnce({ recordset: [{ exists: true }] }), // Employee check
        }))
        .mockImplementationOnce(() => ({
          input: jest.fn().mockReturnThis(),
          query: jest.fn().mockResolvedValueOnce({ recordset: [{ exists: true }] }), // Task check
        }))
        .mockImplementationOnce(() => ({
          input: jest.fn().mockReturnThis(),
          query: jest.fn().mockResolvedValueOnce({ rowsAffected: [1] }), // Insert
        }))
        .mockImplementationOnce(() => ({
          input: jest.fn().mockReturnThis(),
          query: jest.fn().mockResolvedValueOnce({ recordset: [mockCreatedRow] }), // Fetch inserted row
        }));

      const result = await suiviDeTempsResolvers.Mutation.createSuiviDeTemp(
        null,
        { input: validInput },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({
        idsuivi: '1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z',
        heure_fin_suivi: null,
        duree_suivi: null,
        description: null, // Include description
        employee: {
          idEmployee: 'emp1',
          nomEmployee: 'John Doe',
          emailEmployee: 'john@example.com',
        },
        tache: {
          idTache: 'task1',
          titreTache: 'Task 1',
          statutTache: 'In Progress',
          idProjet: 'proj1',
          projet: {
            idProjet: 'proj1',
            nom_projet: 'Project 1',
            statutProjet: 'Active',
          },
        },
      });
    });

    it('should throw error if required fields are missing', async () => {
      const invalidInput = { idEmployee: '', idTache: '', heure_debut_suivi: '' };

      await expect(
        suiviDeTempsResolvers.Mutation.createSuiviDeTemp(
          null,
          { input: invalidInput },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow(UserInputError);
    });
  });

  // -------------------------------
  // MUTATION: stopActiveSuivi
  // -------------------------------
  describe('Mutation: stopActiveSuivi', () => {
    it('should stop an active time entry successfully', async () => {
      // Simulate an active entry exists
      const activeEntry = {
        idsuivi: '1',
        heure_debut_suivi: '2024-03-31T08:00:00.000Z'
      };

      const findRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [activeEntry] })
      };
      const updateRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ rowsAffected: [1] })
      };
      const resultRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({
          recordset: [{
            idsuivi: '1',
            heure_debut_suivi: '2024-03-31T08:00:00.000Z',
            heure_fin_suivi: new Date().toISOString(),
            duree_suivi: 120,
            idEmployee: 'emp1',
            idTache: 'task1',
            nom_employee: 'John Doe',
            email_employee: 'john@example.com',
            titre_tache: 'Task 1',
            statut_tache: 'In Progress',
            idProjet: 'proj1',
            nom_projet: 'Project 1',
            statut_projet: 'Active'
          }]
        })
      };

      mockTransaction.begin.mockResolvedValue(undefined);
      mockTransaction.commit.mockResolvedValue(undefined);

      (sql.Request as unknown as jest.Mock)
        .mockImplementationOnce(() => findRequestMock)    // find active entry
        .mockImplementationOnce(() => updateRequestMock)  // update (stop)
        .mockImplementationOnce(() => resultRequestMock); // retrieval

      const result = await suiviDeTempsResolvers.Mutation.stopActiveSuivi(
        null,
        { idEmployee: 'emp1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.suivi).toBeDefined();
    });

    it('should return success false if no active entry is found', async () => {
      // Simulate no active entry is found
      const findRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [] })
      };

      (sql.Request as unknown as jest.Mock).mockImplementationOnce(() => findRequestMock);

      const result = await suiviDeTempsResolvers.Mutation.stopActiveSuivi(
        null,
        { idEmployee: 'emp1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(result).toEqual({
        success: false,
        message: 'No active time entry found',
        suivi: null
      });
    });
  });

  // -------------------------------
  // MUTATION: deleteSuiviDeTemp
  // -------------------------------
  describe('Mutation: deleteSuiviDeTemp', () => {
    it('should delete a time entry successfully', async () => {
      const checkRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [{}] }) // entry exists
      };
      const deleteRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ rowsAffected: [1] })
      };

      mockTransaction.begin.mockResolvedValue(undefined);
      mockTransaction.commit.mockResolvedValue(undefined);

      (sql.Request as unknown as jest.Mock)
        .mockImplementationOnce(() => checkRequestMock) // check existence
        .mockImplementationOnce(() => deleteRequestMock); // deletion

      const result = await suiviDeTempsResolvers.Mutation.deleteSuiviDeTemp(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw UserInputError if time entry is not found', async () => {
      const checkRequestMock = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [] }) // no entry found
      };

      (sql.Request as unknown as jest.Mock)
        .mockImplementationOnce(() => checkRequestMock);

      await expect(
        suiviDeTempsResolvers.Mutation.deleteSuiviDeTemp(
          null,
          { id: '1' },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow(UserInputError);
    });
  });
  
  // -------------------------------
  // tacheResolvers: Tache.projet
  // -------------------------------
  describe('tacheResolvers', () => {
    const { Tache } = tacheResolvers;
    
    it('should return null if no idProjet is provided', async () => {
      const parent = { idProjet: undefined };
      const result = await Tache.projet(parent, {}, { pool: mockPool as unknown as sql.ConnectionPool });
      expect(result).toBeNull();
    });
    
    it('should return project data if found', async () => {
      const mockProjet = {
        idProjet: 'proj1',
        nom_projet: 'Project 1',
        description_projet: 'Desc',
        date_debut_projet: '2024-01-01',
        date_fin_projet: '2024-12-31',
        statut_projet: 'Active'
      };
      
      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [mockProjet] })
      });
      
      const parent = { idProjet: 'proj1' };
      const result = await Tache.projet(parent, {}, { pool: mockPool as unknown as sql.ConnectionPool });
      expect(result).toEqual(mockProjet);
    });
    
    it('should return null if project not found', async () => {
      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [] }), // Simulate no project found
      });
      
      const parent = { idProjet: 'proj1' };
      const result = await Tache.projet(parent, {}, { pool: mockPool as unknown as sql.ConnectionPool });
      expect(result).toBeNull();
    });
    
    it('should throw ApolloError on query failure in Tache.projet', async () => {
      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockRejectedValueOnce(new Error('Query failed'))
      });
      
      const parent = { idProjet: 'proj1' };
      await expect(Tache.projet(parent, {}, { pool: mockPool as unknown as sql.ConnectionPool }))
        .rejects.toThrow(ApolloError);
    });

    it('should handle valid idProjet', async () => {
      const mockProjet = {
        idProjet: 'proj1',
        nom_projet: 'Project 1',
        description_projet: 'Desc',
        date_debut_projet: '2024-01-01',
        date_fin_projet: '2024-12-31',
        statut_projet: 'Active',
      };

      mockPool.request.mockReturnValueOnce({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValueOnce({ recordset: [mockProjet] }),
      });

      const parent = { idProjet: 'proj1' };
      const result = await tacheResolvers.Tache.projet(parent, {}, { pool: mockPool as unknown as sql.ConnectionPool });

      expect(result).toEqual({
        idProjet: 'proj1',
        nom_projet: 'Project 1',
        description_projet: 'Desc',
        date_debut_projet: '2024-01-01',
        date_fin_projet: '2024-12-31',
        statut_projet: 'Active',
      });
    });
  });
});
