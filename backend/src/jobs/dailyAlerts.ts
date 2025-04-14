import sql from 'mssql';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config({ path: '/home/usera/Pfee_final/backend/.env' });

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const DAILY_WORK_HOURS = 8; // Required daily work hours
const WORK_END_TIME = 17; // Work ends at 17:00 (5 PM)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: true, // Enable debugging
  logger: true, // Log SMTP traffic
});

const config = {
  user: 'SA',
  password: 'YourPassword123!', // Replace with your actual password
  server: 'localhost',
  database: 'time_tracking',
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // Allow self-signed certificates
  },
};

const sendDailyAlerts = async (pool: sql.ConnectionPool) => {
  try {
    const result = await pool.request().query(`
      SELECT E.idEmployee, E.nom_employee, E.email_employee,
             COALESCE(SUM(DATEDIFF(MINUTE, T.heure_debut_suivi, T.heure_fin_suivi)), 0) AS totalMinutes,
             MAX(T.heure_fin_suivi) AS lastEndTime
      FROM Employee E
      LEFT JOIN SuiviDeTemp T 
        ON E.idEmployee = T.idEmployee 
        AND CAST(T.heure_debut_suivi AS DATE) = CAST(GETDATE() AS DATE)
      GROUP BY E.idEmployee, E.nom_employee, E.email_employee;
    `);

    const employees = result.recordset;

    console.log(`Number of employees fetched: ${employees.length}`);
    employees.forEach(employee => {
      console.log(`Employee: ${employee.nom_employee}, Email: ${employee.email_employee}`);
    });

    for (const employee of employees) {
      console.log(`Processing alerts for employee: ${employee.nom_employee} (${employee.email_employee})`);
      
      const totalHours = (employee.totalMinutes || 0) / 60;
      const lastEndTime = employee.lastEndTime ? new Date(employee.lastEndTime) : null;
      const isOvertime = lastEndTime && lastEndTime.getHours() >= WORK_END_TIME;

      let message = '';
      if (totalHours === 0) {
        message = `You have not logged any work hours today. Please ensure to log your time.`;
      } else if (totalHours === DAILY_WORK_HOURS && !isOvertime) {
        message = `Congratulations! You have completed your daily work hours of ${DAILY_WORK_HOURS} hours.`;
      } else if (totalHours < DAILY_WORK_HOURS) {
        message = `You have worked ${totalHours.toFixed(2)} hours today, which is less than the required ${DAILY_WORK_HOURS} hours.`;
      } else if (totalHours > DAILY_WORK_HOURS || isOvertime) {
        message = `You have worked ${totalHours.toFixed(2)} hours today, which exceeds the required ${DAILY_WORK_HOURS} hours or includes overtime beyond 17:00.`;
      }

      // Send email
      try {
        console.log(`Sending email to: ${employee.email_employee}`);
        console.log(`Email subject: Daily Work Hours Alert`);
        console.log(`Email text: ${message}`);
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: employee.email_employee,
          subject: `Daily Work Hours Alert`,
          text: message,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${employee.email_employee}:`, emailError);
      }
    }

    // Save alerts in the database
    const alertQueries = employees.map(employee => {
      const idAlert = uuidv4();
      const totalHours = (employee.totalMinutes || 0) / 60;
      const lastEndTime = employee.lastEndTime ? new Date(employee.lastEndTime) : null;
      const isOvertime = lastEndTime && lastEndTime.getHours() >= WORK_END_TIME;

      let message = '';
      if (totalHours === 0) {
        message = `You have not logged any work hours today. Please ensure to log your time.`;
      } else if (totalHours === DAILY_WORK_HOURS && !isOvertime) {
        message = `Congratulations! You have completed your daily work hours of ${DAILY_WORK_HOURS} hours.`;
      } else if (totalHours < DAILY_WORK_HOURS) {
        message = `You have worked ${totalHours.toFixed(2)} hours today, which is less than the required ${DAILY_WORK_HOURS} hours.`;
      } else if (totalHours > DAILY_WORK_HOURS || isOvertime) {
        message = `You have worked ${totalHours.toFixed(2)} hours today, which exceeds the required ${DAILY_WORK_HOURS} hours or includes overtime beyond 17:00.`;
      }

      return `
        INSERT INTO Alert (idAlert, message_alert, date_creer_alert, idEmployee)
        VALUES ('${idAlert}', '${message}', GETDATE(), '${employee.idEmployee}');
      `;
    }).join('\n');

    await pool.request().query(alertQueries);

    console.log('Daily alerts processed successfully.');
  } catch (error) {
    console.error('Error processing daily alerts:', error);
  }
};


// Schedule the job to run daily at 18:00 (6 PM)

cron.schedule('53 13 * * *', async () => {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    await sendDailyAlerts(pool);
  } catch (error) {
    console.error('Error running daily alerts:', error);
  } finally {
    pool.close();
  }
});