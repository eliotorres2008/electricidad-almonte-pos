import { useState } from 'react';
import { Users, Shield, History, Check, X, UserCheck, UserX, Plus, CreditCard as Edit3, KeyRound, Trash2, CheckCircle2, Monitor, Lock } from 'lucide-react';
import type { User, PermissionKey, Role } from '@/types';
import { PERMISSION_KEYS, PERMISSION_LABELS } from '@/types';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { genId } from '@/lib/format';

const ROLES: Role[] = ['Administrador', 'Cajero', 'Almacenista', 'Supervisor', 'Cajero Turno Mañana'];

interface UserForm {
  username: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  maxDiscount: number;
  permissions: Record<PermissionKey, boolean>;
}

const emptyUserForm: UserForm = {
  username: '', name: '', email: '', password: '', role: 'Cajero',
  maxDiscount: 5, permissions: { ventas: true, inventario: false, reportes: false, seguridad: false, configuracion: false, anular_venta: false, ver_costo: false },
};

export function Security() {
  const app = useApp();
  const { users, setUsers, audit, loginAttempts, sessions, addAudit, config, currentUser } = app;
  const cashier = config.cashier;
  // Only Administrador can create/edit/delete users and change permissions.
  const canManageUsers = currentUser?.role === 'Administrador';
  const [tab, setTab] = useState<'users' | 'audit' | 'logins' | 'sessions'>('users');
  const activeSession = sessions.find((s) => s.active);
  const activeSessionUser = users.find((u) => u.username === activeSession?.user);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<typeof emptyUserForm>(emptyUserForm);
  const [isEditing, setIsEditing] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);

  const togglePermission = (userId: string, perm: PermissionKey) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: { ...u.permissions, [perm]: !u.permissions[perm] } } : u)));
  };

  const toggleActive = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u)));
  };

  const openNew = () => {
    setUserForm(emptyUserForm);
    setEditUser(null);
    setIsEditing(false);
    // open modal via separate state
    setEditUser({} as User);
  };

  const openEdit = (u: User) => {
    setUserForm({
      username: u.username, name: u.name, email: u.email, password: u.password,
      role: u.role, maxDiscount: u.maxDiscount, permissions: { ...u.permissions } as Record<PermissionKey, boolean>,
    });
    setEditUser(u);
    setIsEditing(true);
  };

  const saveUser = () => {
    if (!canManageUsers) return;
    if (userForm.username.trim().length < 2) return;
    if (userForm.name.trim().length < 2) return;
    if (isEditing && editUser) {
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? {
        ...u, username: userForm.username, name: userForm.name, email: userForm.email,
        password: userForm.password || u.password, role: userForm.role,
        maxDiscount: userForm.maxDiscount, permissions: userForm.permissions,
      } : u)));
      addAudit(`Usuario editado — ${userForm.username}`, cashier);
    } else {
      const newUser: User = {
        id: genId('u'), username: userForm.username, name: userForm.name, email: userForm.email,
        password: userForm.password, role: userForm.role, active: true,
        maxDiscount: userForm.maxDiscount, permissions: userForm.permissions,
      };
      setUsers((prev) => [...prev, newUser]);
      addAudit(`Usuario creado — ${newUser.username} (${newUser.role})`, cashier);
    }
    setEditUser(null);
    setSavedOpen(true);
  };

  const doResetPassword = () => {
    if (!canManageUsers || !resetUser || !newPassword) return;
    setUsers((prev) => prev.map((u) => (u.id === resetUser.id ? { ...u, password: newPassword } : u)));
    addAudit(`Contraseña reseteada — ${resetUser.username}`, cashier);
    setResetUser(null);
    setNewPassword('');
  };

  const deleteUser = (id: string) => {
    if (!canManageUsers) return;
    const u = users.find((x) => x.id === id);
    setUsers((prev) => prev.filter((x) => x.id !== id));
    if (u) addAudit(`Usuario eliminado — ${u.username}`, cashier);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="card p-2 inline-flex gap-1 flex-wrap">
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={<Users size={16} />} label="Usuarios y Permisos" />
        <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')} icon={<History size={16} />} label="Auditoría" />
        <TabBtn active={tab === 'logins'} onClick={() => setTab('logins')} icon={<Shield size={16} />} label="Intentos de Login" />
        <TabBtn active={tab === 'sessions'} onClick={() => setTab('sessions')} icon={<Monitor size={16} />} label="Sesiones" />
      </div>

      {tab === 'users' && (
        <>
          {canManageUsers ? (
            <div className="flex justify-end">
              <button onClick={openNew} className="btn-primary"><Plus size={18} /> Agregar Nuevo Usuario</button>
            </div>
          ) : (
            <div className="card p-4 flex items-center gap-3 bg-amber-500/5 border-amber-500/30">
              <Lock size={18} className="text-amber-500" />
              <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">Solo el Administrador puede crear, editar o eliminar usuarios. Tiene acceso de solo lectura.</p>
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700/50 flex items-center gap-2">
              <Shield size={18} className="text-brand-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white">Matriz de Permisos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold">Rol</th>
                    <th className="px-4 py-3 text-center font-semibold">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold">Desc. Máx.</th>
                    {PERMISSION_KEYS.map((p) => {
                      const lbl = PERMISSION_LABELS[p];
                      const short = p === 'anular_venta' ? 'ANULAR VENTAS' : p === 'ver_costo' ? 'VER COSTOS' : lbl.split(' ')[0].toUpperCase();
                      return (
                        <th key={p} className="px-3 py-3 text-center font-semibold" title={lbl}>{short}</th>
                      );
                    })}
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{u.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">@{u.username}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`chip ${u.role === 'Administrador' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400' : u.role === 'Cajero' || u.role === 'Cajero Turno Mañana' ? 'bg-blue-500/15 text-blue-500' : 'bg-purple-500/15 text-purple-500'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => canManageUsers && toggleActive(u.id)} disabled={!canManageUsers} className={`chip transition ${u.active ? 'bg-green-500/15 text-green-500' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'} ${!canManageUsers ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                          {u.active ? <><UserCheck size={12} /> Activo</> : <><UserX size={12} /> Inactivo</>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-200 font-semibold">{u.maxDiscount}%</td>
                      {PERMISSION_KEYS.map((p) => (
                        <td key={p} className="px-3 py-3 text-center">
                          <button onClick={() => canManageUsers && togglePermission(u.id, p)} disabled={!canManageUsers} className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition ${u.permissions[p] ? 'bg-brand-500 text-neutral-900 hover:bg-brand-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600'} ${!canManageUsers ? 'cursor-not-allowed opacity-60' : ''}`}>
                            {u.permissions[p] ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 whitespace-nowrap">
                          <button onClick={() => openEdit(u)} disabled={!canManageUsers} className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400" title="Editar Usuario"><Edit3 size={16} /></button>
                          <button onClick={() => setResetUser(u)} disabled={!canManageUsers} className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-500 hover:bg-amber-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400" title="Cambiar Contraseña"><KeyRound size={16} /></button>
                          <button onClick={() => deleteUser(u.id)} disabled={!canManageUsers} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400" title="Eliminar Usuario"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700/50 flex items-center gap-2">
            <History size={18} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Registro de Auditoría</h3>
            <span className="chip bg-brand-500/15 text-brand-600 dark:text-brand-400 ml-auto">{audit.length} eventos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold">Acción Realizada</th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {audit.map((a) => (
                  <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                    <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-100">{a.user}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{a.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">{a.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logins' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700/50 flex items-center gap-2">
            <Shield size={18} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Intentos de Inicio de Sesión</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold">Resultado</th>
                  <th className="px-4 py-3 text-left font-semibold">Dirección IP</th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loginAttempts.map((la) => (
                  <tr key={la.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                    <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-100">{la.username}</td>
                    <td className="px-4 py-3">
                      {la.success ? <span className="chip bg-green-500/15 text-green-500"><Check size={12} /> Éxito</span> : <span className="chip bg-red-500/15 text-red-500"><X size={12} /> Fallido</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">{la.ip}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">{la.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700/50 flex items-center gap-2">
            <Monitor size={18} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Sesión Actual</h3>
            <span className="text-xs text-neutral-400 ml-2">Equipo local — un único usuario activo por puesto</span>
          </div>
          <div className="p-6">
            {activeSession ? (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/15 text-green-500 flex items-center justify-center">
                    <UserCheck size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">{activeSessionUser?.name ?? activeSession.user}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">@{activeSession.user} · <span className="capitalize">{activeSessionUser?.role ?? '—'}</span></p>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">Login: {activeSession.loginTime}</p>
                  </div>
                  <button onClick={() => app.logout()} className="btn-danger"><UserX size={18} /> Cerrar Sesión Actual</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-6">No hay sesión activa.</p>
            )}
            <p className="text-xs text-neutral-400 mt-4">El historial de inicios de sesión se encuentra en la pestaña «Intentos de Login» y «Auditoría».</p>
          </div>
        </div>
      )}

      {/* User Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        subtitle={isEditing ? 'Modifica los datos del usuario' : 'Crea un nuevo perfil de usuario'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditUser(null)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={saveUser} disabled={userForm.username.trim().length < 2 || userForm.name.trim().length < 2} className="btn-primary flex-1"><CheckCircle2 size={18} /> Guardar</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre de Usuario</label>
              <input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="input" placeholder="ronny.cajero" minLength={2} />
              {userForm.username && userForm.username.trim().length < 2 && <p className="text-[11px] text-red-500 mt-1">Mínimo 2 caracteres</p>}
            </div>
            <div>
              <label className="label">Nombre Completo</label>
              <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="input" placeholder="Ronny Almonte" minLength={2} />
              {userForm.name && userForm.name.trim().length < 2 && <p className="text-[11px] text-red-500 mt-1">Mínimo 2 caracteres</p>}
            </div>
            <div>
              <label className="label">Correo Electrónico</label>
              <input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="input" placeholder="usuario@almonte.do" />
            </div>
            <div>
              <label className="label">Rol</label>
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })} className="input">
                {ROLES.map((r) => (<option key={r}>{r}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Contraseña {isEditing ? '(dejar vacío para no cambiar)' : ''}</label>
              <input type="text" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="input" placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Descuento Máximo Permitido (%)</label>
              <NumberField value={userForm.maxDiscount} onChange={(v) => setUserForm({ ...userForm, maxDiscount: v })} min={0} max={100} />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="label">Permisos del Usuario</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERMISSION_KEYS.map((p) => (
                <button
                  key={p}
                  onClick={() => setUserForm({ ...userForm, permissions: { ...userForm.permissions, [p]: !userForm.permissions[p] } })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${userForm.permissions[p] ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}
                >
                  {userForm.permissions[p] ? <Check size={14} /> : <X size={14} />}
                  {PERMISSION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        title="Resetear Contraseña"
        subtitle={resetUser?.name}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setResetUser(null)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={doResetPassword} disabled={!newPassword} className="btn-primary flex-1"><KeyRound size={18} /> Resetear</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nueva Contraseña</label>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="••••••••" autoFocus />
          </div>
        </div>
      </Modal>

      {/* Saved toast */}
      <Modal open={savedOpen} onClose={() => setSavedOpen(false)} title="" size="sm">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
          <p className="font-semibold text-neutral-900 dark:text-white">Usuario guardado</p>
        </div>
      </Modal>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${active ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
      {icon} {label}
    </button>
  );
}
