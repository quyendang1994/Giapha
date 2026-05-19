import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
};