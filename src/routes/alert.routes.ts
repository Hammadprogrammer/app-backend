import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { sosRateLimiter } from '../middlewares/rateLimiter';
import { triggerAlert, getAlertHistory } from '../controllers/alert.controller';

const router = Router();

router.use(authenticate);

router.post('/trigger', sosRateLimiter, triggerAlert);
router.get('/history', getAlertHistory);

export default router;
