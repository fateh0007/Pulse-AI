import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import { listDoctors, createDoctor, connectDoctor, myConnections, myPatients } from '../controllers/doctorController.js';

const router = Router();

router.get('/', listDoctors);
router.post('/', auth, requireRole('doctor', 'admin'), createDoctor);
router.post('/:id/connect', auth, requireRole('user'), connectDoctor);
router.get('/me/connections', auth, requireRole('user'), myConnections);
router.get('/me/patients', auth, requireRole('doctor'), myPatients);

export default router;
