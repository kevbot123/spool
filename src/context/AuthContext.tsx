"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  isLoading: boolean;
  error: string | null; // Added error state
  fetchToken: () => Promise<void>; // Function to manually trigger token fetch if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    setIsLoading(true);
    setError(null); // Reset error before fetching
    try {
      const response = await fetch('/api/auth/session-info');
      if (!response.ok) {
        if (response.status === 401) {
          // User not logged in, clear token
          setAccessToken(null);
          console.log('AuthContext: User not authenticated.');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
      } else {
        const data = await response.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          console.log('AuthContext: Access token fetched successfully.');
        } else {
          setAccessToken(null); // Handle case where token is missing even if response is ok
        }
      }
    } catch (err) {
      console.error("AuthContext: Failed to fetch auth token:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    // Optional: Add interval refetch or logic based on token expiry if needed
  }, []);

  const value = { accessToken, isLoading, error, fetchToken };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
