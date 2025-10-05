const Stripe = require('stripe');
const stripeConfig = require('../config/stripe');
const { Appointment, Patient, Doctor } = require('../models');
const { sendAppointmentConfirmationEmail } = require('../services/emailService');

const stripe = Stripe(stripeConfig.secretKey);

// ... hàm createCheckoutSession không thay đổi ...
async function createCheckoutSession(req, res) {
    try {
        const { doctorId, date, time, reasonForVisit } = req.body || {};
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }
        if (!doctorId || !date || !time) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin lịch hẹn' });
        }
        const amount = 35000;
        const currency = (stripeConfig.currency || 'vnd').toLowerCase();
        const unitAmount = currency === 'vnd' ? Math.round(amount) : Math.round(amount * 100);

        const session = await stripe.checkout.sessions.create({
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
                doctorId,
                date,
                time,
                reasonForVisit: reasonForVisit || '',
                patientId: req.user._id.toString(),
            },
        });
        return res.status(200).json({ success: true, url: session.url });
    } catch (error) {
        console.error('Create Stripe session error:', error);
        return res.status(500).json({ success: false, message: 'Không tạo được phiên thanh toán' });
    }
}


// POST /api/stripe/webhook
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
            const { doctorId, date, time, reasonForVisit, patientId } = session.metadata || {}; // patientId ở đây là User ID

            const existingAppointment = await Appointment.findOne({
                patient: patientId, doctor: doctorId, appointmentDate: new Date(date), startTime: time
            });

            if (!existingAppointment) {
                const appointmentId = `APT${Date.now()}${Math.random().toString(36).slice(-4)}`;
                const newAppointment = await Appointment.create({
                    appointmentId,
                    doctor: doctorId,
                    patient: patientId,
                    appointmentDate: new Date(date),
                    startTime: time,
                    reasonForVisit,
                    paymentStatus: 'paid',
                    status: 'confirmed',
                });
                console.log(`🗓️ Appointment ${appointmentId} created successfully via webhook.`);

                // === GỬI EMAIL XÁC NHẬN ===
                console.log("📧 Attempting to send confirmation email...");
                try {
                    // SỬA LỖI: Dùng findOne({ user: patientId }) thay vì findById
                    const patientProfile = await Patient.findOne({ user: patientId }).populate('user', 'email');
                    const doctorProfile = await Doctor.findById(doctorId).populate('user', 'fullName');

                    console.log("🔍 Fetched Patient Profile:", patientProfile ? 'Found' : 'Not Found');
                    console.log("🔍 Fetched Doctor Profile:", doctorProfile ? 'Found' : 'Not Found');
                    
                    if (patientProfile && patientProfile.user && doctorProfile && doctorProfile.user) {
                        const emailDetails = {
                            patientEmail: patientProfile.user.email,
                            patientName: patientProfile.basicInfo.fullName,
                            doctorName: doctorProfile.user.fullName,
                            appointmentDate: newAppointment.appointmentDate,
                            startTime: newAppointment.startTime,
                        };
                        console.log("✉️ Sending email with details:", emailDetails);
                        await sendAppointmentConfirmationEmail(emailDetails);
                    } else {
                        console.warn("⚠️ Could not send email: Patient or Doctor details are missing.");
                    }
                } catch (emailError) {
                    console.error("❌ Webhook: Failed to send confirmation email.", emailError);
                }
                // ===========================
            } else {
                 console.log("ℹ️ Appointment already exists, skipping creation.");
            }
        }
    } catch (err) {
        console.error('❌ Stripe webhook handling error:', err);
    }

    res.json({ received: true });
}

// POST /api/stripe/confirm-session
async function confirmSession(req, res) {
    // Logic chính đã được xử lý bởi webhook, hàm này chỉ để xác nhận nhanh cho client.
    res.status(200).json({ success: true, message: "Session confirmed (main logic is handled by webhook)." });
}

module.exports = { createCheckoutSession, webhook, confirmSession };

