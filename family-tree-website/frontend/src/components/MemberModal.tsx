import React, { useState, useEffect } from 'react';
import { api, type Member } from '../services/api';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  memberToEdit?: Member | null;
}

const MemberModal: React.FC<MemberModalProps> = ({ isOpen, onClose, onSave, memberToEdit }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    fatherId: '',
    motherId: '',
    // Add other fields as needed based on the screenshot
  });
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchAllMembers = async () => {
      const membersData = await api.getMembers();
      setAllMembers(membersData);
    };
    fetchAllMembers();
  }, []);

  useEffect(() => {
    if (memberToEdit) {
      setFormData({
        firstName: memberToEdit.firstName,
        lastName: memberToEdit.lastName,
        gender: memberToEdit.gender,
        birthDate: memberToEdit.birthDate,
        fatherId: memberToEdit.fatherId || '',
        motherId: memberToEdit.motherId || '',
        // Populate other fields
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        gender: '',
        birthDate: '',
        fatherId: '',
        motherId: '',
      });
    }
  }, [memberToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const memberData: any = {
      ...formData,
      gender: formData.gender === 'Nam' ? 'Male' : formData.gender === 'Nữ' ? 'Female' : 'Other'
    };

    if (memberToEdit && memberToEdit.id) {
      await api.updateMember(memberToEdit.id, memberData);
    } else {
      await api.createMember(memberData);
    }
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 backdrop-blur-sm">
      <div className="bg-heritage-cream p-8 rounded-2xl shadow-2xl w-full max-w-md border border-heritage-gold/30">
        <h2 className="text-3xl font-bold mb-6 text-heritage-red font-serif text-center">
          {memberToEdit ? 'Sửa thông tin' : 'Thêm thành viên'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-heritage-brown text-sm font-bold mb-1">Họ và tên đệm:</label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-heritage-brown text-sm font-bold mb-1">Tên:</label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="input-field w-full" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-heritage-brown text-sm font-bold mb-1">Giới tính:</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="input-field w-full" required>
                <option value="">Chọn...</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-heritage-brown text-sm font-bold mb-1">Ngày sinh:</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="input-field w-full" required />
            </div>
          </div>
          <div>
            <label className="block text-heritage-brown text-sm font-bold mb-1">Cha:</label>
            <select name="fatherId" value={formData.fatherId} onChange={handleChange} className="input-field w-full">
              <option value="">Chọn cha</option>
              {allMembers.filter(m => m.gender === 'Male' && m.id !== memberToEdit?.id).map(m => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-heritage-brown text-sm font-bold mb-1">Mẹ:</label>
            <select name="motherId" value={formData.motherId} onChange={handleChange} className="input-field w-full">
              <option value="">Chọn mẹ</option>
              {allMembers.filter(m => m.gender === 'Female' && m.id !== memberToEdit?.id).map(m => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-heritage-brown hover:bg-heritage-brown/10 transition-colors">Hủy</button>
            <button type="submit" className="btn-primary px-8">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;