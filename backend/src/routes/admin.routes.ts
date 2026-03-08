import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

// Tournament management
router.post('/tournaments', adminController.createTournament);
router.put('/tournaments/:id', adminController.updateTournament);
router.delete('/tournaments/:id', adminController.deleteTournament);

// Deposit management
router.get('/deposits/pending', adminController.getPendingDeposits);
router.post('/deposits/:id/approve', adminController.approveDeposit);
router.post('/deposits/:id/reject', adminController.rejectDeposit);

// Withdrawal management
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.post('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.post('/withdrawals/:id/reject', adminController.rejectWithdrawal);

// User management
router.post('/users/:id/ban', adminController.banUser);
router.delete('/users/:id/ban', adminController.unbanUser);

// Analytics
router.get('/analytics', adminController.getAnalytics);

export default router;
