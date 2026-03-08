import { Response } from 'express';
import Joi from 'joi';
import { User, Transaction, Withdrawal } from '../config/database';
import { RedisClient } from '../config/redis';
import { AuthRequest } from '../middlewares/auth';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';
import { uploadImageToS3 } from '../services/storage.service';

const logger = Logger.getInstance();
const redis = RedisClient.getInstance();

const depositSchema = Joi.object({
  amount: Joi.number().min(100).max(100000).required(),
  payment_screenshot: Joi.string().required()
});

const withdrawSchema = Joi.object({
  amount: Joi.number().min(100).required(),
  upi_id: Joi.string().pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/).required()
});

export const getBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get locked amount from pending transactions
  const pendingTransactions = await Transaction.findAll({
    where: {
      user_id: req.userId,
      type: 'entry_fee',
      status: 'pending'
    }
  });

  const lockedAmount = pendingTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

  res.json({
    success: true,
    balance: user.wallet_balance,
    locked_amount: lockedAmount,
    available: user.wallet_balance - lockedAmount
  });
});

export const requestDeposit = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { error, value } = depositSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { amount, payment_screenshot } = value;

  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Upload screenshot to S3
  const screenshotUrl = await uploadImageToS3(payment_screenshot, `deposits/${req.userId}`);

  // Create transaction
  const transaction = await Transaction.create({
    user_id: req.userId,
    amount,
    type: 'deposit',
    status: 'pending',
    notes: `Deposit of ₹${amount} - Awaiting admin verification`
  });

  logger.info(`Deposit requested: ${user.email} - ₹${amount}`);

  res.status(201).json({
    success: true,
    message: 'Deposit submitted for verification',
    transaction_id: transaction.id,
    status: 'pending'
  });
});

export const getTransactionHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const type = req.query.type as string;
  const offset = (page - 1) * limit;

  const where: any = { user_id: req.userId };
  if (type) where.type = type;

  const { count, rows: transactions } = await Transaction.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({
    success: true,
    transactions: transactions.map((t: any) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      status: t.status,
      created_at: t.created_at
    })),
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    }
  });
});

export const requestWithdrawal = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { error, value } = withdrawSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { amount, upi_id } = value;

  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get settings
  const minWithdrawal = await redis.get('setting:min_withdrawal') || 100;
  const maxWithdrawal = await redis.get('setting:max_withdrawal') || 50000;

  if (amount < minWithdrawal || amount > maxWithdrawal) {
    throw new AppError(
      `Withdrawal amount must be between ₹${minWithdrawal} and ₹${maxWithdrawal}`,
      400
    );
  }

  if (user.wallet_balance < amount) {
    throw new AppError('Insufficient wallet balance', 400);
  }

  // Create withdrawal request
  const withdrawal = await Withdrawal.create({
    user_id: req.userId,
    amount,
    upi_id,
    status: 'pending'
  });

  logger.info(`Withdrawal requested: ${user.email} - ₹${amount} to ${upi_id}`);

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted',
    withdrawal_id: withdrawal.id,
    status: 'pending'
  });
});

export const getWithdrawalHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const { count, rows: withdrawals } = await Withdrawal.findAndCountAll({
    where: { user_id: req.userId },
    attributes: ['id', 'amount', 'upi_id', 'status', 'created_at'],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({
    success: true,
    withdrawals,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    }
  });
});
