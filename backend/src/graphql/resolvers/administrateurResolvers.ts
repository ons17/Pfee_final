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
    { id: admin.idAdministrateur, email: admin.email_administrateur, role: 'ADMIN' },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
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
    }
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

        if (admin.role !== 'ADMIN') {
          throw new Error("Access denied");
        }

        const token = generateToken(admin);

        return {
          success: true,
          message: "Connexion réussie",
          administrateur: {
            idAdministrateur: admin.idAdministrateur,
            nom_administrateur: admin.nom_administrateur,
            email_administrateur: admin.email_administrateur,
            role: admin.role,
          },
          token,
        };
      } catch (error) {
        console.error('Erreur lors de la connexion administrateur:', error);
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
        const hashedPassword = await bcrypt.hash(password_administrateur, 10);

        const id = crypto.randomUUID();
        await pool.request()
          .input("id", sql.UniqueIdentifier, id)
          .input("nom", sql.VarChar, nom_administrateur)
          .input("email", sql.VarChar, email_administrateur)
          .input("password", sql.VarChar, hashedPassword)
          .input("role", sql.VarChar, role)
          .query(`
            INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, password_administrateur, role)
            VALUES (@id, @nom, @email, @password, @role)
          `);

        // Generate a reset token
        const resetToken = jwt.sign({ email: email_administrateur }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
        const resetUrl = `http://localhost:5173/ResetPassword?token=${resetToken}`;

        // Send email to the new admin
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const emailContent = `
          <div style="font-family: Arial;">
            <p>Dear ${nom_administrateur},</p>
            <p>Your admin account has been created successfully. Below are your login details:</p>
            <ul>
              <li><strong>Email:</strong> ${email_administrateur}</li>
            </ul>
            <p>Please reset your password using the link below:</p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:white;border-radius:5px;text-decoration:none;">Reset Password</a>
            <p>Best regards,<br>Your Company</p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email_administrateur,
          subject: 'Welcome to the Admin Panel - Reset Your Password',
          html: emailContent,
        });

        return {
          success: true,
          message: 'Admin created successfully and email sent',
          administrateur: { idAdministrateur: id, nom_administrateur, email_administrateur, role },
        };
      } catch (error) {
        console.error('Error creating admin:', error);
        return { success: false, message: 'Failed to create admin', administrateur: null };
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
  }
};