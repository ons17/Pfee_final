import nodemailer from 'nodemailer';

export const sendResetPasswordEmail = async (email: string, resetToken: string) => {
  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`; // Lien vers la page de réinitialisation

  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Ou un autre service
    auth: {
      user: process.env.EMAIL_USER, // Votre email
      pass: process.env.EMAIL_PASS, // Votre mot de passe ou token d'application
    },
  });

  const mailOptions = {
    from: '"Your App Name" <your-email@example.com>',
    to: email,
    subject: 'Reset Your Password',
    html: `
      <p>Hello,</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      <a href="${resetLink}" style="
        display: inline-block;
        padding: 10px 20px;
        color: white;
        background-color: #007bff;
        text-decoration: none;
        border-radius: 5px;
        font-size: 16px;
      ">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Reset password email sent successfully');
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw new Error('Failed to send reset password email');
  }
};