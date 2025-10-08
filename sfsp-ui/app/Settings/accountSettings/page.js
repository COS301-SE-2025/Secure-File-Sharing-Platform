// AccountSettings.jsx
'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, User, Camera, Trash2, Sun, Moon, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UserAvatar } from '@/app/lib/avatarUtils';
import { getApiUrl } from '@/lib/api-config';
import axios from 'axios';

export default function AccountSettings() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [errors, setErrors] = useState({ username: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteFormData, setDeleteFormData] = useState({ email: '', password: '' });
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteMessage, setDeleteMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }

      try {
        const res = await fetch(`${getApiUrl('')}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');

        setUser(result.data);
        setFormData({ username: result.data.username || '', email: result.data.email || '' });
      } catch (error) {
        console.error('Failed to fetch profile:', error.message);
        setErrors((prev) => ({ ...prev, general: 'Failed to load profile. Please try again.' }));
      }
    }

    fetchProfile();
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

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

    if (formData.username === user?.username && formData.email === user?.email) {
      setSuccessMessage('No changes to save.');
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl('')}/users/profile`, {
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
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: error.message || 'Failed to update profile' }));
      console.error('Error updating profile:', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateFormatChange = (value) => {
    setDateFormat(value);
    localStorage.setItem('dateFormat', value);
  };

  const handleDeleteInputChange = (field, value) => {
    setDeleteFormData((prev) => ({ ...prev, [field]: value }));
    setDeleteErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateDeleteForm = () => {
    const newErrors = {};
    if (!deleteFormData.email) {
      newErrors.email = 'Email is required';
    } else if (deleteFormData.email.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      newErrors.email = 'Email does not match your account';
    }
    if (!deleteFormData.password) {
      newErrors.password = 'Password is required';
    }
    return newErrors;
  };

  const handleDeleteClick = () => {
    const validationErrors = validateDeleteForm();
    if (Object.keys(validationErrors).length > 0) {
      setDeleteErrors(validationErrors);
      return;
    }
    setDeleteErrors({});
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl('')}/users/profile`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: deleteFormData.email,
          password: deleteFormData.password,
        }),
      });

      if (!res.ok) throw new Error('Failed to delete account');

      localStorage.removeItem('token');
      setDeleteMessage('Account deleted successfully');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error) {
      console.error('Delete error:', error.message);
      setDeleteErrors({ general: 'Failed to delete account. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

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

        img.onerror = () => {
          setAvatarMessage('Invalid image file. Please try another.');
          setTimeout(() => setAvatarMessage(''), 5000);
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
        router.push('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'avatars');

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const avatarUrl = response.data.secure_url;

      const updateResponse = await fetch(`${getApiUrl('')}/users/avatar-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
        router.push('/login');
        return;
      }

      const response = await fetch(`${getApiUrl('')}/users/avatar-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed Top Bar */}
      <div className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white h-16 flex items-center justify-between px-6 shadow-sm fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
          >
            <ArrowLeft size={20} />
            <span className="text-lg font-semibold">Back</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <User className="text-blue-600 dark:text-blue-400" size={20} />
          <h1 className="text-2xl font-semibold text-blue-500">ACCOUNT SETTINGS</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 p-6 max-w-4xl mx-auto">
        {/* User Header */}
        <div className="flex items-center gap-4 mb-8">
          <UserAvatar
            avatarUrl={user?.avatar_url}
            username={user?.username}
            size="w-10 h-10"
            className="bg-gray-200 dark:bg-gray-300 text-gray-600 dark:text-gray-600"
            alt="Avatar"
          />
          <h1 className="text-2xl text-blue-600 dark:text-blue-400">{user?.username || 'Loading...'}</h1>
        </div>

        <div className="space-y-8">
          {/* Avatar Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Avatar</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
              <UserAvatar
                avatarUrl={user?.avatar_url}
                username={user?.username}
                size="w-16 h-16"
                textSize="text-2xl"
                className="bg-gray-200 dark:bg-gray-300 text-gray-600 dark:text-gray-600"
                alt="User avatar"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={isUploading}
                  className={`px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${
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

          <hr className="border-gray-300 dark:border-gray-600" />

          {/* Change Username Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Change Username</h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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

              {errors.general && (
                <p className="text-sm text-red-500 mt-1">{errors.general}</p>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>

              {successMessage && (
                <p className="mt-4 text-green-500 font-semibold">{successMessage}</p>
              )}
            </div>
          </div>

          <hr className="border-gray-300 dark:border-gray-600" />

          {/* Date Format Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Date Format</h3>
            <select
              id="dateFormat"
              value={dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <hr className="border-gray-300 dark:border-gray-600" />

          {/* Theme Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Theme</h3>
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-white rounded-full hover:bg-gray-400 dark:hover:bg-gray-700"
                title="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
          </div>

          <hr className="border-gray-300 dark:border-gray-600" />

          {/* Delete Account Section (Collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(!isDeleteOpen)}
              className="flex items-center justify-between w-full text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              Delete Account
              {isDeleteOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {isDeleteOpen && (
              <div className="mt-4 space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Deleting your account is permanent and cannot be undone. Please enter your email and password to confirm.
                </p>
                <div>
                  <label htmlFor="delete-email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="delete-email"
                    type="email"
                    value={deleteFormData.email}
                    onChange={(e) => handleDeleteInputChange('email', e.target.value)}
                    className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      deleteErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    aria-invalid={!!deleteErrors.email}
                    aria-describedby={deleteErrors.email ? 'delete-email-error' : undefined}
                  />
                  {deleteErrors.email && (
                    <p id="delete-email-error" className="text-sm text-red-500 mt-1">
                      {deleteErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="delete-password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    value={deleteFormData.password}
                    onChange={(e) => handleDeleteInputChange('password', e.target.value)}
                    className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      deleteErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    aria-invalid={!!deleteErrors.password}
                    aria-describedby={deleteErrors.password ? 'delete-password-error' : undefined}
                  />
                  {deleteErrors.password && (
                    <p id="delete-password-error" className="text-sm text-red-500 mt-1">
                      {deleteErrors.password}
                    </p>
                  )}
                </div>
                {deleteErrors.general && (
                  <p className="text-sm text-red-500 mt-1">{deleteErrors.general}</p>
                )}
                {deleteMessage && (
                  <p className="text-sm text-green-500 mt-1">{deleteMessage}</p>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeleteFormData({ email: '', password: '' });
                      setDeleteErrors({});
                      setDeleteMessage('');
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Account Deletion
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}