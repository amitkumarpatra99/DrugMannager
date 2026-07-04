import { useState, useEffect } from 'react';
import type { User } from './types';
import { Auth } from './components/Auth';
import { PatientDashboard } from './components/PatientDashboard';
import { ShopDashboard } from './components/ShopDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { getStoredSession, setStoredSession, initializeDB, addActivityLog } from './utils/storage';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Ensure local DB tables are set up
    initializeDB();
    // Load existing login session if any
    const session = getStoredSession();
    if (session) {
      setCurrentUser(session);
    }
  }, []);

  const handleLogout = () => {
    if (currentUser) {
      addActivityLog(`${currentUser.role.toUpperCase()} session ended for: ${currentUser.name || currentUser.emailOrPhone}`, 'info');
    }
    setStoredSession(null);
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Auth onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Route to the appropriate workspace based on user role gate
  switch (currentUser.role) {
    case 'patient':
      return <PatientDashboard user={currentUser} onLogout={handleLogout} />;
    case 'shop':
      return <ShopDashboard user={currentUser} onLogout={handleLogout} />;
    case 'admin':
      return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
    default:
      return <Auth onLoginSuccess={(user) => setCurrentUser(user)} />;
  }
}

export default App;
