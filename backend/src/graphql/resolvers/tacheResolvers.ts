import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { checkAndUpdateProjectStatus } from './projetResolvers';

// Add this helper function at the top of the file
const checkTaskStatus = async (pool: sql.ConnectionPool, taskId: string) => {
  try {
    // Get total tracked time, task duration and current status
    const result = await pool.request()
      .input('taskId', sql.UniqueIdentifier, taskId)
      .query(`
        SELECT 
          t.duration * 60 as planned_duration_minutes,  -- Convert hours to minutes
          COALESCE(SUM(CAST(s.duree_suivi AS float) / 60), 0) as total_tracked_minutes,  -- Convert seconds to minutes
          t.statut_tache as current_status
        FROM Tache t
        LEFT JOIN SuiviDeTemp s ON t.idTache = s.idTache
        WHERE t.idTache = @taskId
        GROUP BY t.duration, t.statut_tache
      `);

    if (result.recordset.length > 0) {
      const { planned_duration_minutes, total_tracked_minutes, current_status } = result.recordset[0];
      
      // Logical status progression:
      // 1. If tracked time >= planned duration and status is IN_PROGRESS, set to END
      // 2. If tracked time > 0 and < planned duration and status is TODO, set to IN_PROGRESS
      // 3. If tracked time >= planned duration and status is TODO, set to END
      
      let newStatus = null;

      if (total_tracked_minutes >= planned_duration_minutes && current_status !== 'END') {
        newStatus = 'END';
      } else if (total_tracked_minutes > 0 && total_tracked_minutes < planned_duration_minutes && current_status === 'TODO') {
        newStatus = 'IN_PROGRESS';
      }

      // Update only if status needs to change
      if (newStatus) {
        await pool.request()
          .input('taskId', sql.UniqueIdentifier, taskId)
          .input('newStatus', sql.VarChar, newStatus)
          .query(`
            UPDATE Tache 
            SET statut_tache = @newStatus
            WHERE idTache = @taskId
          `);
      }
    }
  } catch (error) {
    console.error("Error checking task status:", error);
    throw error;
  }
};

export const tacheResolvers = {
  Query: {
    taches: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        // First, get tasks with their basic info and tracked time
        const result = await pool.request().query(`
          SELECT 
            t.idTache,
            t.titre_tache as titreTache,
            t.description_tache as descriptionTache,
            t.date_debut_tache as dateDebutTache,
            t.date_fin_tache as dateFinTache,
            t.statut_tache as statutTache,
            t.duration,
            t.idProjet,
            (
              SELECT CAST(ISNULL(SUM(s.duree_suivi), 0) AS INT)
              FROM SuiviDeTemp s
              WHERE s.idTache = t.idTache
            ) as total_tracked_time
          FROM Tache t
        `);

        // For each task, fetch its time tracking entries
        const tasks = await Promise.all(result.recordset.map(async (task) => {
          // Get time tracking entries
          const suiviResult = await pool.request()
            .input('taskId', sql.UniqueIdentifier, task.idTache)
            .query(`
              SELECT idsuivi, duree_suivi
              FROM SuiviDeTemp
              WHERE idTache = @taskId
            `);

          // Check and update task status based on tracked time
          await checkTaskStatus(pool, task.idTache);

          return {
            idTache: task.idTache,
            titreTache: task.titreTache,
            descriptionTache: task.descriptionTache,
            dateDebutTache: task.dateDebutTache ? new Date(task.dateDebutTache).toISOString() : null,
            dateFinTache: task.dateFinTache ? new Date(task.dateFinTache).toISOString() : null,
            statutTache: task.statutTache,
            duration: task.duration,
            idProjet: task.idProjet,
            suiviDeTemps: suiviResult.recordset,
            total_tracked_time: task.total_tracked_time
          };
        }));

        return tasks;
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
    },

    tache: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        // Check status first
        await checkTaskStatus(pool, id);

        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
            FROM Tache
            WHERE idTache = @id
          `);

        if (result.recordset.length === 0) {
          throw new Error("Tache not found");
        }

        const tache = result.recordset[0];
        return {
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
        };
      } catch (error) {
        console.error("Error fetching tache:", error);
        throw new Error("Error fetching tache");
      }
    },

    searchTaches: async (
      _: any,
      { filters }: { filters?: { titreTache?: string; statutTache?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
          FROM Tache
        `;
        const conditions = [];
        const inputs = [];

        if (filters?.titreTache) {
          conditions.push("titre_tache LIKE @titreTache");
          inputs.push({ name: "titreTache", type: sql.NVarChar, value: `%${filters.titreTache}%` });
        }

        if (filters?.statutTache) {
          conditions.push("statut_tache = @statutTache");
          inputs.push({ name: "statutTache", type: sql.NVarChar, value: filters.statutTache });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);

        return result.recordset.map((tache) => ({
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
        }));
      } catch (error) {
        console.error("Error searching taches:", error);
        throw new Error("Error searching taches");
      }
    },
  },

  Mutation: {
    createTache: async (
      _: any,
      { titreTache, descriptionTache, duration, idProjet, dateDebutTache, dateFinTache }: {
        titreTache: string;
        descriptionTache?: string;
        duration: number;
        idProjet: string;
        dateDebutTache?: string;
        dateFinTache?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idTache = uuidv4();

        await pool.request()
          .input('idTache', sql.UniqueIdentifier, idTache)
          .input('titre_tache', sql.NVarChar, titreTache)
          .input('description_tache', sql.NVarChar, descriptionTache || null)
          .input('duration', sql.Int, duration)
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('date_debut_tache', sql.DateTime, dateDebutTache ? new Date(dateDebutTache) : null)
          .input('date_fin_tache', sql.DateTime, dateFinTache ? new Date(dateFinTache) : null)
          .query(`
            INSERT INTO Tache (idTache, titre_tache, description_tache, duration, idProjet, date_debut_tache, date_fin_tache)
            VALUES (@idTache, @titre_tache, @description_tache, @duration, @idProjet, @date_debut_tache, @date_fin_tache)
          `);

        // After inserting the new task
        await checkAndUpdateProjectStatus(pool, idProjet);

        // Fetch the newly created tache to return it
        const newTache = await pool.request()
          .input('idTache', sql.UniqueIdentifier, idTache)
          .query(`
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
            FROM Tache
            WHERE idTache = @idTache
          `);

        const tache = newTache.recordset[0];

        return {
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
        };
      } catch (error) {
        console.error("Error creating tache:", error);
        throw new Error("Error creating tache");
      }
    },

    updateTache: async (
      _: any,
      { id, titreTache, descriptionTache, statutTache, duration, idProjet, dateDebutTache, dateFinTache }: {
        id: string;
        titreTache?: string;
        descriptionTache?: string;
        statutTache?: string;
        duration?: number;
        idProjet?: string;
        dateDebutTache?: string;
        dateFinTache?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // First check the tracked time vs duration
        const timeCheck = await new sql.Request(transaction)
          .input('taskId', sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              t.duration * 60 as planned_duration_minutes,
              COALESCE(SUM(CAST(s.duree_suivi AS float) / 60), 0) as total_tracked_minutes
            FROM Tache t
            LEFT JOIN SuiviDeTemp s ON t.idTache = s.idTache
            WHERE t.idTache = @taskId
            GROUP BY t.duration
          `);

        if (timeCheck.recordset.length > 0) {
          const { planned_duration_minutes, total_tracked_minutes } = timeCheck.recordset[0];
          
          // If tracked time >= duration, force status to END
          if (total_tracked_minutes >= planned_duration_minutes) {
            statutTache = 'END';
          }
        }

        const request = new sql.Request(transaction).input('id', sql.UniqueIdentifier, id);
        const updates = [];

        if (titreTache !== undefined) {
          updates.push('titre_tache = @titreTache');
          request.input('titreTache', sql.NVarChar, titreTache);
        }

        if (descriptionTache !== undefined) {
          updates.push('description_tache = @descriptionTache');
          request.input('descriptionTache', sql.NVarChar, descriptionTache);
        }

        if (statutTache !== undefined) {
          updates.push('statut_tache = @statutTache');
          request.input('statutTache', sql.NVarChar, statutTache);
        }

        if (duration !== undefined) {
          updates.push('duration = @duration');
          request.input('duration', sql.Int, duration);
        }

        if (idProjet !== undefined && idProjet !== null) {
          updates.push('idProjet = @idProjet');
          request.input('idProjet', sql.UniqueIdentifier, idProjet);
        }

        if (dateDebutTache !== undefined) {
          updates.push('date_debut_tache = @dateDebutTache');
          request.input('dateDebutTache', sql.DateTime, dateDebutTache ? new Date(dateDebutTache) : null);
        }

        if (dateFinTache !== undefined) {
          updates.push('date_fin_tache = @dateFinTache');
          request.input('dateFinTache', sql.DateTime, dateFinTache ? new Date(dateFinTache) : null);
        }

        if (updates.length === 0) {
          throw new Error("No updates provided");
        }

        const query = `
          UPDATE Tache
          SET ${updates.join(', ')}
          WHERE idTache = @id
        `;

        await request.query(query);

        // Fetch the updated tache
        const updatedTacheResult = await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idTache, titre_tache, description_tache, date_debut_tache, 
                   date_fin_tache, statut_tache, duration, idProjet
            FROM Tache
            WHERE idTache = @id
          `);

        await transaction.commit();

        const updatedTache = updatedTacheResult.recordset[0];

        if (idProjet) {
          await checkAndUpdateProjectStatus(pool, idProjet);
        }

       

        return {
          idTache: updatedTache.idTache,
          titreTache: updatedTache.titre_tache,
          descriptionTache: updatedTache.description_tache,
          dateDebutTache: updatedTache.date_debut_tache ? new Date(updatedTache.date_debut_tache).toISOString() : null,
          dateFinTache: updatedTache.date_fin_tache ? new Date(updatedTache.date_fin_tache).toISOString() : null,
          statutTache: updatedTache.statut_tache,
          duration: updatedTache.duration,
          idProjet: updatedTache.idProjet
        };
      } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error updating tache:", error);
        throw new Error("Error updating tache");
      }
    },

    deleteTache: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Get project ID before deleting
        const task = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query('SELECT idProjet FROM Tache WHERE idTache = @id');
        const projectId = task.recordset[0]?.idProjet;

        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query('DELETE FROM Tache WHERE idTache = @id');

        // Update project status after deletion
        if (projectId) {
          await checkAndUpdateProjectStatus(pool, projectId);
        }

        return {
          success: true,
          message: `Tache deleted successfully`
        };
      } catch (error) {
        console.error("Error deleting tache:", error);
        return {
          success: false,
          message: "Error deleting tache"
        };
      }
    },
  },

  Tache: {
    projet: async (parent: { idProjet: string }, _: any, { pool }: { pool: sql.ConnectionPool }) => {
      if (!parent.idProjet) return null;

      try {
        const result = await pool.request()
          .input("idProjet", sql.UniqueIdentifier, parent.idProjet)
          .query(`
            SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet
            FROM Projet
            WHERE idProjet = @idProjet
          `);

        if (result.recordset.length === 0) return null;

        return {
          idProjet: result.recordset[0].idProjet,
          nom_projet: result.recordset[0].nom_projet,
          description_projet: result.recordset[0].description_projet,
          date_debut_projet: result.recordset[0].date_debut_projet,
          date_fin_projet: result.recordset[0].date_fin_projet,
          statut_projet: result.recordset[0].statut_projet
        };
      } catch (error) {
        console.error("Error fetching project:", error);
      }
    }
  }
};