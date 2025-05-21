import * as sql from 'mssql';

export const superviseurResolvers = {
  Administrateur: {
    projets: async (parent: any, _: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        if (parent.role.toUpperCase() !== 'SUPERVISOR') {
          return [];
        }

        const result = await pool.request()
          .input('supervisorId', sql.UniqueIdentifier, parent.idAdministrateur)
          .query(`
            SELECT p.*
            FROM Projet p
            JOIN SupervisorProjet sp ON p.idProjet = sp.idProjet
            WHERE sp.idAdministrateur = @supervisorId
          `);

        return result.recordset;
      } catch (error) {
        console.error('Error fetching supervisor projects:', error);
        throw new Error('Failed to fetch supervisor projects');
      }
    }
  },

  Mutation: {
    assignProjetToSupervisor: async (_: any, 
      { idAdministrateur, idProjet }: { idAdministrateur: string, idProjet: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Check if supervisor exists and has correct role
        const supervisorCheck = await new sql.Request(transaction)
          .input('supervisorId', sql.UniqueIdentifier, idAdministrateur)
          .query(`
            SELECT 1 FROM Administrateur 
            WHERE idAdministrateur = @supervisorId 
            AND role = 'SUPERVISOR'
          `);

        if (supervisorCheck.recordset.length === 0) {
          throw new Error('Invalid supervisor');
        }

        // Create the assignment
        await new sql.Request(transaction)
          .input('supervisorId', sql.UniqueIdentifier, idAdministrateur)
          .input('projetId', sql.UniqueIdentifier, idProjet)
          .query(`
            INSERT INTO SupervisorProjet (idAdministrateur, idProjet)
            VALUES (@supervisorId, @projetId)
          `);

        await transaction.commit();

        // Return the new assignment
        const result = await pool.request()
          .input('supervisorId', sql.UniqueIdentifier, idAdministrateur)
          .input('projetId', sql.UniqueIdentifier, idProjet)
          .query(`
            SELECT TOP 1
              sp.idSupervisorProjet,
              sp.dateAssigned,
              a.*,
              p.*
            FROM SupervisorProjet sp
            JOIN Administrateur a ON sp.idAdministrateur = a.idAdministrateur
            JOIN Projet p ON sp.idProjet = p.idProjet
            WHERE sp.idAdministrateur = @supervisorId
            AND sp.idProjet = @projetId
          `);

        return {
          idSupervisorProjet: result.recordset[0].idSupervisorProjet,
          dateAssigned: result.recordset[0].dateAssigned,
          supervisor: {
            idAdministrateur: result.recordset[0].idAdministrateur,
            nom_administrateur: result.recordset[0].nom_administrateur,
            email_administrateur: result.recordset[0].email_administrateur,
            role: result.recordset[0].role
          },
          projet: {
            idProjet: result.recordset[0].idProjet,
            nom_projet: result.recordset[0].nom_projet,
            description_projet: result.recordset[0].description_projet,
            statut_projet: result.recordset[0].statut_projet
          }
        };
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Error during transaction rollback:', rollbackError);
        }
        throw error;
      }
    },

    removeProjetFromSupervisor: async (_: any,
      { idAdministrateur, idProjet }: { idAdministrateur: string, idProjet: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const result = await pool.request()
          .input('supervisorId', sql.UniqueIdentifier, idAdministrateur)
          .input('projetId', sql.UniqueIdentifier, idProjet)
          .query(`
            DELETE FROM SupervisorProjet
            WHERE idAdministrateur = @supervisorId
            AND idProjet = @projetId
          `);

        return result.rowsAffected[0] > 0;
      } catch (error) {
        console.error('Error removing project from supervisor:', error);
        throw new Error('Failed to remove project from supervisor');
      }
    }
  }
};