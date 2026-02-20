import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { chatWithAI, getDoctorMessages, sendDoctorMessage } from '../controllers/chatController.js';

const router = Router();

router.post('/', auth, chatWithAI);
router.get('/doctor/:connectionId', auth, getDoctorMessages);
router.post('/doctor/:connectionId', auth, sendDoctorMessage);

export default router;
