import React, { useEffect, useState } from 'react';
import { api, type Member } from '../services/api';

const FamilyTree: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Family Members</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <div key={member.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-semibold">{member.firstName} {member.lastName}</h3>
            <p className="text-gray-600">Born: {member.birthDate}</p>
            <p className="text-gray-600">Gender: {member.gender}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FamilyTree;