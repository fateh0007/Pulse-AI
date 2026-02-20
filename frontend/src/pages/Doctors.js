import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Stethoscope, 
  
  Phone, 
  Mail, 
  UserPlus,
  CheckCircle,
  Star,
  
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doctorsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Doctors = () => {
  const { isDoctor, isAdmin, isUser, isPremiumActive } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [connections, setConnections] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    experienceYears: '',
    languages: '',
    bio: '',
    contactEmail: '',
    contactPhone: ''
  });

  const fetchDoctors = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const response = await doctorsAPI.getDoctors(query);
      setDoctors(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch doctors');
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load - fetch all doctors
    fetchDoctors('');
    if (!isDoctor && !isAdmin) {
      fetchConnections();
    } else {
      fetchPatients();
    }
  }, [isDoctor]); // Only depend on isDoctor, not fetchDoctors

  

  const fetchConnections = async () => {
    try {
      const response = await doctorsAPI.getMyConnections();
      setConnections(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await doctorsAPI.getMyPatients();
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    // If query is empty, pass undefined/null to fetch all doctors
    fetchDoctors(query || '');
  };

  const handleConnect = async (doctorId) => {
    try {
      await doctorsAPI.connectDoctor(doctorId);
      toast.success('Successfully connected to doctor!');
      fetchConnections();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to connect to doctor');
    }
  };

  const goToDoctorChat = (connectionId) => {
    navigate(`/chat?mode=doctor&connection=${connectionId}`);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (!isDoctor && !isAdmin) {
      toast.error('Only doctors or admins can create doctor profiles. Please sign in with the correct role.');
      return;
    }
    try {
      const doctorData = {
        ...newDoctor,
        experienceYears: parseInt(newDoctor.experienceYears) || 0,
        languages: newDoctor.languages.split(',').map(lang => lang.trim()).filter(Boolean)
      };
      
      await doctorsAPI.createDoctor(doctorData);
      toast.success('Doctor profile created successfully!');
      setShowCreateForm(false);
      setNewDoctor({
        name: '',
        specialty: '',
        experienceYears: '',
        languages: '',
        bio: '',
        contactEmail: '',
        contactPhone: ''
      });
      fetchDoctors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create doctor profile');
    }
  };

  const isConnected = (doctorId) => {
    return connections.some(conn => conn.doctor._id === doctorId);
  };

  const getExperienceStars = (years) => {
    const stars = Math.min(Math.floor(years / 5), 5);
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Doctors</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isDoctor ? 'Manage your doctor profile' : 'Find and connect with healthcare professionals'}
          </p>
        </div>
        {(isDoctor || isAdmin) && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center mt-4 sm:mt-0"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Profile
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search doctors by name or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Create Doctor Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Doctor Profile</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDoctor.name}
                      onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                      className="input-field"
                      placeholder="Dr. John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Specialty *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDoctor.specialty}
                      onChange={(e) => setNewDoctor({...newDoctor, specialty: e.target.value})}
                      className="input-field"
                      placeholder="Cardiology"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      value={newDoctor.experienceYears}
                      onChange={(e) => setNewDoctor({...newDoctor, experienceYears: e.target.value})}
                      className="input-field"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Languages
                    </label>
                    <input
                      type="text"
                      value={newDoctor.languages}
                      onChange={(e) => setNewDoctor({...newDoctor, languages: e.target.value})}
                      className="input-field"
                      placeholder="English, Spanish, French"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={newDoctor.contactEmail}
                      onChange={(e) => setNewDoctor({...newDoctor, contactEmail: e.target.value})}
                      className="input-field"
                      placeholder="doctor@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={newDoctor.contactPhone}
                      onChange={(e) => setNewDoctor({...newDoctor, contactPhone: e.target.value})}
                      className="input-field"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={newDoctor.bio}
                    onChange={(e) => setNewDoctor({...newDoctor, bio: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Tell us about your medical background and approach..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doctor) => (
          <div key={doctor._id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{doctor.name}</h3>
                  <p className="text-sm text-primary-600 dark:text-primary-400">{doctor.specialty}</p>
                </div>
              </div>
              {!isDoctor && (
                <div className="flex items-center">
                  {isConnected(doctor._id) ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      {isUser && isPremiumActive && (
                        <button
                          onClick={() => goToDoctorChat(connections.find(c => c.doctor._id === doctor._id)?._id)}
                          className="btn-secondary text-sm py-1 px-3"
                        >
                          Open Chat
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(doctor._id)}
                      className="btn-primary text-sm py-1 px-3 flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Connect
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium mr-2">Experience:</span>
                <div className="flex items-center">
                  {getExperienceStars(doctor.experienceYears)}
                  <span className="ml-2">{doctor.experienceYears} years</span>
                </div>
              </div>
              
              {doctor.languages && doctor.languages.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Languages:</span> {doctor.languages.join(', ')}
                </div>
              )}
              
              {doctor.contactEmail && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="h-4 w-4 mr-2" />
                  {doctor.contactEmail}
                </div>
              )}
              
              {doctor.contactPhone && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="h-4 w-4 mr-2" />
                  {doctor.contactPhone}
                </div>
              )}
            </div>

            {doctor.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
              }}>{doctor.bio}</p>
            )}
          </div>
        ))}
      </div>

      {doctors.length === 0 && !loading && (
        <div className="text-center py-12">
          <Stethoscope className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No doctors found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search criteria' : 'No doctors are available at the moment'}
          </p>
        </div>
      )}

      {isDoctor && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Patient Conversations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Open chats from your connected patients.</p>
          </div>
          {patients.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No patient conversations yet.</p>
          ) : (
            <div className="space-y-3">
              {patients.map((conn) => (
                <div key={conn._id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{conn.user?.name || 'Patient'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{conn.user?.email}</p>
                  </div>
                  <button
                    onClick={() => goToDoctorChat(conn._id)}
                    className="btn-secondary text-sm"
                  >
                    Open Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Doctors;
