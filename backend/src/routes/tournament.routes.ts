import { Router } from 'express';
import * as tournamentController from '../controllers/tournament.controller';
import { optionalAuthMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.get('/:id/room-details', optionalAuthMiddleware, tournamentController.getRoomDetails);
router.post('/join', optionalAuthMiddleware, tournamentController.joinTournament);
router.post('/:id/submit-result', optionalAuthMiddleware, tournamentController.submitResult);
router.get('/:id/participant-status', optionalAuthMiddleware, tournamentController.getParticipantStatus);

export default router;
