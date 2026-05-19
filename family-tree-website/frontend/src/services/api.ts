import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export interface Member {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate?: string;
  gender: 'Male' | 'Female' | 'Other';
  fatherId?: string;
  motherId?: string;
  bio?: string;
  photoUrl?: string;
}

export const api = {
  getMembers: async (): Promise<Member[]> => {
    const response = await axios.get(`${API_URL}/members`);
    return response.data;
  },
  getMember: async (id: string): Promise<Member> => {
    const response = await axios.get(`${API_URL}/members/${id}`);
    return response.data;
  },
  createMember: async (member: Member): Promise<Member> => {
    const response = await axios.post(`${API_URL}/members`, member);
    return response.data;
  },
  updateMember: async (id: string, member: Partial<Member>): Promise<Member> => {
    const response = await axios.put(`${API_URL}/members/${id}`, member);
    return response.data;
  },
  deleteMember: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/members/${id}`);
  },
};