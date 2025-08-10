import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendVerificationEmail(email, verificationCode, userName) {
    const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
        to: email,
        subject: 'Verify Your SecureShare Sign-In',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">SecureShare - Verify Your Sign-In</h2>
            
            <p>Hello ${userName},</p>
            
            <p>Someone is trying to sign in to your SecureShare account using Google. For your security, please verify this is you by entering the following code:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
            <h1 style="font-size: 32px; color: #1f2937; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
            
            <p>If you didn't try to sign in, please ignore this email and consider changing your Google account password.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. Please do not reply to this email.
            </p>
        </div>
        `,
        text: `
        SecureShare - Verify Your Sign-In
        
        Hello ${userName},
        
        Someone is trying to sign in to your SecureShare account using Google. For your security, please verify this is you by entering the following code:
        
        ${verificationCode}
        
        This code will expire in 10 minutes.
        
        If you didn't try to sign in, please ignore this email and consider changing your Google account password.
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email);
        return { success: true };
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return { success: false, error: error.message };
    }
}

export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
