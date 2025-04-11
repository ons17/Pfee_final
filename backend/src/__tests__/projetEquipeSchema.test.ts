import { projetEquipeSchema } from '../graphql/resolvers/projetEquipeSchema';
import { equipeResolvers } from '../graphql/resolvers/equipeResolvers'; // Import equipeResolvers
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4
import * as sql from 'mssql';

jest.mock('mssql');
jest.mock('uuid'); // Mock uuidv4

describe('projetEquipeSchema', () => {
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

  // Mutation: addEquipeToProject
  describe('Mutation: addEquipeToProject', () => {
    it('should add an equipe to a project successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ recordset: [] }) // Check if relationship exists
        .mockResolvedValueOnce({ rowsAffected: [1] }) // Insert relationship
        .mockResolvedValueOnce({ recordset: [{ idProjet: '1', nom_projet: 'Project A' }] }); // Fetch updated project

      const result = await projetEquipeSchema.Mutation.addEquipeToProject(
        null,
        { idProjet: '1', idEquipe: '2' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        message: 'Equipe successfully added to project.',
        code: 'SUCCESS',
        projet: { idProjet: '1', nom_projet: 'Project A' },
      });
    });

    it('should return an error if the relationship already exists', async () => {
      mockPool.query.mockResolvedValueOnce({ recordset: [{ idProjet: '1', idEquipe: '2' }] }); // Relationship exists

      const result = await projetEquipeSchema.Mutation.addEquipeToProject(
        null,
        { idProjet: '1', idEquipe: '2' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Equipe is already associated with the project.',
        code: 'DUPLICATE_RELATIONSHIP',
      });
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await projetEquipeSchema.Mutation.addEquipeToProject(
        null,
        { idProjet: '1', idEquipe: '2' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Error adding Equipe to project: Error: Database error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  // Mutation: removeEquipeFromProject
  describe('Mutation: removeEquipeFromProject', () => {
    it('should remove an equipe from a project successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ recordset: [{ idProjet: '1', idEquipe: '2' }] }) // Check if relationship exists
        .mockResolvedValueOnce({ rowsAffected: [1] }) // Delete relationship
        .mockResolvedValueOnce({ recordset: [{ idProjet: '1', nom_projet: 'Project A' }] }); // Fetch updated project

      const result = await projetEquipeSchema.Mutation.removeEquipeFromProject(
        null,
        { idProjet: '1', idEquipe: '2' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        message: 'Equipe removed from project successfully.',
        code: 'SUCCESS',
        projet: { idProjet: '1', nom_projet: 'Project A' },
      });
    });

    it('should return an error if the relationship does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ recordset: [] }); // Relationship does not exist

      const result = await projetEquipeSchema.Mutation.removeEquipeFromProject(
        null,
        { idProjet: '1', idEquipe: '2' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'This Equipe is not associated with the project.',
        code: 'NO_RELATIONSHIP',
      });
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await projetEquipeSchema.Mutation.removeEquipeFromProject(
        null,
        { idProjet: '1', idEquipe: '2' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Error removing Equipe from project: Error: Database error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  // Query: projetEquipes
  describe('Query: projetEquipes', () => {
    it('should fetch all project-equipe relationships', async () => {
      const mockRelationships = [
        { idProjet: '1', idEquipe: '2' },
        { idProjet: '3', idEquipe: '4' },
      ];

      mockPool.query.mockResolvedValueOnce({ recordset: mockRelationships });

      const result = await projetEquipeSchema.Query.projetEquipes(
        null,
        {},
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRelationships);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        projetEquipeSchema.Query.projetEquipes(
          null,
          {},
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Error fetching project-equipe relationships: Error: Database error');
    });
  });

  it('should fetch teams with only nom_equipe filter', async () => {
    const mockTeams = [
      { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
    ];

    mockPool.query
      .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
      .mockResolvedValueOnce({ recordset: [] }); // Projects for Team A

    const filters = { nom_equipe: 'Team' };

    const result = await equipeResolvers.Query.searchEquipes(
      null,
      { filters },
      { pool: mockPool as unknown as sql.ConnectionPool }
    );

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
    ]);

    expect(mockPool.request().input).toHaveBeenCalledWith('nom_equipe', sql.NVarChar(100), '%Team%');
    expect(mockPool.request().input).not.toHaveBeenCalledWith('description_equipe', expect.anything(), expect.anything());
  });

  it('should fetch teams with only description_equipe filter', async () => {
    const mockTeams = [
      { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
    ];

    mockPool.query
      .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
      .mockResolvedValueOnce({ recordset: [] }); // Projects for Team A

    const filters = { description_equipe: 'Description' };

    const result = await equipeResolvers.Query.searchEquipes(
      null,
      { filters },
      { pool: mockPool as unknown as sql.ConnectionPool }
    );

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
    ]);

    expect(mockPool.request().input).not.toHaveBeenCalledWith('nom_equipe', expect.anything(), expect.anything());
    expect(mockPool.request().input).toHaveBeenCalledWith('description_equipe', sql.NVarChar(500), '%Description%');
  });

  it('should fetch teams with no associated projects', async () => {
    const mockTeams = [
      { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
    ];

    mockPool.query
      .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
      .mockResolvedValueOnce({ recordset: [] }); // No projects for Team A

    const filters = { nom_equipe: 'Team' };

    const result = await equipeResolvers.Query.searchEquipes(
      null,
      { filters },
      { pool: mockPool as unknown as sql.ConnectionPool }
    );

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
    ]);
  });

  it('should create a new team without description', async () => {
    const mockTeam = { idEquipe: '1', nom_equipe: 'Team A', description_equipe: '' }; // Ensure empty string

    (uuidv4 as jest.Mock).mockReturnValue('1'); // Mock UUID generation

    mockPool.query.mockResolvedValueOnce({ rowsAffected: [1] });

    const result = await equipeResolvers.Mutation.createEquipe(
      null,
      { nom_equipe: 'Team A' },
      { pool: mockPool as unknown as sql.ConnectionPool }
    );

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockTeam); // Match the expected output
  });

  it('should handle database errors when deleting a team', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    await expect(
      equipeResolvers.Mutation.deleteEquipe(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      )
    ).rejects.toThrow('Error deleting equipe');
  });
});