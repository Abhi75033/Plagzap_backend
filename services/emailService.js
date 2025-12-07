/**
 * EMAIL SERVICE
 * Handles sending beautiful HTML emails for various events
 */

// Try to load nodemailer, but don't crash if not installed
let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    console.warn('⚠️ Nodemailer not installed. Email features disabled. Run: npm install nodemailer');
}

// Create transporter with SMTP settings
let transporter = null;

const initTransporter = () => {
    if (transporter) return transporter;

    // If nodemailer is not installed, return null
    if (!nodemailer) {
        return null;
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('✅ Email service initialized');
    } else {
        console.warn('⚠️ SMTP credentials not configured. Email service disabled.');
    }
    return transporter;
};

// Base email template with beautiful styling
const getBaseTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f1a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">
                                ⚡ PlagZap
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                                AI-Powered Plagiarism Detection
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: rgba(0,0,0,0.2); padding: 25px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
                            <p style="margin: 0 0 10px 0; color: #888; font-size: 13px;">
                                © ${new Date().getFullYear()} PlagZap. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                Need help? Contact us at <a href="mailto:abhishekyadav1112.21@gmail.com" style="color: #667eea;">abhishekyadav1112.21@gmail.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

// Welcome Email Template
const getWelcomeEmailTemplate = (userName) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            Welcome to PlagZap, ${userName}! 🎉
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Thank you for joining PlagZap! We're excited to have you on board.
        </p>
        <div style="background: rgba(102, 126, 234, 0.1); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 16px;">What you can do now:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #b0b0b0; font-size: 14px; line-height: 1.8;">
                <li>Check your content for plagiarism</li>
                <li>Detect AI-generated text</li>
                <li>Humanize your content to make it unique</li>
                <li>Download detailed reports</li>
            </ul>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/analyzer" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Start Analyzing Now →
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Welcome to PlagZap!');
};

// Subscription Granted Email
const getSubscriptionGrantedTemplate = (userName, tier, expiry) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            🎁 Premium Subscription Activated!
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Great news! Your premium subscription has been activated by our admin team.
        </p>
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); padding: 25px; border-radius: 12px; margin: 25px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="color: #888; font-size: 14px; padding-bottom: 10px;">Plan:</td>
                    <td style="color: #10b981; font-size: 18px; font-weight: 600; text-align: right; text-transform: capitalize;">${tier}</td>
                </tr>
                <tr>
                    <td style="color: #888; font-size: 14px; padding-top: 10px;">Valid Until:</td>
                    <td style="color: #ffffff; font-size: 16px; text-align: right;">${new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                </tr>
            </table>
        </div>
        <p style="margin: 20px 0; color: #b0b0b0; font-size: 14px; line-height: 1.6;">
            Enjoy unlimited access to all premium features including AI detection, content humanizer, and detailed reports!
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Go to Dashboard →
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Activated - PlagZap');
};

// Subscription Paused Email
const getSubscriptionPausedTemplate = (userName) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            ⏸️ Your Subscription is Paused
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Your PlagZap subscription has been temporarily paused. Premium features are currently unavailable.
        </p>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 20px; border-radius: 12px; margin: 25px 0;">
            <p style="margin: 0; color: #f59e0b; font-size: 14px;">
                <strong>What this means:</strong><br><br>
                • Premium features are temporarily disabled<br>
                • Your subscription time is preserved<br>
                • Contact support to resume your subscription
            </p>
        </div>
        <p style="margin: 20px 0; color: #888; font-size: 14px;">
            If you believe this was done in error, please contact us immediately.
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:abhishekyadav1112.21@gmail.com" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Contact Support
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Paused - PlagZap');
};

// Subscription Suspended Email
const getSubscriptionSuspendedTemplate = (userName) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            🚫 Your Subscription is Suspended
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Your PlagZap subscription has been suspended. All premium features have been disabled.
        </p>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 20px; border-radius: 12px; margin: 25px 0;">
            <p style="margin: 0; color: #ef4444; font-size: 14px;">
                <strong>Important:</strong><br><br>
                Your account has been suspended. Please contact our support team to resolve this issue and restore access to your premium features.
            </p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:abhishekyadav1112.21@gmail.com" 
               style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Contact Support Immediately
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Suspended - PlagZap');
};

// Subscription Resumed Email
const getSubscriptionResumedTemplate = (userName, tier) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            ✅ Your Subscription is Active Again!
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Great news! Your PlagZap subscription has been resumed. All premium features are now available again.
        </p>
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; color: #10b981; font-size: 18px; font-weight: 600;">
                🎉 Your ${tier} plan is back!
            </p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/analyzer" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Start Analyzing →
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Resumed - PlagZap');
};

// Promotional Email Template
const getPromotionalEmailTemplate = (userName, subject, message, ctaText, ctaUrl, couponCode = null) => {
    const couponSection = couponCode ? `
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%); border: 2px dashed #8b5cf6; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #888; font-size: 14px;">Use coupon code:</p>
            <p style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700; letter-spacing: 3px;">${couponCode}</p>
        </div>
    ` : '';

    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            ${subject}
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            ${message}
        </p>
        ${couponSection}
        <div style="text-align: center; margin-top: 30px;">
            <a href="${ctaUrl || process.env.CLIENT_URL || 'http://localhost:5173'}/pricing" 
               style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ${ctaText || 'Claim Offer Now'} →
            </a>
        </div>
    `;
    return getBaseTemplate(content, subject);
};

// Send email function
const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transport = initTransporter();
        if (!transport) {
            console.log('📧 Email would be sent to:', to, 'Subject:', subject);
            return { success: false, message: 'Email service not configured' };
        }

        const info = await transport.sendMail({
            from: `"PlagZap" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html: htmlContent,
        });

        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return { success: false, error: error.message };
    }
};

// Export functions
module.exports = {
    sendWelcomeEmail: async (email, userName) => {
        const html = getWelcomeEmailTemplate(userName);
        return sendEmail(email, '🎉 Welcome to PlagZap!', html);
    },

    sendSubscriptionGrantedEmail: async (email, userName, tier, expiry) => {
        const html = getSubscriptionGrantedTemplate(userName, tier, expiry);
        return sendEmail(email, '🎁 Your Premium Subscription is Active!', html);
    },

    sendSubscriptionPausedEmail: async (email, userName) => {
        const html = getSubscriptionPausedTemplate(userName);
        return sendEmail(email, '⏸️ Your Subscription has been Paused', html);
    },

    sendSubscriptionSuspendedEmail: async (email, userName) => {
        const html = getSubscriptionSuspendedTemplate(userName);
        return sendEmail(email, '🚫 Your Subscription has been Suspended', html);
    },

    sendSubscriptionResumedEmail: async (email, userName, tier) => {
        const html = getSubscriptionResumedTemplate(userName, tier);
        return sendEmail(email, '✅ Your Subscription is Active Again!', html);
    },

    sendPromotionalEmail: async (email, userName, subject, message, ctaText, ctaUrl, couponCode) => {
        const html = getPromotionalEmailTemplate(userName, subject, message, ctaText, ctaUrl, couponCode);
        return sendEmail(email, subject, html);
    },

    // Bulk send promotional emails
    sendBulkPromotionalEmail: async (users, subject, message, ctaText, ctaUrl, couponCode) => {
        const results = [];
        for (const user of users) {
            const result = await module.exports.sendPromotionalEmail(
                user.email,
                user.name,
                subject,
                message,
                ctaText,
                ctaUrl,
                couponCode
            );
            results.push({ email: user.email, ...result });
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return results;
    }
};
