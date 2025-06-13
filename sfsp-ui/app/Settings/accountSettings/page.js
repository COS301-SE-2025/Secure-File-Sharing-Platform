'use client';
import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleUploadPhoto = () => {
    alert('Avatar upload functionality coming soon!');
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        {/* User Info Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
            {user?.username?.slice(0, 2).toUpperCase() || '??'}
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
              <div className="flex items-center gap-4">
                <div className="w-15 h-15 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold text-2xl">
                  {user?.username?.slice(0, 2).toUpperCase() || '??'}
                </div>
                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  className="px-4 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <Camera size={16} />
                  Upload photo
                </button>
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
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <p className="text-slate-400">Password change functionality coming soon...</p>
          </div>
        )}

        {activeTab === 'NOTIFICATIONS' && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
            <p className="text-slate-400">Notification settings coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}


// 'use client';
// import { useEffect, useState } from 'react';
// import { Camera } from 'lucide-react';

// export default function AccountSettings() {
//     const [activeTab, setActiveTab] = useState('MY ACCOUNT');
//     const [user, setUser] = useState(null);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isDeleting, setIsDeleting] = useState(false);
//     const [showDeleteModal, setShowDeleteModal] = useState(false);

//     const [formData, setFormData] = useState({
//         username: '',
//         email: ''
//     });

//     const [errors, setErrors] = useState({
//         username: '',
//         email: ''
//     });

//     const tabs = ['MY ACCOUNT', 'CHANGE PASSWORD', 'NOTIFICATIONS'];

//     const handleInputChange = (field, value) => {
//         setFormData(prev => ({
//         ...prev,
//         [field]: value
//         }));
//     };

//     useEffect(() => {
//         const fetchProfile = async () => {
//             const token = localStorage.getItem('token');
//             if (!token) return;

//             try {
//             const res = await fetch('http://localhost:5000/api/users/profile', {
//                 headers: {
//                 Authorization: `Bearer ${token}`,
//                 },
//             });

//             const result = await res.json();
//             if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');

//             setUser(result.data);
//             setFormData({
//                 username: result.data.firstName || '',
//                 email: result.data.email || ''
//             });
//             } catch (err) {
//             console.error('Failed to fetch profile:', err.message);
//             }
//         };

//         fetchProfile();
//     }, []);


//     const handleSaveChanges = async () => {
//         const token = localStorage.getItem('token');
//         setIsSaving(true);

//         try {
//             const res = await fetch('http://localhost:5000/api/users/profile', {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: JSON.stringify({
//                     username: formData.username,
//             })
//         });

//         if (!res.ok) {
//             throw new Error('Failed to update profile');
//         }

//         const data = await res.json();
//         console.log('Profile updated successfully:', data);
//         setFormData(prev => ({...prev, username: data.data.username }));
//     } catch (err) {
//             console.error('Error updating profile:', err.message);
//         }
//     };

//     const handleConfirmDelete = async () => {
//         const token = localStorage.getItem('token');
//         setIsDeleting(true);

//         try {
//             const res = await fetch('http://localhost:5000/api/users/profile', {
//                 method: 'DELETE',
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     email: user.email,
//                 }),
//             });

//             if (!res.ok) throw new Error("Failed to delete account");

//             localStorage.removeItem('token');
//             window.location.href = '/dashboard';
//         } catch (err) {
//             console.error("Delete error:", err.message);
//             setShowDeleteModal(false);
//         } finally {
//             setIsDeleting(false);
//         }
//     };

//     const handleDeleteClick = () => {
//         let hasError = false;
//         const newErrors = { username: '', email: '' };

//         if (!formData.username) {
//             newErrors.username = 'Username is required';
//             hasError = true;
//         }

//         if (!formData.email) {
//             newErrors.email = 'Email is required';
//             hasError = true;
//         }

//         if (
//             formData.username.trim().toLowerCase() !== user?.username?.toLowerCase()
//         ) {
//             newErrors.username = 'Username does not match your account';
//             hasError = true;
//         }

//         if (
//             formData.email.trim().toLowerCase() !== user?.email?.toLowerCase()
//         ) {
//             newErrors.email = 'Email does not match your account';
//             hasError = true;
//         }

//         if (hasError) {
//             setErrors(newErrors);
//             return;
//         }

//         setErrors({ username: '', email: '' });
//         setShowDeleteModal(true);
//     };



// return (
//     <div className = "p-6">
//         <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
//             <div className="flex items-center gap-4 mb-8">
//                 <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
//                     {user?.username?.slice(0, 2).toUpperCase() || '??'}
//                 </div>
//                 <h1 className="text-2xl text-blue-600">{user?.username || 'Loading...'}</h1>
//             </div>

//             <div className="mb-8">
//                 <div className="flex gap-8 border-b border-slate-600">
//                     {tabs.map((tab) => (
//                         <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 px-1 text-sm font-medium transition-colors ${ activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300' }`}>
//                             {tab}
//                         </button>
//                     ))}
//                 </div>
//             </div>

//             {activeTab === 'MY ACCOUNT' && (
//                 <div className="max-w-2xl">
//                     <div className="mb-8">
//                         <h3 className="text-lg font-semibold mb-2">Avatar</h3>
//                         <p className="text-sm text-slate-400 mb-4">    
//                             JPG or PNG / 8MB maximum / 250×250px minimum
//                         </p>
                        
//                         <div className="flex items-center gap-4">
//                             <div className="w-15 h-15 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold text-2xl">
//                                 {user?.username?.slice(0, 2).toUpperCase() || '??'}
//                             </div>

//                             <button className="px-4 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
//                                 <Camera size={16} />
//                                 Upload photo
//                             </button>
//                         </div>
//                     </div>

//                     <div className="space-y-6">
//                         <div>
//                             <label className="block text-sm font-medium mb-2">
//                                 Username <span className="text-red-500">*</span>
//                             </label>
//                             <input
//                                 type="text"
//                                 value={formData.username}
//                                 onChange={(e) => {
//                                 handleInputChange('username', e.target.value);
//                                 setErrors((prev) => ({ ...prev, username: '' }));
//                                 }}
//                                 className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                                 errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
//                                 }`}
//                             />
//                             {errors.username && (
//                                 <p className="text-sm text-red-500 mt-1">{errors.username}</p>
//                             )}
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium mb-2">
//                                 Email <span className="text-red-500">*</span>
//                             </label>
//                             <input
//                                 type="email"
//                                 value={formData.email}
//                                 onChange={(e) => {
//                                 handleInputChange('email', e.target.value);
//                                 setErrors((prev) => ({ ...prev, email: '' }));
//                                 }}
//                                 className={`mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                                 errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
//                                 }`}
//                             />
//                             {errors.email && (
//                                 <p className="text-sm text-red-500 mt-1">{errors.email}</p>
//                             )}
//                         </div>
//                     </div>

//                     <div className="mt-8">
//                         <button
//                             onClick={handleSaveChanges}
//                             disabled={isSaving}
//                             className="px-6 py-2 bg-blue-600 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors"
//                             >
//                             Save changes
//                         </button>
//                     </div>

//                     <div className="mt-4">
//                         <button
//                             onClick={handleDeleteClick}
//                             disabled={isDeleting}
//                             className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
//                             >
//                             {isDeleting ? "Deleting..." : "Delete Account"}
//                         </button>
//                     </div>

//                     {showDeleteModal && (
//                         <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
//                             <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg w-full max-w-md pointer-events-auto">
//                                 <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
//                                     Confirm Account Deletion
//                                 </h2>

//                                 <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
//                                     Are you sure you want to delete your account? This action cannot be undone.
//                                 </p>

//                                 <div className="flex justify-end space-x-3">
//                                     <button
//                                     onClick={() => setShowDeleteModal(false)}
//                                     className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
//                                     >
//                                         Cancel
//                                     </button>

//                                     <button
//                                     onClick={handleConfirmDelete}
//                                     disabled={isDeleting}
//                                     className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500"
//                                     >
//                                         {isDeleting ? "Deleting..." : "Delete"}
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* Placeholder content for other tabs */}
//             {activeTab === 'CHANGE PASSWORD' && (
//                 <div className="max-w-2xl">
//                     <h3 className="text-lg font-semibold mb-4">Change Password</h3>
//                     <p className="text-slate-400">Password change functionality coming soon...</p>
//                 </div>
//             )}

//             {activeTab === 'NOTIFICATIONS' && (
//                 <div className="max-w-2xl">
//                     <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
//                     <p className="text-slate-400">Notification settings coming soon...</p>
//                 </div>
//             )}
//         </div>
//     </div>
//     );
// }