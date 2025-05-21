import { OAuth2Client } from 'google-auth-library';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "onssbenamara3@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ons123";

// Admin type definition
type Admin = {
  idAdministrateur: string;
  nom_administrateur: string;
  email_administrateur: string;
  password_administrateur?: string;
  role: string;
  
};

// JWT Token generationz
const generateToken = (admin: Admin) => {
  return jwt.sign(
    { 
      id: admin.idAdministrateur, 
      email: admin.email_administrateur, 
      role: admin.role // This will use the actual role from database
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

export const loginWithGoogle = async (_: any, { googleIdToken }: any, { pool }: { pool: sql.ConnectionPool }) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: googleIdToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name;

    if (!email) {
      return { success: false, message: "Invalid Google token", administrateur: null, token: null };
    }

    let result = await pool.request()
      .input("email", sql.VarChar, email)
      .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

    if (result.recordset.length === 0) {
      const id = crypto.randomUUID();
      await pool.request()
        .input("id", sql.UniqueIdentifier, id)
        .input("nom", sql.VarChar, name || "Admin")
        .input("email", sql.VarChar, email)
        .query("INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, role) VALUES (@id, @nom, @email, 'ADMIN')");

      result = await pool.request()
        .input("email", sql.VarChar, email)
        .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");
    }

    const admin = result.recordset[0];
    const token = jwt.sign({ id: admin.idAdministrateur, email: admin.email_administrateur }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    return { success: true, message: "Login successful", administrateur: admin, token };
  } catch (error) {
    console.error("Google Login Error:", error);
    return { success: false, message: "Google login failed", administrateur: null, token: null };
  }
};

export const adminResolvers = {
  Query: {
    getAdministrateur: async (_: any, { email_administrateur }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input("email", sql.VarChar, email_administrateur)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          return { success: false, message: "Administrateur non trouvé", administrateur: null };
        }

        return { success: true, message: "Administrateur trouvé", administrateur: result.recordset[0] };
      } catch (error) {
        console.error("Erreur lors de la récupération de l'administrateur:", error);
        return { success: false, message: "Erreur interne", administrateur: null };
      }
    },

    allAdministrateurs: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .query("SELECT idAdministrateur, nom_administrateur, email_administrateur, role FROM Administrateur");
        
        return result.recordset;
      } catch (error) {
        console.error('Error fetching administrators:', error);
        throw new Error('Failed to fetch administrators');
      }
    },
  },
  Mutation: {
    loginAdministrateur: async (_: any, { email_administrateur, password_administrateur }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input("email", sql.VarChar, email_administrateur)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          return { success: false, message: "Email ou mot de passe incorrect", administrateur: null, token: null };
        }

        const admin = result.recordset[0];
        const isPasswordValid = await bcrypt.compare(password_administrateur, admin.password_administrateur);

        if (!isPasswordValid) {
          return { success: false, message: "Email ou mot de passe incorrect", administrateur: null, token: null };
        }

        const token = generateToken(admin);

        return {
          success: true,
          message: "Connexion réussie",
          administrateur: {
            idAdministrateur: admin.idAdministrateur,
            nom_administrateur: admin.nom_administrateur,
            email_administrateur: admin.email_administrateur,
            role: admin.role // Keep the original role from database
          },
          token
        };
      } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return { success: false, message: "Erreur interne", administrateur: null, token: null };
      }
    },

    loginWithGoogle: async (_: any, { googleIdToken }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const ticket = await client.verifyIdToken({
          idToken: googleIdToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload?.email;
        const name = payload?.name;

        if (!email || email !== ADMIN_EMAIL) {
          return { success: false, message: "Accès refusé", administrateur: null, token: null };
        }

        let result = await pool.request()
          .input("email", sql.VarChar, ADMIN_EMAIL)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          const id = crypto.randomUUID();
          await pool.request()
            .input("id", sql.UniqueIdentifier, id)
            .input("nom", sql.VarChar, name || "Admin")
            .input("email", sql.VarChar, ADMIN_EMAIL)
            .query("INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, role) VALUES (@id, @nom, @email, 'ADMIN')");
          
          result = await pool.request()
            .input("email", sql.VarChar, ADMIN_EMAIL)
            .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");
        }

        const admin = result.recordset[0];
        const token = generateToken(admin);

        return { success: true, message: "Connexion réussie", administrateur: admin, token };
      } catch (error) {
        console.error("Erreur d'authentification Google:", error);
        return { success: false, message: "Erreur d'authentification", administrateur: null, token: null };
      }
    },

    createAdministrateur: async (
      _: any,
      { nom_administrateur, email_administrateur, password_administrateur, role }: any,
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password_administrateur, 10);

        // Insert the admin into the database
        await pool.request()
          .input('nom', sql.VarChar, nom_administrateur)
          .input('email', sql.VarChar, email_administrateur)
          .input('password', sql.VarChar, hashedPassword)
          .input('role', sql.VarChar, role)
          .query(`
            INSERT INTO Administrateur (nom_administrateur, email_administrateur, password_administrateur, role)
            VALUES (@nom, @email, @password, @role)
          `);

        // Send email with credentials
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        // Update the email content in createAdministrateur resolver
        const emailContent = `
          <div style="font-family: Arial;">
            <h2>Welcome to ImbusFlow</h2>
            <p>Dear ${nom_administrateur},</p>
            <p>Your supervisor account has been created successfully. Here are your login credentials:</p>
            <ul>
              <li><strong>Email:</strong> ${email_administrateur}</li>
              <li><strong>Password:</strong> ${password_administrateur}</li>
            </ul>
            <p><strong>Important:</strong> Please change your password after your first login.</p>
            <a href="http://localhost:5173/admin/reset-password" 
               style="display:inline-block;padding:10px 20px;color:#fff;background-color:#007bff;text-decoration:none;border-radius:5px;">
              Reset Password
            </a>
            <p>Best regards,<br>ImbusFlow Team</p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email_administrateur,
          subject: 'Welcome to the Admin Panel - Your Credentials',
          html: emailContent,
        });

        return { success: true, message: 'Admin created successfully and credentials sent via email.' };
      } catch (error) {
        console.error('Error creating admin:', error);
        return { success: false, message: 'Failed to create admin.' };
      }
    },

    createEmployee: async (_: any, { input }: any, { pool, user }: { pool: sql.ConnectionPool; user: any }) => {
      if (user.role !== 'ADMIN') {
        throw new Error('Access denied. Only admins can create employees.');
      }

      try {
        const { nomEmployee, emailEmployee, passwordEmployee, role } = input;
        const hashedPassword = await bcrypt.hash(passwordEmployee, 10);
        const id = crypto.randomUUID();

        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('nom', sql.VarChar, nomEmployee)
          .input('email', sql.VarChar, emailEmployee)
          .input('password', sql.VarChar, hashedPassword)
          .input('role', sql.VarChar, role)
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, role)
            VALUES (@id, @nom, @email, @password, @role)
          `);

        return { success: true, message: 'Employee created successfully' };
      } catch (error) {
        console.error('Error creating employee:', error);
        return { success: false, message: 'Failed to create employee' };
      }
    },

    resetPassword: async (_: any, { token, newPassword }: { token: string; newPassword: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
        if (!decoded || typeof decoded.email !== 'string') {
          throw new Error('Invalid or expired token');
        }

        const email = decoded.email;

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        const result = await pool.request()
          .input('email', sql.VarChar, email)
          .input('password', sql.VarChar, hashedPassword)
          .query(`UPDATE Administrateur SET password_administrateur = @password WHERE email_administrateur = @email`);

        if (result.rowsAffected[0] === 0) {
          console.error('Failed to reset password. Admin not found for email:', email);
          return { success: false, message: 'Admin not found or invalid email.' };
        }

        return { success: true, message: 'Password reset successfully' };
      } catch (error) {
        console.error('Error resetting password:', error);
        throw new Error('Invalid or expired token');
      }
    }
  }
};


