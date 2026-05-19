import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center space-x-3 p-3 cursor-pointer transition-all duration-200 rounded-lg mb-1 ${
      active 
        ? 'bg-heritage-gold text-white font-semibold shadow-md' 
        : 'text-heritage-brown hover:bg-heritage-darkRed/10 hover:text-heritage-darkRed'
    }`}
  >
    <span className="text-lg">{icon}</span>
    <span className="text-sm">{label}</span>
  </div>
);

const Sidebar: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-64 h-screen bg-heritage-red text-heritage-cream flex flex-col shadow-2xl">
      <div className="p-8 text-center border-b border-heritage-darkRed">
        <div className="w-24 h-24 mx-auto bg-heritage-gold rounded-full border-4 border-heritage-cream/30 flex items-center justify-center overflow-hidden shadow-lg mb-4">
          <span className="text-4xl font-serif font-bold text-heritage-darkRed">GP</span>
        </div>
        <h2 className="text-xl font-bold text-heritage-cream font-serif tracking-widest uppercase">Gia Phả Đặng Tộc</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-8">
          <h3 className="px-3 mb-3 text-xs font-bold text-heritage-gold/80 uppercase tracking-widest">Dòng họ</h3>
          <SidebarItem 
            icon="🌳" 
            label="Phả đồ trực tuyến" 
            active={activeTab === 'tree'} 
            onClick={() => setActiveTab('tree')} 
          />
          <SidebarItem 
            icon="👥" 
            label="Danh sách gia phả" 
            active={activeTab === 'members'} 
            onClick={() => setActiveTab('members')} 
          />
          <SidebarItem 
            icon="📚" 
            label="Thư viện" 
            active={activeTab === 'library'} 
            onClick={() => setActiveTab('library')} 
          />
        </div>

        <div className="mb-8">
          <h3 className="px-3 mb-3 text-xs font-bold text-heritage-gold/80 uppercase tracking-widest">Tin tức</h3>
          <SidebarItem 
            icon="📰" 
            label="Bài viết" 
            active={activeTab === 'posts'} 
            onClick={() => setActiveTab('posts')} 
          />
          <SidebarItem 
            icon="📁" 
            label="Chuyên mục" 
            active={activeTab === 'categories'} 
            onClick={() => setActiveTab('categories')} 
          />
          <SidebarItem 
            icon="📅" 
            label="Sự kiện" 
            active={activeTab === 'events'} 
            onClick={() => setActiveTab('events')} 
          />
        </div>

        <div className="mb-8">
          <h3 className="px-3 mb-3 text-xs font-bold text-heritage-gold/80 uppercase tracking-widest">Website</h3>
          <SidebarItem 
            icon="⚙️" 
            label="Cấu hình" 
            active={activeTab === 'config'} 
            onClick={() => setActiveTab('config')} 
          />
          <SidebarItem 
            icon="☰" 
            label="Menu" 
            active={activeTab === 'menu'} 
            onClick={() => setActiveTab('menu')} 
          />
          <SidebarItem 
            icon="✉️" 
            label="Email" 
            active={activeTab === 'email'} 
            onClick={() => setActiveTab('email')} 
          />
        </div>
      </div>

      <div className="p-6 border-t border-heritage-darkRed text-center text-xs text-heritage-gold/60 font-medium">
        Create By Đặng Quyền
      </div>
    </div>
  );
};

export default Sidebar;