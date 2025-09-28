// AccountSettings.jsx
'use client';
import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, ArrowLeft, User, Shield, Bell, Palette, Camera, Trash2, Sun, Moon, ChevronUp, ChevronDown, Monitor, Smartphone, Laptop, X, RefreshCw, CheckCircle, AlertCircle, AlertTriangle, Lock, Info, Copy, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UserAvatar } from '@/app/lib/avatarUtils';
import { getApiUrl } from '@/lib/api-config';
import axios from 'axios';
import { format, formatDistance } from 'date-fns';

export default function AccountSettings() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const tabs = ['MY ACCOUNT', 'SECURE PASSWORD RESET', 'NOTIFICATIONS', 'DEVICES'];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [errors, setErrors] = useState({ username: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
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
    },
  });
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    resetPIN: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStep, setPasswordStep] = useState('mnemonic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState(Array(10).fill(''));
  const [mnemonicErrors, setMnemonicErrors] = useState(Array(10).fill(''));
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteFormData, setDeleteFormData] = useState({ email: '', password: '' });
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteMessage, setDeleteMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSessionRevokeModal, setShowSessionRevokeModal] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  
  // Password requirements and visibility state
  const [passwordRequirements, setPasswordRequirements] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  // Session management state
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [isRevokingSession, setIsRevokingSession] = useState(false);

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

  // ------------------------------ Load Notification Settings ----------------------------------------
  useEffect(() => {
    async function fetchNotificationSettings() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok && result.data?.notificationSettings) {
          setNotificationSettings(result.data.notificationSettings);
          localStorage.setItem('notificationSettings', JSON.stringify(result.data.notificationSettings));
        } else {
          const savedSettings = localStorage.getItem('notificationSettings');
          if (savedSettings) {
            setNotificationSettings(JSON.parse(savedSettings));
          }
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error.message);
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
          setNotificationSettings(JSON.parse(savedSettings));
        }
      }
    }

    fetchNotificationSettings();
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

  // ------------------------------ Sidebar Collapse Logic ----------------------------------------
  useEffect(() => {
    const savedState = localStorage.getItem('settingsSidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // ------------------------------ Date Format Logic ----------------------------------------
  useEffect(() => {
    const savedDateFormat = localStorage.getItem('dateFormat');
    if (savedDateFormat) {
      setDateFormat(savedDateFormat);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('settingsSidebarCollapsed', JSON.stringify(newState));
  };

  const showExpanded = !isCollapsed || isHovered;

  const tabsWithIcons = [
    { name: 'MY ACCOUNT', icon: User },
    { name: 'SECURE PASSWORD RESET', icon: Shield },
    { name: 'NOTIFICATIONS', icon: Bell },
    { name: 'DEVICES', icon: Laptop },
  ];

  // ------------------------------------Sidebar Toggle Logic------------------------------------

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

  const handlePasswordInputChange = (field, value) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'newPassword') {
      const requirements = {
        hasMinLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
      };
      setPasswordRequirements(requirements);
    }
  };

  const validateCurrentPassword = async () => {
    setIsProcessing(true);
    setPasswordErrors({});

    try {
      const response = await fetch(`${getApiUrl('')}/users/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
        }),
      });

      if (response.ok) {
        const pinResponse = await fetch(`${getApiUrl('')}/users/send-reset-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (pinResponse.ok) {
          setPasswordStep('pin');
          setPasswordMessage('A 5-character PIN has been sent to your email. Please check your inbox.');
          setTimeout(() => setPasswordMessage(''), 5000);
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

  const validatePIN = async () => {
    if (!passwordData.resetPIN || passwordData.resetPIN.length !== 5) {
      setPasswordErrors({ resetPIN: 'Please enter the 5-character PIN from your email' });
      return;
    }

    try {
      const response = await fetch(`${getApiUrl('')}/users/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ pin: passwordData.resetPIN }),
      });

      if (response.ok) {
        setPasswordStep('newPassword');
        setPasswordMessage('PIN verified! Now enter your new password.');
        setTimeout(() => setPasswordMessage(''), 5000);
      } else {
        const error = await response.json();
        setPasswordErrors({ resetPIN: error.message || 'Invalid PIN' });
      }
    } catch (error) {
      setPasswordErrors({ resetPIN: 'Network error. Please try again.' });
    }
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
      const response = await fetch(`${getApiUrl('/users/change-password')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          mnemonicWords: mnemonicWords,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setPasswordMessage(`Password changed successfully! Your new recovery mnemonic is: ${data.newMnemonicWords.join(' ')}`);

        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          resetPIN: '',
        });
        setMnemonicWords(Array(10).fill(''));
        setMnemonicErrors(Array(10).fill(''));
        setPasswordStep('mnemonic');
        setPasswordErrors({});

        setTimeout(() => setPasswordMessage(''), 10000);
      } else {
        const error = await response.json();
        setPasswordErrors({ general: error.message || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordErrors({ general: 'Network error. Please try again.' });
    }

    setIsProcessing(false);
  };

  const handleMnemonicWordChange = (index, value) => {
    const newWords = [...mnemonicWords];
    newWords[index] = value;
    setMnemonicWords(newWords);

    if (mnemonicErrors[index]) {
      const newErrors = [...mnemonicErrors];
      newErrors[index] = '';
      setMnemonicErrors(newErrors);
    }
  };

  const validateMnemonic = async () => {
    setIsProcessing(true);
    setPasswordMessage('');
    setMnemonicErrors(Array(10).fill(''));

    const emptyIndices = mnemonicWords
      .map((word, index) => (!word.trim() ? index : -1))
      .filter(index => index !== -1);

    if (emptyIndices.length > 0) {
      const newErrors = [...mnemonicErrors];
      emptyIndices.forEach(index => {
        newErrors[index] = 'Required';
      });
      setMnemonicErrors(newErrors);
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-mnemonic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          mnemonicWords: mnemonicWords,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordMessage('Mnemonic verified successfully! You can now set your new password.');
        setPasswordStep('newPassword');
      } else {
        const error = await response.json();
        if (error.invalidWords && Array.isArray(error.invalidWords)) {
          const newErrors = [...mnemonicErrors];
          error.invalidWords.forEach(index => {
            newErrors[index] = 'Invalid word';
          });
          setMnemonicErrors(newErrors);
          setPasswordMessage('Some mnemonic words are incorrect. Please check and try again.');
        } else {
          setPasswordMessage(error.message || 'Invalid mnemonic phrase. Please check your words and try again.');
        }
      }
    } catch (error) {
      setPasswordMessage('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyMnemonic = async (mnemonicText) => {
    try {
      await navigator.clipboard.writeText(mnemonicText);
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2000);
    } catch (error) {
      console.error('Failed to copy mnemonic:', error);
    }
  };

  const resetPasswordFlow = () => {
    setPasswordStep('mnemonic');
    setMnemonicWords(Array(10).fill(''));
    setMnemonicErrors(Array(10).fill(''));
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      resetPIN: '',
    });
    setPasswordErrors({});
    setPasswordMessage('');
  };

  const handleNotificationChange = (category, setting, value) => {
    setNotificationSettings((prev) => {
      const updatedSettings = {
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: value,
        },
      };
      localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  };

  const handleSaveNotifications = async () => {
    setIsUpdatingNotifications(true);
    setNotificationMessage('');

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${getApiUrl('')}/users/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notificationSettings),
      });

      if (response.ok) {
        localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
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

  // ------------------------------ Session Management Logic ----------------------------------------
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    setSessionError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }
      
      console.log('Fetching sessions...');
      
      const response = await axios.get(`${API_BASE_URL}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('Sessions received:', response.data.data);
        
        let userLocation = null;
        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          const geoData = await geoResponse.json();
          if (geoData && geoData.city && geoData.country_name) {
            userLocation = geoData.region 
              ? `${geoData.city}, ${geoData.region}, ${geoData.country_name}`
              : `${geoData.city}, ${geoData.country_name}`;
            console.log('Retrieved user location from client:', userLocation);
          }
        } catch (err) {
          console.error('Failed to get location from client-side:', err);
        }
        
        const updatedSessions = response.data.data.map(session => {
          // Determine if current session based only on recency
          const isCurrentSession = 
            session.last_login_at && 
            (Date.now() - new Date(session.last_login_at).getTime()) < (1000 * 60 * 5);
            
          if (isCurrentSession && userLocation && 
              (session.location === 'Local Network' || !session.location || session.location === 'Unknown Location')) {
            return { 
              ...session, 
              location: userLocation,
              ip_address: session.ip_address === "140.0.0.0" ? "" : session.ip_address,
              browser_version: session.browser_version === "140.0.0.0" ? "" : session.browser_version 
            };
          }
          return { 
            ...session, 
            ip_address: session.ip_address === "140.0.0.0" ? "" : session.ip_address,
            browser_version: session.browser_version === "140.0.0.0" ? "" : session.browser_version 
          };
        });
        
        setSessions(updatedSessions);
        
        console.log('Sessions state updated with client-side enhancement');
      } else {
        console.error('Failed to load session data:', response.data);
        setSessionError('Failed to load session data');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessionError(
        error.response?.data?.message || 'Failed to load session data'
      );
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const confirmSessionRevoke = (sessionId, isCurrentDevice) => {
    setSessionToRevoke({
      id: sessionId,
      isCurrentDevice
    });
    setShowSessionRevokeModal(true);
  };

  const handleConfirmSessionRevoke = () => {
    if (sessionToRevoke) {
      handleRevokeSession(sessionToRevoke.id, sessionToRevoke.isCurrentDevice);
      setShowSessionRevokeModal(false);
    }
  };

  const handleCancelSessionRevoke = () => {
    setShowSessionRevokeModal(false);
    setSessionToRevoke(null);
  };

  const handleRevokeSession = async (sessionId, isCurrentDevice) => {
    setIsRevokingSession(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }
      
      console.log('Revoking session:', sessionId, 'Is current device:', isCurrentDevice);
      
      const response = await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        if (isCurrentDevice) {
          console.log('Current device session revoked, logging out...');
          localStorage.removeItem('token');
          sessionStorage.clear();
          
          setSessionError('Your current session has been revoked. Redirecting to login...');
          
          setTimeout(() => {
            console.log('Redirecting to login page...');
            window.location.href = '/auth/login';
          }, 1500);
        } else {
          setSessions(sessions.filter(session => session.id !== sessionId));
        }
      } else {
        setSessionError('Failed to revoke session');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      setSessionError(
        error.response?.data?.message || 'Failed to revoke session'
      );
    } finally {
      setIsRevokingSession(false);
      setShowSessionRevokeModal(false);
      setSessionToRevoke(null);
    }
  };

  const checkToken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return false;
      }

      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.success;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  useEffect(() => {
    if (activeTab === 'DEVICES' && mounted && typeof window !== 'undefined') {
      checkToken().then(isValid => {
        if (isValid) {
          console.log('Loading sessions for DEVICES tab');
          fetchSessions();
        } else {
          setSessionError('Your session has expired. Please log in again.');
        }
      });
    }
  }, [activeTab, mounted]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div 
        className={`${
          showExpanded ? 'w-64' : 'w-16'
        } bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white p-6 flex flex-col shadow-md min-h-screen transition-all duration-300 ease-in-out`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header Section */}
        <div className="flex items-center mb-8">
          {showExpanded ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              <ArrowLeft size={20} />
              <span className="text-lg font-semibold">Settings</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center w-full text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1">
          {tabsWithIcons.map((tab) => {
            const Icon = tab.icon;
            return (
              <div key={tab.name} className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.name)}
                  className={`py-2 px-4 text-left text-sm rounded-md transition-colors w-full flex items-center gap-3
                    ${showExpanded ? '' : 'justify-center'}
                    ${
                      activeTab === tab.name
                        ? 'bg-blue-100 dark:bg-[#2A3548] text-blue-700 dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-300 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-white'
                    }`}
                >
                  <Icon size={18} />
                  {showExpanded && <span>{tab.name}</span>}
                </button>
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && !isHovered && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {tab.name}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pin/Unpin Toggle Button */}
        <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-600">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-full p-3 rounded-lg hover:bg-blue-300 dark:hover:bg-gray-700 transition-colors"
            title={isCollapsed ? 'Pin Sidebar Open' : 'Auto-Hide Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            {showExpanded && (
              <span className="ml-2 text-sm">
                {isCollapsed ? 'Pin Open' : 'Auto-Hide'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
        <div className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white h-16 flex items-center px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-blue-500 ">ACCOUNT SETTINGS</h1>
          </div>
        </div>

        <div className="p-6">
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

          {activeTab === 'MY ACCOUNT' && (
            <div className="max-w-2xl space-y-8">
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
            )}

          {activeTab === 'SECURE PASSWORD RESET' && (
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Secure Password Reset</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Verify your identity using your recovery mnemonic phrase
                  </p>
                </div>
                {!user?.is_google_user && passwordStep !== 'mnemonic' && (
                  <button
                    type="button"
                    onClick={resetPasswordFlow}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                  >
                    ← Back to Mnemonic
                  </button>
                )}
              </div>
              
              {user?.is_google_user && (
                <div className="mb-6 p-6 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-base font-medium text-blue-800 dark:text-blue-300">Google Account Authentication</h3>
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                        <p>You signed in using your Google account. Password management is handled through Google.</p>
                        <p className="mt-2">To change your password, please visit your Google account settings at <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="font-medium underline">Google Security Settings</a>.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!user?.is_google_user && passwordMessage && (
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    passwordMessage.includes('successfully')
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                      : passwordMessage.includes('verified')
                      ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {passwordMessage.includes('successfully') && <CheckCircle size={20} className="mt-0.5" />}
                    {passwordMessage.includes('verified') && <Shield size={20} className="mt-0.5" />}
                    {!passwordMessage.includes('successfully') && !passwordMessage.includes('verified') && <AlertCircle size={20} className="mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{passwordMessage.split('!')[0]}!</p>
                      {passwordMessage.includes('recovery mnemonic') && (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your New Recovery Mnemonic:</p>
                            <button
                              onClick={() => handleCopyMnemonic(passwordMessage.split('mnemonic is: ')[1])}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy size={14} />
                              <span className="text-xs">{copiedMnemonic ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                          <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded border text-center break-words">
                            {passwordMessage.split('mnemonic is: ')[1]}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            ⚠️ Save these words securely. They are required to recover your account if you forget your password.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!user?.is_google_user && passwordStep === 'mnemonic' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <Shield size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Mnemonic Verification</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Enter your 10-word recovery phrase in order</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      {mnemonicWords.map((word, index) => (
                        <div key={index} className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                            Word {index + 1}
                          </label>
                          <input
                            type="text"
                            value={word}
                            onChange={(e) => handleMnemonicWordChange(index, e.target.value)}
                            className={`w-full px-3 py-2 text-center border rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                              mnemonicErrors[index] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder={`Word ${index + 1}`}
                          />
                          {mnemonicErrors[index] && (
                            <p className="text-xs text-red-500 text-center">{mnemonicErrors[index]}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Security Tip:</span> Your mnemonic phrase is your master key to account recovery
                      </div>
                      <button
                        type="button"
                        onClick={validateMnemonic}
                        disabled={isProcessing || mnemonicWords.some(word => !word.trim())}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Shield size={18} />
                            <span>Verify Mnemonic</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start space-x-2">
                        <Info size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <span className="font-medium">Can't find your mnemonic?</span>
                          <p className="mt-1">Check your email from registration, password recovery emails, or secure storage where you saved them during account setup.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Important Security Information</h5>
                        <ul className="text-xs text-yellow-700 dark:text-yellow-200 space-y-1">
                          <li>• Never share your mnemonic phrase with anyone</li>
                          <li>• Store it securely offline in multiple locations</li>
                          <li>• This phrase gives full access to your account</li>
                          <li>• If lost, account recovery may be impossible</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!user?.is_google_user && passwordStep === 'newPassword' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <Lock size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Set New Password</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Create a strong, secure password for your account</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                            className={`w-full px-4 py-3 pr-12 border rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                              passwordErrors.newPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter your new password (min 8 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="text-sm text-red-500 mt-1">{passwordErrors.newPassword}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Confirm New Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                            className={`w-full px-4 py-3 pr-12 border rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                              passwordErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Confirm your new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <p className="text-sm text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
                        )}
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-2">
                          <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            <span className="font-medium">Password Requirements:</span>
                            <ul className="mt-2 space-y-1">
                              <li className={`flex items-center space-x-2 ${passwordRequirements.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                <CheckCircle size={14} className={passwordRequirements.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                                <span>At least 8 characters long</span>
                              </li>
                              <li className={`flex items-center space-x-2 ${passwordRequirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                <CheckCircle size={14} className={passwordRequirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                                <span>Include uppercase letter</span>
                              </li>
                              <li className={`flex items-center space-x-2 ${passwordRequirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                <CheckCircle size={14} className={passwordRequirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                                <span>Include lowercase letter</span>
                              </li>
                              <li className={`flex items-center space-x-2 ${passwordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                <CheckCircle size={14} className={passwordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                                <span>Include at least one number</span>
                              </li>
                              <li className={`flex items-center space-x-2 ${passwordRequirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                <CheckCircle size={14} className={passwordRequirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                                <span>Include special character</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setPasswordStep('mnemonic')}
                          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={isProcessing || !passwordData.newPassword || !passwordData.confirmPassword}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={18} />
                              <span>Update Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Settings</h3>
              </div>

              {notificationMessage && (
                <div
                  className={`mb-6 p-3 rounded-md ${
                    notificationMessage.includes('successfully')
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {notificationMessage}
                </div>
              )}

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Alerts</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Email me when:</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-900 dark:text-white">I&apos;m running out of space</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.alerts.runningOutOfSpace}
                            onChange={(e) =>
                              handleNotificationChange('alerts', 'runningOutOfSpace', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-900 dark:text-white">I delete a large number of files</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.alerts.deleteLargeFiles}
                            onChange={(e) =>
                              handleNotificationChange('alerts', 'deleteLargeFiles', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-900 dark:text-white">A new browser is used to sign in</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.alerts.newBrowserSignIn}
                            onChange={(e) =>
                              handleNotificationChange('alerts', 'newBrowserSignIn', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-900 dark:text-white">A new device is linked</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.alerts.newDeviceLinked}
                            onChange={(e) =>
                              handleNotificationChange('alerts', 'newDeviceLinked', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-900 dark:text-white">A new app is connected</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.alerts.newAppConnected}
                            onChange={(e) =>
                              handleNotificationChange('alerts', 'newAppConnected', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="ml-32 w-full max-w-xl">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">News</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Email me about:</p>
                    <div className="space-y-3">
                      <div className="flex items-center py-2 pr-4">
                        <span className="text-sm text-gray-900 dark:text-white min-w-[250px]">New features and updates</span>
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
                        <span className="text-sm text-gray-900 dark:text-white min-w-[250px]">Tips on using SecureShare</span>
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
                        <span className="text-sm text-gray-900 dark:text-white min-w-[250px]">SecureShare feedback surveys</span>
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

                <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Files</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Email me about:</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-900 dark:text-white">Activity in shared folders (weekly digest)</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.files.sharedFolderActivity}
                          onChange={(e) =>
                            handleNotificationChange('files', 'sharedFolderActivity', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

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

          {/* Devices & Sessions Tab */}
          {activeTab === 'DEVICES' && (
            <div className="max-w-2xl relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Devices & Sessions</h3>
                <button
                  onClick={fetchSessions}
                  disabled={isLoadingSessions}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <RefreshCw size={16} className={isLoadingSessions ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {sessionError && (
                <div className="mb-6 p-3 rounded-md bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  {sessionError}
                </div>
              )}

              {isLoadingSessions ? (
                <div className="text-center py-10">
                  <div className="animate-spin h-10 w-10 mx-auto mb-4 text-blue-600">
                    <RefreshCw size={40} />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">Loading your devices...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-300">No active sessions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                      Session Management
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Your current session is highlighted in green. Other sessions are listed by most recent activity.
                    </p>
                  </div>
                  
                  {sessions
                    .sort((a, b) => {
                      // Use the same current session detection logic
                      const currentUA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
                      
                      const getIsCurrent = (session) => {
                        // Use recency-based detection instead of browser-specific
                        return session.last_login_at && 
                          (Date.now() - new Date(session.last_login_at).getTime()) < (1000 * 60 * 5);
                      };
                      const aIsCurrent = getIsCurrent(a);
                      const bIsCurrent = getIsCurrent(b);
                      
                      if (aIsCurrent && !bIsCurrent) return -1;
                      if (!aIsCurrent && bIsCurrent) return 1;
                      return new Date(b.last_login_at || 0) - new Date(a.last_login_at || 0);
                    })
                    .map((session) => {
                    // Determine device icon
                    let DeviceIcon = Laptop;
                    if (session.is_mobile) DeviceIcon = Smartphone;
                    else if (session.is_tablet) DeviceIcon = Monitor;
                    
                    // Format the last login date
                    const lastLogin = session.last_login_at ? new Date(session.last_login_at) : new Date();
                    const formattedDate = format(lastLogin, 'MMM d, yyyy h:mm a');
                    const timeAgo = formatDistance(lastLogin, new Date(), { addSuffix: true });
                    
                    // Is this the current device?
                    // Use recency-based detection instead of browser-specific
                    const finalIsCurrentDevice = 
                      session.last_login_at &&
                      (Date.now() - new Date(session.last_login_at).getTime()) < (1000 * 60 * 5); // Within 5 minutes

                    return (
                      <div
                        key={session.id}
                        className={`p-4 border-2 rounded-lg ${
                          finalIsCurrentDevice 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg ring-2 ring-green-200 dark:ring-green-800' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${
                              finalIsCurrentDevice 
                                ? 'bg-green-100 dark:bg-green-800' 
                                : 'bg-blue-100 dark:bg-blue-900'
                            }`}>
                              <DeviceIcon className={`h-6 w-6 ${
                                finalIsCurrentDevice 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-blue-600 dark:text-blue-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                                {session.browser_name || 'Unknown browser'} on {session.os_name || 'Unknown OS'}
                                {finalIsCurrentDevice && (
                                  <span className="ml-3 px-4 py-2 text-sm font-bold bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center shadow-lg">
                                    <span className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></span>
                                    Current
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {session.device_type || 'Unknown device'} 
                                {session.browser_version && session.browser_version !== "140.0.0.0" ? ` • ${session.browser_version}` : ""} 
                                {session.os_version ? ` • ${session.os_version}` : ""}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Last active {timeAgo} ({formattedDate})
                              </p>
                              <div className="flex items-center mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  <span className="font-medium">IP:</span> {
                                    (session.ip_address === "::1" || session.ip_address === "127.0.0.1" || 
                                     session.ip_address === "140.0.0.0" || session.ip_address?.startsWith("140.")) ? 
                                      "Private Network Address" : 
                                      session.ip_address || 'Unknown'
                                  } • 
                                  <span className="font-medium">Location:</span> {session.location || 'Unknown'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => confirmSessionRevoke(session.id, finalIsCurrentDevice)}
                            disabled={isRevokingSession || finalIsCurrentDevice}
                            className={`text-red-600 hover:text-red-500 focus:outline-none transition-colors ${
                              finalIsCurrentDevice ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md' : ''
                            }`}
                            title={finalIsCurrentDevice ? "Cannot revoke your current session" : "Revoke access"}
                          >
                            {finalIsCurrentDevice ? (
                              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active</span>
                            ) : (
                              <X size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md text-sm">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Security Tip</h4>
                  <p className="text-yellow-700 dark:text-yellow-200">
                    If you notice any devices or locations you don't recognize, revoke access immediately and change your password.
                  </p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md text-sm mt-4">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-1">Current Session</h4>
                  <p className="text-green-700 dark:text-green-200">
                    Your current session is always listed first and highlighted in green. For privacy and security, your actual location is displayed for your current session.
                  </p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md text-sm mt-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Privacy & Security Information</h4>
                  <p className="text-blue-700 dark:text-blue-200">
                    For security reasons, your actual IP address is not displayed. Your location is determined based on your network connection and may be used to identify suspicious login attempts.
                  </p>
                </div>
              </div>
            </div>
          )}
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

      {/* Session Revoke Confirmation Modal */}
      {showSessionRevokeModal && sessionToRevoke && activeTab === 'DEVICES' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {sessionToRevoke.isCurrentDevice 
                ? "Sign out from current device?" 
                : "Revoke device access?"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {sessionToRevoke.isCurrentDevice 
                ? "You are about to sign out from your current device. You will be logged out immediately and redirected to the login page." 
                : "This will revoke access for this device. The user will need to log in again to access their account."}
            </p>
            {sessionToRevoke.isCurrentDevice && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-md mb-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  Warning: You will be logged out immediately after confirming.
                </p>
              </div>
            )}
            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancelSessionRevoke}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSessionRevoke}
                className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
              >
                {sessionToRevoke.isCurrentDevice ? "Sign Out" : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}