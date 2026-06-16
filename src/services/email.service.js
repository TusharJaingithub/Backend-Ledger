require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = "🎉 Welcome to Backend Ledger!";

  const text = `
Hello ${name},

Welcome to Backend Ledger! 🚀

We’re thrilled to have you join our community. Your account has been successfully created, and you’re now ready to explore all the features we offer.

With Backend Ledger, you can securely manage your transactions, track your records, and stay organized with ease.

If you have any questions or need support, feel free to reach out anytime.

We’re excited to be part of your journey!

Best regards,
The Backend Ledger Team
    `;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Welcome to Backend Ledger, ${name}! 🎉</h2>
        
        <p>We’re excited to have you on board. Your account has been successfully created and is ready to use.</p>
        
        <p>
            With <strong>Backend Ledger</strong>, you can:
        </p>
        
        <ul>
            <li>📊 Track your financial records easily</li>
            <li>🔒 Keep your data secure</li>
            <li>⚡ Manage transactions efficiently</li>
        </ul>

        <p>
            Start exploring and make the most out of your experience.
        </p>

        <p>
            If you need any help, our support team is always here for you.
        </p>

        <br>

        <p>Best regards,</p>
        <p><strong>The Backend Ledger Team</strong></p>
    </div>
    `;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "💸 Transaction Successful!";

  const text = `
            Hello ${name},

            Your transaction has been completed successfully.

            Transaction Details:
            Amount: ₹${amount}
            Transferred To: ${toAccount}

            Thank you for using Backend Ledger. Your trust means a lot to us.

            If you did not perform this transaction, please contact our support team immediately.

            Best regards,
            The Backend Ledger Team
                `;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Transaction Successful 💸</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>Your transaction has been successfully processed.</p>

        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Transferred To:</strong> ${toAccount}</p>
        </div>

        <p>Thank you for choosing <strong>Backend Ledger</strong>.</p>

        <p style="color: red;">
            If you did not authorize this transaction, please contact support immediately.
        </p>

        <br>

        <p>Best regards,</p>
        <p><strong>The Backend Ledger Team</strong></p>
    </div>
    `;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
    const subject = "❌ Transaction Failed";

    const text = `
Hello ${name},

We regret to inform you that your transaction could not be completed.

Transaction Details:
Amount: ₹${amount}
Recipient Account: ${toAccount}

This may have happened due to:
- Insufficient balance
- Invalid account details
- Temporary server issue

Please review the details and try again.

If the problem continues, feel free to contact our support team.

Best regards,
The Backend Ledger Team
    `;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #E53935;">Transaction Failed ❌</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>Unfortunately, your recent transaction could not be processed.</p>

        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Recipient Account:</strong> ${toAccount}</p>
        </div>

        <p><strong>Possible reasons:</strong></p>
        <ul>
            <li>Insufficient balance</li>
            <li>Invalid account details</li>
            <li>Temporary server issue</li>
        </ul>

        <p>Please verify your details and try again.</p>

        <p>If this issue persists, contact our support team for assistance.</p>

        <br>

        <p>Best regards,</p>
        <p><strong>The Backend Ledger Team</strong></p>
    </div>
    `;

    await sendEmail(userEmail, subject, text, html);
}

module.exports = { 
  sendRegistrationEmail ,
  sendTransactionEmail,
  sendTransactionFailureEmail
};
