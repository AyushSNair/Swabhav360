import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { FIREBASE_AUTH } from '../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_DB } from '../FirebaseConfig';
import { View, ActivityIndicator } from 'react-native';

type AuthContextType = {
  user: User | null;
  hasProfile: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  hasProfile: false,
  loading: true,
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkProfile = async (user: User) => {
    if (!user) return false;
    
    try {
      const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
      return userDoc.exists() && userDoc.data()?.profileComplete === true;
    } catch (error) {
      console.error('Error checking profile:', error);
      return false;
    }
  };

  const refreshUser = async () => {
    if (user) {
      const profileComplete = await checkProfile(user);
      setHasProfile(profileComplete);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        const profileComplete = await checkProfile(user);
        setHasProfile(profileComplete);
        setUser(user);
      } else {
        setUser(null);
        setHasProfile(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, hasProfile, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
