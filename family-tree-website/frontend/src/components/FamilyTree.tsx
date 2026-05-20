import React, { useEffect, useMemo, useState } from 'react';
import { api, type Member } from '../services/api';

type RelationAction = 'head' | 'spouse' | 'child' | 'edit';

interface TreeNode {
  id: string;
  member: Member;
  x: number;
  y: number;
}

interface TreeEdge {
  from: string;
  to: string;
  dashed?: boolean;
}

const CARD_WIDTH = 180;
const CARD_HEIGHT = 210;

const FamilyTree: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [relationAction, setRelationAction] = useState<RelationAction>('head');
  const [relationTarget, setRelationTarget] = useState<Member | null>(null);

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'Male' as Member['gender'],
    fatherId: '',
    motherId: '',
    bio: '',
  });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    void fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const hasHead = members.length > 0;

  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => {
      if (m.id) map.set(m.id, m);
    });
    return map;
  }, [members]);

  const treeData = useMemo(() => {
    const nodes: TreeNode[] = [];
    const edges: TreeEdge[] = [];

    if (members.length === 0) return { nodes, edges };

    const roots = members.filter((m) => !m.fatherId && !m.motherId);
    const root = roots[0] ?? members[0];

    if (!root?.id) return { nodes, edges };

    const spousePairs = new Set<string>();
    const levelMap = new Map<string, number>();
    const queue: Array<{ id: string; level: number }> = [{ id: root.id, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      const { id, level } = current;
      if (visited.has(id)) continue;
      visited.add(id);
      levelMap.set(id, level);

      const children = members.filter((m) => m.fatherId === id || m.motherId === id);
      children.forEach((c) => {
        if (!c.id) return;
        queue.push({ id: c.id, level: level + 1 });
      });

      const currentMember = memberById.get(id);
      if (currentMember?.id) {
        const spouses = members.filter((m) => {
          if (!m.id) return false;
          const commonChild = members.some(
            (child) =>
              (child.fatherId === currentMember.id && child.motherId === m.id) ||
              (child.fatherId === m.id && child.motherId === currentMember.id),
          );
          return commonChild;
        });

        spouses.forEach((spouse) => {
          if (!spouse.id) return;
          const key = [currentMember.id as string, spouse.id].sort().join('-');
          if (!spousePairs.has(key)) {
            spousePairs.add(key);
          }
          if (!levelMap.has(spouse.id)) {
            levelMap.set(spouse.id, level);
          }
        });
      }
    }

    const levels = new Map<number, Member[]>();
    members.forEach((m) => {
      if (!m.id) return;
      const level = levelMap.get(m.id) ?? 0;
      const arr = levels.get(level) ?? [];
      arr.push(m);
      levels.set(level, arr);
    });

    Array.from(levels.entries()).forEach(([level, list]) => {
      list.forEach((m, index) => {
        if (!m.id) return;
        nodes.push({
          id: m.id,
          member: m,
          x: index * 220 + 60,
          y: level * 280 + 60,
        });
      });
    });

    members.forEach((m) => {
      if (!m.id) return;
      if (m.fatherId) edges.push({ from: m.fatherId, to: m.id });
      if (m.motherId) edges.push({ from: m.motherId, to: m.id, dashed: true });
    });

    spousePairs.forEach((pair) => {
      const [a, b] = pair.split('-');
      edges.push({ from: a, to: b, dashed: true });
    });

    return { nodes, edges };
  }, [members, memberById]);

  const nodePosition = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    treeData.nodes.forEach((n) => map.set(n.id, { x: n.x, y: n.y }));
    return map;
  }, [treeData.nodes]);

  const openForm = (action: RelationAction, target: Member | null = null) => {
    setRelationAction(action);
    setRelationTarget(target);
    setMenuOpenFor(null);

    setFormData({
      firstName: '',
      lastName: '',
      birthDate: '',
      gender: action === 'spouse' ? 'Female' : 'Male',
      fatherId: '',
      motherId: '',
      bio: '',
    });

    if (action === 'edit' && target) {
      setFormData({
        firstName: target.firstName,
        lastName: target.lastName,
        birthDate: target.birthDate,
        gender: target.gender,
        fatherId: target.fatherId || '',
        motherId: target.motherId || '',
        bio: target.bio || '',
      });
    }

    setIsFormOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const payload: Member = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        fatherId: formData.fatherId || undefined,
        motherId: formData.motherId || undefined,
        bio: formData.bio || undefined,
      };

      if (relationAction === 'spouse' && relationTarget?.id) {
        const spouseGender: Member['gender'] =
          relationTarget.gender === 'Male'
            ? 'Female'
            : relationTarget.gender === 'Female'
              ? 'Male'
              : 'Other';

        payload.gender = spouseGender;
      }

      if (relationAction === 'child' && relationTarget?.id) {
        if (relationTarget.gender === 'Male') {
          payload.fatherId = relationTarget.id;
        } else if (relationTarget.gender === 'Female') {
          payload.motherId = relationTarget.id;
        }
      }

      if (relationAction === 'edit' && relationTarget?.id) {
        await api.updateMember(relationTarget.id, payload);
      } else {
        await api.createMember(payload);
      }

      setIsFormOpen(false);
      await fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Không thể lưu dữ liệu. Vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!member.id) return;
    const confirmed = window.confirm(`Xóa thành viên ${member.firstName} ${member.lastName}?`);
    if (!confirmed) return;
    try {
      await api.deleteMember(member.id);
      await fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Không thể xóa thành viên.');
    }
  };

  const formTitle = () => {
    if (relationAction === 'head') return 'Thêm người đứng đầu gia phả';
    if (relationAction === 'spouse')
      return `Thêm hôn thê cho ${relationTarget?.firstName ?? ''} ${relationTarget?.lastName ?? ''}`.trim();
    if (relationAction === 'child')
      return `Thêm con cho ${relationTarget?.firstName ?? ''} ${relationTarget?.lastName ?? ''}`.trim();
    return `Chỉnh sửa thông tin ${relationTarget?.firstName ?? ''} ${relationTarget?.lastName ?? ''}`.trim();
  };

  return (
    <div className="p-4 md:p-6">
      <style>{`
        .tree-paper {
          background: radial-gradient(circle at center, #f5f1e8, #efe6d2 60%, #eadfca);
          border: 1px solid #d6c8a8;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }
        .member-card {
          position: absolute;
          width: ${CARD_WIDTH}px;
          height: ${CARD_HEIGHT}px;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          user-select: none;
          border: 2px solid #d7dde8;
        }
        .member-card.male { background: #84c6f0; }
        .member-card.female { background: #eaa2e6; }
        .gear-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: #3f5d7a;
          color: #fff;
          cursor: pointer;
        }
        .menu-popup {
          position: absolute;
          top: 28px;
          right: 0;
          z-index: 20;
          width: 190px;
          background: #fff;
          border: 1px solid #d4d4d4;
          border-radius: 8px;
          box-shadow: 0 10px 20px rgba(0,0,0,.12);
          overflow: hidden;
        }
        .menu-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border: none;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
        }
        .menu-item:hover { background: #f3f4f6; }
      `}</style>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl md:text-3xl font-bold">Phả đồ trực tuyến</h2>
        {!hasHead && (
          <button className="btn-primary px-4 py-2 rounded-md" onClick={() => openForm('head')}>
            + Thêm người đứng đầu gia phả
          </button>
        )}
      </div>

      <div
        className="tree-paper w-full h-[72vh] cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('.member-card')) return;
          setIsDraggingCanvas(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (!isDraggingCanvas) return;
          setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          });
        }}
        onMouseUp={() => setIsDraggingCanvas(false)}
        onMouseLeave={() => setIsDraggingCanvas(false)}
      >
        {!hasHead && (
          <div className="h-full flex items-center justify-center text-gray-600">
            Chưa có dữ liệu gia phả. Hãy thêm người đứng đầu để khởi tạo cây.
          </div>
        )}

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            width: '3000px',
            height: '2200px',
            position: 'relative',
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {treeData.edges.map((edge, idx) => {
              const from = nodePosition.get(edge.from);
              const to = nodePosition.get(edge.to);
              if (!from || !to) return null;

              const x1 = from.x + CARD_WIDTH / 2;
              const y1 = from.y + CARD_HEIGHT;
              const x2 = to.x + CARD_WIDTH / 2;
              const y2 = to.y;

              return (
                <line
                  key={`${edge.from}-${edge.to}-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#b8b8b8"
                  strokeWidth={3}
                  strokeDasharray={edge.dashed ? '6 6' : undefined}
                />
              );
            })}
          </svg>

          {treeData.nodes.map((node) => {
            const isFemale = node.member.gender === 'Female';
            const isMenuOpen = menuOpenFor === node.id;
            return (
              <div
                key={node.id}
                className={`member-card ${isFemale ? 'female' : 'male'}`}
                style={{ left: node.x, top: node.y }}
              >
                <button
                  className="gear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenFor((prev) => (prev === node.id ? null : node.id));
                  }}
                  title="Tùy chọn"
                >
                  ⚙
                </button>

                {isMenuOpen && (
                  <div className="menu-popup">
                    <button className="menu-item" onClick={() => openForm('head')}>
                      ⊕ Thêm đời đầu
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => {
                        setPan({ x: 0, y: 0 });
                        setMenuOpenFor(null);
                      }}
                    >
                      ↩ Trở về gốc
                    </button>
                    <button className="menu-item" onClick={() => openForm('spouse', node.member)}>
                      ⊕ Thêm hôn thê
                    </button>
                    <button className="menu-item" onClick={() => openForm('child', node.member)}>
                      ⊕ Thêm con
                    </button>
                    <button className="menu-item" onClick={() => openForm('edit', node.member)}>
                      ✎ Chỉnh sửa
                    </button>
                    <button className="menu-item text-red-600" onClick={() => void handleDeleteMember(node.member)}>
                      🗑 Xóa
                    </button>
                  </div>
                )}

                <div className="mt-8 bg-white rounded-md p-2 h-[120px] flex items-center justify-center overflow-hidden">
                  {node.member.photoUrl ? (
                    <img src={node.member.photoUrl} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="text-5xl text-gray-400">👤</div>
                  )}
                </div>
                <div className="mt-2 text-center font-semibold text-sm text-gray-900 truncate">
                  {node.member.firstName} {node.member.lastName}
                </div>
                <div className="text-center text-xs text-gray-700 mt-1">{node.member.birthDate || 'N/A'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-100">
              <h3 className="text-2xl font-semibold">{formTitle()}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-2xl leading-none">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Họ và tên *</label>
                <input
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tên gọi khác</label>
                <input
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Chức danh</label>
                <input
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Sinh ngày</label>
                <input
                  type="date"
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.birthDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, birthDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Giới tính</label>
                <select
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gender: e.target.value as Member['gender'] }))
                  }
                >
                  <option value="Male">Nam</option>
                  <option value="Female">Nữ</option>
                  <option value="Other">Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Cha</label>
                <select
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.fatherId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fatherId: e.target.value }))}
                >
                  <option value="">--Chọn--</option>
                  {members
                    .filter((m) => m.id && m.gender === 'Male')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Mẹ</label>
                <select
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.motherId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motherId: e.target.value }))}
                >
                  <option value="">--Chọn--</option>
                  {members
                    .filter((m) => m.id && m.gender === 'Female')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" className="px-5 py-2 border rounded" onClick={() => setIsFormOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary px-6 py-2 rounded" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTree;