import PDFDocument from 'pdfkit';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';
import { Connection } from '../models/Connection.js';
import { Readable } from 'stream';

function drawHeader(doc, title) {
  doc
    .fontSize(20)
    .text(title, { align: 'center' })
    .moveDown(0.5)
    .fontSize(10)
    .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
    .moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
}

export async function generatePrescriptionPDF(req, res, next) {
  try {
    const {
      patientEmail,
      diagnosis,
      medications,
      notes,
      date
    } = req.body || {};

    if (!patientEmail || !Array.isArray(medications)) {
      return res.status(400).json({ message: 'patientEmail and medications[] are required' });
    }

    // Ensure patient exists
    const patient = await User.findOne({ email: patientEmail.toLowerCase().trim() });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Ensure caller is permitted:
    // - doctor: must be connected to patient
    // - admin: allowed
    // - patient/user: only if matches self
    let doctorProfile = null;
    if (req.userRole === 'doctor') {
      doctorProfile = await Doctor.findOne({ user: req.userId });
      if (!doctorProfile) return res.status(403).json({ message: 'Doctor profile not found' });
      const connected = await Connection.findOne({
        user: patient._id,
        doctor: doctorProfile._id,
        status: 'connected'
      });
      if (!connected) {
        return res.status(403).json({ message: 'You can only prescribe for your connected patients' });
      }
    } else if (req.userRole === 'patient' || req.userRole === 'user') {
      if (String(patient._id) !== String(req.userId)) {
        return res.status(403).json({ message: 'Patients can only download their own prescriptions' });
      }
    } else if (req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const doctorName =
      doctorProfile?.name ||
      (req.userRole === 'admin' ? 'Admin' : 'Doctor');

    const fileName = `prescription-${patient.email.split('@')[0]}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const prescriptionData = {
        doctor: doctorProfile?._id,
        doctorName,
        diagnosis,
        medications,
        notes,
        date,
        fileName,
        pdf: pdfBuffer,
        createdAt: new Date()
      };

      // Store on patient record
      await User.updateOne(
        { _id: patient._id },
        {
          $push: {
            prescriptions: prescriptionData
          }
        }
      ).catch((err) => console.error('Failed to store prescription on patient', err));

      // Store on doctor record if doctor created it
      if (doctorProfile && (req.userRole === 'doctor' || req.userRole === 'admin')) {
        await Doctor.updateOne(
          { _id: doctorProfile._id },
          {
            $push: {
              prescriptions: {
                patient: patient._id,
                patientName: patient.name,
                patientEmail: patient.email,
                diagnosis,
                medications,
                notes,
                date,
                fileName,
                pdf: pdfBuffer,
                createdAt: new Date()
              }
            }
          }
        ).catch((err) => console.error('Failed to store prescription on doctor', err));
      }

      // Stream to caller
      res.end(pdfBuffer);
    });
    doc.pipe(res);

    drawHeader(doc, 'Prescription');

    doc.fontSize(12).text(`Patient: ${patient.name}`);
    doc.text(`Doctor: ${doctorName}`);
    doc.text(`Date: ${date || new Date().toISOString().split('T')[0]}`);
    if (diagnosis) doc.text(`Diagnosis: ${diagnosis}`);
    doc.moveDown();

    doc.fontSize(14).text('Medications').moveDown(0.5);
    doc.fontSize(12);

    if (medications.length === 0) {
      doc.text('No medications listed.');
    } else {
      medications.forEach((m, idx) => {
        const line = [
          m.name ? `Name: ${m.name}` : null,
          m.dosage ? `Dosage: ${m.dosage}` : null,
          m.frequency ? `Frequency: ${m.frequency}` : null,
          m.duration ? `Duration: ${m.duration}` : null,
          m.instructions ? `Notes: ${m.instructions}` : null
        ].filter(Boolean).join(' | ');
        doc.text(`${idx + 1}. ${line}`);
      });
    }

    if (notes) {
      doc.moveDown();
      doc.fontSize(14).text('Additional Notes').moveDown(0.5);
      doc.fontSize(12).text(notes);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}

export async function listMyPrescriptions(req, res, next) {
  try {
    // If user is a doctor, return prescriptions from Doctor model
    if (req.userRole === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.userId }).populate('prescriptions.patient');
      if (!doctorProfile) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      const prescriptions = (doctorProfile.prescriptions || []).map((p) => ({
        id: p._id,
        patientName: p.patientName || p.patient?.name || 'Patient',
        patientEmail: p.patientEmail || p.patient?.email || '',
        diagnosis: p.diagnosis,
        date: p.date,
        createdAt: p.createdAt,
        fileName: p.fileName,
        pdfBase64: p.pdf ? p.pdf.toString('base64') : null
      }));
      return res.json(prescriptions);
    }

    // If user is a patient, return prescriptions from User model
    const user = await User.findById(req.userId).populate('prescriptions.doctor');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const prescriptions = (user.prescriptions || []).map((p) => ({
      id: p._id,
      doctorName: p.doctorName || p.doctor?.name || 'Doctor',
      diagnosis: p.diagnosis,
      date: p.date,
      createdAt: p.createdAt,
      fileName: p.fileName,
      pdfBase64: p.pdf ? p.pdf.toString('base64') : null
    }));
    res.json(prescriptions);
  } catch (err) {
    next(err);
  }
}
