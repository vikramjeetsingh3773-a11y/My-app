import { Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../config/database';
import { RedisClient } from '../config/redis';
import { AuthRequest, generateToken, generateRefreshToken } from '../middlewares/auth';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';
import { sendOTP, sendWelcomeEmail } from '../services/notification.service';

const logger = Logger.getInstance();
const redis = RedisClient.getInstance();

// Validation schemas
const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const otpSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required()
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const confirmPasswordSchema = Joi.object({
  reset_token: Joi.string().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/).required()
});

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate input
  const { error, value } = signupSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { username, email, phone, password } = value;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: { email }
  });

  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const userWithUsername = await User.findOne({
    where: { username }
  });

  if (userWithUsername) {
    throw new AppError('Username already taken', 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const userId = uuidv4();
  const user = await User.create({
    id: userId,
    username,
    email,
    phone,
    password_hash: passwordHash,
    is_verified: false,
    phone_verified: false
  });

  // Generate and send OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${userId}`, otp, 600); // 10 minutes

  await sendOTP(phone, otp);
  logger.info(`User signup: ${email} (${userId})`);

  res.status(201).json({
    success: true,
    message: 'Account created. OTP sent to phone.',
    user_id: userId
  });
});

export const verifyOTP = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate input
  const { error, value } = otpSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { user_id, otp } = value;

  // Get user
  const user = await User.findByPk(user_id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify OTP
  const storedOTP = await redis.get<string>(`otp:${user_id}`);
  if (!storedOTP || storedOTP !== otp) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  // Update user
  await user.update({
    phone_verified: true,
    is_verified: true
  });

  // Clear OTP
  await redis.delete(`otp:${user_id}`);

  // Generate tokens
  const token = generateToken(user.id, 'user');
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token
  await redis.set(`refresh:${user.id}`, refreshToken, 604800); // 7 days

  await sendWelcomeEmail(user.email, user.username);
  logger.info(`User verified: ${user.email} (${user.id})`);

  res.json({
    success: true,
    message: 'Phone verified successfully',
    token,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password } = value;

  // Find user
  const user = await User.findOne({
    where: { email }
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if user is banned
  if (user.is_banned) {
    throw new AppError('Your account has been banned', 403);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate tokens
  const token = generateToken(user.id, 'user');
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token
  await redis.set(`refresh:${user.id}`, refreshToken, 604800); // 7 days

  logger.info(`User login: ${email} (${user.id})`);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      wallet_balance: user.wallet_balance,
      avatar_url: user.avatar_url,
      total_wins: user.total_wins,
      total_earnings: user.total_earnings
    }
  });
});

export const refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = refreshTokenSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { refresh_token } = value;

  try {
    const decoded = require('jsonwebtoken').verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
    );

    const userId = decoded.userId;

    // Verify refresh token is still in Redis
    const storedToken = await redis.get<string>(`refresh:${userId}`);
    if (!storedToken || storedToken !== refresh_token) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user || user.is_banned) {
      throw new AppError('User not found or banned', 401);
    }

    // Generate new token
    const newToken = generateToken(userId, 'user');

    logger.info(`Token refreshed: ${userId}`);

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.userId) {
    await redis.delete(`refresh:${req.userId}`);
    logger.info(`User logout: ${req.userId}`);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const requestPasswordReset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email } = value;

  const user = await User.findOne({
    where: { email }
  });

  if (!user) {
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If account exists, reset link sent to email'
    });
  }

  // Generate reset token
  const resetToken = uuidv4();
  await redis.set(`reset:${resetToken}`, user.id, 1800); // 30 minutes

  // Send reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  // await sendPasswordResetEmail(email, resetLink);

  logger.info(`Password reset requested: ${email}`);

  res.json({
    success: true,
    message: 'If account exists, reset link sent to email'
  });
});

export const confirmPasswordReset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = confirmPasswordSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { reset_token, password } = value;

  // Verify reset token
  const userId = await redis.get<string>(`reset:${reset_token}`);
  if (!userId) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Get user
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Update user
  await user.update({
    password_hash: passwordHash
  });

  // Clear reset token
  await redis.delete(`reset:${reset_token}`);

  logger.info(`Password reset: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});
