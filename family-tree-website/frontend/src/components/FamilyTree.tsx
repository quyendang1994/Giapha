import React, { useEffect, useMemo, useState } from 'react';
import { api, type Marriage, type Member } from '../services/api';

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
  relation: 'parent-child';
}

const CARD_WIDTH = 165;
const CARD_HEIGHT = 195;
const SPOUSE_PAIR_SEPARATOR = '::spouse::';
const NORMAL_GAP_X = 50;
const SPOUSE_GAP_X = 2;

const getMemberOrderValue = (member: Member) => {
  const value = Number.parseInt(member.order ?? '', 10);
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
};

const FamilyTree: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [viewRootId, setViewRootId] = useState<string | null>(null);

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
    order: '',
    address: '',
    phone: '',
    maritalStatus: '',
    education: '',
    bloodType: '',
  });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    void fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // IMPORTANT:
    // Nếu bảng `marriages` chưa được tạo trên Supabase (hoặc bị RLS chặn),
    // Promise.all sẽ fail và dẫn tới không setMembers => “Thêm đời đầu” xong không hiển thị.
    // Vì vậy tách lỗi để members vẫn hiển thị ngay cả khi marriages lỗi.
    try {
      const memberData = await api.getMembers();
      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching members:', error);
      return;
    }

    try {
      const marriageData = await api.getMarriages();
      setMarriages(marriageData);
    } catch (error) {
      console.warn('Warning: cannot fetch marriages (table missing / RLS / network). Rendering without marriages.', error);
      setMarriages([]);
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

  const visibleMembers = useMemo(() => {
    if (!viewRootId) return members;

    // Hiển thị: người được chọn + toàn bộ hậu duệ (con/cháu/...) + hôn phối của các người đó
    const visibleIds = new Set<string>();
    const queue: string[] = [viewRootId];
    visibleIds.add(viewRootId);

    // 1) Thu thập hậu duệ
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;

      members.forEach((m) => {
        if (!m.id) return;
        if (m.fatherId === currentId || m.motherId === currentId) {
          if (!visibleIds.has(m.id)) {
            visibleIds.add(m.id);
            queue.push(m.id);
          }
        }
      });
    }

    // 2) Bổ sung hôn phối để tránh “mất hôn thê/hôn phu” khi xem đời sau
    // Chỉ thêm vợ/chồng của các node đang hiển thị (không kéo thêm đời của phía vợ/chồng).
    const spouseIdsToAdd = new Set<string>();
    marriages.forEach((marriage) => {
      if (!marriage.husbandId || !marriage.wifeId) return;

      const hasHusbandVisible = visibleIds.has(marriage.husbandId);
      const hasWifeVisible = visibleIds.has(marriage.wifeId);

      if (hasHusbandVisible) spouseIdsToAdd.add(marriage.wifeId);
      if (hasWifeVisible) spouseIdsToAdd.add(marriage.husbandId);
    });

    spouseIdsToAdd.forEach((id) => visibleIds.add(id));

    return members.filter((m) => m.id && visibleIds.has(m.id));
  }, [members, marriages, viewRootId]);

  const treeData = useMemo(() => {
    const nodes: TreeNode[] = [];
    const edges: TreeEdge[] = [];

    if (visibleMembers.length === 0) return { nodes, edges };

    const spousePairs = new Set<string>();
    const levelMap = new Map<string, number>();

    visibleMembers.forEach((m) => {
      if (!m.id) return;
      if (!m.fatherId && !m.motherId) {
        levelMap.set(m.id, 0);
      }
    });

    marriages.forEach((marriage) => {
      if (!marriage.husbandId || !marriage.wifeId) return;
      const key = [marriage.husbandId, marriage.wifeId].sort().join(SPOUSE_PAIR_SEPARATOR);
      spousePairs.add(key);
    });

    const getBaseLevel = (member: Member, visiting: Set<string>): number => {
      if (!member.id) return 0;
      if (levelMap.has(member.id)) return levelMap.get(member.id) ?? 0;
      if (visiting.has(member.id)) return 0;

      visiting.add(member.id);

      const parentLevels: number[] = [];

      if (member.fatherId) {
        const father = memberById.get(member.fatherId);
        if (father) parentLevels.push(getBaseLevel(father, visiting) + 1);
      }

      if (member.motherId) {
        const mother = memberById.get(member.motherId);
        if (mother) parentLevels.push(getBaseLevel(mother, visiting) + 1);
      }

      const computedLevel = parentLevels.length > 0 ? Math.max(...parentLevels) : 0;
      levelMap.set(member.id, computedLevel);
      visiting.delete(member.id);
      return computedLevel;
    };

    visibleMembers.forEach((m) => {
      if (!m.id) return;
      getBaseLevel(m, new Set<string>());
    });

    spousePairs.forEach((pair) => {
      const [a, b] = pair.split(SPOUSE_PAIR_SEPARATOR);
      const levelA = levelMap.get(a);
      const levelB = levelMap.get(b);

      if (levelA !== undefined && levelB === undefined) {
        levelMap.set(b, levelA);
      } else if (levelB !== undefined && levelA === undefined) {
        levelMap.set(a, levelB);
      } else if (levelA !== undefined && levelB !== undefined) {
        // Vợ/chồng phải nằm cùng hàng với người có cấp thế hệ sâu hơn.
        // Trường hợp thêm vợ cho con: vợ mới chưa có cha/mẹ nên ban đầu bị xem là đời đầu (level 0).
        // Nếu dùng Math.min thì kéo người con lên hàng đời đầu, sai nghiệp vụ gia phả.
        const commonLevel = Math.max(levelA, levelB);
        levelMap.set(a, commonLevel);
        levelMap.set(b, commonLevel);
      }
    });

    const levels = new Map<number, Member[]>();
    visibleMembers.forEach((m) => {
      if (!m.id) return;
      const level = levelMap.get(m.id) ?? 0;
      const arr = levels.get(level) ?? [];
      arr.push(m);
      levels.set(level, arr);
    });

    const originalIndexById = new Map<string, number>();
    visibleMembers.forEach((m, index) => {
      if (m.id) originalIndexById.set(m.id, index);
    });

    const isSpousePair = (a: Member, b: Member) => {
      if (!a.id || !b.id) return false;
      return marriages.some(
        (m) =>
          (m.husbandId === a.id && m.wifeId === b.id) || (m.husbandId === b.id && m.wifeId === a.id),
      );
    };

    const getSpouseIds = (member: Member) => {
      if (!member.id) return new Set<string>();
      const ids = marriages
        .filter((m) => m.husbandId === member.id || m.wifeId === member.id)
        .map((m) => (m.husbandId === member.id ? m.wifeId : m.husbandId))
        .filter((id): id is string => Boolean(id));
      return new Set(ids);
    };

    const shouldUseSpouseGap = (current: Member, next: Member) => {
      if (!current.id || !next.id) return false;
      if (isSpousePair(current, next)) return true;

      // Trường hợp 1 chồng nhiều vợ: [chồng, vợ1, vợ2] cần nằm sát nhau.
      const currentSpouses = getSpouseIds(current);
      const nextSpouses = getSpouseIds(next);

      for (const spouseId of currentSpouses) {
        if (nextSpouses.has(spouseId)) return true;
      }

      return false;
    };

    Array.from(levels.entries()).forEach(([level, list]) => {
      const maleMembers = list
        .filter((m) => m.gender === 'Male')
        .sort((a, b) => (originalIndexById.get(a.id ?? '') ?? 0) - (originalIndexById.get(b.id ?? '') ?? 0));

      const femaleMembers = list.filter((m) => m.gender === 'Female');
      const otherMembers = list
        .filter((m) => m.gender !== 'Male' && m.gender !== 'Female')
        .sort((a, b) => (originalIndexById.get(a.id ?? '') ?? 0) - (originalIndexById.get(b.id ?? '') ?? 0));

      const usedFemaleIds = new Set<string>();
      const arranged: Member[] = [];

      maleMembers.forEach((husband) => {
        arranged.push(husband);

        const wives = femaleMembers
          .filter((wife) => {
            if (!wife.id) return false;
            if (usedFemaleIds.has(wife.id)) return false;
            return isSpousePair(husband, wife);
          })
          .sort((a, b) => {
            const marriageA =
              husband.id && a.id
                ? marriages.find((m) => m.husbandId === husband.id && m.wifeId === a.id)
                : undefined;
            const marriageB =
              husband.id && b.id
                ? marriages.find((m) => m.husbandId === husband.id && m.wifeId === b.id)
                : undefined;

            const orderA = marriageA?.order ?? getMemberOrderValue(a);
            const orderB = marriageB?.order ?? getMemberOrderValue(b);

            const orderDiff = orderA - orderB;
            if (orderDiff !== 0) return orderDiff;
            return (originalIndexById.get(a.id ?? '') ?? 0) - (originalIndexById.get(b.id ?? '') ?? 0);
          });

        wives.forEach((wife) => {
          if (wife.id) usedFemaleIds.add(wife.id);
          arranged.push(wife);
        });
      });

      const remainingFemales = femaleMembers
        .filter((f) => !f.id || !usedFemaleIds.has(f.id))
        .sort((a, b) => {
          const orderDiff = getMemberOrderValue(a) - getMemberOrderValue(b);
          if (orderDiff !== 0) return orderDiff;
          return (originalIndexById.get(a.id ?? '') ?? 0) - (originalIndexById.get(b.id ?? '') ?? 0);
        });

      const sortedList = [...arranged, ...remainingFemales, ...otherMembers];

      let currentX = 60;

      sortedList.forEach((m, index) => {
        if (!m.id) return;
        nodes.push({
          id: m.id,
          member: m,
          x: currentX,
          y: level * 280 + 60,
        });

        const nextMember = sortedList[index + 1];
        if (!nextMember) return;

        const gap = shouldUseSpouseGap(m, nextMember) ? SPOUSE_GAP_X : NORMAL_GAP_X;
        currentX += CARD_WIDTH + gap;
      });
    });

    visibleMembers.forEach((m) => {
      if (!m.id) return;
      const parentId = m.fatherId || m.motherId;
      if (parentId && levelMap.has(parentId)) {
        edges.push({ from: parentId, to: m.id, relation: 'parent-child' });
      }
    });

    return { nodes, edges };
  }, [visibleMembers, marriages, memberById]);

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
      order: '',
      address: '',
      phone: '',
      maritalStatus: '',
      education: '',
      bloodType: '',
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
        order: target.order || '',
        address: target.address || '',
        phone: target.phone || '',
        maritalStatus: target.maritalStatus || '',
        education: target.education || '',
        bloodType: target.bloodType || '',
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
        order: formData.order || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        education: formData.education || undefined,
        bloodType: formData.bloodType || undefined,
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
        const created = await api.createMember(payload);

        if (relationAction === 'spouse' && relationTarget?.id && created.id) {
          const husbandId =
            relationTarget.gender === 'Male'
              ? relationTarget.id
              : created.gender === 'Male'
                ? created.id
                : relationTarget.id;

          const wifeId =
            relationTarget.gender === 'Female'
              ? relationTarget.id
              : created.gender === 'Female'
                ? created.id
                : created.id;

          const parsedOrder = Number.parseInt(formData.order ?? '', 10);
          await api.createMarriage({
            husbandId,
            wifeId,
            order: Number.isNaN(parsedOrder) ? undefined : parsedOrder,
            status: 'engaged',
          });
        }
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

    const hasChildren = members.some((m) => m.fatherId === member.id || m.motherId === member.id);
    if (hasChildren) {
      alert('Không thể xóa thành viên này vì đang có thế hệ con. Vui lòng xóa hoặc chuyển liên kết thế hệ con trước.');
      return;
    }

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

  const getSpouseCandidatesById = (targetId: string | undefined, gender: Member['gender']) => {
    if (!targetId) return [];

    const spouseIds = marriages
      .filter((m) => m.husbandId === targetId || m.wifeId === targetId)
      .map((m) => (m.husbandId === targetId ? m.wifeId : m.husbandId));

    const spouseIdSet = new Set(spouseIds);

    return members.filter((candidate) => {
      if (!candidate.id || candidate.id === targetId) return false;
      if (candidate.gender !== gender) return false;
      return spouseIdSet.has(candidate.id);
    });
  };

  const getMemberByIdSafe = (id: string | undefined) => {
    if (!id) return undefined;
    return members.find((m) => m.id === id);
  };

  const uniqById = <T extends { id?: string }>(list: T[]) => {
    const seen = new Set<string>();
    return list.filter((item) => {
      if (!item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const getParentOptionsForEdit = (gender: Member['gender']) => {
    // Mục tiêu: khi sửa trong “Phả đồ”, dropdown Cha/Mẹ phải ưu tiên “liên kết hiện tại”
    // và/hoặc “hôn phối liên quan”, tránh xổ ra hàng loạt người cùng đời (ví dụ c1/đá/sdf).
    if (relationAction !== 'edit') return getParentCandidates(gender);

    const currentFatherId = formData.fatherId || relationTarget?.fatherId || '';
    const currentMotherId = formData.motherId || relationTarget?.motherId || '';

    const currentFather = getMemberByIdSafe(currentFatherId);
    const currentMother = getMemberByIdSafe(currentMotherId);

    if (gender === 'Male') {
      const candidates: Member[] = [];

      // 1) Luôn ghim “Cha hiện tại” (nếu có) — KHÔNG phụ thuộc gender trong DB để tránh dữ liệu sai/lệch.
      if (currentFather) candidates.push(currentFather);

      // 2) Nếu có Mẹ -> Cha candidates là các chồng của Mẹ (thêm vào, có thể đổi cha)
      if (currentMotherId) {
        candidates.push(...getSpouseCandidatesById(currentMotherId, 'Male'));
      }

      // 3) Nếu chưa có đầu mối nào -> fallback theo đời (nhưng vẫn là last resort)
      if (candidates.length === 0) {
        candidates.push(...getParentCandidates('Male'));
      }

      // Chỉ giữ đúng giới tính kỳ vọng (nếu dữ liệu gender chuẩn) nhưng không làm mất “cha hiện tại”
      const normalized = candidates.filter((m) => m.id && (m.gender === 'Male' || m.id === currentFatherId));
      return uniqById(normalized);
    }

    // gender === 'Female'
    {
      const candidates: Member[] = [];

      if (currentMother) candidates.push(currentMother);

      if (currentFatherId) {
        candidates.push(...getSpouseCandidatesById(currentFatherId, 'Female'));
      }

      if (candidates.length === 0) {
        candidates.push(...getParentCandidates('Female'));
      }

      const normalized = candidates.filter((m) => m.id && (m.gender === 'Female' || m.id === currentMotherId));
      return uniqById(normalized);
    }
  };

  const getSpouseCandidates = (target: Member | null, gender: Member['gender']) =>
    getSpouseCandidatesById(target?.id, gender);

  const hasSpouse = (target: Member | null) => {
    if (!target?.id) return false;
    return marriages.some((m) => m.husbandId === target.id || m.wifeId === target.id);
  };

  const getParentCandidates = (gender: Member['gender']) => {
    const targetId = relationTarget?.id;
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

    members.forEach((member) => {
      if (member.id) getMemberLevel(member, new Set<string>());
    });

    const targetLevel =
      relationAction === 'edit' && relationTarget ? getMemberLevel(relationTarget, new Set<string>()) : undefined;

    if (relationAction === 'edit' && targetId) {
      const queue = [targetId];

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) continue;

        members.forEach((member) => {
          if (!member.id) return;
          if (member.fatherId !== currentId && member.motherId !== currentId) return;
          if (descendantIds.has(member.id)) return;

          descendantIds.add(member.id);
          queue.push(member.id);
        });
      }
    }

    return members.filter((member) => {
      if (!member.id) return false;
      if (member.gender !== gender) return false;
      if (member.id === targetId) return false;
      if (descendantIds.has(member.id)) return false;

    // Khi chỉnh sửa một người con, chỉ cho chọn Cha/Mẹ ở đúng đời trước (parentLevel = targetLevel - 1).
    // Tránh trường hợp hiển thị người cùng hàng (anh/chị/em) hoặc đời sau.
    if (relationAction === 'edit' && targetLevel !== undefined) {
      const candidateLevel = levelById.get(member.id) ?? 0;
      const expectedParentLevel = Math.max(0, targetLevel - 1);

      // Chỉ cho phép đúng đời trước
      if (candidateLevel !== expectedParentLevel) return false;
    }

      return true;
    });
  };

  const isSpouseLikeInEditForm =
    relationAction === 'edit' &&
    Boolean(
      !relationTarget?.fatherId &&
        !relationTarget?.motherId &&
        (formData.maritalStatus === 'Đính hôn' ||
          (relationTarget?.id &&
            marriages.some((m) => m.husbandId === relationTarget.id || m.wifeId === relationTarget.id))),
    );

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
        <h2 className="text-2xl md:text-3xl font-bold">Phả đồ</h2>
      </div>

      <div
        className="tree-paper w-full h-[72vh] cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          if (!hasHead) return;
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
        {!hasHead ? (
          <div className="absolute inset-0 z-10 grid place-items-center text-gray-600">
            <div className="flex flex-col items-center gap-4">
              <div className="text-lg font-semibold text-center">Chưa có dữ liệu gia phả.</div>
              <button className="btn-primary px-6 py-3 rounded-md shadow-lg" onClick={() => openForm('head')}>
                + Thêm thành viên đầu tiên
              </button>
            </div>
          </div>
        ) : (
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
              const midY = y1 + Math.max(28, (y2 - y1) / 2);

              return (
                <path
                  key={`${edge.from}-${edge.to}-${idx}`}
                  d={`M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`}
                  fill="none"
                  stroke="#c9c9c9"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                      {node.member.gender !== 'Female' && (
                        <button
                          className="menu-item"
                          onClick={() => {
                            setViewRootId(node.member.id ?? null);
                            setPan({ x: 0, y: 0 });
                            setMenuOpenFor(null);
                          }}
                        >
                          👁 Xem đời sau
                        </button>
                      )}
                      <button
                        className="menu-item"
                        onClick={() => {
                          setViewRootId(null);
                          setPan({ x: 0, y: 0 });
                          setMenuOpenFor(null);
                        }}
                      >
                        ↩ Trở về gốc
                      </button>
                      <button className="menu-item" onClick={() => openForm('spouse', node.member)}>
                        ⊕ Thêm hôn thê
                      </button>
                      <button
                        className="menu-item"
                        onClick={() => {
                          if (!hasSpouse(node.member)) {
                            alert('Chưa có hôn thê/hôn phu, không thể thêm con.');
                            setMenuOpenFor(null);
                            return;
                          }
                          openForm('child', node.member);
                        }}
                      >
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

                  <div className="mt-7 bg-white rounded-md p-2 h-[108px] flex items-center justify-center overflow-hidden">
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
        )}
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
                <label className="block font-semibold mb-1">Thứ tự</label>
                <input
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.order}
                  onChange={(e) => setFormData((prev) => ({ ...prev, order: e.target.value }))}
                  placeholder="Ví dụ: 1, 2, 3..."
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Địa chỉ</label>
                <input
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Số điện thoại</label>
                <input
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tình trạng hôn nhân</label>
                <select
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
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
                  value={formData.education}
                  onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nhóm máu</label>
                <select
                  className="input-field w-full border rounded px-3 py-2"
                  value={formData.bloodType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bloodType: e.target.value }))}
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

              {relationAction !== 'spouse' && (
                <>
                  <div>
                    <label className="block font-semibold mb-1">Cha</label>
                    <select
                      className="input-field w-full border rounded px-3 py-2"
                      value={formData.fatherId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fatherId: e.target.value }))}
                      disabled={
                        (relationAction === 'child' && relationTarget?.gender === 'Male') || isSpouseLikeInEditForm
                      }
                    >
                      <option value="">--Chọn--</option>
                      {(relationAction === 'child' && relationTarget
                        ? getSpouseCandidates(relationTarget, 'Male')
                        : relationAction === 'edit'
                          ? getParentOptionsForEdit('Male')
                          : formData.motherId
                            ? getSpouseCandidatesById(formData.motherId, 'Male')
                            : getParentCandidates('Male')
                      ).map((m) => (
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
                      disabled={
                        (relationAction === 'child' && relationTarget?.gender === 'Female') || isSpouseLikeInEditForm
                      }
                    >
                      <option value="">--Chọn--</option>
                      {(relationAction === 'child' && relationTarget
                        ? getSpouseCandidates(relationTarget, 'Female')
                        : relationAction === 'edit'
                          ? getParentOptionsForEdit('Female')
                          : formData.fatherId
                            ? getSpouseCandidatesById(formData.fatherId, 'Female')
                            : getParentCandidates('Female')
                      ).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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