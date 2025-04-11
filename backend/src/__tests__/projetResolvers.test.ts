import { projetResolvers } from '../graphql/resolvers/projetResolvers';
import { v4 as uuidv4 } from 'uuid';
import * as sql from 'mssql';

jest.mock('mssql');
jest.mock('uuid');

describe('projetResolvers', () => {
  const mockPool = {
    request: jest.fn().mockReturnThis(),
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------- Queries --------------------
  describe('Query: searchProjets', () => {
    it('should fetch projects with nom_projet filter', async () => {
      const mockProjects = [
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockProjects }) // Fetch projects
        .mockResolvedValueOnce({ recordset: [] }); // Teams for Project A

      const filters = { nom_projet: 'Project' };
      const result = await projetResolvers.Query.searchProjets(
        null,
        { filters },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active', equipes: [] },
      ]);
    });

    it('should fetch projects without nom_projet filter', async () => {
      const mockProjects = [
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockProjects }) // Fetch projects
        .mockResolvedValueOnce({ recordset: [] }); // Teams for Project A

      const filters = { statut_projet: 'Active' }; // No nom_projet filter
      const result = await projetResolvers.Query.searchProjets(
        null,
        { filters },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active', equipes: [] },
      ]);
    });

    it('should fetch projects with date_debut_projet filter', async () => {
      const mockProjects = [
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockProjects }) // Fetch projects
        .mockResolvedValueOnce({ recordset: [] }); // Teams for Project A

      const filters = { date_debut_projet: '2023-01-01' };
      const result = await projetResolvers.Query.searchProjets(
        null,
        { filters },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active', equipes: [] },
      ]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        projetResolvers.Query.searchProjets(
          null,
          { filters: {} },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Error searching projects');
    });
  });

  describe('Query: projets', () => {
    it('should fetch projects filtered by teamId', async () => {
      const mockProjects = [
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockProjects }) // Fetch projects
        .mockResolvedValueOnce({ recordset: [] }); // Teams for Project A

      const result = await projetResolvers.Query.projets(
        null,
        { teamId: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active', equipes: [] },
      ]);
    });

    it('should fetch all projects when no teamId is provided', async () => {
      const mockProjects = [
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockProjects }) // Fetch projects
        .mockResolvedValueOnce({ recordset: [] }); // Teams for Project A

      const result = await projetResolvers.Query.projets(
        null,
        {},
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active', equipes: [] },
      ]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        projetResolvers.Query.projets(
          null,
          {},
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Failed to fetch projects');
    });
  });

  describe('Query: projet', () => {
    it('should fetch a single project by ID', async () => {
      const mockProject = { idProjet: '1', nom_projet: 'Project A', statut_projet: 'Active' };
      const mockTeams = [{ idEquipe: '1', nom_equipe: 'Team A' }];

      mockPool.query
        .mockResolvedValueOnce({ recordset: [mockProject] }) // Fetch project
        .mockResolvedValueOnce({ recordset: mockTeams }); // Fetch teams

      const result = await projetResolvers.Query.projet(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        idProjet: '1',
        nom_projet: 'Project A',
        statut_projet: 'Active',
        equipes: mockTeams,
      });
    });

    it('should throw an error if the project is not found', async () => {
      mockPool.query.mockResolvedValueOnce({ recordset: [] }); // No project found

      await expect(
        projetResolvers.Query.projet(
          null,
          { id: '1' },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Projet not found');
    });
  });

  // -------------------- Mutations --------------------
  describe('Mutation: createProjet', () => {
    it('should create a new project', async () => {
      const mockProject = {
        idProjet: '1',
        nom_projet: 'Project A',
        description_projet: 'Description A',
        statut_projet: 'Active',
      };

      (uuidv4 as jest.Mock).mockReturnValue('1');
      mockPool.query.mockResolvedValueOnce({ rowsAffected: [1] });

      const result = await projetResolvers.Mutation.createProjet(
        null,
        {
          nom_projet: 'Project A',
          description_projet: 'Description A',
          statut_projet: 'Active',
        },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProject);
    });

    it('should handle database errors', async () => {
      (uuidv4 as jest.Mock).mockReturnValue('1');
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        projetResolvers.Mutation.createProjet(
          null,
          {
            nom_projet: 'Project A',
            description_projet: 'Description A',
            statut_projet: 'Active',
          },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Error creating project');
    });
  });

  describe('Mutation: deleteProjet', () => {
    it('should delete a project successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rowsAffected: [1] });

      const result = await projetResolvers.Mutation.deleteProjet(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Projet successfully deleted',
      });
    });

    it('should return a failure response if the project is not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowsAffected: [0] });

      const result = await projetResolvers.Mutation.deleteProjet(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Projet not found',
      });
    });

    it('should handle database errors during deletion', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await projetResolvers.Mutation.deleteProjet(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Error deleting projet',
      });
    });
  });
});