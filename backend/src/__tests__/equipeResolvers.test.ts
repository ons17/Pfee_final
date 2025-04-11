// filepath: /home/usera/Pfee_final/backend/src/__tests__/equipeResolvers.test.ts
import { equipeResolvers } from '../graphql/resolvers/equipeResolvers';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

jest.mock('mssql');
jest.mock('uuid');

describe('equipeResolvers', () => {
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

  // Query: searchEquipes
  describe('Query: searchEquipes', () => {
    it('should fetch teams with filters', async () => {
      const mockTeams = [
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
        { idEquipe: '2', nom_equipe: 'Team B', description_equipe: 'Description B' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
        .mockResolvedValueOnce({ recordset: [] }) // Projects for Team A
        .mockResolvedValueOnce({ recordset: [] }); // Projects for Team B

      const filters = { nom_equipe: 'Team' };
      const result = await equipeResolvers.Query.searchEquipes(
        null,
        { filters },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
        { idEquipe: '2', nom_equipe: 'Team B', description_equipe: 'Description B', projets: [] },
      ]);
    });

    it('should fetch all teams when no filters are provided', async () => {
      const mockTeams = [
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
        .mockResolvedValueOnce({ recordset: [] }); // Projects for Team A

      const result = await equipeResolvers.Query.searchEquipes(
        null,
        { filters: {} },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
      ]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        equipeResolvers.Query.searchEquipes(
          null,
          { filters: {} },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Failed to search teams');
    });

    it('should populate conditions and inputs when filters are provided', async () => {
      const mockTeams = [
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
      ];

      mockPool.query
        .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
        .mockResolvedValueOnce({ recordset: [] }); // Projects for Team A

      const filters = { nom_equipe: 'Team', description_equipe: 'Description' };

      const result = await equipeResolvers.Query.searchEquipes(
        null,
        { filters },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
      ]);

      // Verify that the SQL query was built with the correct conditions and inputs
      expect(mockPool.request().input).toHaveBeenCalledWith('nom_equipe', sql.NVarChar(100), '%Team%');
      expect(mockPool.request().input).toHaveBeenCalledWith('description_equipe', sql.NVarChar(500), '%Description%');
    });

    it('should not populate conditions and inputs when no filters are provided', async () => {
      const mockTeams = [
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
      ];

      mockPool.query
        .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
        .mockResolvedValueOnce({ recordset: [] }); // Projects for Team A

      const result = await equipeResolvers.Query.searchEquipes(
        null,
        { filters: {} },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
      ]);

      // Verify that no inputs were added to the SQL query
      expect(mockPool.request().input).not.toHaveBeenCalledWith('nom_equipe', expect.anything(), expect.anything());
      expect(mockPool.request().input).not.toHaveBeenCalledWith('description_equipe', expect.anything(), expect.anything());
    });
  });

  // Query: equipes
  describe('Query: equipes', () => {
    it('should fetch all teams', async () => {
      const mockTeams = [
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' },
      ];
      mockPool.query
        .mockResolvedValueOnce({ recordset: mockTeams }) // Fetch teams
        .mockResolvedValueOnce({ recordset: [] }); // Projects for Team A

      const result = await equipeResolvers.Query.equipes(
        null,
        {},
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A', projets: [] },
      ]);
    });
  });

  // Query: equipe
  describe('Query: equipe', () => {
    it('should fetch a single team by ID', async () => {
      const mockTeam = { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' };
      const mockProjects = [{ idProjet: '1', nom_projet: 'Project A' }];

      mockPool.query
        .mockResolvedValueOnce({ recordset: [mockTeam] }) // Fetch team
        .mockResolvedValueOnce({ recordset: mockProjects }); // Fetch projects

      const result = await equipeResolvers.Query.equipe(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        idEquipe: '1',
        nom_equipe: 'Team A',
        description_equipe: 'Description A',
        projets: mockProjects,
      });
    });

    it('should throw an error if the team is not found', async () => {
      mockPool.query.mockResolvedValueOnce({ recordset: [] }); // No team found

      await expect(
        equipeResolvers.Query.equipe(
          null,
          { id: '1' },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Team not found');
    });
  });

  // Mutation: createEquipe
  describe('Mutation: createEquipe', () => {
    it('should create a new team', async () => {
      const mockTeam = { idEquipe: '1', nom_equipe: 'Team A', description_equipe: 'Description A' };

      (uuidv4 as jest.Mock).mockReturnValue('1'); // Mock UUID generation

      mockPool.query.mockResolvedValueOnce({ rowsAffected: [1] });

      const result = await equipeResolvers.Mutation.createEquipe(
        null,
        { nom_equipe: 'Team A', description_equipe: 'Description A' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTeam);
    });

    it('should handle database errors when creating a team', async () => {
      (uuidv4 as jest.Mock).mockReturnValue('1'); // Mock UUID generation
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        equipeResolvers.Mutation.createEquipe(
          null,
          { nom_equipe: 'Team A', description_equipe: 'Description A' },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Error creating equipe');
    });
  });

  // Mutation: updateEquipe
  describe('Mutation: updateEquipe', () => {
    it('should update an existing team', async () => {
      const mockUpdatedTeam = { idEquipe: '1', nom_equipe: 'Updated Team', description_equipe: 'Updated Description' };

      mockPool.query.mockResolvedValueOnce({ rowsAffected: [1] }); // Update query
      mockPool.query.mockResolvedValueOnce({ recordset: [mockUpdatedTeam] }); // Fetch updated team

      const result = await equipeResolvers.Mutation.updateEquipe(
        null,
        { id: '1', nom_equipe: 'Updated Team', description_equipe: 'Updated Description' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUpdatedTeam);
    });

    it('should handle errors when updating a team', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        equipeResolvers.Mutation.updateEquipe(
          null,
          { id: '1', nom_equipe: 'Updated Team', description_equipe: 'Updated Description' },
          { pool: mockPool as unknown as sql.ConnectionPool }
        )
      ).rejects.toThrow('Error updating equipe');
    });
  });

  // Mutation: deleteEquipe
  describe('Mutation: deleteEquipe', () => {
    it('should delete a team by ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rowsAffected: [1] });

      const result = await equipeResolvers.Mutation.deleteEquipe(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Equipe successfully deleted',
      });
    });

    it('should return a failure response if the team is not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowsAffected: [0] });

      const result = await equipeResolvers.Mutation.deleteEquipe(
        null,
        { id: '1' },
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'No equipe found with this ID',
      });
    });

    it('should handle errors when deleting a team', async () => {
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

  // Field Resolver: Equipe.projets
  describe('Field Resolver: Equipe.projets', () => {
    it('should fetch associated projects for a team', async () => {
      const mockProjects = [
        { idProjet: '1', nom_projet: 'Project A' },
        { idProjet: '2', nom_projet: 'Project B' },
      ];

      mockPool.query.mockResolvedValueOnce({ recordset: mockProjects });

      const result = await equipeResolvers.Equipe.projets(
        { idEquipe: '1' },
        null,
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProjects);
    });

    it('should return an empty array if no projects are found', async () => {
      mockPool.query.mockResolvedValueOnce({ recordset: [] });

      const result = await equipeResolvers.Equipe.projets(
        { idEquipe: '1' },
        null,
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should handle errors when fetching projects', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await equipeResolvers.Equipe.projets(
        { idEquipe: '1' },
        null,
        { pool: mockPool as unknown as sql.ConnectionPool }
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });
});