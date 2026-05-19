import React, { useEffect, useState } from 'react';
import { api, type Member } from '../services/api';
import MemberModal from './MemberModal';

const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const data = await api.getMembers();
    setMembers(data);
  };

  const handleAddMember = () => {
    setMemberToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setMemberToEdit(member);
    setIsModalOpen(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
      await api.deleteMember(id);
      fetchMembers();
    }
  };

  return (
    <div className="card">
      <div className="p-6 border-b border-heritage-lightBrown/20 flex justify-between items-center bg-white/50">
        <h2 className="text-2xl font-bold text-heritage-red">Danh sách thành viên</h2>
        <button 
          onClick={handleAddMember}
          className="btn-primary"
        >
          + Thêm thành viên
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-heritage-lightBrown/20">
          <thead className="bg-heritage-gold/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-heritage-brown uppercase tracking-wider">#</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-heritage-brown uppercase tracking-wider">Họ và tên</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-heritage-brown uppercase tracking-wider">Giới tính</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-heritage-brown uppercase tracking-wider">Ngày sinh</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-heritage-brown uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-heritage-lightBrown/10">
            {members.map((member, index) => (
              <tr key={member.id} className="hover:bg-heritage-cream/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-heritage-lightBrown">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-heritage-brown">{member.firstName} {member.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-heritage-brown">
                  <span className={`px-2 py-1 rounded-full text-xs ${member.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {member.gender === 'Male' ? 'Nam' : member.gender === 'Female' ? 'Nữ' : 'Khác'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-heritage-brown">{member.birthDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleEditMember(member)}
                    className="text-heritage-gold hover:text-heritage-darkGold mr-4 transition-colors"
                  >
                    Sửa
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(member.id || '')}
                    className="text-heritage-red hover:text-heritage-darkRed transition-colors"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MemberModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchMembers} 
        memberToEdit={memberToEdit} 
      />
    </div>
  );
};

export default MemberList;