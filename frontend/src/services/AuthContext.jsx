import { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ name: '', role: '', category: '', location: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData({
              name: data.name || firebaseUser.displayName || 'User',
              role: data.role || 'user',
              category: data.category || '',
              location: data.location || ''
            });
          } else {
            const supplierRef = doc(db, 'suppliers', firebaseUser.uid);
            const supplierSnap = await getDoc(supplierRef);

            if (supplierSnap.exists()) {
              const data = supplierSnap.data();
              setUserData({
                name: data.name || firebaseUser.displayName || 'Supplier',
                role: 'supplier', 
                category: data.category || '',
                location: data.location || '',
                vendorId: data.vendorId || ''
              });
            } else {
              setUserData({
                name: firebaseUser.displayName || 'User',
                role: 'user',
                category: '',
                location: ''
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData({
            name: firebaseUser.displayName || 'User',
            role: 'user',
            category: '',
            location: ''
          });
        }
      } else {
        setUser(null);
        setUserData({ name: '', role: '', category: '', location: '' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  const isRole = (role) => userData.role === role;
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      ...userData, 
      loading,
      isAdmin: isRole('admin'),
      isSupplier: isRole('supplier'),
      isUser: isRole('user'),
      isAuthenticated,
      signOut
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);