import { Response } from 'express';
import Joi from 'joi';
import { User, Participant, Tournament } from '../config/database';
import { RedisClient } from '../config/redis';
import { AuthRequest } from '../middlewares/auth';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';
import { uploadImageToS3 } from '../services/storage.service';

const logger = Logger.getInstance();
const redis = RedisClient.getInstance();

const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  avatar: Joi.string().optional()
});

const connectGamingIdSchema = Joi.object({
  freefire_uid: Joi.string().required()
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  // Try to get from cache first
  let user = await redis.get(`user:${req.userId}`);

  if (!user) {
    user = await User.findByPk(req.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Cache for 10 minutes
    await redis.set(`user:${req.userId}`, user.toJSON(), 600);
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      freefire_uid: user.freefire_uid,
      wallet_balance: user.wallet_balance,
      total_wins: user.total_wins,
      total_earnings: user.total_earnings,
      rank: user.rank,
      avatar_url: user.avatar_url,
      phone_verified: user.phone_verified,
      is_verified: user.is_verified,
      created_at: user.created_at
    }
  });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if new username is available
  if (value.username && value.username !== user.username) {
    const existingUser = await User.findOne({
      where: { username: value.username }
    });
    if (existingUser) {
      throw new AppError('Username already taken', 400);
    }
  }

  const updateData: any = {};

  if (value.username) {
    updateData.username = value.username;
  }

  if (value.avatar) {
    // Upload avatar to S3
    const avatarUrl = await uploadImageToS3(value.avatar, `avatars/${req.userId}`);
    updateData.avatar_url = avatarUrl;
  }

  await user.update(updateData);

  // Invalidate cache
  await redis.delete(`user:${req.userId}`);

  logger.info(`Profile updated: ${user.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url
    }
  });
});

export const connectGamingId = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { error, value } = connectGamingIdSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { freefire_uid } = value;

  // Check if UID is already used by another account
  const existingUser = await User.findOne({
    where: { freefire_uid }
  });

  if (existingUser && existingUser.id !== req.userId) {
    throw new AppError('Free Fire UID already connected to another account', 400);
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.update({
    freefire_uid
  });

  // Invalidate cache
  await redis.delete(`user:${req.userId}`);

  logger.info(`Gaming ID connected: ${user.email} - ${freefire_uid}`);

  res.json({
    success: true,
    message: 'Free Fire UID connected successfully',
    freefire_uid
  });
});

export const getMatchHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const { count, rows: participants } = await Participant.findAndCountAll({
    where: { user_id: req.userId, status: 'completed' },
    include: [
      {
        model: Tournament,
        attributes: ['id', 'name', 'game_mode', 'status']
      }
    ],
    order: [['updated_at', 'DESC']],
    limit,
    offset
  });

  const matches = participants.map((p: any) => ({
    tournament_id: p.tournament_id,
    tournament_name: p.Tournament?.name,
    game_mode: p.Tournament?.game_mode,
    placement: p.placement,
    prize_won: p.prize_won,
    completed_at: p.updated_at
  }));

  res.json({
    success: true,
    matches,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    }
  });
});

export const getLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Try to get from cache
  let leaderboard = await redis.get(`leaderboard:${page}`);

  if (!leaderboard) {
    const users = await User.findAll({
      where: {
        is_banned: false,
        is_verified: true
      },
      attributes: ['id', 'username', 'avatar_url', 'total_wins', 'total_earnings', 'rank'],
      order: [['total_earnings', 'DESC']],
      limit,
      offset
    });

    leaderboard = users.map((user, index) => ({
      rank: offset + index + 1,
      username: user.username,
      avatar_url: user.avatar_url,
      wins: user.total_wins,
      earnings: user.total_earnings
    }));

    // Cache for 5 minutes
    await redis.set(`leaderboard:${page}`, leaderboard, 300);
  }

  res.json({
    success: true,
    leaderboard
  });
});

export const getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get tournament stats
  const tournaments = await Participant.findAll({
    where: { user_id: req.userId }
  });

  const completedMatches = tournaments.filter((t: any) => t.status === 'completed').length;
  const joinedMatches = tournaments.length;
  const successRate = joinedMatches > 0 ? ((completedMatches / joinedMatches) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    stats: {
      username: user.username,
      total_tournaments_joined: joinedMatches,
      tournaments_completed: completedMatches,
      total_wins: user.total_wins,
      total_earnings: user.total_earnings,
      success_rate: successRate,
      average_earnings: completedMatches > 0 ? (user.total_earnings / completedMatches).toFixed(2) : 0,
      wallet_balance: user.wallet_balance
    }
  });
});
