const nodemailer = require('nodemailer');

// Email configuration (using Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// === GENERIC EMAIL TEMPLATE ===
const createEmailTemplate = (title, content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1977cc; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">${title}</h1>
    </div>
    <div style="padding: 20px 30px; line-height: 1.6;">
      ${content}
    </div>
    <div style="background-color: #f1f1f1; color: #555; padding: 15px 30px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">This is an automated email, please do not reply.</p>
      <p style="margin: 5px 0;">BeautySmile Clinic | Hotline: +84 935 655 266 | Email: hotro@beautysmile.com</p>
    </div>
  </div>
`;

const sendEmail = async ({ to, subject, html, title }) => {
    try {
        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: createEmailTemplate(title, html)
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
        return { success: true };
    } catch (error) {
        console.error(`Email send error to ${to}:`, error);
    }
};

// Send verification code
const sendVerificationCode = async (email, code) => {
    try {
        const title = "Account Verification";
        const content = `
          <p>Hello,</p>
          <p>Thank you for registering an account at BeautySmile Clinic. Please use the following verification code to complete your registration:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; border-left: 4px solid #1977cc;">
            <h2 style="color: #1977cc; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h2>
          </div>
          <p>This code is valid for 10 minutes.</p>
          <p>Regards,<br><strong>The BeautySmile Clinic Team</strong></p>
        `;

        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Account Verification Code - BeautySmile Clinic',
            html: createEmailTemplate(title, content)
        };
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

// Send password reset email 
const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        const title = "Password Reset Request";
        const content = `
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. Please click the button below to create a new password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #1977cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password</a>
          </div>
          <p>This link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
          <p>Regards,<br><strong>The BeautySmile Clinic Team</strong></p>
        `;

        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - BeautySmile Clinic',
            html: createEmailTemplate(title, content)
        };
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Password reset email error:', error);
        throw error;
    }
};

// Send appointment confirmation email
const sendAppointmentConfirmationEmail = async (appointmentDetails) => {
    try {
        const { patientEmail, patientName, doctorName, appointmentDate, startTime, locationName = 'BeautySmile Clinic' } = appointmentDetails;
        
        // Format date to a more readable English format (e.g., "October 21, 2025")
        const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const title = "Appointment Confirmed";
        const content = `
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>BeautySmile Clinic confirms that you have successfully booked your appointment. Here are the details of your appointment:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1977cc;">
            <p style="margin: 8px 0;"><strong>Doctor:</strong> ${doctorName}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${startTime}</p>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${locationName}</p>
          </div>
          <p>Please arrive 10-15 minutes before your appointment time for check-in. If you need to reschedule, please contact us.</p>
          <p>Thank you for choosing our services!</p>
          <p>Regards,<br><strong>The BeautySmile Clinic Team</strong></p>
        `;

        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: patientEmail,
            subject: 'Appointment Confirmation - BeautySmile Clinic',
            html: createEmailTemplate(title, content)
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email sent to ${patientEmail}`);
        return { success: true };
    } catch (error) {
        console.error('Appointment confirmation email error:', error);
    }
};

module.exports = {
    sendEmail,
    sendVerificationCode,
    sendPasswordResetEmail,
    sendAppointmentConfirmationEmail
};