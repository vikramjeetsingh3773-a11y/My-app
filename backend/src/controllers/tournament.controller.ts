import { Response } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';
import { User, Tournament, Participant, Transaction } from '../config/database';
import { RedisClient } from '../config/redis';
import { AuthRequest } from '../middlewares/auth';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';
import { uploadImageToS3 } from '../services/storage.service';
import { Database } from '../config/database';

const logger = Logger.getInstance();
const redis = RedisClient.getInstance();
const db = Database.getInstance();

const getTournamentsSchema = Joi.object({
  game_mode: Joi.string().optional(),
  status: Joi.string().optional(),
  page: Joi.number().default(1),
  limit: Joi.number().default(10)
});

const joinTournamentSchema = Joi.object({
  tournament_id: Joi.string().uuid().required()
});

const submitResultSchema = Joi.object({
  placement: Joi.number().min(1).required(),
  screenshot: Joi.string().required()
});

export const getTournaments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = getTournamentsSchema.validate(req.query);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { game_mode, status, page, limit } = value;
  const offset = (page - 1) * limit;

  const where: any = {};
  if (game_mode) where.game_mode = game_mode;
  if (status) where.status = status;
  else where.status = { [Op.in]: ['upcoming', 'live'] };

  // Try to get from cache
  const cacheKey = `tournaments:${JSON.stringify({ game_mode, status, page, limit })}`;
  let result = await redis.get(cacheKey);

  if (!result) {
    const { count, rows: tournaments } = await Tournament.findAndCountAll({
      where,
      attributes: [
        'id', 'name', 'game_mode', 'entry_fee', 'prize_pool',
        'max_players', 'current_players', 'start_time', 'map_type', 'status'
      ],
      order: [['start_time', 'ASC']],
      limit,
      offset
    });

    result = {
      tournaments,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    };

    // Cache for 1 minute
    await redis.set(cacheKey, result, 60);
  }

  res.json({
    success: true,
    ...result
  });
});

export const getTournamentById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Try to get from cache
  let tournament = await redis.get(`tournament:${id}`);

  if (!tournament) {
    tournament = await Tournament.findByPk(id);
    if (!tournament) {
      throw new AppError('Tournament not found', 404);
    }

    // Cache for 5 minutes
    await redis.set(`tournament:${id}`, tournament.toJSON(), 300);
  }

  res.json({
    success: true,
    tournament
  });
});

export const getRoomDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { id } = req.params;

  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  // Check if user has joined
  const participant = await Participant.findOne({
    where: {
      user_id: req.userId,
      tournament_id: id
    }
  });

  if (!participant) {
    throw new AppError('You have not joined this tournament', 403);
  }

  // Check if room details should be revealed (30 min before start)
  const timeUntilStart = tournament.start_time.getTime() - Date.now();
  if (timeUntilStart > 30 * 60 * 1000) {
    throw new AppError('Room details will be available 30 minutes before start', 400);
  }

  res.json({
    success: true,
    room_details: {
      room_id: tournament.room_id,
      room_password: tournament.room_password,
      start_time: tournament.start_time,
      map_type: tournament.map_type,
      game_mode: tournament.game_mode,
      rules: `Match mode: ${tournament.game_mode}\nMap: ${tournament.map_type}\nMax players: ${tournament.max_players}`
    }
  });
});

export const joinTournament = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { error, value } = joinTournamentSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { tournament_id } = value;

  // Get user
  const user = await User.findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is banned
  if (user.is_banned) {
    throw new AppError('You are banned from participating in tournaments', 403);
  }

  // Get tournament
  const tournament = await Tournament.findByPk(tournament_id);
  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  // Check tournament status
  if (tournament.status !== 'upcoming') {
    throw new AppError('Tournament is not available for joining', 400);
  }

  // Check if user already joined
  const existingParticipant = await Participant.findOne({
    where: {
      user_id: req.userId,
      tournament_id
    }
  });

  if (existingParticipant) {
    throw new AppError('You have already joined this tournament', 400);
  }

  // Check available slots
  if (tournament.current_players >= tournament.max_players) {
    throw new AppError('Tournament is full', 400);
  }

  // Check wallet balance
  if (user.wallet_balance < tournament.entry_fee) {
    throw new AppError('Insufficient wallet balance', 400);
  }

  // Use transaction for atomicity
  await db.transaction(async (t: any) => {
    // Deduct entry fee
    await user.update(
      {
        wallet_balance: user.wallet_balance - tournament.entry_fee
      },
      { transaction: t }
    );

    // Create participant
    await Participant.create(
      {
        user_id: req.userId,
        tournament_id,
        status: 'joined'
      },
      { transaction: t }
    );

    // Update tournament player count
    await tournament.update(
      {
        current_players: tournament.current_players + 1
      },
      { transaction: t }
    );

    // Create transaction record
    await Transaction.create(
      {
        user_id: req.userId,
        amount: tournament.entry_fee,
        type: 'entry_fee',
        status: 'completed',
        reference_id: tournament_id
      },
      { transaction: t }
    );
  });

  // Invalidate caches
  await redis.delete(`user:${req.userId}`);
  await redis.deletePattern(`tournaments:*`);
  await redis.delete(`tournament:${tournament_id}`);

  logger.info(`User joined tournament: ${user.email} - ${tournament.name} (${tournament_id})`);

  res.status(201).json({
    success: true,
    message: 'Joined tournament successfully',
    participant_id: `${req.userId}-${tournament_id}`,
    wallet_balance: user.wallet_balance - tournament.entry_fee
  });
});

export const submitResult = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { error, value } = submitResultSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { id } = req.params;
  const { placement, screenshot } = value;

  // Get participant
  const participant = await Participant.findOne({
    where: {
      user_id: req.userId,
      tournament_id: id
    }
  });

  if (!participant) {
    throw new AppError('You have not joined this tournament', 403);
  }

  if (participant.status === 'completed') {
    throw new AppError('You have already submitted results for this tournament', 400);
  }

  // Upload screenshot
  const screenshotUrl = await uploadImageToS3(screenshot, `results/${id}/${req.userId}`);

  // Update participant
  await participant.update({
    placement,
    screenshot_url: screenshotUrl,
    status: 'pending_verification'
  });

  logger.info(`Result submitted: ${req.userId} - Tournament ${id} - Placement ${placement}`);

  res.json({
    success: true,
    message: 'Result submitted for verification',
    status: 'pending_verification'
  });
});

export const getParticipantStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const { id } = req.params;

  const participant = await Participant.findOne({
    where: {
      user_id: req.userId,
      tournament_id: id
    }
  });

  if (!participant) {
    throw new AppError('You have not joined this tournament', 403);
  }

  res.json({
    success: true,
    status: participant.status,
    placement: participant.placement,
    prize_won: participant.prize_won,
    screenshot_url: participant.screenshot_url
  });
});
