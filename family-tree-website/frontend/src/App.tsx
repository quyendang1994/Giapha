import { useState } from 'react';
import Layout from './components/Layout';
import MemberList from './components/MemberList';
import FamilyTree from './components/FamilyTree';
import ContentManager from './components/ContentManager';
import AccountPage from './components/AccountPage';

function App() {
  const [activeTab, setActiveTab] = useState('members');

  const renderContent = () => {
    switch (activeTab) {
      case 'members':
        return <MemberList />;
      case 'tree':
        return <FamilyTree />;
      case 'posts':
        return <ContentManager title="Bài viết" type="posts" />;
      case 'categories':
        return <ContentManager title="Chuyên mục" type="posts" />;
      case 'events':
        return <ContentManager title="Sự kiện" type="events" />;
      case 'library':
        return <ContentManager title="Thư viện" type="albums" />;
      case 'account':
        return <AccountPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;