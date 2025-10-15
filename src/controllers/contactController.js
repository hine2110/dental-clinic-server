const Contact = require("../models/Contact");
const Staff = require("../models/Staff"); 
const { sendEmail } = require("../services/emailService"); 

const handleContactSubmission = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    await Contact.create({ name, email, subject, message });
    const receptionists = await Staff.find({ staffType: 'receptionist', isActive: true })
                                     .populate('user', 'email');
    const receptionistEmails = receptionists.map(staff => staff.user?.email).filter(Boolean);
    if (receptionistEmails.length > 0) {
      const adminMailHtml = `<h2>New Contact Form Submission</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><hr><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`;
      sendEmail({
        to: receptionistEmails.join(','),
        subject: `[New Contact] - ${subject}`,
        html: adminMailHtml,
        title: "New Contact Inquiry"
      });
    }
    const userMailHtml = `<h2>Dear ${name},</h2><p>Thank you for contacting Beauty Smile Clinic. We have received your request.</p><p>Our team will review your message and get back to you shortly.</p><hr><p><strong>Beauty Smile Dental Clinic</strong></p>`;
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

const getAllContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [contacts, totalContacts] = await Promise.all([
      Contact.find()
        .sort({ status: 1, createdAt: 1 })
        .skip(skip) 
        .limit(limit) 
        .populate('repliedBy', 'fullName'),
      Contact.countDocuments() 
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

const replyToContact = async (req, res) => {
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

module.exports = {
  handleContactSubmission,
  getAllContacts,       
  replyToContact    
};