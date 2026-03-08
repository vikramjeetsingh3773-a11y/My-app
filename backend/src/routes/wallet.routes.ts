import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.post('/deposit', walletController.requestDeposit);
router.get('/transactions', walletController.getTransactionHistory);
router.post('/withdraw', walletController.requestWithdrawal);
router.get('/withdrawals', walletController.getWithdrawalHistory);

export default router;
