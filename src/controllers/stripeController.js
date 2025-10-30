const Stripe = require('stripe');
const mongoose = require('mongoose'); // <-- THÊM MỚI
const stripeConfig = require('../config/stripe');
const { 
    Appointment, 
    Patient, 
    Doctor, 
    Location, 
    DoctorSchedule // <-- THÊM MỚI
} = require('../models');
const { sendAppointmentConfirmationEmail } = require('../services/emailService');

const stripe = Stripe(stripeConfig.secretKey);

// ==========================================================
// HÀM 1: NÂNG CẤP createCheckoutSession (CỰC KỲ QUAN TRỌNG)
// ==========================================================
async function createCheckoutSession(req, res) {
    const { doctorId, locationId, date, time, reasonForVisit } = req.body || {};
    
    // 1. Kiểm tra input (giữ nguyên)
    if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    const userId = req.user._id;

    if (!doctorId || !locationId || !date || !time) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin lịch hẹn' });
    }

    const session = await mongoose.startSession();
    let newAppointment; 

    try {
        session.startTransaction();

        const patientProfile = await Patient.findOne({ user: userId }).session(session); 
        if (!patientProfile) {
            throw new Error("Không tìm thấy hồ sơ bệnh nhân. Vui lòng cập nhật hồ sơ.");
        }
        const patientId = patientProfile._id; 

        const targetDate = new Date(date); 
        const targetDateStart = new Date(new Date(targetDate).setHours(0, 0, 0, 0)); 
        const targetDateEnd = new Date(new Date(targetDate).setHours(23, 59, 59, 999)); 

        // ==========================================================
        // THAY ĐỔI LOGIC: BỎ `findOne()` KIỂM TRA XUNG ĐỘT
        // ==========================================================
        // const existingSlot = await Appointment.findOne({ ... }).session(session); 
        // if (existingSlot) { ... }
        // (XÓA BỎ HOÀN TOÀN KHỐI LỆNH `findOne` NÀY)


        // 5. KIỂM TRA LỊCH BÁC SĨ (Vẫn cần thiết)
        const doctorSchedule = await DoctorSchedule.findOne({
            doctor: doctorId,
            location: locationId,
            date: { $gte: targetDateStart, $lt: targetDateEnd }, 
            startTime: { $lte: time },
            endTime: { $gt: time },
            isAvailable: true
        }).session(session);

        if (!doctorSchedule) {
            throw new Error("Bác sĩ không có lịch làm việc trong giờ này hoặc giờ hẹn không còn khả dụng.");
        }

        // 6. TẠO LỊCH HẸN "GIỮ CHỖ" (Giữ nguyên)
        // Chúng ta CỨ TẠO. Nếu trùng, CSDL sẽ ném lỗi E11000
        const appointmentCount = await Appointment.estimatedDocumentCount();
        const appointmentId = `APT${String(appointmentCount + 1).padStart(6, '0')}`;
        
        const startTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
        const endTimeMinutes = startTimeMinutes + 60;
        const endHour = Math.floor(endTimeMinutes / 60);
        const endMinute = endTimeMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        const appointmentToCreate = new Appointment({
            appointmentId,
            doctor: doctorId,
            patient: patientId,
            location: locationId,
            schedule: doctorSchedule._id,
            appointmentDate: targetDateStart,
            startTime: time,
            status: "pending-payment",
            paymentStatus: "pending", 
            bookingType: 'online'
        });

        const createdAppointments = await Appointment.create([appointmentToCreate], { session: session });
        newAppointment = createdAppointments[0];

        // 7. COMMIT TRANSACTION (Giữ nguyên)
        await session.commitTransaction();

    } catch (error) {
        // 8. ROLLBACK TRANSACTION
        await session.abortTransaction();
        if (error.code === 11000) {
            // Lỗi này CHỈ xảy ra khi Unique Index (Hành động 1) phát hiện trùng lặp
            console.error("Lỗi Race Condition (E11000):", error.message);
            return res.status(409).json({ // 409 Conflict
                success: false,
                message: "Rất tiếc, giờ hẹn này vừa có người khác đặt. Vui lòng chọn giờ khác."
            });
        }
        
        // Các lỗi khác (ví dụ: "Không tìm thấy hồ sơ bệnh nhân")
        console.error("Lỗi khi tạo lịch hẹn (Transaction Rollback):", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Lỗi khi đặt lịch hẹn." 
        });

    } finally {
        session.endSession();
    }
    // ==========================================================
    // KẾT THÚC GIỮ CHỖ
    // ==========================================================


    // 11. TẠO STRIPE SESSION (Sau khi đã giữ chỗ thành công)
    try {
        const amount = 35000;
        const currency = (stripeConfig.currency || 'vnd').toLowerCase();
        const unitAmount = currency === 'vnd' ? Math.round(amount) : Math.round(amount * 100);

        const stripeSession = await stripe.checkout.sessions.create({
            customer_email: req.user.email,
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency,
                    product_data: { name: `Deposit for appointment on ${date} at ${time}` },
                    unit_amount: unitAmount,
                },
                quantity: 1,
            }],
            success_url: `${stripeConfig.frontendUrl}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${stripeConfig.frontendUrl}/payment?status=cancel`,
            metadata: {
                // GHI CHÚ: Chúng ta chỉ cần gửi ID của lịch hẹn đã tạo
                appointmentId: newAppointment._id.toString(),
                patientUserId: userId.toString(), // Gửi ID của User để tiện tra cứu
            },
        });
        
        // 12. Trả link thanh toán cho FE
        return res.status(200).json({ success: true, url: stripeSession.url });

    } catch (error) {
        console.error('Lỗi tạo Stripe session (sau khi đã tạo lịch pending):', error);
        // Trường hợp này hiếm gặp: Đã tạo lịch pending nhưng Stripe sập
        // Lịch hẹn "ma" này sẽ được dọn dẹp bởi TTL Index (Hành động 3)
        return res.status(500).json({ 
            success: false, 
            message: 'Đã giữ chỗ thành công, nhưng không tạo được phiên thanh toán. Vui lòng thử lại sau.' 
        });
    }
}


// ==========================================================
// HÀM 2: NÂNG CẤP WEBHOOK (CỰC KỲ QUAN TRỌNG)
// ==========================================================
async function webhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, stripeConfig.webhookSecret);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            console.log("✅ Webhook 'checkout.session.completed' received.");
            const session = event.data.object;
            
            // 1. LẤY APPOINTMENT ID TỪ METADATA
            // Đây là ID của lịch hẹn "pending-payment" chúng ta đã tạo
            const { appointmentId } = session.metadata || {}; 

            if (!appointmentId) {
                console.error("❌ Webhook Lỗi: Không tìm thấy appointmentId trong metadata.");
                // Trả về 200 cho Stripe biết đã nhận, nhưng log lỗi
                return res.status(200).json({ error: "Missing metadata, but acknowledged." });
            }

            // 2. GHI CHÚ: KHÔNG TẠO MỚI (NO CREATE)
            // Thay vào đó, TÌM VÀ CẬP NHẬT (Find And Update)
            const updatedAppointment = await Appointment.findOneAndUpdate(
                { 
                    _id: appointmentId,
                    status: 'pending-payment' // Chỉ cập nhật nếu nó đang ở trạng thái chờ
                }, 
                {
                    $set: {
                        status: 'confirmed',      // <-- GHI CHÚ: Đổi thành 'confirmed'
                        paymentStatus: 'paid'     // <-- GHI CHÚ: Đổi thành 'paid'
                    }
                },
                { new: true } // Trả về bản ghi đã cập nhật
            );

            // 3. XỬ LÝ KẾT QUẢ CẬP NHẬT
            if (!updatedAppointment) {
                // Lỗi này xảy ra nếu:
                // 1. Webhook bị Stripe gọi 2 lần (lần 2 sẽ thất bại vì status không còn là 'pending-payment')
                // 2. ID không khớp (lỗi nghiêm trọng)
                console.warn(`ℹ️ Webhook: Không tìm thấy lịch hẹn ${appointmentId} ở trạng thái 'pending-payment' để cập nhật. Có thể đã được xử lý (duplicate webhook).`);
            } else {
                console.log(`🗓️ Appointment ${updatedAppointment.appointmentId} ĐÃ CẬP NHẬT thành 'confirmed' qua webhook.`);

                // === GỬI EMAIL XÁC NHẬN (Logic này của bạn đã tốt) ===
                console.log("📧 Attempting to send confirmation email...");
                try {
                    // Lấy lại các thông tin cần thiết từ lịch hẹn đã cập nhật
                    const patientProfile = await Patient.findById(updatedAppointment.patient).populate('user', 'email');
                    const doctorProfile = await Doctor.findById(updatedAppointment.doctor).populate('user', 'fullName');
                    const locationProfile = await Location.findById(updatedAppointment.location);

                    // Sửa lại logic lấy tên (từ code cũ của bạn, `patientProfile.basicInfo` có thể không có trong populate)
                    const patientUser = await Patient.findById(updatedAppointment.patient).populate('basicInfo.fullName'); // Giả định populate
                    const patientName = (patientUser && patientUser.basicInfo) ? patientUser.basicInfo.fullName : 'Quý khách'; // Tên dự phòng

                    if (patientProfile && patientProfile.user && doctorProfile && doctorProfile.user) {
                        const emailDetails = {
                            patientEmail: patientProfile.user.email,
                            patientName: patientName,
                            doctorName: doctorProfile.user.fullName,
                            appointmentDate: updatedAppointment.appointmentDate,
                            startTime: updatedAppointment.startTime,
                            locationName: locationProfile.name,
                        };
                        console.log("✉️ Sending email with details:", emailDetails);
                        await sendAppointmentConfirmationEmail(emailDetails);
                    } else {
                        console.warn("⚠️ Không thể gửi email: Thiếu thông tin Patient, Doctor hoặc Location.");
                    }
                } catch (emailError) {
                    console.error("❌ Webhook: Lỗi khi gửi email xác nhận.", emailError);
                }
                // ===========================
            }
        }
    } catch (err) {
        console.error('❌ Lỗi xử lý Stripe webhook:', err);
    }

    // Luôn trả về 200 cho Stripe để xác nhận đã nhận
    res.json({ received: true });
}

async function retryCheckoutSession(req, res) {
    const { appointmentId } = req.body;
    const userId = req.user._id;

    if (!appointmentId) {
        return res.status(400).json({ success: false, message: 'Thiếu Appointment ID' });
    }

    try {
        // 1. Tìm Patient ID (giống như hàm create)
        const patientProfile = await Patient.findOne({ user: userId });
        if (!patientProfile) {
            throw new Error("Không tìm thấy hồ sơ bệnh nhân.");
        }

        // 2. Tìm lịch hẹn
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            patient: patientProfile._id
        });

        // 3. Xác thực lịch hẹn
        if (!appointment) {
            throw new Error("Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc về bạn.");
        }
        if (appointment.status !== 'pending-payment') {
            throw new Error("Lịch hẹn này không ở trạng thái chờ thanh toán.");
        }

        // 4. Kiểm tra hết hạn (dựa trên TTL Index 15 phút = 900 giây)
        const paymentExpiresAt = new Date(appointment.createdAt.getTime() + 900 * 1000);
        if (new Date() > paymentExpiresAt) {
            // Lịch hẹn này sẽ sớm bị TTL Index xóa, hoặc đã bị xóa.
            // Ngăn người dùng thanh toán cho lịch hẹn đã hết hạn.
            throw new Error("Lịch hẹn này đã hết hạn chờ thanh toán. Vui lòng đặt lại lịch mới.");
        }

        // 5. Nếu hợp lệ -> Tạo phiên Stripe MỚI
        const amount = 35000;
        const currency = (stripeConfig.currency || 'vnd').toLowerCase();
        const unitAmount = currency === 'vnd' ? Math.round(amount) : Math.round(amount * 100);

        // Lấy thông tin ngày giờ từ lịch hẹn đã lưu
        const appointmentDateStr = new Date(appointment.appointmentDate).toISOString().split('T')[0];
        
        const stripeSession = await stripe.checkout.sessions.create({
            customer_email: req.user.email,
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency,
                    product_data: { name: `Deposit for appointment on ${appointmentDateStr} at ${appointment.startTime}` },
                    unit_amount: unitAmount,
                },
                quantity: 1,
            }],
            success_url: `${stripeConfig.frontendUrl}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${stripeConfig.frontendUrl}/payment?status=cancel`,
            metadata: {
                // Gửi CÙNG MỘT appointmentId
                appointmentId: appointment._id.toString(),
                patientUserId: userId.toString(),
            },
        });
        
        // 6. Trả link thanh toán MỚI cho FE
        return res.status(200).json({ success: true, url: stripeSession.url });

    } catch (error) {
        console.error('Lỗi khi thử thanh toán lại:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Lỗi khi tạo phiên thanh toán." 
        });
    }
}

// Hàm này không thay đổi
async function confirmSession(req, res) {
    res.status(200).json({ success: true, message: "Session confirmed (main logic is handled by webhook)." });
}

module.exports = { 
    createCheckoutSession, 
    webhook, 
    confirmSession, 
    retryCheckoutSession 
};