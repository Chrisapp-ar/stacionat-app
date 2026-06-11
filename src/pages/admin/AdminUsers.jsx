import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [fullName, setFullName] = useState('');
  const [billingType, setBillingType] = useState('Personal');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      // Usamos fetch directo a la API REST de Supabase para no desloguear al admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const authData = await res.json();
      
      if (!res.ok) {
        throw new Error(authData.msg || authData.message || 'Error creando usuario');
      }

      // Si se crea correctamente, obtenemos el ID del nuevo usuario y actualizamos su perfil
      if (authData.user && authData.user.id) {
        // Esperamos un segundo para que el trigger de Supabase cree la fila en perfiles
        setTimeout(async () => {
          await supabase.from('profiles').update({ 
            role: role,
            email: email,
            full_name: fullName || null
          }).eq('id', authData.user.id);
          
          fetchUsers();
          setShowCreateModal(false);
          resetForm();
          alert('Usuario creado con éxito.');
        }, 1500);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const { error } = await supabase.from('profiles').update({
      role: role,
      full_name: fullName,
      billing_type: billingType
    }).eq('id', selectedUser.id);
    
    if (error) {
      alert("Error actualizando: " + error.message);
    } else {
      fetchUsers();
      setShowEditModal(false);
    }
    setFormLoading(false);
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setRole(u.role || 'user');
    setFullName(u.full_name || '');
    setBillingType(u.billing_type || 'Personal');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRole('user');
    setFullName('');
    setBillingType('Personal');
    setFormLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-background">Usuarios y Empleados</h2>
          <p className="text-on-surface-variant text-sm mt-1">Genera nuevos empleados o modifica usuarios existentes.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span> Añadir Usuario
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-soft border border-outline-variant/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant flex justify-center"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/30 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="p-4">Identificación</th>
                  <th className="p-4">Facturación</th>
                  <th className="p-4">CO2 (kg)</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-outline-variant/30 hover:bg-surface-container/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-on-background">{u.full_name || u.email || 'Usuario Sin Nombre'}</p>
                      <p className="font-mono text-[10px] text-on-surface-variant mt-0.5 truncate w-32" title={u.id}>{u.id}</p>
                    </td>
                    <td className="p-4 text-on-background font-medium capitalize">{u.billing_type || 'Personal'}</td>
                    <td className="p-4 text-tertiary font-bold">{u.co2_saved_kg || 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-error/10 text-error' : 
                        u.role === 'operator' ? 'bg-primary/10 text-primary' : 
                        'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openEdit(u)}
                        className="text-primary hover:underline text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full"
                      >
                        Modificar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-on-background mb-4">Crear Nuevo Usuario</h3>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <input type="text" placeholder="Nombre Completo (Opcional)" value={fullName} onChange={e => setFullName(e.target.value)} className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none focus:border-primary border border-outline-variant" />
              <input type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} required className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none focus:border-primary border border-outline-variant" />
              <input type="password" placeholder="Contraseña (Mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none focus:border-primary border border-outline-variant" />
              
              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Asignar Rol</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none border border-outline-variant">
                  <option value="user">Cliente / Usuario (User)</option>
                  <option value="operator">Cajero / Operador (Operator)</option>
                  <option value="admin">Administrador (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl">Cancelar</button>
                <button type="submit" disabled={formLoading} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                  {formLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-on-background mb-1">Modificar Usuario</h3>
            <p className="text-xs text-on-surface-variant font-mono mb-4">{selectedUser.id}</p>
            
            <form onSubmit={handleEditUser} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Nombre o Alias</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none focus:border-primary border border-outline-variant" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Tipo de Facturación</label>
                <select value={billingType} onChange={e => setBillingType(e.target.value)} className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none border border-outline-variant">
                  <option value="Personal">Personal</option>
                  <option value="Empresa">Empresa</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Rol del Sistema</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="bg-surface-container text-sm rounded-xl p-3 w-full outline-none border border-outline-variant">
                  <option value="user">Cliente (User)</option>
                  <option value="operator">Cajero (Operator)</option>
                  <option value="admin">Administrador (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-xl">Cancelar</button>
                <button type="submit" disabled={formLoading} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                  {formLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
