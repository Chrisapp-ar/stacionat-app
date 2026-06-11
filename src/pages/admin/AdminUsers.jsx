import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const toggleRole = async (userId, currentRole) => {
    let newRole = 'user';
    if (!currentRole || currentRole === 'user') newRole = 'operator';
    else if (currentRole === 'operator') newRole = 'admin';
    else newRole = 'user';
    
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchUsers();
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-on-background">Usuarios y Empleados</h2>
        <p className="text-on-surface-variant text-sm mt-1">Gestiona roles de acceso: Usuario, Operador y Administrador.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-soft border border-outline-variant/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant flex justify-center"><span className="material-symbols-outlined animate-spin">refresh</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/30 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="p-4">ID / Correo</th>
                  <th className="p-4">Facturación</th>
                  <th className="p-4">CO2 (kg)</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-outline-variant/30 hover:bg-surface-container/50 transition-colors">
                    <td className="p-4 font-mono text-xs text-on-surface-variant">
                      <span className="truncate w-32 block" title={u.id}>{u.id}</span>
                    </td>
                    <td className="p-4 text-on-background font-medium capitalize">{u.billing_type || 'Personal'}</td>
                    <td className="p-4 text-tertiary font-bold">{u.co2_saved_kg || 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        u.role === 'admin' ? 'bg-error/10 text-error' : 
                        u.role === 'operator' ? 'bg-primary/10 text-primary' : 
                        'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => toggleRole(u.id, u.role)}
                        className="text-primary hover:underline text-xs font-bold bg-surface-container px-3 py-1.5 rounded-full"
                      >
                        Cambiar Rol
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
