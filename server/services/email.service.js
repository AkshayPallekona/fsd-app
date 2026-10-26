const nodemailer = require('nodemailer');
const {
  EMAIL_MODE,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  NODE_ENV
} = require('../config/env');

let transporter = null;

if (EMAIL_MODE === 'smtp') {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendResetPasswordEmail(email, resetUrl) {
  if (EMAIL_MODE === 'console') {
    if (NODE_ENV === 'production') {
      throw new Error('EMAIL_MODE=console cannot be used in production.');
    }
    // eslint-disable-next-line no-console
    console.log('\n================== [DEV ONLY] PASSWORD RESET EMAIL ==================');
    // eslint-disable-next-line no-console
    console.log(`To: ${email}`);
    // eslint-disable-next-line no-console
    console.log(`Reset Link: ${resetUrl}`);
    // eslint-disable-next-line no-console
    console.log('Valid for 30 minutes.');
    // eslint-disable-next-line no-console
    console.log('======================================================================\n');
    return { devOnly: true, link: resetUrl };
  }

  if (transporter) {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Password Reset Request - Rental Portal',
      text: `You requested a password reset for your Rental Portal account. Please click the link below or paste it into your browser to reset your password:\n\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Password Reset Request</h2>
          <p>You requested a password reset for your Rental Portal account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Or copy and paste this URL into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">This link will expire in 30 minutes. If you did not request this reset, please ignore this message.</p>
        </div>
      `
    });
    return info;
  }
}

module.exports = {
  sendResetPasswordEmail
};
