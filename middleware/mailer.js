const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: 587,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

async function sendTemporaryPassword(email, name, password) {
  await transporter.sendMail({
    from: '"Rabbit Nursery" <no-reply@rabbit-nursery.com>',
    to: email,
    subject: 'Your Rabbit Nursery Account',
    html: `
      <p>Hello ${name || email},</p>
      <p>Your account has been created. Use the temporary password below to log in:</p>
      <p style="font-size:1.2em;font-weight:bold;letter-spacing:2px;">${password}</p>
      <p>Please change your password after logging in.</p>
      <p>Rabbit Nursery Team</p>
    `,
  });
}

async function sendResetCode(email, name, code) {
  await transporter.sendMail({
    from: '"Rabbit Nursery" <no-reply@rabbit-nursery.com>',
    to: email,
    subject: 'Password Reset Code',
    html: `
      <p>Hello ${name || email},</p>
      <p>Use the confirmation code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
      <p style="font-size:1.5em;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>If you did not request this, ignore this email.</p>
      <p>Rabbit Nursery Team</p>
    `,
  });
}

module.exports = { sendTemporaryPassword, sendResetCode };
