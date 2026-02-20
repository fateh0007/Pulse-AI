import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import { generatePrescriptionPDF, listMyPrescriptions } from '../controllers/prescriptionController.js';

const router = Router();

router.post('/pdf', auth, requireRole('doctor', 'admin', 'user'), generatePrescriptionPDF);
router.get('/mine', auth, requireRole('doctor', 'admin', 'user'), listMyPrescriptions);

export default router;
