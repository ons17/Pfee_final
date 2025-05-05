import * as sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { GraphQLScalarType, Kind } from 'graphql';
import { UserInputError, ApolloError } from 'apollo-server-express';

// DateTimeISO Scalar with robust validation
const DateTimeISO = new GraphQLScalarType({
  name: 'DateTimeISO',
  description: 'ISO 8601 date with validation',
  parseValue(value: unknown) {
    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
      throw new UserInputError('Invalid date format. Value must be a string, number, or Date.');
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new UserInputError('Invalid date format. Use ISO 8601 (e.g., "2024-03-31")');
    }
    return date.toISOString();
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new UserInputError('Query error: Date must be a string');
    }
    const date = new Date(ast.value);
    if (isNaN(date.getTime())) {
      throw new UserInputError('Invalid date format');
    }
    return date.toISOString();
  },
  serialize(value) {
    return value;
  }
});

// Helper function for consistent error handling
const handleDatabaseError = (error: unknown, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  throw new ApolloError(`Failed to ${operation}`, 'DATABASE_ERROR', {
    originalError: error instanceof Error ? error : new Error(String(error)),
    operation
  });
};

// Add this helper function at the top with other helpers
const checkAndUpdateTaskStatus = async (transaction: sql.Transaction, taskId: string) => {
  try {
    // Get total tracked time and task duration
    const result = await new sql.Request(transaction)
      .input('taskId', sql.UniqueIdentifier, taskId)
      .query(`
        SELECT 
          t.duration * 60 as planned_duration_minutes,  -- Convert hours to minutes
          COALESCE(SUM(CAST(s.duree_suivi AS float) / 60), 0) as total_tracked_minutes  -- Convert seconds to minutes
        FROM Tache t
        LEFT JOIN SuiviDeTemp s ON t.idTache = s.idTache
        WHERE t.idTache = @taskId
        GROUP BY t.duration
      `);

    if (result.recordset.length > 0) {
      const { planned_duration_minutes, total_tracked_minutes } = result.recordset[0];
      
      // If total tracked time equals or exceeds planned duration, update status to END
      if (total_tracked_minutes >= planned_duration_minutes) {
        await new sql.Request(transaction)
          .input('taskId', sql.UniqueIdentifier, taskId)
          .query(`
            UPDATE Tache 
            SET statut_tache = 'END'
            WHERE idTache = @taskId AND statut_tache != 'END'
          `);
      }
    }
  } catch (error) {
    console.error('Error checking task status:', error);
    throw error;
  }
};

// Interface for SuiviDeTemp result
interface SuiviDeTempResult {
  idsuivi: string;
  heure_debut_suivi: string;
  heure_fin_suivi: string | null;
  duree_suivi: number | null;
  description?: string;
  idEmployee: string;
  idTache: string;
  nom_employee: string;
  email_employee: string;
  titre_tache: string;
  statut_tache: string;
  idProjet?: string;
  nom_projet?: string;
  statut_projet?: string;
  is_paused: boolean; // New field
  paused_duration: number; // New field
  last_paused_time: string | null; // New field
}

// Maps database row to GraphQL type
const mapSuiviResult = (row: SuiviDeTempResult) => ({
  idsuivi: row.idsuivi,
  heure_debut_suivi: row.heure_debut_suivi,
  heure_fin_suivi: row.heure_fin_suivi ?? null,
  duree_suivi: row.duree_suivi,
  description: row.description || null,
  employee: {
    idEmployee: row.idEmployee,
    nomEmployee: row.nom_employee,
    emailEmployee: row.email_employee,
  },
  tache: {
    idTache: row.idTache,
    titreTache: row.titre_tache,
    statutTache: row.statut_tache,
    idProjet: row.idProjet,
    projet: row.idProjet
      ? {
          idProjet: row.idProjet,
          nom_projet: row.nom_projet || 'N/A',
          statutProjet: row.statut_projet,
        }
      : null,
  },
  isPaused: row.is_paused, // New mapping
  pausedDuration: row.paused_duration, // New mapping
  lastPausedTime: row.last_paused_time ? row.last_paused_time : null, // New mapping
});

const fetchSuiviById = async (transaction: sql.Transaction, id: string) => {
  const result = await new sql.Request(transaction)
    .input('suiviId', sql.UniqueIdentifier, id)
    .query<SuiviDeTempResult>(`
      SELECT 
        s.*,
        e.nom_employee, 
        e.email_employee, 
        t.titre_tache, 
        t.statut_tache, 
        t.idProjet, 
        p.nom_projet, 
        p.statut_projet
      FROM SuiviDeTemp s
      LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
      LEFT JOIN Tache t ON s.idTache = t.idTache
      LEFT JOIN Projet p ON t.idProjet = p.idProjet
      WHERE s.idsuivi = @suiviId
    `);
  return result.recordset[0];
};

export const suiviDeTempsResolvers = {
  DateTimeISO,
  
  Query: {
    suivisDeTemp: async (_: any, { filters = {} }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        let query = `
          SELECT 
            s.idsuivi, 
            s.heure_debut_suivi, 
            s.heure_fin_suivi, 
            s.duree_suivi, 
            s.description, 
            s.idEmployee, 
            s.idTache, 
            e.nom_employee, 
            e.email_employee, 
            t.titre_tache, 
            t.statut_tache, 
            t.idProjet, 
            COALESCE(p.nom_projet, 'N/A') AS nom_projet, 
            p.statut_projet
          FROM SuiviDeTemp s
          LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
          LEFT JOIN Tache t ON s.idTache = t.idTache
          LEFT JOIN Projet p ON t.idProjet = p.idProjet
        `;

        const conditions: string[] = [];
        const request = pool.request();

        if (filters.startDate) {
          conditions.push("CONVERT(DATE, s.heure_debut_suivi) >= CONVERT(DATE, @startDate)");
          request.input("startDate", sql.DateTime, new Date(filters.startDate));
        }

        if (filters.endDate) {
          conditions.push("CONVERT(DATE, s.heure_debut_suivi) <= CONVERT(DATE, @endDate)");
          request.input("endDate", sql.DateTime, new Date(filters.endDate));
        }

        if (filters.employeeId) {
          conditions.push("s.idEmployee = @employeeId");
          request.input("employeeId", sql.UniqueIdentifier, filters.employeeId);
        }

        if (filters.taskId) {
          conditions.push("s.idTache = @taskId");
          request.input("taskId", sql.UniqueIdentifier, filters.taskId);
        }

        if (filters.projectId) {
          conditions.push("p.idProjet = @projectId");
          request.input("projectId", sql.UniqueIdentifier, filters.projectId);
        }

        if (filters.isActive !== undefined) {
          conditions.push(filters.isActive 
            ? "s.heure_fin_suivi IS NULL" 
            : "s.heure_fin_suivi IS NOT NULL");
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += " ORDER BY s.heure_debut_suivi DESC";

        const result = await request.query<SuiviDeTempResult>(query);
        return result.recordset.map(mapSuiviResult);
      } catch (error) {
        handleDatabaseError(error, 'fetch time entries');
      }
    },

    getActiveSuivi: async (_: any, { employeeId }: { employeeId: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input("findEmployeeId", sql.UniqueIdentifier, employeeId)
          .query(`
            SELECT TOP 1
              s.idsuivi,
              s.heure_debut_suivi,
              s.is_paused,
              s.exact_pause_value,
              s.paused_duration,
              t.idTache,
              t.titre_tache,
              p.idProjet,
              p.nom_projet
            FROM SuiviDeTemp s
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idEmployee = @findEmployeeId
              AND s.heure_fin_suivi IS NULL
            ORDER BY s.heure_debut_suivi DESC
          `);

        if (result.recordset.length === 0) return null;
        const row = result.recordset[0];
        return {
          idsuivi: row.idsuivi,
          heureDebutSuivi: row.heure_debut_suivi,
          isPaused: row.is_paused,
          exactPauseValue: row.exact_pause_value,
          pausedDuration: row.paused_duration, // <-- add this
          tache: {
            idTache: row.idTache,
            idProjet: row.idProjet,
            titreTache: row.titre_tache,
            nomProjet: row.nom_projet
          }
        };
      } catch (error) {
        handleDatabaseError(error, 'fetch active time entry');
      }
    }
  },

  Mutation: {
    createSuiviDeTemp: async (
      _: any,
      { input }: { input: { idEmployee: string; idTache: string; heure_debut_suivi: string; description?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();

        if (!input.idEmployee || !input.idTache || !input.heure_debut_suivi) {
          throw new UserInputError('Missing required fields');
        }

        const startDate = new Date(input.heure_debut_suivi);
        if (isNaN(startDate.getTime())) {
          throw new UserInputError('Invalid start time format');
        }

        const employeeCheck = await new sql.Request(transaction)
          .input('checkEmpId', sql.UniqueIdentifier, input.idEmployee)
          .query('SELECT 1 FROM Employee WHERE idEmployee = @checkEmpId');
        
        if (employeeCheck.recordset.length === 0) {
          throw new UserInputError(`Employee with ID ${input.idEmployee} does not exist`);
        }

        const taskCheck = await new sql.Request(transaction)
          .input('checkTaskId', sql.UniqueIdentifier, input.idTache)
          .query('SELECT 1 FROM Tache WHERE idTache = @checkTaskId');
        
        if (taskCheck.recordset.length === 0) {
          throw new UserInputError(`Task with ID ${input.idTache} does not exist`);
        }

        const idsuivi = uuidv4();
        await new sql.Request(transaction)
          .input("newSuiviId", sql.UniqueIdentifier, idsuivi)
          .input("startTime", sql.DateTime2, startDate)
          .input("empId", sql.UniqueIdentifier, input.idEmployee)
          .input("taskId", sql.UniqueIdentifier, input.idTache)
          .input("description", sql.NVarChar, input.description || null) // Handle description
          .query(`
            INSERT INTO SuiviDeTemp (
              idsuivi, heure_debut_suivi, idEmployee, idTache, description, is_paused, paused_duration
            ) VALUES (
              @newSuiviId, @startTime, @empId, @taskId, @description, 0, 0
            )
          `);

        const result = await new sql.Request(transaction)
          .input('resultSuiviId', sql.UniqueIdentifier, idsuivi)
          .query<SuiviDeTempResult>(`
            SELECT 
              s.idsuivi, 
              s.heure_debut_suivi, 
              s.heure_fin_suivi, 
              s.duree_suivi, 
              s.description, 
              s.idEmployee, 
              s.idTache, 
              e.nom_employee, 
              e.email_employee, 
              t.titre_tache, 
              t.statut_tache, 
              t.idProjet, 
              COALESCE(p.nom_projet, 'N/A') AS nom_projet, 
              p.statut_projet,
              s.is_paused,
              s.paused_duration,
              s.last_paused_time
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idsuivi = @resultSuiviId
          `);

        await transaction.commit();
        return mapSuiviResult(result.recordset[0]);
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
        if (error instanceof UserInputError) throw error;
        handleDatabaseError(error, 'create time entry');
      }
    },

    updateSuiviDeTemp: async (
      _: any,
      { id, input }: { id: string; input: { description?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request()
          .input("id", sql.UniqueIdentifier, id)
          .input("description", sql.NVarChar, input.description || null)
          .query(`
            UPDATE SuiviDeTemp
            SET description = @description
            WHERE idsuivi = @id
          `);

        return true;
      } catch (error) {
        throw new ApolloError("Failed to update time entry");
      }
    },

    stopActiveSuivi: async (
      _: any,
      { idEmployee, description }: { idEmployee: string; description?: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Fetch the active time entry
        const activeEntry = await new sql.Request(transaction)
          .input('findEmpId', sql.UniqueIdentifier, idEmployee)
          .query(`
            SELECT TOP 1 
              idsuivi, 
              heure_debut_suivi,
              is_paused,
              paused_duration,
              last_paused_time
            FROM SuiviDeTemp
            WHERE idEmployee = @findEmpId 
              AND heure_fin_suivi IS NULL
            ORDER BY heure_debut_suivi DESC
          `);

        if (activeEntry.recordset.length === 0) {
          return {
            success: false,
            message: 'No active time entry found.',
            suivi: null,
          };
        }

        const suivi = activeEntry.recordset[0];
        const idsuivi = suivi.idsuivi;
        const startTime = new Date(suivi.heure_debut_suivi);
        let pausedDuration = suivi.paused_duration;
        const endTime = new Date();

        // If the entry is paused, calculate the additional paused time in SECONDS
        if (suivi.is_paused) {
          const lastPausedTime = new Date(suivi.last_paused_time);
          const additionalPaused = Math.floor((endTime.getTime() - lastPausedTime.getTime()) / 1000); // SECONDS
          pausedDuration += additionalPaused;
        }

        // Calculate the total duration and active duration in SECONDS
        const totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // SECONDS
        const activeDuration = totalDuration - pausedDuration;

        // When storing duree_suivi, you may want to keep it in minutes for reporting, but paused_duration must be in SECONDS

        // Update the database
        await new sql.Request(transaction)
          .input('updateSuiviId', sql.UniqueIdentifier, idsuivi)
          .input('endTime', sql.DateTime2, endTime)
          .input('duration', sql.Int, activeDuration)
          .input('pausedDuration', sql.Int, pausedDuration)
          .input('description', sql.NVarChar, description || null)
          .query(`
            UPDATE SuiviDeTemp
            SET 
              heure_fin_suivi = @endTime,
              duree_suivi = @duration,
              description = @description,
              is_paused = 0,
              paused_duration = @pausedDuration,
              last_paused_time = NULL
            WHERE idsuivi = @updateSuiviId
          `);

        // Get the task ID for the time entry
        const taskResult = await new sql.Request(transaction)
          .input('suiviId', sql.UniqueIdentifier, idsuivi)
          .query(`
            SELECT idTache FROM SuiviDeTemp WHERE idsuivi = @suiviId
          `);

        if (taskResult.recordset.length > 0) {
          const taskId = taskResult.recordset[0].idTache;
          // Check and update task status
          await checkAndUpdateTaskStatus(transaction, taskId);
        }

        const result = await fetchSuiviById(transaction, idsuivi);
        await transaction.commit();

        return {
          success: true,
          message: 'Time entry stopped successfully.',
          suivi: mapSuiviResult(result),
        };
      } catch (error) {
        await transaction.rollback();
        handleDatabaseError(error, 'stop active time entry');
      }
    },

    deleteSuiviDeTemp: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      const transaction = new sql.Transaction(pool);
      
      try {
        await transaction.begin();

        const entryCheck = await new sql.Request(transaction)
          .input('checkSuiviId', sql.UniqueIdentifier, id)
          .query('SELECT 1 FROM SuiviDeTemp WHERE idsuivi = @checkSuiviId');
        
        if (entryCheck.recordset.length === 0) {
          throw new UserInputError("Suivi introuvable", {
            invalidArgs: { id },
          });
        }
    
        await new sql.Request(transaction)
          .input("deleteSuiviId", sql.UniqueIdentifier, id)
          .query(`
            DELETE FROM SuiviDeTemp
            WHERE idsuivi = @deleteSuiviId
          `);
    
        await transaction.commit();
        return true;
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
        if (error instanceof UserInputError) throw error;
        handleDatabaseError(error, 'delete time entry');
      }
    },

    pauseSuivi: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Fetch the entry
        const suiviCheck = await new sql.Request(transaction)
          .input('suiviId', sql.UniqueIdentifier, id)
          .query(`
            SELECT heure_debut_suivi, heure_fin_suivi, is_paused, paused_duration, last_paused_time
            FROM SuiviDeTemp
            WHERE idsuivi = @suiviId
          `);

        if (suiviCheck.recordset.length === 0) throw new UserInputError('Time entry not found');
        const suivi = suiviCheck.recordset[0];
        if (suivi.heure_fin_suivi !== null) throw new UserInputError('Cannot pause a completed time entry');
        if (suivi.is_paused) throw new UserInputError('Time entry is already paused');

        // Calculate the exact pause value (seconds since start minus paused_duration)
        const now = new Date();
        const start = new Date(suivi.heure_debut_suivi);
        const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000) - (suivi.paused_duration || 0);

        await new sql.Request(transaction)
          .input('suiviId', sql.UniqueIdentifier, id)
          .input('now', sql.DateTime, now)
          .input('exactPauseValue', sql.Int, elapsedSeconds)
          .query(`
            UPDATE SuiviDeTemp
            SET is_paused = 1, last_paused_time = @now, exact_pause_value = @exactPauseValue
            WHERE idsuivi = @suiviId
          `);

        const updatedSuivi = await fetchSuiviById(transaction, id);
        await transaction.commit();

        return {
          success: true,
          message: 'Time entry paused successfully',
          suivi: mapSuiviResult(updatedSuivi),
        };
      } catch (error) {
        await transaction.rollback();
        handleDatabaseError(error, 'pause time entry');
      }
    },

    resumeSuivi: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Check if the time entry exists and is paused
        const suiviCheck = await new sql.Request(transaction)
          .input('suiviId', sql.UniqueIdentifier, id)
          .query(`
            SELECT is_paused, last_paused_time, paused_duration 
            FROM SuiviDeTemp 
            WHERE idsuivi = @suiviId
          `);

        if (suiviCheck.recordset.length === 0) {
          throw new UserInputError('Time entry not found');
        }

        const suivi = suiviCheck.recordset[0];
        if (!suivi.is_paused) {
          throw new UserInputError('Time entry is not paused');
        }

        // Calculate the total paused duration in seconds
        const lastPausedTime = new Date(suivi.last_paused_time);
        const now = new Date();
        const additionalPaused = Math.floor((now.getTime() - lastPausedTime.getTime()) / 1000); // SECONDS

        const totalPausedDuration = (suivi.paused_duration || 0) + additionalPaused;

        // Update the database
        await new sql.Request(transaction)
          .input('suiviId', sql.UniqueIdentifier, id)
          .input('pausedDuration', sql.Int, totalPausedDuration)
          .query(`
            UPDATE SuiviDeTemp
            SET is_paused = 0, last_paused_time = NULL, paused_duration = @pausedDuration
            WHERE idsuivi = @suiviId
          `);

        const updatedSuivi = await fetchSuiviById(transaction, id);
        await transaction.commit();

        return {
          success: true,
          message: 'Time entry resumed successfully',
          suivi: mapSuiviResult(updatedSuivi),
        };
      } catch (error) {
        await transaction.rollback();
        handleDatabaseError(error, 'resume time entry');
      }
    },

    forceResumeAllPaused: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const now = new Date();
    
        const result = await pool.request()
          .input('now', sql.DateTime, now)
          .query(`
            UPDATE SuiviDeTemp
            SET 
              is_paused = 0,
              last_paused_time = NULL,
              paused_duration = paused_duration + DATEDIFF(SECOND, last_paused_time, @now)
            OUTPUT INSERTED.idsuivi
            WHERE is_paused = 1 AND heure_fin_suivi IS NULL;
          `);
    
        const resumedCount = result.recordset.length;
    
        await pool.request()
          .input('now', sql.DateTime, now)
          .query(`
            UPDATE PauseHistory
            SET resume_time = @now
            WHERE resume_time IS NULL
              AND idsuivi IN (SELECT idsuivi FROM SuiviDeTemp WHERE is_paused = 0);
          `);
    
        return {
          success: true,
          resumedCount,
          message: `${resumedCount} paused entries were successfully resumed.`
        };
      } catch (error) {
        handleDatabaseError(error, 'force resume all paused entries');
      }
    }
  }
};

export const tacheResolvers = {
  Tache: {
    projet: async (parent: { idProjet?: string }, args: any, { pool }: { pool: sql.ConnectionPool }) => {
      if (!parent.idProjet) {
        return null; // Return null instead of throwing an error
      }

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
          statut_projet: result.recordset[0].statut_projet,
        };
      } catch (error) {
        console.error("Error fetching project:", error);
        throw new ApolloError("Failed to fetch project");
      }
    }
  }
};