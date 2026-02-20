import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  
  User, 
  Calendar,
  Pill,
  Clock,
  FileDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { prescriptionsAPI, doctorsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Prescriptions = () => {
  const { user, isDoctor } = useAuth();
  const [patients, setPatients] = useState([]);
  const [myPrescriptions, setMyPrescriptions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [prescription, setPrescription] = useState({
    patientEmail: user?.email || '',
    doctorName: isDoctor ? user?.name || '' : '',
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const openSavedPrescription = (base64, fileName) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      if (isDoctor) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'prescription.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(url, '_blank', 'noopener');
      }
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to open saved prescription', err);
      toast.error('Unable to open prescription');
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      if (!isDoctor) return;
      try {
        const res = await doctorsAPI.getMyPatients();
        setPatients(res.data || []);
      } catch (err) {
        console.error('Failed to load patients', err);
        toast.error('Unable to load patients for prescriptions');
      }
    };
    loadPatients();
  }, [isDoctor]);

  useEffect(() => {
    const loadMyPrescriptions = async () => {
      setIsLoadingList(true);
      try {
        const res = await prescriptionsAPI.listMine();
        setMyPrescriptions(res.data || []);
      } catch (err) {
        console.error('Failed to load prescriptions list', err);
      } finally {
        setIsLoadingList(false);
      }
    };
    loadMyPrescriptions();
  }, []);

  const handleMedicationChange = (index, field, value) => {
    const updatedMedications = [...prescription.medications];
    updatedMedications[index][field] = value;
    setPrescription({ ...prescription, medications: updatedMedications });
  };

  const addMedication = () => {
    setPrescription({
      ...prescription,
      medications: [...prescription.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
  };

  const removeMedication = (index) => {
    if (prescription.medications.length > 1) {
      const updatedMedications = prescription.medications.filter((_, i) => i !== index);
      setPrescription({ ...prescription, medications: updatedMedications });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prescription.patientEmail) {
      toast.error('Please provide patient email');
      return;
    }

    const validMedications = prescription.medications.filter(med => med.name.trim());

    setIsGenerating(true);

    try {
      const response = await prescriptionsAPI.generatePDF({
        ...prescription,
        medications: validMedications
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const fileLabel = prescription.patientEmail?.split('@')[0] || 'patient';

      if (isDoctor) {
        // Doctors download directly
        const link = document.createElement('a');
        link.href = url;
        link.download = `prescription-${fileLabel}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Patients view inline in a new tab
        window.open(url, '_blank', 'noopener');
      }
      window.URL.revokeObjectURL(url);

      toast.success(isDoctor ? 'Prescription generated successfully!' : 'Prescription ready to view');
      setShowCreateForm(false);
      setPrescription({
        patientEmail: user?.email || '',
        doctorName: user?.name || '',
        diagnosis: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        notes: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      // Reload prescriptions list
      if (isDoctor) {
        try {
          const res = await prescriptionsAPI.listMine();
          setMyPrescriptions(res.data || []);
        } catch (err) {
          console.error('Failed to reload prescriptions list', err);
        }
      }
    } catch (error) {
      console.error('Prescription generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate prescription. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isDoctor) {
    return (
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prescriptions</h1>
          <p className="text-gray-600 dark:text-gray-400">View prescriptions your doctor has prepared.</p>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Your prescriptions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Select a prescription to view it.</p>
        </div>
        {isLoadingList ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        ) : myPrescriptions.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No prescriptions found. Please contact your doctor.</p>
        ) : (
          <div className="space-y-3">
            {myPrescriptions.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{p.fileName || 'Prescription'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{p.doctorName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.date || new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => openSavedPrescription(p.pdfBase64, p.fileName)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prescriptions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage patient prescriptions
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center mt-4 sm:mt-0"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Prescription
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Create New Prescription
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient and Doctor Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Patient *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <select
                        required
                        value={prescription.patientEmail}
                        onChange={(e) => setPrescription({ ...prescription, patientEmail: e.target.value })}
                        className="input-field pl-10"
                      >
                        <option value="">Select connected patient</option>
                        {patients.map((p) => (
                          <option key={p._id} value={p.user?.email || ''}>
                            {p.user?.name} ({p.user?.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    {patients.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        No connected patients found. Connect with a patient first to prescribe.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Doctor Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        required
                        value={prescription.doctorName}
                        onChange={(e) => setPrescription({...prescription, doctorName: e.target.value})}
                        className="input-field pl-10"
                        placeholder="Enter doctor name"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="date"
                        value={prescription.date}
                        onChange={(e) => setPrescription({...prescription, date: e.target.value})}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Diagnosis
                    </label>
                    <input
                      type="text"
                      value={prescription.diagnosis}
                      onChange={(e) => setPrescription({...prescription, diagnosis: e.target.value})}
                      className="input-field"
                      placeholder="Enter diagnosis"
                    />
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Medications
                    </label>
                    <button
                      type="button"
                      onClick={addMedication}
                      className="btn-secondary text-sm py-1 px-3 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Medication
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {prescription.medications.map((medication, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Medication {index + 1}</h4>
                          {prescription.medications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedication(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Medication Name
                            </label>
                            <div className="relative">
                              <Pill className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <input
                                type="text"
                                value={medication.name}
                                onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                                className="input-field pl-10 text-sm"
                                placeholder="e.g., Amoxicillin"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Dosage
                            </label>
                            <input
                              type="text"
                              value={medication.dosage}
                              onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                              className="input-field text-sm"
                              placeholder="e.g., 500mg"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Frequency
                            </label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <input
                                type="text"
                                value={medication.frequency}
                                onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                                className="input-field pl-10 text-sm"
                                placeholder="e.g., Twice daily"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Duration
                            </label>
                            <input
                              type="text"
                              value={medication.duration}
                              onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                              className="input-field text-sm"
                              placeholder="e.g., 7 days"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Instructions
                            </label>
                            <input
                              type="text"
                              value={medication.instructions}
                              onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                              className="input-field text-sm"
                              placeholder="e.g., Take with food"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={prescription.notes}
                    onChange={(e) => setPrescription({...prescription, notes: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Any additional instructions or notes for the patient..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="btn-primary flex items-center"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        Generate PDF
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* My Prescriptions List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">My Prescriptions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">View all prescriptions you have created.</p>
        </div>
        {isLoadingList ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 p-4">Loading...</p>
        ) : myPrescriptions.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 p-4">No prescriptions created yet. Create your first prescription above.</p>
        ) : (
          <div className="space-y-3">
            {myPrescriptions.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{p.patientName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{p.patientEmail}</p>
                  {p.diagnosis && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Diagnosis: {p.diagnosis}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '')}</p>
                </div>
                <button
                  className="btn-secondary text-sm flex items-center"
                  onClick={() => openSavedPrescription(p.pdfBase64, p.fileName)}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900 dark:text-green-200">Prescription Management</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Create professional prescription PDFs for your patients. All prescriptions are generated 
              with proper formatting and can be downloaded immediately. Make sure to include all necessary 
              medication details and patient information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prescriptions;
