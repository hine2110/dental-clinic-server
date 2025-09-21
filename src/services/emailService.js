const nodemailer = require('nodemailer');

//cau hinh email (su dung gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// ma xac thuc
const sendVerificationCode = async (email, code) => {
    try {
        const mailOptions = {
            from : process.env.EMAIL_USER,
            to: email,
            subject: 'Mã xác thực đăng ký tài khoản - Dental Clinic',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1977cc;">Xác thực tài khoản</h2>
          <p>Xin chào,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Dental Clinic. Vui lòng sử dụng mã xác thực sau:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1977cc; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>Mã này có hiệu lực trong 10 phút.</p>
          <p>Trân trọng,<br>Dental Clinic Team</p>
        </div>
    `
        };
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:' , error);
        throw error;
    }
};

// gui mail reset password 
const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Đặt lại mật khẩu - Dental Clinic',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1977cc;">Đặt lại mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link bên dưới:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #1977cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
          </div>
          <p>Link này có hiệu lực trong 1 giờ.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <p>Trân trọng,<br>Dental Clinic Team</p>
        </div>
    `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Password reset email error', error);
        throw error;
    }
};

module.exports = {
    sendVerificationCode,
    sendPasswordResetEmail
};