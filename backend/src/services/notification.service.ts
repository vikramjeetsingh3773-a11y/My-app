import { Logger } from '../utils/logger';
import AWS from 'aws-sdk';

const logger = Logger.getInstance();

// Storage Service (S3)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export async function uploadImageToS3(base64Data: string, path: string): Promise<string> {
  try {
    // Remove data URI prefix if present
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');

    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'battlemint-uploads',
      Key: `${path}-${Date.now()}.jpg`,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    };

    const result = await s3.upload(params).promise();
    logger.info(`Image uploaded to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    logger.error('Error uploading image to S3:', error);
    throw new Error('Failed to upload image');
  }
}

// Notification Service
export async function sendOTP(phone: string, otp: string): Promise<void> {
  try {
    // Using Twilio for OTP
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    await client.messages.create({
      body: `Your BattleMint OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    logger.info(`OTP sent to ${phone}`);
  } catch (error) {
    logger.error('Error sending OTP:', error);
  }
}

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  try {
    // Using Nodemailer for email
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Welcome to BattleMint!',
      html: `
        <h2>Welcome to BattleMint, ${username}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Start competing in tournaments and win prizes today!</p>
      `
    });

    logger.info(`Welcome email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending welcome email:', error);
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset Your BattleMint Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background: #7c3aed; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This link expires in 30 minutes.</p>
      `
    });

    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending password reset email:', error);
  }
}

// Firebase Push Notification Service
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    // This would integrate with Firebase Cloud Messaging
    // For now, we'll log it
    logger.info(`Push notification sent: ${title} to ${tokens.length} devices`);
  } catch (error) {
    logger.error('Error sending push notification:', error);
  }
}
