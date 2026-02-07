import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { RegisteredUser } from '../types';

interface User {
  name: string;
  username: string;
  role: 'medic' | 'doctor';
}

interface AuthContextType {
  user: User | null;
  register: (userData: RegisteredUser) => Promise<{ success: boolean; message: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get users from storage. This is the single source of truth.
const getRegisteredUsersFromStorage = (): RegisteredUser[] => {
    try {
        const savedUsersJSON = localStorage.getItem('registeredUsers');
        // If storage exists and is not empty, parse it.
        if (savedUsersJSON) {
            return JSON.parse(savedUsersJSON);
        }
    } catch (error) {
        console.error("Failed to parse users from localStorage:", error);
        // If parsing fails, fall back to default.
    }
    // If nothing in storage, create and persist default users.
    const defaultUsers: RegisteredUser[] = [
        { name: 'طبيب افتراضي', username: 'doctor', password: 'password', role: 'doctor' },
        { name: 'مسعف افتراضي', username: 'medic', password: 'password', role: 'medic' },
    ];
    localStorage.setItem('registeredUsers', JSON.stringify(defaultUsers));
    return defaultUsers;
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Effect to load the logged-in user session on initial app load.
  useEffect(() => {
    try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    } catch {
        // Handle potential parsing errors gracefully
        setUser(null);
    }
  }, []);


  const register = async (userData: RegisteredUser): Promise<{ success: boolean; message: string }> => {
    const trimmedUsername = userData.username.trim();
    const trimmedPassword = userData.password.trim();

    if (!trimmedUsername || !trimmedPassword) {
        return { success: false, message: 'اسم المستخدم وكلمة المرور لا يمكن أن تكون فارغة.' };
    }
    
    // 1. Read the latest user list directly from the "database" (localStorage).
    const currentUsers = getRegisteredUsersFromStorage();
    
    // 2. Check for duplicates.
    if (currentUsers.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
        return { success: false, message: 'اسم المستخدم هذا موجود بالفعل.' };
    }

    // 3. Add the new user.
    const newUser = { ...userData, username: trimmedUsername, password: trimmedPassword };
    const updatedUsers = [...currentUsers, newUser];

    // 4. Write the updated list back to the "database".
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    
    return { success: true, message: 'تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.' };
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // 1. Read the definitive user list directly from the "database" at the moment of login.
    const currentUsers = getRegisteredUsersFromStorage();
    
    // 2. Find the user based on credentials.
    const foundUser = currentUsers.find(
      u => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.password === trimmedPassword
    );

    if (foundUser) {
        // 3. If found, create the session object.
        const loggedInUser: User = {
            name: foundUser.name,
            username: foundUser.username,
            role: foundUser.role,
        };
        // 4. Persist the session in the "database" and update the app's state.
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
    }
    
    // 5. If not found, return an error.
    return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};