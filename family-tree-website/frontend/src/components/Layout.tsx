import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC<{ 
  children: React.ReactNode; 
  activeTab: string; 
  setActiveTab: (tab: string) => void; 
}> = ({ children, activeTab, setActiveTab }) => {
  const { user, signInWithGoogle, signInWithFacebook, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen bg-heritage-cream">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center border-b border-heritage-lightBrown/20">
          <h1 className="text-2xl font-bold text-heritage-red">Gia Phả Dòng Họ</h1>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="font-semibold text-heritage-brown">{user.displayName}</p>
                </div>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl py-4 z-50 border border-gray-100">
                    <div className="flex flex-col items-center px-4 pb-4 border-b border-gray-100">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.displayName} className="w-20 h-20 rounded-full object-cover mb-2" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-white text-3xl font-bold mb-2">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex justify-between px-4 pt-4">
                      <button 
                        onClick={() => setActiveTab('account')}
                        className="flex items-center bg-teal-700 text-white px-4 py-2 rounded text-sm hover:bg-teal-800"
                      >
                        <span className="mr-2">👤</span> Tài khoản
                      </button>
                      <button 
                        onClick={signOut}
                        className="flex items-center bg-slate-600 text-white px-4 py-2 rounded text-sm hover:bg-slate-700"
                      >
                        <span className="mr-2">↪</span> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-2">
                <button 
                  onClick={signInWithGoogle}
                  className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                >
                  Google
                </button>
                <button 
                  onClick={signInWithFacebook}
                  className="text-sm bg-blue-800 text-white px-3 py-1 rounded hover:bg-blue-900 transition-colors"
                >
                  Facebook
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;