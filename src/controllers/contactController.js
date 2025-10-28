// src/controllers/contactController.js
const io = require('../services/socket').getIO();
const Contact = require("../models/Contact");
const Staff = require("../models/Staff"); 
const User = require("../models/User"); 
const StaffSchedule = require("../models/StaffSchedule"); 
const Location = require("../models/Location"); 
const { sendEmail } = require("../services/emailService"); 

// === HÀM TIỆN ÍCH MỚI (Sửa Lỗi 1 & 2) ===
/**
 * Lấy TẤT CẢ các cơ sở mà một nhân viên (user) ĐÃ TỪNG/SẼ ĐƯỢC PHÂN CÔNG.
 * Đây là logic để xác định "quyền" xem contact của nhân viên.
 */
const getStaffAssignedLocations = async (userId) => {
  const staff = await Staff.findOne({ user: userId }).select('_id');
  if (!staff) {
    return [];
  }
  // Tìm TẤT CẢ các lịch làm việc (quá khứ, hiện tại, tương lai) của nhân viên
  const schedules = await StaffSchedule.find({
    staff: staff._id 
  }).select('location');

  // Lấy ra các ID cơ sở duy nhất
  const locationIds = [...new Set(schedules.map(s => s.location.toString()))];
  return locationIds;
};

// === HÀM 1: Bệnh nhân gửi Contact (SỬA LỖI 2) ===
const handleContactSubmission = async (req, res) => {
  try {
    const { name, email, subject, message, locationId } = req.body;

    if (!name || !email || !subject || !message || !locationId) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields, including location." });
    }

    const locationExists = await Location.findById(locationId);
    if (!locationExists) {
      return res.status(400).json({ success: false, message: "Invalid location selected." });
    }

    // 1. Tạo Contact
    await Contact.create({ name, email, subject, message, location: locationId });
    
    // 2. Phát tín hiệu real-time (cho ai đang online)
    const locationRoom = `location_${locationId}`;
    io.to(locationRoom).emit('new_contact_received');
    console.log(`📢 Emitted 'new_contact_received' to room: ${locationRoom}`);

    // === SỬA LỖI LOGIC GỬI EMAIL ===
    // 3. Gửi email cho TẤT CẢ nhân viên lễ tân được phân công tại cơ sở đó
    // (Bất kể họ có đang làm việc hay không)

    // 3a. Tìm tất cả lịch làm việc (kể cả quá khứ/tương lai) tại cơ sở này
    const allSchedulesForLocation = await StaffSchedule.find({
      location: locationId
    }).select('staff');

    // 3b. Lấy danh sách nhân viên duy nhất
    const allStaffIdsAtLocation = [...new Set(allSchedulesForLocation.map(s => s.staff))];

    if (allStaffIdsAtLocation.length > 0) {
      // 3c. Lọc ra ai là 'receptionist'
      const staffDocs = await Staff.find({
        _id: { $in: allStaffIdsAtLocation },
        staffType: 'receptionist'
      }).select('user');

      const userIds = staffDocs.map(s => s.user);

      if (userIds.length > 0) {
        // 3d. Lấy email của họ
        const activeUsers = await User.find({
          _id: { $in: userIds },
          isActive: true
        }).select('email');

        const receptionistEmails = activeUsers.map(u => u.email).filter(Boolean);

        // 3e. Gửi email cho TẤT CẢ lễ tân tìm thấy
        if (receptionistEmails.length > 0) {
          const adminMailHtml = `<h2>New Contact (Location: ${locationExists.name})</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><hr><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`;
          sendEmail({
            to: receptionistEmails.join(','), // Gửi cho mọi người
            subject: `[New Contact @ ${locationExists.name}] - ${subject}`,
            html: adminMailHtml,
            title: "New Contact Inquiry"
          });
        }
      }
    }
    // === KẾT THÚC SỬA LỖI LOGIC GỬI EMAIL ===

    // 4. Gửi email xác nhận cho bệnh nhân (giữ nguyên)
    const userMailHtml = `<h2>Dear ${name},</h2><p>Thank you for contacting Beauty Smile Clinic (${locationExists.name}). We have received your request.</p><p>Our team will review your message and get back to you shortly.</p><hr><p><strong>Beauty Smile Dental Clinic</strong></p>`;
    sendEmail({
      to: email,
      subject: "Confirmation: We've received your message",
      html: userMailHtml,
      title: "Message Received"
    });

    res.status(201).json({ 
      success: true, 
      message: "Message sent successfully! Please check your email for a confirmation." 
    });

  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ success: false, message: "Server error, could not send message." });
  }
};


// === HÀM 2: Lấy danh sách Contact (SỬA LỖI 1) ===
const getAllContacts = async (req, res) => {
  try {
    // 1. Lấy TẤT CẢ ID cơ sở mà nhân viên này được phân công (Dùng hàm mới)
    const locationIds = await getStaffAssignedLocations(req.user._id); 
    
    if (locationIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalContacts: 0 }
      });
    }

    // 2. Lọc contact theo các cơ sở đó
    const query = { location: { $in: locationIds } };

    // 3. Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 4. Lấy dữ liệu
    const [contacts, totalContacts] = await Promise.all([
      Contact.find(query) 
        .sort({ status: 1, createdAt: -1 }) // Sắp xếp: Mới nhất, chưa đọc lên đầu
        .skip(skip) 
        .limit(limit) 
        .populate('repliedBy', 'fullName')
        .populate('location', 'name'),
      Contact.countDocuments(query) 
    ]);

    const totalPages = Math.ceil(totalContacts / limit);

    res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalContacts: totalContacts
      }
    });
  } catch (error) {
    console.error("Get all contacts error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching contacts." });
  }
}

// === HÀM 3: Phản hồi Contact (Không đổi) ===
const replyToContact = async (req, res) => {
  // (Nội dung hàm này không thay đổi, giữ nguyên như cũ)
  try {
    const { contactId } = req.params;
    const { replyMessage } = req.body;
    const receptionistId = req.user._id; 

    if (!replyMessage) {
      return res.status(400).json({ success: false, message: "Reply message cannot be empty." });
    }

    const contact = await Contact.findById(contactId);

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found." });
    }
    contact.replyMessage = replyMessage;
    contact.repliedBy = receptionistId;
    contact.repliedAt = new Date();
    contact.status = 'replied';
    await contact.save();

    const replyEmailHtml = `
      <h2>Dear ${contact.name},</h2>
      <p>This is a reply to your recent inquiry with the subject "<strong>${contact.subject}</strong>".</p>
      <p>Our team has sent you the following response:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1977cc;">
        <p style="margin:0;">${replyMessage.replace(/\n/g, '<br>')}</p>
      </div>
      <p>If you have any further questions, please feel free to contact us again.</p>
      <p>Sincerely,<br><strong>The Beauty Smile Clinic Team</strong></p>
    `;

    await sendEmail({
      to: contact.email,
      subject: `Re: ${contact.subject}`,
      html: replyEmailHtml,
      title: "Response to Your Inquiry"
    });

    res.status(200).json({ success: true, message: "Reply sent successfully!", data: contact });

  } catch (error) {
    console.error("Reply to contact error:", error);
    res.status(500).json({ success: false, message: "Server error while sending reply." });
  }
};

// === HÀM 4: Lấy số Contact chưa đọc (SỬA LỖI 1) ===
const getUnreadCount = async (req, res) => {
  try {
    // 1. Lấy TẤT CẢ ID cơ sở mà nhân viên này được phân công (Dùng hàm mới)
    const locationIds = await getStaffAssignedLocations(req.user._id); 

    // 2. Đếm các contact 'new' CHỈ từ các cơ sở đó
    const unreadCount = await Contact.countDocuments({ 
      status: 'new',
      location: { $in: locationIds }
    });

    res.status(200).json({
      success: true,
      data: {
        count: unreadCount
      }
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching unread count." });
  }
};

module.exports = {
  handleContactSubmission,
  getAllContacts,       
  replyToContact,
  getUnreadCount
};