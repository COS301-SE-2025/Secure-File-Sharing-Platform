'use client';
import { useEffect, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import axios from 'axios';
// import { supabase } from '@/lib/supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api/users';

export default function AccountSettings() {
  const tabs = ['MY ACCOUNT', 'CHANGE PASSWORD', 'NOTIFICATIONS'];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [errors, setErrors] = useState({ username: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');

  const [notificationSettings, setNotificationSettings] = useState({
    alerts: {
      runningOutOfSpace: true,
      deleteLargeFiles: true,
      newBrowserSignIn: true,
      newDeviceLinked: true,
      newAppConnected: true,
    },
    files: {
      sharedFolderActivity: true,
    },
    news: {
      newFeatures: true,
      secureShareTips: false,
      feedbackSurveys: true,
    }
  });

  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const handleNotificationChange = (category, setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSaveNotifications = async () => {
    setIsUpdatingNotifications(true);
    setNotificationMessage('');

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(notificationSettings),
      });

      if (response.ok) {
        setNotificationMessage('Notification settings updated successfully!');
        setTimeout(() => setNotificationMessage(''), 3000);
      } else {
        throw new Error('Failed to update notification settings');
      }
    } catch (error) {
      setNotificationMessage('Failed to update notification settings. Please try again.');
      setTimeout(() => setNotificationMessage(''), 5000);
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');

        setUser(result.data);
        setFormData({ username: result.data.username || '', email: result.data.email || '' });
      } catch (error) {
        console.error('Failed to fetch profile:', error.message);
      }
    }

    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setSuccessMessage('');
  };

  const validate = () => {
    const newErrors = { username: '', email: '' };
    let hasError = false;

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      hasError = true;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
      hasError = true;
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleSaveChanges = async () => {
    if (!validate()) return;

    if (
      formData.username === user?.username &&
      formData.email === user?.email
    ) {
      setSuccessMessage('No changes to save.');
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      setUser(data.data);
      setFormData({ username: data.data.username, email: data.data.email });
      setSuccessMessage('Profile updated successfully!');
    } catch (error) {
      setErrors((prev) => ({ ...prev, username: error.message }));
      console.error('Error updating profile:', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (!validate()) return;

    const mismatchErrors = {};
    let hasMismatch = false;

    if (formData.username.trim().toLowerCase() !== user?.username.toLowerCase()) {
      mismatchErrors.username = 'Username does not match your account';
      hasMismatch = true;
    }

    if (formData.email.trim().toLowerCase() !== user?.email.toLowerCase()) {
      mismatchErrors.email = 'Email does not match your account';
      hasMismatch = true;
    }

    if (hasMismatch) {
      setErrors(mismatchErrors);
      return;
    }

    setErrors({ username: '', email: '' });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!res.ok) throw new Error('Failed to delete account');

      localStorage.removeItem('token');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Delete error:', error.message);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // --------------------------------------------------------------- UPLOAD PHOTO ---------------------------------------------------------

  const handleUploadPhoto = () => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/jpeg,image/png,image/jpg';
      
      fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
          setAvatarMessage('Only JPG or PNG images are allowed.');
          setTimeout(() => setAvatarMessage(''), 5000);
          return;
        }
        
        if (file.size > 8 * 1024 * 1024) {
          setAvatarMessage('File size must be less than 8MB.');
          setTimeout(() => setAvatarMessage(''), 5000);
          return;
        }
        
        const img = new Image();
        img.onload = async () => {
          if (img.width < 250 || img.height < 250) {
            setAvatarMessage('Image must be at least 250×250 pixels.');
            setTimeout(() => setAvatarMessage(''), 5000);
            return;
          }
          
          await uploadAvatar(file);
        };
        
        img.src = URL.createObjectURL(file);
      };
      
      fileInput.click();
    } catch (error) {
      console.error('Error selecting file:', error);
      setAvatarMessage('Error selecting file. Please try again.');
      setTimeout(() => setAvatarMessage(''), 5000);
    }
  };

  const uploadAvatar = async (file) => {
    try {
      setIsUploading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setAvatarMessage('Please log in to upload an avatar.');
        setTimeout(() => setAvatarMessage(''), 5000);
        window.location.href = '/login';
        return;
      }

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET); // Fixed key from 'avatar' to 'upload_preset'
      formData.append('folder', 'avatars'); // Optional: organize in Cloudinary

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const avatarUrl = response.data.secure_url;

      // Update avatar_url via backend
      const updateResponse = await fetch(`${API_BASE_URL}/avatar-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Failed to update avatar URL');
      }

      const { data } = await updateResponse.json();
      setUser((prev) => ({
        ...prev,
        avatar_url: data.avatar_url,
      }));

      setAvatarMessage('Avatar updated successfully!');
      setTimeout(() => setAvatarMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setAvatarMessage(error.message || 'Error uploading avatar. Please try again.');
      setTimeout(() => setAvatarMessage(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      if (!user?.avatar_url) {
        setAvatarMessage('No avatar to remove.');
        setTimeout(() => setAvatarMessage(''), 3000);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        setAvatarMessage('Please log in to remove avatar.');
        setTimeout(() => setAvatarMessage(''), 5000);
        window.location.href = '/login';
        return;
      }

      // Update avatar_url to null via backend
      const response = await fetch(`${API_BASE_URL}/avatar-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: null }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove avatar');
      }

      setUser((prev) => ({
        ...prev,
        avatar_url: null,
      }));

      setAvatarMessage('Avatar removed successfully!');
      setTimeout(() => setAvatarMessage(''), 3000);
    } catch (error) {
      console.error('Error removing avatar:', error);
      setAvatarMessage(error.message || 'Error removing avatar. Please try again.');
      setTimeout(() => setAvatarMessage(''), 5000);
    }
  };

  {user?.avatar_url && (
    <button 
      type="button" 
      onClick={handleDeleteAvatar}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
    >
      <Trash2 size={16} />
      Remove photo
    </button>
  )}

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');

        setUser(result.data);
        setFormData({ username: result.data.username || '', email: result.data.email || '' });
      } catch (error) {
        console.error('Failed to fetch profile:', error.message);
      }
    }

    fetchProfile();
  }, []);

  // --------------------------------------------------------------- END UPLOAD PHOTO -----------------------------------------------------

  // --------------------------------------------------------------- PASSWORD TAB ---------------------------------------------------------
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    resetPIN: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStep, setPasswordStep] = useState('verify');
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const handlePasswordInputChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateCurrentPassword = async () => {
    setIsProcessing(true);
    setPasswordErrors({});
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          currentPassword: passwordData.currentPassword 
        })
      });
      
      if (response.ok) {
        const pinResponse = await fetch(`${API_BASE_URL}/send-reset-pin`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (pinResponse.ok) {
          setPasswordStep('pin');
          setPasswordMessage('A 5-character PIN has been sent to your email. Please check your inbox.');
        } else {
          const error = await pinResponse.json();
          setPasswordErrors({ general: error.message || 'Failed to send PIN' });
        }
      } else {
        const error = await response.json();
        setPasswordErrors({ currentPassword: error.message || 'Invalid current password' });
      }
    } catch (error) {
      setPasswordErrors({ general: 'Network error. Please try again.' });
    }
    
    setIsProcessing(false);
  };

  const validatePIN = () => {
    if (!passwordData.resetPIN || passwordData.resetPIN.length !== 5) {
      setPasswordErrors({ resetPIN: 'Please enter the 5-character PIN from your email' });
      return false;
    }
    setPasswordStep('newPassword');
    setPasswordMessage('PIN verified! Now enter your new password.');
    return true;
  };

  const validateNewPassword = () => {
    const errors = {};
    
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (passwordData.newPassword === passwordData.currentPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateNewPassword()) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pin: passwordData.resetPIN,
          newPassword: passwordData.newPassword
        })
      });
      
      if (response.ok) {
        setPasswordMessage('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          resetPIN: ''
        });
        setPasswordStep('verify');
        setPasswordErrors({});
      } else {
        const error = await response.json();
        setPasswordErrors({ general: error.message || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordErrors({ general: 'Network error. Please try again.' });
    }
    
    setIsProcessing(false);
  };

  const resetPasswordFlow = () => {
    setPasswordStep('verify');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      resetPIN: ''
    });
    setPasswordErrors({});
    setPasswordMessage('');
  };
  // --------------------------------------------------------------- END PASSWORD TAB ---------------------------------------------------------

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        {/* User Info Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold overflow-hidden">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              user?.username?.slice(0, 2).toUpperCase() || '??'
            )}
          </div>
          <h1 className="text-2xl text-blue-600">{user?.username || 'Loading...'}</h1>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-8 border-b border-slate-600">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === 'MY ACCOUNT' && (
          <div className="max-w-2xl">
            {/* Avatar Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Avatar</h3>
              <p className="text-sm text-slate-400 mb-4">
                JPG or PNG / 8MB maximum / 250×250px minimum
              </p>
              {avatarMessage && (
                <div
                  className={`mb-4 p-3 rounded-md ${
                    avatarMessage.includes('successfully')
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {avatarMessage}
                </div>
              )}
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="User avatar"
                    className="w-15 h-15 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-15 h-15 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold text-2xl">
                    {user?.username?.slice(0, 2).toUpperCase() || '??'}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={isUploading}
                    className={`px-4 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Camera size={16} />
                    {isUploading ? 'Uploading...' : 'Upload photo'}
                  </button>
                  {user?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
                {errors.username && (
                  <p id="username-error" className="text-sm text-red-500 mt-1">
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-red-500 mt-1">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>

            {/* Success message */}
            {successMessage && (
              <p className="mt-4 text-green-500 font-semibold">{successMessage}</p>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg w-full max-w-md">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Confirm Account Deletion
                  </h2>

                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
                    Are you sure you want to delete your account? This action cannot be undone.
                  </p>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'CHANGE PASSWORD' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Change Password</h3>
              {passwordStep !== 'verify' && (
                <button
                  type="button"
                  onClick={resetPasswordFlow}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Start Over
                </button>
              )}
            </div>

            {/* Success/Error Messages */}
            {passwordMessage && (
              <div className={`mb-4 p-3 rounded-md ${
                passwordMessage.includes('successfully') 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}>
                {passwordMessage}
              </div>
            )}

            {passwordErrors.general && (
              <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {passwordErrors.general}
              </div>
            )}

            {/* Step 1: Verify Current Password */}
            {passwordStep === 'verify' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 mb-4">
                  First, please verify your current password to proceed.
                </p>
                
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                    className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your current password"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-500 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={validateCurrentPassword}
                  disabled={isProcessing || !passwordData.currentPassword}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Verifying...' : 'Verify & Send PIN'}
                </button>
              </div>
            )}

            {/* Step 2: Enter PIN */}
            {passwordStep === 'pin' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 mb-4">
                  A 5-character PIN has been sent to your email address. Please enter it below.
                </p>
                
                <div>
                  <label htmlFor="resetPIN" className="block text-sm font-medium mb-2">
                    5-Character PIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="resetPIN"
                    type="text"
                    maxLength="5"
                    value={passwordData.resetPIN}
                    onChange={(e) => handlePasswordInputChange('resetPIN', e.target.value)}
                    className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      passwordErrors.resetPIN ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter 5-character PIN"
                  />
                  {passwordErrors.resetPIN && (
                    <p className="text-sm text-red-500 mt-1">{passwordErrors.resetPIN}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={validatePIN}
                  disabled={!passwordData.resetPIN || passwordData.resetPIN.length !== 5}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Verify PIN
                </button>
              </div>
            )}

            {/* Step 3: Set New Password */}
            {passwordStep === 'newPassword' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 mb-4">
                  Now enter your new password. Make sure it&apos;s strong and secure.
                </p>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                    className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-500 mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                    className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Confirm your new password"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isProcessing || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'NOTIFICATIONS' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Notification Settings</h3>
            </div>

            {/* Success/Error Messages */}
            {notificationMessage && (
              <div className={`mb-6 p-3 rounded-md ${
                notificationMessage.includes('successfully') 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
                {notificationMessage}
              </div>
            )}

            <div className="space-y-8">
              {/* Alerts and News - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Alerts Section */}
                <div>
                  <h4 className="text-base font-semibold mb-3">Alerts</h4>
                  <p className="text-sm text-slate-400 mb-4">Email me when:</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">I'm running out of space</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alerts.runningOutOfSpace}
                          onChange={(e) => handleNotificationChange('alerts', 'runningOutOfSpace', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">I delete a large number of files</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alerts.deleteLargeFiles}
                          onChange={(e) => handleNotificationChange('alerts', 'deleteLargeFiles', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">A new browser is used to sign in</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alerts.newBrowserSignIn}
                          onChange={(e) => handleNotificationChange('alerts', 'newBrowserSignIn', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">A new device is linked</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alerts.newDeviceLinked}
                          onChange={(e) => handleNotificationChange('alerts', 'newDeviceLinked', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">A new app is connected</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.alerts.newAppConnected}
                          onChange={(e) => handleNotificationChange('alerts', 'newAppConnected', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* News Section */}
                <div className="ml-32 w-full max-w-xl">
                  <h4 className="text-base font-semibold mb-3">News</h4>
                  <p className="text-sm text-slate-400 mb-4">Email me about:</p>

                  <div className="space-y-3">
                    <div className="flex items-center py-2 pr-4">
                      <span className="text-sm min-w-[250px]">New features and updates</span>
                      <label className="ml-auto relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.news.newFeatures}
                          onChange={(e) =>
                            handleNotificationChange('news', 'newFeatures', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center py-2 pr-4">
                      <span className="text-sm min-w-[250px]">Tips on using SecureShare</span>
                      <label className="ml-auto relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.news.secureShareTips}
                          onChange={(e) =>
                            handleNotificationChange('news', 'secureShareTips', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center py-2 pr-4">
                      <span className="text-sm min-w-[250px]">SecureShare feedback surveys</span>
                      <label className="ml-auto relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.news.feedbackSurveys}
                          onChange={(e) =>
                            handleNotificationChange('news', 'feedbackSurveys', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Files Section - Full Width Below */}
              <div>
                <h4 className="text-base font-semibold mb-3">Files</h4>
                <p className="text-sm text-slate-400 mb-4">Email me about:</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Activity in shared folders (weekly digest)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.files.sharedFolderActivity}
                        onChange={(e) => handleNotificationChange('files', 'sharedFolderActivity', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleSaveNotifications}
                disabled={isUpdatingNotifications}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingNotifications ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}