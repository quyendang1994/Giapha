import React, { useEffect, useMemo, useState } from 'react';
import { api, type Marriage, type Member } from '../services/api';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  memberToEdit?: Member | null;
}

const createEmptyFormData = () => ({
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'Male' as Member['gender'],
  fatherId: '',
  motherId: '',
  bio: '',
  order: '',
  address: '',
  phone: '',
  maritalStatus: '',
  education: '',
  bloodType: '',
});

const MemberModal: React.FC<MemberModalProps> = ({ isOpen, onClose, onSave, memberToEdit }) => {
  const [formData, setFormData] = useState(createEmptyFormData);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchModalData = async () => {
      const membersData = await api.getMembers();
      setAllMembers(membersData);

      try {
        const marriagesData = await api.getMarriages();
        setMarriages(marriagesData);
      } catch (error) {
        console.warn('Warning: cannot fetch marriages. Parent fields will remain editable.', error);
        setMarriages([]);
      }
    };

    void fetchModalData();
  }, [isOpen]);

  useEffect(() => {
    if (memberToEdit) {
      setFormData({
        firstName: memberToEdit.firstName,
        lastName: memberToEdit.lastName,
        birthDate: memberToEdit.birthDate,
        gender: memberToEdit.gender,
        fatherId: memberToEdit.fatherId || '',
        motherId: memberToEdit.motherId || '',
        bio: memberToEdit.bio || '',
        order: memberToEdit.order || '',
        address: memberToEdit.address || '',
        phone: memberToEdit.phone || '',
        maritalStatus: memberToEdit.maritalStatus || '',
        education: memberToEdit.education || '',
        bloodType: memberToEdit.bloodType || '',
      });
      return;
    }

    setFormData(createEmptyFormData());
  }, [memberToEdit, isOpen]);

  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    allMembers.forEach((member) => {
      if (member.id) map.set(member.id, member);
    });
    return map;
  }, [allMembers]);

  const isSpouseMember = Boolean(
    formData.maritalStatus === 'Đính hôn' ||
      (memberToEdit?.id &&
        marriages.some((marriage) => marriage.husbandId === memberToEdit.id || marriage.wifeId === memberToEdit.id)),
  );

  const getSpouseCandidates = (targetId: string | undefined, gender: Member['gender']) => {
    if (!targetId) return [];

    const spouseIds = marriages
      .filter((marriage) => marriage.husbandId === targetId || marriage.wifeId === targetId)
      .map((marriage) => (marriage.husbandId === targetId ? marriage.wifeId : marriage.husbandId));

    const spouseIdSet = new Set(spouseIds);

    return allMembers.filter((member) => {
      if (!member.id) return false;
      if (member.gender !== gender) return false;
      return spouseIdSet.has(member.id);
    });
  };

  const getParentCandidates = (gender: Member['gender']) => {
    const targetId = memberToEdit?.id;
    const descendantIds = new Set<string>();
    const levelById = new Map<string, number>();

    const getMemberLevel = (member: Member, visiting: Set<string>): number => {
      if (!member.id) return 0;
      if (levelById.has(member.id)) return levelById.get(member.id) ?? 0;
      if (visiting.has(member.id)) return 0;

      visiting.add(member.id);

      const parentLevels: number[] = [];

      if (member.fatherId) {
        const father = memberById.get(member.fatherId);
        if (father) parentLevels.push(getMemberLevel(father, visiting) + 1);
      }

      if (member.motherId) {
        const mother = memberById.get(member.motherId);
        if (mother) parentLevels.push(getMemberLevel(mother, visiting) + 1);
      }

      const level = parentLevels.length > 0 ? Math.max(...parentLevels) : 0;
      levelById.set(member.id, level);
      visiting.delete(member.id);
      return level;
    };

    allMembers.forEach((member) => {
      if (member.id) getMemberLevel(member, new Set<string>());
    });

    const targetLevel = memberToEdit ? getMemberLevel(memberToEdit, new Set<string>()) : undefined;

    if (targetId) {
      const queue = [targetId];

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) continue;

        allMembers.forEach((member) => {
          if (!member.id) return;
          if (member.fatherId !== currentId && member.motherId !== currentId) return;
          if (descendantIds.has(member.id)) return;

          descendantIds.add(member.id);
          queue.push(member.id);
        });
      }
    }

    return allMembers.filter((member) => {
      if (!member.id) return false;
      if (member.gender !== gender) return false;
      if (member.id === targetId) return false;
      if (descendantIds.has(member.id)) return false;

      // Khi chỉnh sửa trong phả đồ/danh sách, chỉ cho chọn Cha/Mẹ ở đời trước.
      // Không hiển thị người cùng hàng như anh/chị/em hoặc đời sau.
      if (targetLevel !== undefined) {
        const candidateLevel = levelById.get(member.id) ?? 0;
        if (candidateLevel >= targetLevel) return false;
      }

      return true;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const memberData: Member = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        fatherId: isSpouseMember ? memberToEdit?.fatherId : formData.fatherId || undefined,
        motherId: isSpouseMember ? memberToEdit?.motherId : formData.motherId || undefined,
        bio: formData.bio || undefined,
        order: formData.order || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        education: formData.education || undefined,
        bloodType: formData.bloodType || undefined,
      };

      if (memberToEdit?.id) {
        await api.updateMember(memberToEdit.id, memberData);
      } else {
        await api.createMember(memberData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Không thể lưu dữ liệu. Vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const title = memberToEdit
    ? `Chỉnh sửa thông tin ${memberToEdit.firstName ?? ''} ${memberToEdit.lastName ?? ''}`.trim()
    : 'Thêm thành viên';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-100">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none" type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1">Họ và tên *</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Tên gọi khác</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Chức danh</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Sinh ngày</label>
            <input
              type="date"
              className="input-field w-full border rounded px-3 py-2"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Giới tính</label>
            <select
              className="input-field w-full border rounded px-3 py-2"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="Male">Nam</option>
              <option value="Female">Nữ</option>
              <option value="Other">Khác</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Thứ tự</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="order"
              value={formData.order}
              onChange={handleChange}
              placeholder="Ví dụ: 1, 2, 3..."
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Địa chỉ</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Số điện thoại</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Tình trạng hôn nhân</label>
            <select
              className="input-field w-full border rounded px-3 py-2"
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
            >
              <option value="">--Chọn--</option>
              <option value="Độc thân">Độc thân</option>
              <option value="Đính hôn">Đính hôn</option>
              <option value="Đã kết hôn">Đã kết hôn</option>
              <option value="Ly hôn">Ly hôn</option>
              <option value="Góa">Góa</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Học vấn</label>
            <input
              className="input-field w-full border rounded px-3 py-2"
              name="education"
              value={formData.education}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Nhóm máu</label>
            <select
              className="input-field w-full border rounded px-3 py-2"
              name="bloodType"
              value={formData.bloodType}
              onChange={handleChange}
            >
              <option value="">--Chọn--</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Cha</label>
            <select
              className="input-field w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              name="fatherId"
              value={formData.fatherId}
              onChange={handleChange}
              disabled={isSpouseMember}
            >
              <option value="">--Chọn--</option>
              {(formData.motherId ? getSpouseCandidates(formData.motherId, 'Male') : getParentCandidates('Male')).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Mẹ</label>
            <select
              className="input-field w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              name="motherId"
              value={formData.motherId}
              onChange={handleChange}
              disabled={isSpouseMember}
            >
              <option value="">--Chọn--</option>
              {(formData.fatherId ? getSpouseCandidates(formData.fatherId, 'Female') : getParentCandidates('Female')).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" className="px-5 py-2 border rounded" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary px-6 py-2 rounded" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;