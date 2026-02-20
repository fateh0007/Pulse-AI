import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar,
  Edit3,
  Save,
  X,
  Heart,
  Stethoscope,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doctorsAPI, prescriptionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Profile = () => {
  const { user, logout, isDoctor } = useAuth();
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      name: user?.name || '',
      email: user?.email || ''
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: user?.name || '',
      email: user?.email || ''
    });
  };

  const handleSave = () => {
    // In a real app, you would make an API call to update the user profile
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (isDoctor) {
          // For doctors, get connected patients count
          const patients = await doctorsAPI.getMyPatients();
          setConnectionsCount(patients.data?.length || 0);
        } else {
          // For patients, get connected doctors count
          const connections = await doctorsAPI.getMyConnections();
          setConnectionsCount(connections.data?.length || 0);
        }
      } catch {
        setConnectionsCount(0);
      }
      try {
        const pres = await prescriptionsAPI.listMine();
        setPrescriptionsCount(pres.data?.length || 0);
      } catch {
        setPrescriptionsCount(0);
      }
    };
    loadCounts();
  }, [isDoctor]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="h-5 w-5 text-blue-600" />;
      case 'admin':
        return <Crown className="h-5 w-5 text-purple-600" />;
      default:
        return <Heart className="h-5 w-5 text-red-600" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'doctor':
        return 'Healthcare professional with access to patient management and prescription tools';
      case 'admin':
        return 'System administrator with full access to all features and user management';
      default:
        return 'Patient with access to AI chat, doctor connections, and health information';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                {getRoleIcon(user?.role)}
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{user?.name}</h2>
            <div className="flex justify-center mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user?.role)}`}>
                {getRoleIcon(user?.role)}
                <span className="ml-2 capitalize">{user?.role}</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {getRoleDescription(user?.role)}
            </p>
            <button
              onClick={logout}
              className="btn-secondary w-full"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Account Information</h3>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="btn-secondary flex items-center text-sm"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancel}
                      className="btn-secondary flex items-center text-sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn-primary flex items-center text-sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 py-2">{user?.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your email"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 py-2">{user?.email}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Account Type
                </label>
                <div className="flex items-center py-2">
                  {getRoleIcon(user?.role)}
                  <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">{user?.role}</span>
                </div>
              </div>

              {/* Member Since */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Member Since
                </label>
                <p className="text-gray-900 dark:text-gray-100 py-2">
                  {user?.createdAt ? format(new Date(user.createdAt), 'MMMM dd, yyyy') : 'Recently joined'}
                </p>
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div className="card mt-6">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Account Statistics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</div>
                    <div className="text-sm text-blue-800 dark:text-blue-300">AI Chat Sessions</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {user?.role === 'doctor' ? prescriptionsCount : connectionsCount}
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-300">
                      {user?.role === 'doctor' ? 'Prescriptions Issued' : 'Connections'}
                    </div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {user?.role === 'doctor' ? connectionsCount : prescriptionsCount}
                    </div>
                    <div className="text-sm text-purple-800 dark:text-purple-300">
                      {user?.role === 'doctor' ? 'Connected Patients' : 'Prescriptions'}
                    </div>
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="card mt-6">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Security</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">Account Status</span>
                </div>
                <span className="text-sm text-green-600 dark:text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Two-Factor Authentication</span>
                </div>
                <span className="text-sm text-blue-600 dark:text-blue-400">Not Enabled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Password</span>
                </div>
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Last changed: Recently</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
