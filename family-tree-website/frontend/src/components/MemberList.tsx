import React, { useEffect, useState } from 'react';
import { api, type Member } from '../services/api';
import MemberModal from './MemberModal';
import { useAuth } from '../context/AuthContext';

const MemberList: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const getMemberName = (id?: string) => {
    if (!id) return 'Chưa có';
    const member = members.find((item) => item.id === id);
    return member ? `${member.firstName} ${member.lastName}`.trim() : 'Không tìm thấy';
  };

  const formatValue = (value?: string) => (value && value.trim() ? value : 'Chưa có');

  const normalizeSearchText = (value?: string) =>
    (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filteredMembers = members.filter((member) => {
    const keyword = normalizeSearchText(searchTerm.trim());
    if (!keyword) return true;

    const genderLabel = member.gender === 'Male' ? 'Nam' : member.gender === 'Female' ? 'Nữ' : 'Khác';
    const searchableText = [
      member.firstName,
      member.lastName,
      `${member.firstName} ${member.lastName}`,
      genderLabel,
      member.birthDate,
      member.deathDate,
      member.bio,
      member.order,
      member.address,
      member.phone,
      member.maritalStatus,
      member.education,
      member.bloodType,
      getMemberName(member.fatherId),
      getMemberName(member.motherId),
    ]
      .map(normalizeSearchText)
      .join(' ');

    return searchableText.includes(keyword);
  });

  const handleDeleteMember = async (id: string) => {
    const hasChildren = members.some((member) => member.fatherId === id || member.motherId === id);
    if (hasChildren) {
      alert('Không thể xóa thành viên này vì đang có thế hệ con. Vui lòng xóa hoặc chuyển liên kết thế hệ con trước.');
      return;
    }

    if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
      await api.deleteMember(id);
      fetchMembers();
    }
  };

  return (
    <div className="card">
      <div className="p-6 border-b border-heritage-lightBrown/20 bg-white/50">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h2 className="text-2xl font-bold text-heritage-red">Danh sách thành viên</h2>
          {user?.role === 'admin' && (
            <button 
              onClick={handleAddMember}
              className="btn-primary"
            >
              + Thêm thành viên
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-heritage-lightBrown">
              🔎
            </span>
            <input
              className="input-field w-full border rounded-lg pr-10 py-3"
              style={{ paddingLeft: '2.75rem' }}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm theo tên, giới tính, ngày sinh, cha/mẹ, số điện thoại..."
              aria-label="Tìm kiếm thành viên"
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-heritage-lightBrown hover:text-heritage-red"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-sm text-heritage-lightBrown whitespace-nowrap">
            Hiển thị {filteredMembers.length}/{members.length} thành viên
          </div>
        </div>
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
            {filteredMembers.map((member, index) => (
              <tr
                key={member.id}
                className="hover:bg-heritage-cream/50 transition-colors cursor-pointer"
                onClick={() => setSelectedMember(member)}
                title="Bấm để xem thông tin chi tiết"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-heritage-lightBrown">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-heritage-brown">{member.firstName} {member.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-heritage-brown">
                  <span className={`px-2 py-1 rounded-full text-xs ${member.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {member.gender === 'Male' ? 'Nam' : member.gender === 'Female' ? 'Nữ' : 'Khác'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-heritage-brown">{member.birthDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user?.role === 'admin' && (
                    <>
                      <button 
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditMember(member);
                        }}
                        className="text-heritage-gold hover:text-heritage-darkGold mr-4 transition-colors"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteMember(member.id || '');
                        }}
                        className="text-heritage-red hover:text-heritage-darkRed transition-colors"
                      >
                        Xóa
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="py-10 text-center text-heritage-lightBrown">
            Không tìm thấy thành viên phù hợp với từ khóa “{searchTerm}”.
          </div>
        )}
      </div>
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white w-full max-w-5xl rounded-lg shadow-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 py-3 border-b bg-heritage-cream/60">
              <h3 className="text-2xl font-semibold text-heritage-red">Thông tin thành viên</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-2xl leading-none text-heritage-brown hover:text-heritage-red"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-56 h-56 rounded-lg bg-heritage-cream flex items-center justify-center overflow-hidden border border-heritage-lightBrown/20">
                  {selectedMember.photoUrl ? (
                    <img
                      src={selectedMember.photoUrl}
                      alt={`${selectedMember.firstName} ${selectedMember.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl text-heritage-lightBrown">👤</div>
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="text-3xl font-bold text-heritage-brown">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </h4>
                  <div className="mt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedMember.gender === 'Male'
                          ? 'bg-blue-100 text-blue-700'
                          : selectedMember.gender === 'Female'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedMember.gender === 'Male' ? 'Nam' : selectedMember.gender === 'Female' ? 'Nữ' : 'Khác'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 text-base">
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Ngày sinh</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.birthDate)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Ngày mất</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.deathDate)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Cha</div>
                      <div className="text-heritage-brown">{getMemberName(selectedMember.fatherId)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Mẹ</div>
                      <div className="text-heritage-brown">{getMemberName(selectedMember.motherId)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Thứ tự</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.order)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Tình trạng hôn nhân</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.maritalStatus)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Số điện thoại</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.phone)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Nhóm máu</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.bloodType)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Học vấn</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.education)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-heritage-lightBrown">Địa chỉ</div>
                      <div className="text-heritage-brown">{formatValue(selectedMember.address)}</div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="font-semibold text-heritage-lightBrown">Chức danh / Ghi chú</div>
                    <div className="text-heritage-brown whitespace-pre-wrap">{formatValue(selectedMember.bio)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button className="btn-primary px-5 py-2 rounded" onClick={() => setSelectedMember(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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