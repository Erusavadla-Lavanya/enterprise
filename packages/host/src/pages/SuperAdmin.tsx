import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { Shield, Users, Layers, Terminal, ToggleLeft, ToggleRight, Mail, Plus, RefreshCw, Edit, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SuperAdmin() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/admin/modules')) return 'modules';
    if (location.pathname.includes('/admin/system')) return 'system';
    return 'tenants';
  };

  const activeTab = getTabFromPath();
  
  // Tenants data
  const [tenants, setTenants] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState('premium');
  const [showAddForm, setShowAddForm] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<{ email: string; pass: string } | null>(null);

  // System Logs & Templates
  const [logs, setLogs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [loadingSystem, setLoadingSystem] = useState(false);

  // Message banners
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTenants = async () => {
    setLoadingTenants(true);
    setError('');
    try {
      const data = await apiRequest('/auth/tenants');
      setTenants(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchSystemData = async () => {
    setLoadingSystem(true);
    setError('');
    try {
      const logsData = await apiRequest('/auth/system/logs');
      const templatesData = await apiRequest('/auth/system/templates');
      setLogs(logsData);
      setTemplates(templatesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load system data');
    } finally {
      setLoadingSystem(false);
    }
  };

  // Hydrate all data on initialization to make stats count accurate
  const loadStatsAndData = async () => {
    try {
      const logsData = await apiRequest('/auth/system/logs');
      setLogs(logsData);
      const data = await apiRequest('/auth/tenants');
      setTenants(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStatsAndData();
  }, []);

  useEffect(() => {
    if (activeTab === 'tenants') {
      fetchTenants();
    } else if (activeTab === 'system') {
      fetchSystemData();
    }
  }, [activeTab]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTempCredentials(null);

    if (!companyName.trim() || !domain.trim() || !adminEmail.trim()) {
      setError('Please fill in all required fields (Company Name, Domain, Admin Email).');
      return;
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters, or leave it blank to auto-generate one.');
      return;
    }

    try {
      const response = await apiRequest('/auth/register-tenant', {
        method: 'POST',
        body: JSON.stringify({
          companyName,
          domain,
          adminEmail,
          subscriptionPlan: plan,
          password: password || undefined,
        }),
      });

      setSuccess(`Tenant "${companyName}" registered successfully!`);
      setTempCredentials({ email: adminEmail, pass: password || response.temporaryPassword });
      setCompanyName('');
      setDomain('');
      setAdminEmail('');
      setPassword('');
      setShowAddForm(false);
      fetchTenants();
      loadStatsAndData();
    } catch (err: any) {
      // Show full validation message from server if available
      const msg = err.message || 'Failed to register tenant.';
      setError(msg);
    }
  };


  const handleToggleTenant = async (id: string, currentStatus: boolean) => {
    setError('');
    try {
      await apiRequest(`/auth/tenants/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      setSuccess(`Tenant status updated!`);
      fetchTenants();
      loadStatsAndData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle tenant activation.');
    }
  };

  const handleToggleModuleStatus = async (tenantId: string, moduleId: string) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/auth/tenants/${tenantId}/modules/${moduleId}/toggle-status`, {
        method: 'PATCH',
      });
      setSuccess('Module subscription status toggled!');
      fetchTenants();
      loadStatsAndData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle module status.');
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setError('');
    try {
      await apiRequest(`/auth/system/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ subject: templateSubject, body: templateBody }),
      });
      setSuccess(`Template updated successfully!`);
      setEditingTemplate(null);
      fetchSystemData();
    } catch (err: any) {
      setError(err.message || 'Failed to update template.');
    }
  };

  // Stats
  const activeTenantsCount = tenants.filter(t => t.isActive).length;
  const suspendedTenantsCount = tenants.filter(t => !t.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="text-blue-600 h-8 w-8" />
            Super Admin Console
          </h2>
          <p className="text-slate-500 mt-1">Manage platform tenants, catalogue subscriptions, and global audit logs.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'tenants' && (
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition shadow-sm"
            >
              <Plus size={18} />
              {showAddForm ? 'Cancel' : 'Register Tenant'}
            </button>
          )}
          <button 
            onClick={() => {
              if (activeTab === 'tenants') fetchTenants();
              else if (activeTab === 'system') fetchSystemData();
              loadStatsAndData();
            }}
            className="p-2 border rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg shadow-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg shadow-sm">
          {error}
        </div>
      )}

      {tempCredentials && (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-md space-y-2">
          <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
            <Mail size={18} />
            Temporary Credentials Generated
          </h3>
          <p className="text-sm text-blue-800">
            Please share these temporary details with the Tenant Admin:
          </p>
          <div className="font-mono text-sm bg-white p-3 rounded-lg border">
            <div><strong>Admin Email:</strong> {tempCredentials.email}</div>
            <div><strong>Temporary Password:</strong> {tempCredentials.pass}</div>
          </div>
        </div>
      )}

      {/* Overview Stats Cards - Matches UI Preview Mockup */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Active Tenants</div>
            <div className="text-3xl font-extrabold text-blue-950 mt-1">{activeTenantsCount}</div>
          </div>
          <div className="h-10 w-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Suspended Tenants</div>
            <div className="text-3xl font-extrabold text-rose-950 mt-1">{suspendedTenantsCount}</div>
          </div>
          <div className="h-10 w-10 bg-rose-100 text-rose-600 flex items-center justify-center rounded-xl">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-100 to-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Platform Logs</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{logs.length}</div>
          </div>
          <div className="h-10 w-10 bg-slate-200 text-slate-700 flex items-center justify-center rounded-xl">
            <Terminal size={20} />
          </div>
        </div>
      </div>



      {/* Tenants tab */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          {showAddForm && (
            <form onSubmit={handleCreateTenant} className="bg-slate-50 border p-6 rounded-xl space-y-4 shadow-inner max-w-2xl">
              <h3 className="text-lg font-bold text-slate-800">Register New Company Tenant</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wayne Enterprises" 
                    className="w-full p-2 border rounded-lg"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unique Domain</label>
                  <input 
                    type="text" 
                    placeholder="e.g. wayne.com" 
                    className="w-full p-2 border rounded-lg"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tenant Admin Email</label>
                  <input 
                    type="email" 
                    placeholder="e.g. admin@wayne.com" 
                    className="w-full p-2 border rounded-lg"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Admin Password (Optional)</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank for auto password" 
                    className="w-full p-2 border rounded-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
                  <select 
                    className="w-full p-2 border rounded-lg bg-white"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    <option value="basic">Basic Plan (Attendance, Leave)</option>
                    <option value="subscription">Subscription Plan (Attendance, Leave, Payroll-Pending)</option>
                    <option value="premium">Premium Plan (All Modules Active)</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Create Tenant
              </button>
            </form>
          )}

          {loadingTenants ? (
            <p className="text-slate-500">Loading tenants...</p>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-bold text-slate-700 text-sm">Company Name</th>
                    <th className="p-4 font-bold text-slate-700 text-sm">Domain</th>
                    <th className="p-4 font-bold text-slate-700 text-sm">Email</th>
                    <th className="p-4 font-bold text-slate-700 text-sm">Modules</th>
                    <th className="p-4 font-bold text-slate-700 text-sm">Approval Status</th>
                    <th className="p-4 font-bold text-slate-700 text-sm">Status</th>
                    <th className="p-4 font-bold text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-medium text-slate-900">{t.name}</td>
                      <td className="p-4 font-mono text-sm text-slate-600">{t.domain}</td>
                      <td className="p-4 text-sm text-slate-600">{t.email || 'N/A'}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {t.tenantModules && t.tenantModules.length > 0 ? (
                            t.tenantModules.map((tm: any) => (
                              <button 
                                key={tm.id}
                                onClick={() => handleToggleModuleStatus(t.id, tm.module.id)}
                                className={`text-xs px-2.5 py-0.5 rounded-full border capitalize font-semibold cursor-pointer transition select-none flex items-center gap-1 ${
                                  tm.status === 'active' 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-amber-50 text-amber-900 border-amber-250 hover:bg-amber-100'
                                }`}
                                title="Click to toggle subscription status (Active / Pending)"
                              >
                                {tm.module.name} {tm.status === 'pending' && <span className="text-[10px] opacity-75 font-normal">(Pending)</span>}
                              </button>
                            ))
                          ) : (
                            t.subscribedModules.split(',').map((mod: string) => (
                              <span key={mod} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full border capitalize">
                                {mod}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {t.status === 'pending' ? 'Awaiting Approval' : 'Approved'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {t.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleTenant(t.id, t.isActive)}
                          className={`flex items-center gap-1 text-sm font-semibold p-1.5 rounded transition ${t.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {t.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          {t.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modules tab */}
      {activeTab === 'modules' && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
            <div className="h-10 w-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-lg mb-4">
              <Users size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Attendance Tracker</h3>
            <p className="text-slate-500 text-sm mt-2">Allows employees to log clock-in/out. Enables managers to audit timesheets.</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-full border border-blue-100">Standard Module</span>
              <span className="text-slate-400 font-medium">Global Status: Active</span>
            </div>
          </div>

          <div className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-lg mb-4">
              <Mail size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Leave Planner</h3>
            <p className="text-slate-500 text-sm mt-2">Apply for leaves, track approval flow, and review personal leave balances.</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-full border border-blue-100">Standard Module</span>
              <span className="text-slate-400 font-medium">Global Status: Active</span>
            </div>
          </div>

          <div className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
            <div className="h-10 w-10 bg-amber-100 text-amber-600 flex items-center justify-center rounded-lg mb-4">
              <Layers size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Payroll & Slips</h3>
            <p className="text-slate-500 text-sm mt-2">Manage base salaries, calculate deductions, and generate payslips.</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-1 rounded-full border border-purple-100">Premium Module</span>
              <span className="text-slate-400 font-medium">Global Status: Active</span>
            </div>
          </div>
        </div>
      )}

      {/* System tab */}
      {activeTab === 'system' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Email Templates */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="text-slate-700" size={20} />
              System Email Templates
            </h3>
            
            {editingTemplate ? (
              <form onSubmit={handleSaveTemplate} className="bg-slate-50 p-5 rounded-xl border space-y-4">
                <h4 className="font-semibold text-slate-800">Edit Template: <span className="font-mono text-sm">{editingTemplate.name}</span></h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Line</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded bg-white text-sm"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Template Body</label>
                  <textarea 
                    className="w-full p-2 border rounded bg-white text-sm font-mono"
                    rows={6}
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 text-sm">
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition">Save Template</button>
                  <button type="button" onClick={() => setEditingTemplate(null)} className="border px-3 py-1.5 rounded hover:bg-slate-100 transition">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <div key={t.id} className="p-4 bg-white border rounded-xl shadow-sm flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 capitalize">{t.name.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-500 mt-1 font-mono">Subject: {t.subject}</div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingTemplate(t);
                        setTemplateSubject(t.subject);
                        setTemplateBody(t.body);
                      }}
                      className="text-slate-600 hover:text-blue-600 p-1.5 hover:bg-slate-50 rounded transition"
                      title="Edit Template"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="text-slate-700" size={20} />
              Platform Audit Logs
            </h3>
            
            <div className="border rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 shadow-sm max-h-[380px] overflow-y-auto space-y-2.5">
              {logs.map((log) => (
                <div key={log.id} className="border-b border-slate-800 pb-2 flex flex-col gap-1">
                  <div className="flex justify-between text-slate-500">
                    <span className="text-blue-400 font-bold">[{log.action}]</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300 font-medium">{log.details}</div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-slate-600 italic">No audit logs logged.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
