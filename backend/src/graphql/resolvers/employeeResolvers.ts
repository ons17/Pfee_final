import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
const fetchEmployees = async (pool: sql.ConnectionPool) => {
  try {
    const result = await pool.request().query(`
      SELECT e.idEmployee, e.nom_employee, e.email_employee, e.role, e.idEquipe, e.disabledUntil, e.password_employee, eq.nom_equipe AS equipeName
      FROM Employee e
      LEFT JOIN Equipe eq ON e.idEquipe = eq.idEquipe
    `);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw new Error('Failed to fetch employees');
  }
};

export const employeeResolvers = {
  Query: {
    employees: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const employees = await fetchEmployees(pool);
        return {
          message: "Employees fetched successfully",
          employees: employees.map(emp => ({
            idEmployee: emp.idEmployee,
            nomEmployee: emp.nom_employee,
            emailEmployee: emp.email_employee,
            passwordEmployee: emp.password_employee,
            idEquipe: emp.idEquipe,
            role: emp.role,
            disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil).toISOString() : null,
            equipe: emp.equipeName ? { idEquipe: emp.idEquipe, nomEquipe: emp.equipeName } : null
          }))
        };
      } catch (error) {
        console.error('Error fetching employees:', error);
        throw new Error('Failed to fetch employees');
      }
    },

    employee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT e.idEmployee, e.nom_employee, e.email_employee, e.role, e.idEquipe, e.disabledUntil, e.password_employee, eq.nom_equipe AS equipeName
            FROM Employee e
            LEFT JOIN Equipe eq ON e.idEquipe = eq.idEquipe
            WHERE e.idEmployee = @id
          `);

        if (result.recordset.length === 0) {
          throw new Error("Employee not found"); // Update error message
        }

        const emp = result.recordset[0];
        return {
          idEmployee: emp.idEmployee,
          nomEmployee: emp.nom_employee,
          emailEmployee: emp.email_employee,
          passwordEmployee: emp.password_employee,
          idEquipe: emp.idEquipe,
          role: emp.role,
          disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil).toISOString() : null,
          equipe: emp.equipeName ? { idEquipe: emp.idEquipe, nomEquipe: emp.equipeName } : null
        };
      } catch (error) {
        console.error("Error fetching employee:", error);
        throw error; // Re-throw the error to preserve the original message
      }
    },

    searchEmployees: async (_: any, { filters }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        let query = `
          SELECT e.idEmployee, e.nom_employee, e.email_employee, e.role, e.idEquipe, e.disabledUntil, e.password_employee, eq.nom_equipe AS equipeName
          FROM Employee e
          LEFT JOIN Equipe eq ON e.idEquipe = eq.idEquipe
        `;
        const conditions: string[] = [];
        const inputs: any[] = [];

        if (filters?.nomEmployee) {
          conditions.push("e.nom_employee LIKE @nomEmployee");
          inputs.push({ name: "nomEmployee", type: sql.VarChar, value: `%${filters.nomEmployee}%` });
        }
        if (filters?.emailEmployee) {
          conditions.push("e.email_employee LIKE @emailEmployee");
          inputs.push({ name: "emailEmployee", type: sql.VarChar, value: `%${filters.emailEmployee}%` });
        }
        if (filters?.passwordEmployee) {
          conditions.push("e.password_employee = @passwordEmployee");
          inputs.push({ name: "passwordEmployee", type: sql.VarChar, value: filters.passwordEmployee });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));
        const result = await request.query(query);

        return {
          message: "Employees searched successfully",
          employees: result.recordset.map(emp => ({
            idEmployee: emp.idEmployee,
            nomEmployee: emp.nom_employee,
            emailEmployee: emp.email_employee,
            passwordEmployee: emp.password_employee,
            idEquipe: emp.idEquipe,
            role: emp.role,
            disabledUntil: emp.disabledUntil,
            equipe: emp.equipeName ? { idEquipe: emp.idEquipe, nomEquipe: emp.equipeName } : null
          }))
        };
      } catch (error) {
        console.error("Error searching employees:", error);
        throw new Error("Error searching employees");
      }
    }
  },

  Mutation: {
    createEmployee: async (_: any, { nomEmployee, emailEmployee, passwordEmployee, idEquipe, role, disabledUntil }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const existing = await pool.request()
          .input('email', sql.VarChar, emailEmployee)
          .query(`SELECT idEmployee FROM Employee WHERE email_employee = @email`);

        if (existing.recordset.length > 0) {
          throw new Error(`An employee with the email "${emailEmployee}" already exists.`);
        }

        const idEmployee = uuidv4();

        // HASH THE PASSWORD HERE
        const hashedPassword = await bcrypt.hash(passwordEmployee, 10);

        await pool.request()
          .input('id', sql.UniqueIdentifier, idEmployee)
          .input('nom', sql.VarChar, nomEmployee)
          .input('email', sql.VarChar, emailEmployee)
          .input('password', sql.VarChar, hashedPassword) // Use hashed password
          .input('equipe', sql.UniqueIdentifier, idEquipe || null)
          .input('role', sql.VarChar, role)
          .input('disabledUntil', sql.DateTime, disabledUntil ? new Date(disabledUntil) : null)
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, idEquipe, role, disabledUntil)
            VALUES (@id, @nom, @email, @password, @equipe, @role, @disabledUntil)
          `);

        return {
          idEmployee,
          nomEmployee,
          emailEmployee,
          passwordEmployee: hashedPassword, // Return hashed password
          idEquipe,
          role,
          disabledUntil: disabledUntil ? new Date(disabledUntil).toISOString() : null
        };
      } catch (error) {
        console.error("Error creating employee:", error);
        throw new Error(error instanceof Error ? error.message : "Error creating employee");
      }
    },

    updateEmployee: async (_: any, { id, nomEmployee, emailEmployee, role, idEquipe, disabledUntil }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('nomEmployee', sql.VarChar, nomEmployee || null)
          .input('emailEmployee', sql.VarChar, emailEmployee || null)
          .input('role', sql.VarChar, role || null)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe || null)
          .input('disabledUntil', sql.DateTime, disabledUntil ? new Date(disabledUntil) : null)
          .query(`
            UPDATE Employee
            SET nom_employee = COALESCE(@nomEmployee, nom_employee),
                email_employee = COALESCE(@emailEmployee, email_employee),
                role = COALESCE(@role, role),
                idEquipe = @idEquipe,
                disabledUntil = @disabledUntil
            WHERE idEmployee = @id
          `);

        const updated = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT e.idEmployee, e.nom_employee, e.email_employee, e.role, e.idEquipe, e.disabledUntil, eq.nom_equipe AS equipeName
            FROM Employee e
            LEFT JOIN Equipe eq ON e.idEquipe = eq.idEquipe
            WHERE e.idEmployee = @id
          `);

        if (updated.recordset.length === 0) throw new Error("Employee not found after update");
        const emp = updated.recordset[0];
        return {
          idEmployee: emp.idEmployee,
          nomEmployee: emp.nom_employee,
          emailEmployee: emp.email_employee,
          role: emp.role,
          idEquipe: emp.idEquipe,
          disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil).toISOString() : null,
          equipe: emp.equipeName ? { idEquipe: emp.idEquipe, nomEquipe: emp.equipeName } : null
        };
      } catch (error) {
        console.error("Error updating employee:", error);
        throw new Error("Error updating employee");
      }
    },

    deleteEmployee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`DELETE FROM Employee WHERE idEmployee = @id`);
        return { success: true, message: "Employee deleted successfully" };
      } catch (error) {
        console.error("Error deleting employee:", error);
        return { success: false, message: "Error deleting employee" };
      }
    },

    sendEmailToEmployee: async (_: any, { id, subject, message }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`SELECT * FROM Employee WHERE idEmployee = @id`);

        if (result.recordset.length === 0) {
          throw new Error('Employee not found');
        }

        const employee = result.recordset[0];

        // Check if employee is disabled
        if (isEmployeeDisabled(employee)) {
          throw new Error('Cannot send email to disabled employee');
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const resetToken = jwt.sign({ email: employee.email_employee }, 'your_secret_key', { expiresIn: '1h' }); // Token valid for 1 hour
        const resetUrl = `http://localhost:5173/ResetPassword?token=${resetToken}`;

        const info = await transporter.sendMail({
          from: 'onssbenamara3@gmail.com',
          to: employee.email_employee,
          subject,
          html: `<div style="font-family: Arial;">
            <p>${message}</p>
            <p><strong>Email:</strong> ${employee.email_employee}</p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#28a745;color:white;border-radius:5px;text-decoration:none;margin-top:10px;">Reset Password</a>
          </div>`
        });

        console.log(`Email sent: ${info.response}`);
        return true;
      } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
      }
    },

    loginEmployee: async (_: any, { email, password }: { email: string; password: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('email', sql.VarChar, email)
          .query(`SELECT * FROM Employee WHERE email_employee = @email`);

        if (result.recordset.length === 0) {
          throw new Error('Invalid email or password');
        }

        const employee = result.recordset[0];
        const isPasswordValid = await bcrypt.compare(password, employee.password_employee);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        const token = jwt.sign({ email: employee.email_employee }, 'your_secret_key', { expiresIn: '1h' });

        return {
          success: true,
          message: 'Login successful',
          token,
          employee: {
            idEmployee: employee.idEmployee,
            nomEmployee: employee.nom_employee,
            emailEmployee: employee.email_employee,
            role: employee.role,
          },
        };
      } catch (error) {
        console.error('Error logging in employee:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to log in');
      }
    },

    resetPassword: async (_: any, { token, newPassword }: { token: string; newPassword: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const decoded = jwt.verify(token, 'your_secret_key') as { email: string };
        const email = decoded.email;

        await pool.request()
          .input('email', sql.VarChar, email)
          .input('password', sql.VarChar, await bcrypt.hash(newPassword, 10))
          .query(`UPDATE Employee SET password_employee = @password WHERE email_employee = @email`);

        return { success: true, message: 'Password reset successfully' };
      } catch (error) {
        console.error('Error resetting password:', error);
        throw new Error('Invalid or expired token'); // Ensure an error is thrown
      }
    }
  }
};

// Employee interface and helper function
interface Employee {
  idEmployee: string;
  nom_employee: string;
  email_employee: string;
  password_employee: string;
  role: string;
  disabledUntil: Date | null;
  idEquipe?: string;
}

// Add helper function to check if employee is disabled
const isEmployeeDisabled = (employee: Employee): boolean => {
  if (!employee.disabledUntil) return false;
  const disabledDate = new Date(employee.disabledUntil);
  return disabledDate > new Date();
};