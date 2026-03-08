import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/connect-gaming-id', userController.connectGamingId);
router.get('/match-history', userController.getMatchHistory);
router.get('/leaderboard', userController.getLeaderboard);
router.get('/stats', userController.getUserStats);

export default router;
