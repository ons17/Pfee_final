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
const TOLERANCE_MINUTES = 5; // 5-minute buffer
const AUTO_STOP_MESSAGE = ' (Arrêt automatique)';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: true,
  logger: true,
});

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

/**
 * Gets current Tunisia time (UTC+1)
 */
function getTunisiaDate() {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000); // UTC+1 offset
}

/**
 * Auto-stops forgotten timers and sends notifications
 */
async function autoStopForgottenTimers(pool: { request: () => { (): any; new(): any; query: { (arg0: string): any; new(): any; }; }; }) {
  try {
    const tunisiaNow = getTunisiaDate();
    const todayDate = tunisiaNow.toISOString().split('T')[0];
    const workEndTime = new Date(tunisiaNow);
    workEndTime.setHours(WORK_END_HOUR, 0, 0, 0); // Set to 17:00 Tunisia time

    // Find all active timers from today
    const activeTimers = await pool.request().query(`
      SELECT 
        s.idsuivi,
        s.heure_debut_suivi,
        e.idEmployee,
        e.nom_employee,
        e.email_employee,
        s.description
      FROM SuiviDeTemp s
      INNER JOIN Employee e ON s.idEmployee = e.idEmployee
      WHERE s.heure_fin_suivi IS NULL
        AND CAST(s.heure_debut_suivi AS DATE) = '${todayDate}'
    `);

    for (const timer of activeTimers.recordset) {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();
        
        const startTime = new Date(timer.heure_debut_suivi);
        let endTime = new Date(workEndTime);
        let duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

        // Handle timers started after work hours
        if (startTime > workEndTime) {
          duration = 0;
          endTime = new Date(startTime);
        }

        // Update timer with auto-stop
        await new sql.Request(transaction)
          .input('idsuivi', sql.UniqueIdentifier, timer.idsuivi)
          .input('endTime', sql.DateTime2, endTime)
          .input('duration', sql.Int, duration)
          .query(`
            UPDATE SuiviDeTemp
            SET 
              heure_fin_suivi = @endTime,
              duree_suivi = @duration,
              description = CONCAT(COALESCE(description, ''), '${AUTO_STOP_MESSAGE}')
            WHERE idsuivi = @idsuivi
          `);

        // Send notification email
        const message = duration > 0 
          ? `Bonjour ${timer.nom_employee},\n\nVotre chronomètre démarré à ${startTime.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })} a été automatiquement arrêté à 17:00.\nDurée enregistrée: ${duration} minutes.` 
          : `Bonjour ${timer.nom_employee},\n\nVotre chronomètre démarré après 17:00 a été arrêté automatiquement. Aucune durée n'a été enregistrée.`;

        await transporter.sendMail({
          from: `Time Tracker <${process.env.EMAIL_USER}>`,
          to: timer.email_employee,
          subject: 'Chronomètre arrêté automatiquement',
          text: message,
          html: `<p>${message.replace(/\n/g, '<br>')}</p>`
        });

        await transaction.commit();
        console.log(`[${new Date().toISOString()}] Auto-stopped timer for ${timer.email_employee}`);
      } catch (error) {
        await transaction.rollback();
        console.error(`[${new Date().toISOString()}] Failed to auto-stop timer ${timer.idsuivi}:`, error);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in autoStopForgottenTimers:`, error);
  }
}

/**
 * Main alert function with daily reports
 */
async function sendDailyEmailAlerts(pool: { request: () => { (): any; new(): any; query: { (arg0: string): any; new(): any; }; input: { (arg0: string, arg1: any, arg2: any): { (): any; new(): any; input: { (arg0: string, arg1: any, arg2: string): { (): any; new(): any; query: { (arg0: string): any; new(): any; }; input: { (arg0: string, arg1: any, arg2: any): { (): any; new(): any; input: { (arg0: string, arg1: any, arg2: string): { (): any; new(): any; query: { (arg0: string): any; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }; }) {
  try {
    const tunisiaDate = getTunisiaDate();
    const todayDateStr = tunisiaDate.toISOString().split('T')[0];

    // Query employees' work time, filtering only active employees (disabledUntil IS NULL)
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
        AND CAST(T.heure_debut_suivi AS DATE) = '${todayDateStr}'
      WHERE E.disabledUntil IS NULL
      GROUP BY E.idEmployee, E.nom_employee, E.email_employee
    `);

    for (const employee of result.recordset) {
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
        message = `Bonjour ${employee.nom_employee}, vous avez complété vos ${DAILY_WORK_HOURS} heures aujourd'hui.`;
      } 
      // Incomplete (<8h)
      else if (totalMinutes < DAILY_WORK_HOURS * 60 - TOLERANCE_MINUTES) {
        alertType = 'incomplete';
        const missingHours = (DAILY_WORK_HOURS - totalHours).toFixed(2);
        message = `Bonjour ${employee.nom_employee}, il vous manque ${missingHours} heures (${DAILY_WORK_HOURS} heures requises).`;
      } 
      // Overtime (>8h or worked past 17:00)
      else if (totalMinutes > DAILY_WORK_HOURS * 60 + TOLERANCE_MINUTES || isOvertime) {
        alertType = 'overtime';
        message = `Bonjour ${employee.nom_employee}, vous avez travaillé ${totalHours.toFixed(2)} heures (dépassement de ${(totalHours - DAILY_WORK_HOURS).toFixed(2)} heures${isOvertime ? ' après 17h00' : ''}).`;
      }

      // Check existing alerts
      const alertCheck = await pool.request()
        .input('employeeId', sql.UniqueIdentifier, employee.idEmployee)
        .input('alertType', sql.NVarChar, alertType)
        .query(`
          SELECT COUNT(*) AS alertCount 
          FROM Alert 
          WHERE idEmployee = @employeeId 
            AND alert_type = @alertType 
            AND CAST(date_creer_alert AS DATE) = '${todayDateStr}'
        `);

      if (alertCheck.recordset[0].alertCount > 0) {
        console.log(`[${new Date().toISOString()}] Alert already sent for ${employee.nom_employee}`);
        continue;
      }

      // Send new alert
      if (message) {
        try {
          await transporter.sendMail({
            from: `Time Tracker <${process.env.EMAIL_USER}>`,
            to: employee.email_employee,
            subject: 'Rapport Journalier - Temps de Travail',
            text: message,
            html: `<p>${message}</p>`
          });

          // Record alert
          await pool.request()
            .input('idAlert', sql.UniqueIdentifier, uuidv4())
            .input('message', sql.NVarChar, message)
            .input('employeeId', sql.UniqueIdentifier, employee.idEmployee)
            .input('alertType', sql.NVarChar, alertType)
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

// Main execution flow
(async () => {
  const pool = new sql.ConnectionPool(dbConfig);
  try {
    await pool.connect();
    console.log(`[${new Date().toISOString()}] Connected to SQL Server`);

    // 1. First auto-stop any forgotten timers
    //await autoStopForgottenTimers(pool);

    // 2. Schedule daily process
    cron.schedule('5 16 * * *', async () => { // 16:05 UTC = 17:05 Tunisia
      console.log(`[${new Date().toISOString()}] Running daily process`);
      await autoStopForgottenTimers(pool);
      await sendDailyEmailAlerts(pool);
    });

    // Initial test run
    console.log(`[${new Date().toISOString()}] Running initial check`);
    await autoStopForgottenTimers(pool);
    await sendDailyEmailAlerts(pool);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Startup error:`, error);
    process.exit(1);
  }
})();

//   node /home/usera/Pfee_final/backend/src/jobs/dailyAlerts.ts