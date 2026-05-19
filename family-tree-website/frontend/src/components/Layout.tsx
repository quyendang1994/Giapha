import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout: React.FC<{ 
  children: React.ReactNode; 
  activeTab: string; 
  setActiveTab: (tab: string) => void; 
}> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="flex min-h-screen bg-heritage-cream">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center border-b border-heritage-lightBrown/20">
          <h1 className="text-2xl font-bold text-heritage-red">Gia Phả Dòng Họ</h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-semibold text-heritage-brown">Thanh Thủy</p>
              <p className="text-xs text-heritage-lightBrown">Quản trị viên</p>
            </div>
            <div className="w-10 h-10 bg-heritage-gold rounded-full border-2 border-white shadow-md"></div>
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