import React from 'react';
import { useAuth } from '../context/AuthContext';

interface ContentManagerProps {
  title: string;
  type: 'posts' | 'events' | 'albums';
}

const ContentManager: React.FC<ContentManagerProps> = ({ title, type }) => {
  const { user } = useAuth();

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {user?.role === 'admin' && (
          <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
            + Thêm {type === 'posts' ? 'bài viết' : type === 'events' ? 'sự kiện' : 'album'}
          </button>
        )}
      </div>
      <div className="p-6 text-center text-gray-500">
        Chức năng quản lý {title.toLowerCase()} đang được phát triển.
      </div>
    </div>
  );
};

export default ContentManager;