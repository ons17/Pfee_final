const sql = require('mssql');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config({ path: '/home/usera/Pfee_final/backend/.env' });

// Constants for Tunisia (UTC+1)
const DAILY_WORK_HOURS = 8;
const WORK_END_HOUR = 17; // 17:00 Tunisia time
const TOLERANCE_MINUTES = 5; // 5-minute buffer for clock-in/out inaccuracies

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: true,
  logger: true,
});

// SQL Server config
const config = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

/**
 * Gets the current date in Tunisia time (UTC+1)
 */
function getTunisiaDate() {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour for UTC+1
}

/**
 * Main alert function with Tunisia timezone handling
 */
async function sendDailyEmailAlerts(pool: { request: () => { (): any; new(): any; query: { (arg0: string): any; new(): any; }; input: { (arg0: string, arg1: any, arg2: any): { (): any; new(): any; input: { (arg0: string, arg1: any, arg2: string): { (): any; new(): any; query: { (arg0: string): any; new(): any; }; input: { (arg0: string, arg1: any, arg2: any): { (): any; new(): any; input: { (arg0: string, arg1: any, arg2: string): { (): any; new(): any; query: { (arg0: string): any; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }; }) {
  try {
    const tunisiaDate = getTunisiaDate();
    const todayDateStr = tunisiaDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Query employees and their work time for today (Tunisia date)
    const result = await pool.request().query(`
      SELECT 
        E.idEmployee, 
        E.nom_employee, 
        E.email_employee,
        COALESCE(SUM(DATEDIFF(MINUTE, T.heure_debut_suivi, T.heure_fin_suivi)), 0) AS totalMinutes,
        MAX(T.heure_fin_suivi) AS lastEndTime
      FROM Employee E
      LEFT JOIN SuiviDeTemp T 
        ON E.idEmployee = T.idEmployee 
        AND CONVERT(DATE, T.heure_debut_suivi) = '${todayDateStr}'
  WHERE E.disabledUntil IS NULL -- Only include employees with no disabledUntil date
      GROUP BY E.idEmployee, E.nom_employee, E.email_employee;
    `);

    const employees = result.recordset;

    for (const employee of employees) {
      const totalMinutes = employee.totalMinutes || 0;
      const totalHours = totalMinutes / 60;
      const lastEndTime = employee.lastEndTime ? new Date(employee.lastEndTime) : null;

      // Check if worked past 17:00 Tunisia time
      const isOvertime = lastEndTime && 
                         lastEndTime.getHours() >= WORK_END_HOUR &&
                         lastEndTime.getMinutes() > TOLERANCE_MINUTES;

      let alertType = '';
      let message = '';

      // Complete (8h ± tolerance)
      if (totalMinutes >= (DAILY_WORK_HOURS * 60 - TOLERANCE_MINUTES) && 
          totalMinutes <= (DAILY_WORK_HOURS * 60 + TOLERANCE_MINUTES)) {
        alertType = 'complete';
        message = `Bonjour ${employee.nom_employee}, vous avez complété vos ${DAILY_WORK_HOURS} heures de travail aujourd'hui.`;
      } 
      // Incomplete (<8h)
      else if (totalMinutes < DAILY_WORK_HOURS * 60 - TOLERANCE_MINUTES) {
        alertType = 'incomplete';
        const missingHours = (DAILY_WORK_HOURS - totalHours).toFixed(2);
        message = `Bonjour ${employee.nom_employee}, il vous manque ${missingHours} heures pour atteindre les ${DAILY_WORK_HOURS} heures requises.`;
      } 
      // Overtime (>8h or worked past 17:00)
      else if (totalMinutes > DAILY_WORK_HOURS * 60 + TOLERANCE_MINUTES || isOvertime) {
        alertType = 'overtime';
        message = `Bonjour ${employee.nom_employee}, vous avez travaillé ${totalHours.toFixed(2)} heures aujourd'hui (dépassement de ${(totalHours - DAILY_WORK_HOURS).toFixed(2)} heures${isOvertime ? ' ou travail après 17h00' : ''}).`;
      }

      // Check if alert already sent today
      const alertCheck = await pool.request()
        .input('employeeId', sql.VarChar, employee.idEmployee)
        .input('alertType', sql.VarChar, alertType)
        .query(`
          SELECT COUNT(*) AS alertCount 
          FROM Alert 
          WHERE idEmployee = @employeeId 
            AND alert_type = @alertType 
            AND CONVERT(DATE, date_creer_alert) = '${todayDateStr}'
        `);

      if (alertCheck.recordset[0].alertCount > 0) {
        console.log(`[${new Date().toISOString()}] Alert already sent for ${employee.nom_employee} (${alertType})`);
        continue;
      }

      // Send email if new alert
      if (message) {
        try {
          await transporter.sendMail({
            from: `Time Tracker <${process.env.EMAIL_USER}>`,
            to: employee.email_employee,
            subject: 'Alerte Temps de Travail',
            text: message,
            html: `<p>${message}</p>`,
          });

          // Record alert in database
          await pool.request()
            .input('idAlert', sql.VarChar, uuidv4())
            .input('message', sql.Text, message)
            .input('employeeId', sql.VarChar, employee.idEmployee)
            .input('alertType', sql.VarChar, alertType)
            .query(`
              INSERT INTO Alert (idAlert, message_alert, date_creer_alert, idEmployee, alert_type)
              VALUES (@idAlert, @message, GETDATE(), @employeeId, @alertType)
            `);

          console.log(`[${new Date().toISOString()}] Sent ${alertType} alert to ${employee.email_employee}`);
        } catch (emailError) {
          console.error(`[${new Date().toISOString()}] Email failed for ${employee.email_employee}:`, emailError);
        }
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in sendDailyEmailAlerts:`, error);
  }
}

// Main execution
(async () => {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log(`[${new Date().toISOString()}] Connected to SQL Server`);

    // Run daily at 17:05 Tunisia time (16:05 UTC)
    cron.schedule('5 16 * * *', async () => {
      console.log(`[${new Date().toISOString()}] Running daily alerts check`);
      await sendDailyEmailAlerts(pool);
    });

    // Also run immediately for testing (optional)
    console.log(`[${new Date().toISOString()}] Running initial test`);
    await sendDailyEmailAlerts(pool);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Startup error:`, error);
    process.exit(1);
  }
})();