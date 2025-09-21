const nodemailer = require('nodemailer');
require('dotenv').config();

const testEmail = async () => {
  console.log('🔧 Testing email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '***' + process.env.EMAIL_APP_PASSWORD.slice(-4) : 'NOT SET');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'test@example.com', // Thay bằng email test
    subject: 'Test Email from Dental Clinic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1977cc;">✅ Email test thành công!</h2>
        <p>Gmail App Password đã hoạt động!</p>
        <p>Thời gian: ${new Date().toLocaleString()}</p>
        <p>Server: Dental Clinic Management System</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
};

testEmail();
