import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

const AccountPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      // 1. Thử tải từ bảng profiles trước
      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const profile = profileById;

      if (profile) {
        setPhone(profile.phone || '');
        setAddress(profile.address || '');
        setAvatarUrl(profile.avatar_url || '');
      } else {
        // 2. Nếu chưa có trong profiles, tải từ metadata (fallback)
        const userMetadata = user as any;
        setPhone(userMetadata.phone || '');
        setAddress(userMetadata.address || '');
        setAvatarUrl(userMetadata.avatar_url || user.photoUrl || '');
      }
    };

    loadProfile();
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      setMessage('Đang tải ảnh lên...');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setMessage('Tải ảnh lên thành công! Nhấn "Cập nhật thông tin" để lưu.');
    } catch (error: any) {
      setMessage('Lỗi tải ảnh: ' + error.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    // 1. Cập nhật vào bảng profiles (để hiển thị trong Dashboard)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        phone,
        address,
        avatar_url: avatarUrl,
      }, {
        onConflict: 'id'
      });

    // 2. Cập nhật vào auth.users (metadata)
    const { error: authError } = await supabase.auth.updateUser({
      data: { 
        phone, 
        address,
        avatar_url: avatarUrl,
      }
    });

    if (profileError || authError) {
      setMessage('Lỗi cập nhật: ' + (profileError?.message || authError?.message));
    } else {
      // Force AuthContext to update immediately with the avatar URL just saved.
      await refreshUser({ photoUrl: avatarUrl || null });
      setMessage('Cập nhật thành công!');
    }
  };

  const handleUpdatePassword = async () => {
    if (!password) {
      setMessage('Vui lòng nhập mật khẩu mới.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage('Lỗi đổi mật khẩu: ' + error.message);
    else setMessage('Đổi mật khẩu thành công!');
    setPassword(''); // Clear password field
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Quản lý tài khoản</h2>
      {message && <p className="mb-4 text-blue-600">{message}</p>}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Ảnh đại diện</label>
          <div className="flex items-center space-x-4 mt-1">
            {avatarUrl && (
              <img src={avatarUrl} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover border" />
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Số điện thoại</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Địa chỉ</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <button onClick={handleUpdateProfile} className="bg-blue-600 text-white px-4 py-2 rounded">Cập nhật thông tin</button>
        
        <hr className="my-6" />
        
        <div>
          <label className="block text-sm font-medium">Mật khẩu mới</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <button onClick={handleUpdatePassword} className="bg-red-600 text-white px-4 py-2 rounded">Đổi mật khẩu</button>
      </div>
    </div>
  );
};

export default AccountPage;
