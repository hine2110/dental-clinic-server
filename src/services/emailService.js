const nodemailer = require('nodemailer');

// Cấu hình email (sử dụng gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// === TEMPLATE EMAIL CHUNG ===
const createEmailTemplate = (title, content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #1977cc; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">${title}</h1>
    </div>
    <div style="padding: 20px 30px; line-height: 1.6;">
      ${content}
    </div>
    <div style="background-color: #f1f1f1; color: #555; padding: 15px 30px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">Đây là email tự động, vui lòng không trả lời.</p>
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

// Gửi mã xác thực
const sendVerificationCode = async (email, code) => {
    try {
        const title = "Xác thực tài khoản";
        const content = `
          <p>Xin chào,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại BeautySmile Clinic. Vui lòng sử dụng mã xác thực sau để hoàn tất đăng ký:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; border-left: 4px solid #1977cc;">
            <h2 style="color: #1977cc; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h2>
          </div>
          <p>Mã này có hiệu lực trong 10 phút.</p>
          <p>Trân trọng,<br><strong>Đội ngũ BeautySmile Clinic</strong></p>
        `;

        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã xác thực tài khoản - BeautySmile Clinic',
            html: createEmailTemplate(title, content)
        };
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

// Gửi mail reset password 
const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        const title = "Yêu cầu đặt lại mật khẩu";
        const content = `
          <p>Xin chào,</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #1977cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px;">Đặt lại mật khẩu</a>
          </div>
          <p>Link này có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <p>Trân trọng,<br><strong>Đội ngũ BeautySmile Clinic</strong></p>
        `;

        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Yêu cầu đặt lại mật khẩu - BeautySmile Clinic',
            html: createEmailTemplate(title, content)
        };
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Password reset email error:', error);
        throw error;
    }
};

// Gửi email xác nhận lịch hẹn
const sendAppointmentConfirmationEmail = async (appointmentDetails) => {
    try {
        const { patientEmail, patientName, doctorName, appointmentDate, startTime, locationName = 'BeautySmile Clinic' } = appointmentDetails;
        const title = "Lịch hẹn đã được xác nhận";
        const content = `
          <p>Xin chào <strong>${patientName}</strong>,</p>
          <p>BeautySmile Clinic xin xác nhận bạn đã đặt cọc và đặt lịch hẹn thành công. Dưới đây là thông tin chi tiết về lịch hẹn của bạn:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1977cc;">
            <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${doctorName}</p>
            <p style="margin: 8px 0;"><strong>Ngày:</strong> ${new Date(appointmentDate).toLocaleDateString('vi-VN')}</p>
            <p style="margin: 8px 0;"><strong>Giờ:</strong> ${startTime}</p>
            <p style="margin: 8px 0;"><strong>Địa điểm:</strong> ${locationName}</p>
          </div>
          <p>Vui lòng đến trước giờ hẹn 10-15 phút để làm thủ tục. Nếu bạn cần thay đổi lịch, vui lòng liên hệ với chúng tôi.</p>
          <p>Cảm ơn bạn đã tin tưởng và lựa chọn dịch vụ của chúng tôi!</p>
          <p>Trân trọng,<br><strong>Đội ngũ BeautySmile Clinic</strong></p>
        `;

        const mailOptions = {
            from: `"BeautySmile Clinic" <${process.env.EMAIL_USER}>`,
            to: patientEmail,
            subject: 'Xác nhận Lịch hẹn tại BeautySmile Clinic',
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