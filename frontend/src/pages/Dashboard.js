import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageCircle, 
  FileText, 
  Activity,
  Calendar,
  
  Heart,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doctorsAPI, prescriptionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, isDoctor } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDoctors: 0,
    connections: 0,
    chatSessions: 1,
    prescriptions: 0
  });
  const [recentDoctors, setRecentDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch doctors list
        const doctorsResponse = await doctorsAPI.getDoctors();
        setStats(prev => ({ ...prev, totalDoctors: doctorsResponse.data.length }));
        setRecentDoctors(doctorsResponse.data.slice(0, 3));

        // Fetch user connections if not a doctor
        if (!isDoctor) {
          try {
            const connectionsResponse = await doctorsAPI.getMyConnections();
            setStats(prev => ({ ...prev, connections: connectionsResponse.data.length }));
          } catch (error) {
            // User might not have connections yet
            console.log('No connections found');
          }
        }

        // Fetch prescriptions for both patients and doctors
        try {
          const prescriptionsRes = await prescriptionsAPI.listMine();
          setStats(prev => ({ ...prev, prescriptions: prescriptionsRes.data?.length || 0 }));
        } catch (error) {
          console.log('No prescriptions found');
        }
      } catch (error) {
        toast.error('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isDoctor]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'doctor': return 'Doctor';
      case 'admin': return 'Administrator';
      default: return 'Patient';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {getGreeting()}, {user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to your {getRoleDisplayName(user?.role).toLowerCase()} dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Doctors</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalDoctors}</p>
            </div>
          </div>
        </div>

        {!isDoctor && (
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">My Connections</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.connections}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Chat Sessions</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.chatSessions}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Prescriptions</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.prescriptions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/chat?mode=ai')}
              className="w-full flex items-center p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Start AI Chat</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get instant health advice</p>
              </div>
            </button>
            
            {!isDoctor && (
              <button
                onClick={() => navigate('/doctors')}
                className="w-full flex items-center p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Users className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Find Doctors</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Connect with healthcare professionals</p>
                </div>
              </button>
            )}

            {isDoctor && (
              <button
                onClick={() => navigate('/prescriptions')}
                className="w-full flex items-center p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Create Prescription</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Generate prescription PDFs</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Recent Doctors */}
        {!isDoctor && recentDoctors.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Doctors</h3>
            </div>
            <div className="space-y-3">
              {recentDoctors.map((doctor) => (
                <div key={doctor._id} className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{doctor.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.specialty}</p>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {doctor.experienceYears} years exp
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Health Tips */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Health Tips</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Stay Active</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Regular exercise improves both physical and mental health.</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Heart className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Healthy Diet</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Eat a balanced diet rich in fruits, vegetables, and whole grains.</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Regular Checkups</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Schedule regular health checkups to maintain your wellbeing.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
