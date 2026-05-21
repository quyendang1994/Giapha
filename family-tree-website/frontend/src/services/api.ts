import { supabase } from './supabaseClient';

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
  order?: string;
  address?: string;
  phone?: string;
  maritalStatus?: string;
  education?: string;
  bloodType?: string;
}

export interface Marriage {
  id?: string;
  husbandId: string;
  wifeId: string;
  order?: number;
  status?: 'engaged' | 'married' | 'divorced' | 'widowed';
  startDate?: string;
  endDate?: string;
}

export const api = {
  getMembers: async (): Promise<Member[]> => {
    const { data, error } = await supabase.from('members').select('*');
    if (error) throw error;
    return data as Member[];
  },
  getMember: async (id: string): Promise<Member> => {
    const { data, error } = await supabase.from('members').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Member;
  },
  createMember: async (member: Member): Promise<Member> => {
    const { data, error } = await supabase.from('members').insert([member]).select().single();
    if (error) throw error;
    return data as Member;
  },
  updateMember: async (id: string, member: Partial<Member>): Promise<Member> => {
    const { data, error } = await supabase.from('members').update(member).eq('id', id).select().single();
    if (error) throw error;
    return data as Member;
  },
  deleteMember: async (id: string): Promise<void> => {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
  },

  getMarriages: async (): Promise<Marriage[]> => {
    const { data, error } = await supabase.from('marriages').select('*');
    if (error) throw error;
    return data as Marriage[];
  },
  createMarriage: async (marriage: Marriage): Promise<Marriage> => {
    const { data, error } = await supabase.from('marriages').insert([marriage]).select().single();
    if (error) throw error;
    return data as Marriage;
  },
  deleteMarriage: async (id: string): Promise<void> => {
    const { error } = await supabase.from('marriages').delete().eq('id', id);
    if (error) throw error;
  },
};
