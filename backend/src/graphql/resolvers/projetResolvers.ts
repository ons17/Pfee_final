import { v4 as uuidv4 } from 'uuid';
import * as sql from 'mssql';

// Add this helper function at the top of the file
export const checkAndUpdateProjectStatus = async (pool: sql.ConnectionPool, projectId: string) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // Check if all tasks are completed
    const result = await new sql.Request(transaction)
      .input('projectId', sql.UniqueIdentifier, projectId)
      .query(`
        SELECT 
          COUNT(CASE WHEN statut_tache != 'end' THEN 1 end) as pending_tasks,
          COUNT(*) as total_tasks
        FROM Tache
        WHERE idProjet = @projectId
      `);

    if (result.recordset.length > 0) {
      const { pending_tasks, total_tasks } = result.recordset[0];

      // If there are tasks and all are completed, set project to end
      if (total_tasks > 0 && pending_tasks === 0) {
        await new sql.Request(transaction)
          .input('projectId', sql.UniqueIdentifier, projectId)
          .query(`
            UPDATE Projet
            SET statut_projet = 'end'
            WHERE idProjet = @projectId AND statut_projet != 'end'
          `);
      }
      // If there are pending tasks and project is end, set it back to in_progress
      else if (pending_tasks > 0) {
        await new sql.Request(transaction)
          .input('projectId', sql.UniqueIdentifier, projectId)
          .query(`
            UPDATE Projet
            SET statut_projet = 'in_progress'
            WHERE idProjet = @projectId AND statut_projet = 'end'
          `);
      }
    }

    await transaction.commit();
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error checking project status:", error);
    throw error;
  }
};

export const projetResolvers = {
  Query: {
    
    // Fetch all projects with optional search and filter criteria
    searchProjets: async (
      _: any,
      { filters }: { filters: { nom_projet?: string; statut_projet?: string; date_debut_projet?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet
          FROM Projet
        `;
        const conditions: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        // Add filters dynamically based on provided arguments
        if (filters.nom_projet) {
          conditions.push("nom_projet LIKE @nom_projet");
          inputs.push({ name: "nom_projet", type: sql.VarChar, value: `%${filters.nom_projet}%` });
        }

        if (filters.statut_projet) {
          conditions.push("statut_projet = @statut_projet");
          inputs.push({ name: "statut_projet", type: sql.VarChar, value: filters.statut_projet });
        }

        if (filters.date_debut_projet) {
          conditions.push("date_debut_projet >= @date_debut_projet");
          inputs.push({ name: "date_debut_projet", type: sql.DateTime, value: filters.date_debut_projet });
        }

        // Append WHERE clause if there are conditions
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        const projects = result.recordset;

        // Fetch associated teams for each project
        for (const project of projects) {
          const equipesResult = await pool.request()
            .input("idProjet", sql.UniqueIdentifier, project.idProjet)
            .query(`
              SELECT e.idEquipe, e.nom_equipe, e.description_equipe
              FROM Equipe e
              INNER JOIN ProjetEquipe pe ON e.idEquipe = pe.idEquipe
              WHERE pe.idProjet = @idProjet;
            `);

          project.equipes = equipesResult.recordset.length > 0 ? equipesResult.recordset : [];
        }

        return projects;
      } catch (error) {
        console.error("Error searching projects:", error);
        throw new Error("Error searching projects");
      }
    },

    // Fetch all projects with optional team filter
    projets: async (_: any, { teamId }: { teamId?: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        
        let query = `
          SELECT p.idProjet, p.nom_projet, p.description_projet, p.date_debut_projet, p.date_fin_projet, p.statut_projet
          FROM Projet p
        `;
        const conditions: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        if (teamId) {
          conditions.push("pe.idEquipe = @teamId");
          inputs.push({ name: "teamId", type: sql.UniqueIdentifier, value: teamId });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        const projects = result.recordset;

        // Fetch associated teams for each project
        for (const project of projects) {
          await checkAndUpdateProjectStatus(pool, project.idProjet);
          const equipesResult = await pool.request()
            .input("idProjet", sql.UniqueIdentifier, project.idProjet)
            .query(`
              SELECT e.idEquipe, e.nom_equipe, e.description_equipe
              FROM Equipe e
              INNER JOIN ProjetEquipe pe ON e.idEquipe = pe.idEquipe
              WHERE pe.idProjet = @idProjet;
            `);

          project.equipes = equipesResult.recordset.length > 0 ? equipesResult.recordset : [];
        }

        return projects;
      } catch (error) {
        console.error("Error fetching projects:", error);
        throw new Error("Failed to fetch projects");
      }
    },

    // Fetch a single project by ID
    projet: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet
            FROM Projet
            WHERE idProjet = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error('Projet not found'); // Update this error message
        }

        const project = result.recordset[0];

        // Fetch associated teams for the project
        const equipesResult = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, id)
          .query(`
            SELECT e.idEquipe, e.nom_equipe, e.description_equipe
            FROM Equipe e
            INNER JOIN ProjetEquipe pe ON e.idEquipe = pe.idEquipe
            WHERE pe.idProjet = @idProjet;
          `);

        project.equipes = equipesResult.recordset.length > 0 ? equipesResult.recordset : [];

        return project;
      } catch (error) {
        console.error('Error fetching project:', error);
        throw error; // Re-throw the original error
      }
    },

    getProjetsForEmployee: async (
      _: any,
      { idEmploye }: { idEmploye: string }, // No change here, as TypeScript uses `string` for GraphQL `ID`
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Step 1: Get the team (équipe) of the employee
        const equipeResult = await pool.request()
          .input('idEmploye', sql.UniqueIdentifier, idEmploye) // Ensure `idEmploye` is treated as a unique identifier
          .query(`
            SELECT e.idEquipe, e.nom_equipe, e.description_equipe
            FROM Employee emp
            INNER JOIN Equipe e ON emp.idEquipe = e.idEquipe
            WHERE emp.idEmployee = @idEmploye;
          `);

        if (equipeResult.recordset.length === 0) {
          return []; // Return an empty array if the employee does not belong to any team
        }

        const equipe = equipeResult.recordset[0];

        // Step 2: Get the projects associated with the team
        const projetsResult = await pool.request()
          .input('idEquipe', sql.UniqueIdentifier, equipe.idEquipe)
          .query(`
            SELECT p.idProjet, p.nom_projet, p.description_projet, p.date_debut_projet, p.date_fin_projet, p.statut_projet
            FROM Projet p
            INNER JOIN ProjetEquipe pe ON p.idProjet = pe.idProjet
            WHERE pe.idEquipe = @idEquipe;
          `);

        const projets = projetsResult.recordset;

        // Step 3: Attach the team details to each project
        projets.forEach((projet) => {
          projet.equipes = [equipe]; // Ensure `equipes` is an array
        });

        return projets;
      } catch (error) {
        console.error('Error fetching projects for employee:', error);
        throw new Error('Failed to fetch projects for employee');
      }
    },

    // Fetch all projects that are not assigned to any supervisor
    getAvailableProjects: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .query(`
            SELECT p.*
            FROM Projet p
            WHERE NOT EXISTS (
              SELECT 1 
              FROM SupervisorProjet sp 
              WHERE sp.idProjet = p.idProjet
            )
          `);
        return result.recordset;
      } catch (error) {
        console.error('Error fetching available projects:', error);
        throw new Error('Failed to fetch available projects');
      }
    },
  },

  Mutation: {
    // Create a new project
    createProjet: async (
      _: any,
      { nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet }: {
        nom_projet: string;
        description_projet?: string;
        date_debut_projet?: string;
        date_fin_projet?: string;
        statut_projet?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idProjet = uuidv4();

        await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('nom_projet', sql.VarChar, nom_projet)
          .input('description_projet', sql.VarChar, description_projet || '')
          .input('date_debut_projet', sql.DateTime, date_debut_projet || null)
          .input('date_fin_projet', sql.DateTime, date_fin_projet || null)
          .input('statut_projet', sql.VarChar, statut_projet || null)
          .query(`
            INSERT INTO Projet (idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet)
            VALUES (@idProjet, @nom_projet, @description_projet, @date_debut_projet, @date_fin_projet, @statut_projet);
          `);

        const project: any = {
          idProjet,
          nom_projet,
          description_projet,
          statut_projet: statut_projet || null,
        };

        if (date_debut_projet) project.date_debut_projet = date_debut_projet;
        if (date_fin_projet) project.date_fin_projet = date_fin_projet;

        return project;
      } catch (error) {
        console.error('Error creating project:', error);
        throw new Error('Error creating project');
      }
    },

    // Update an existing project
    updateProjet: async (
      _: any,
      { id, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet }: { 
        id: string, 
        nom_projet: string, 
        description_projet: string, 
        date_debut_projet?: string, 
        date_fin_projet?: string, 
        statut_projet?: string 
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id);
        request.input('nom_projet', sql.NVarChar, nom_projet);
        request.input('description_projet', sql.NVarChar, description_projet);
        request.input('date_debut_projet', sql.DateTime, date_debut_projet || null);
        request.input('date_fin_projet', sql.DateTime, date_fin_projet || null);
        request.input('statut_projet', sql.NVarChar, statut_projet || null);

        const result = await request.query(`
          UPDATE Projet
          SET 
            nom_projet = @nom_projet,
            description_projet = @description_projet,
            date_debut_projet = @date_debut_projet,
            date_fin_projet = @date_fin_projet,
            statut_projet = @statut_projet
          WHERE IdProjet = @id;
        `);

        return {
          idProjet: id,
          nom_projet,
          description_projet,
          date_debut_projet: date_debut_projet || null,
          date_fin_projet: date_fin_projet || null,
          statut_projet: statut_projet || null,
        };
      } catch (error) {
        console.error('Error updating project:', error);
        throw new Error('Error updating project');
      }
    },

    // Delete a project by ID
    deleteProjet: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id);

        // Perform the deletion query
        const result = await request.query(`
          DELETE FROM Projet WHERE IdProjet = @id;
        `);

        // If no rows are affected, the project wasn't found
        if (result.rowsAffected[0] === 0) {
          return {
            success: false,
            message: 'Projet not found'
          };
        }

        // Return success response
        return {
          success: true,
          message: 'Projet successfully deleted'
        };
      } catch (error) {
        console.error('Error deleting project:', error);
        return {
          success: false,
          message: 'Error deleting projet'
        };
      }
    }
  },
};