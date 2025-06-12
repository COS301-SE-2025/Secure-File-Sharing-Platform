const contactService = require('../services/contactService');

exports.sendMessage = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    try {
        await contactService.sendEmail(name, email, message);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({ success: false, error: 'Failed to send message.' });
    }
};
