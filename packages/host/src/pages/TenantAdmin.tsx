import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { 
  Building, Users, Layers, Sliders, BarChart2, Plus, 
  Trash2, Edit, Save, X, ToggleLeft, ToggleRight, 
  RefreshCw, CheckCircle, AlertTriangle, Play, Square, Calendar, FileText
} from 'lucide-react';

export default function TenantAdmin() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/company/employees') || location.pathname.includes('/admin/employees')) return 'employees';
    if (location.pathname.includes('/company/modules') || location.pathname.includes('/admin/modules')) return 'modules';
    if (location.pathname.includes('/company/settings') || location.pathname.includes('/admin/settings')) return 'settings';
    if (location.pathname.includes('/company/reports') || location.pathname.includes('/admin/reports')) return 'reports';
    if (location.pathname.includes('/company/attendance') || location.pathname.includes('/admin/attendance')) return 'attendance';
    if (location.pathname.includes('/company/leave') || location.pathname.includes('/admin/leave')) return 'leave';
    if (location.pathname.includes('/company/payroll') || location.pathname.includes('/admin/payroll')) return 'payroll';
    return 'dashboard';
  };

  const activeTab = getTabFromPath();
  
  // Settings & Theme
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [theme, setTheme] = useState('blue');
  const [plan, setPlan] = useState('premium');

  // Attendance admin states
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  // Leave admin states
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  // Payroll admin states
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState('07');
  const [payrollYear, setPayrollYear] = useState('2026');
  const [payrollGross, setPayrollGross] = useState('');
  const [payrollDeductions, setPayrollDeductions] = useState('');
  const [showPayrollForm, setShowPayrollForm] = useState(false);

  // KPIs
  const [kpis, setKpis] = useState<any>({
    employeeCount: 0,
    activeTodayCount: 0,
    totalPayrollBudget: 0,
    subscribedModules: '',
  });

  // Employees CRUD
  const [employees, setEmployees] = useState<any[]>([]);
  const [empCode, setEmpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dept, setDept] = useState('');
  const [designation, setDesignation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);

  // Subscribed modules from company settings
  const [modulesMap, setModulesMap] = useState({
    attendance: true,
    leave: true,
    payroll: true,
  });

  // State messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchKpis = async () => {
    try {
      const data = await apiRequest('/company/kpis');
      setKpis(data);
      
      // Update modules map from KPIs
      const subs = data.subscribedModules.split(',');
      setModulesMap({
        attendance: subs.includes('attendance'),
        leave: subs.includes('leave'),
        payroll: subs.includes('payroll'),
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    setLoading(false);
    try {
      const data = await apiRequest('/employees');
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees');
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiRequest('/company/settings');
      setCompanyName(data.name);
      setDomain(data.domain);
      if (data.themeSettings) {
        try {
          const parsed = JSON.parse(data.themeSettings);
          if (parsed.plan) {
            setPlan(parsed.plan);
          }
          if (parsed.primary === '#10b981') setTheme('emerald');
          else if (parsed.primary === '#6366f1') setTheme('indigo');
          else if (parsed.primary === '#a855f7') setTheme('purple');
          else if (parsed.primary === '#f43f5e') setTheme('rose');
          else setTheme('blue');
        } catch (e) {
          setTheme('blue');
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchAttendanceLogs = async () => {
    try {
      const data = await apiRequest('/attendance');
      setAttendanceLogs(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const data = await apiRequest('/leave');
      setLeaveRequests(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchPayrolls = async () => {
    try {
      const data = await apiRequest('/payroll');
      setPayrolls(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchKpis(), fetchEmployees(), fetchSettings()]);
      if (activeTab === 'attendance') {
        await fetchAttendanceLogs();
      } else if (activeTab === 'leave') {
        await fetchLeaveRequests();
      } else if (activeTab === 'payroll') {
        await fetchPayrolls();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [activeTab]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!empCode.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill in employee code, names and email address.');
      return;
    }

    try {
      await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify({
          employeeCode: empCode,
          firstName,
          lastName,
          email,
          department: dept,
          designation,
          password: password || undefined,
        }),
      });

      setSuccess(`Employee "${firstName} ${lastName}" added! Auth login generated.`);
      setEmpCode('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setDept('');
      setDesignation('');
      setShowAddForm(false);
      fetchEmployees();
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to add employee');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/employees/${editingEmp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editingEmp.firstName,
          lastName: editingEmp.lastName,
          department: editingEmp.department,
          designation: editingEmp.designation,
        }),
      });

      setSuccess(`Employee profile updated successfully.`);
      setEditingEmp(null);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This will also remove their auth login credentials.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/employees/${id}`, { method: 'DELETE' });
      setSuccess('Employee deleted successfully.');
      fetchEmployees();
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee.');
    }
  };

  const handleToggleModule = async (moduleName: 'attendance' | 'leave' | 'payroll') => {
    // Check if basic plan and trying to enable payroll (paid subscription module)
    if (plan === 'basic' && moduleName === 'payroll' && !modulesMap.payroll) {
      const proceed = confirm(
        "The Payroll Processing module requires a paid subscription. Would you like to subscribe to this module by paying $10/month?"
      );
      if (!proceed) {
        return;
      }
    }

    const updatedMap = {
      ...modulesMap,
      [moduleName]: !modulesMap[moduleName],
    };
    
    // Construct comma-separated string
    const activeList = Object.entries(updatedMap)
      .filter(([_, active]) => active)
      .map(([name]) => name)
      .join(',');

    try {
      await apiRequest('/company/modules', {
        method: 'PATCH',
        body: JSON.stringify({ modules: activeList }),
      });
      setSuccess(`Module configuration updated successfully!`);
      setModulesMap(updatedMap);
      sessionStorage.setItem('hrms.modules', activeList);
      window.dispatchEvent(new CustomEvent('hrms:modules-updated'));
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle module.');
    }
  };

  const handleSaveTheme = async (selectedTheme: string) => {
    setTheme(selectedTheme);
    let primary = '#3b82f6';
    let secondary = '#1e3a8a';
    if (selectedTheme === 'emerald') {
      primary = '#10b981';
      secondary = '#065f46';
    } else if (selectedTheme === 'indigo') {
      primary = '#6366f1';
      secondary = '#3730a3';
    } else if (selectedTheme === 'purple') {
      primary = '#a855f7';
      secondary = '#581c87';
    } else if (selectedTheme === 'rose') {
      primary = '#f43f5e';
      secondary = '#9f1239';
    }
    
    setError('');
    setSuccess('');
    try {
      await apiRequest('/company/settings/theme', {
        method: 'PATCH',
        body: JSON.stringify({ primary, secondary, fontFamily: 'Inter, sans-serif', logoUrl: '' }),
      });
      setSuccess('Accent color saved successfully!');
      // Apply theme locally
      const root = document.documentElement;
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--secondary', secondary);
    } catch (err: any) {
      setError(err.message || 'Failed to save theme.');
    }
  };

  // Attendance Handlers
  const handleCheckOutAttendance = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/attendance/${id}/checkout`, { method: 'POST' });
      setSuccess('Checked out employee successfully!');
      fetchAttendanceLogs();
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to check out');
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/attendance/${id}`, { method: 'DELETE' });
      setSuccess('Attendance record deleted.');
      fetchAttendanceLogs();
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    }
  };

  const handleUpdateAttendanceNotes = async (id: string) => {
    const notes = prompt('Enter note details:');
    if (notes === null) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/attendance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
      setSuccess('Notes updated.');
      fetchAttendanceLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to update notes');
    }
  };

  // Leave Handlers
  const handleUpdateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/leave/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setSuccess(`Leave request successfully ${status}!`);
      fetchLeaveRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to update leave status');
    }
  };

  // Payroll Handlers
  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedEmployeeId || !payrollGross.trim() || !payrollDeductions.trim()) {
      setError('Please fill in all payroll fields.');
      return;
    }
    const gross = parseFloat(payrollGross);
    const deductions = parseFloat(payrollDeductions);
    const net = gross - deductions;
    const periodDate = new Date(parseInt(payrollYear), parseInt(payrollMonth) - 1, 1).toISOString();

    try {
      await apiRequest('/payroll', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          period: periodDate,
          grossAmount: gross,
          deductions,
          netAmount: net,
          status: 'processed',
        }),
      });
      setSuccess('Payroll generated successfully!');
      setSelectedEmployeeId('');
      setPayrollGross('');
      setPayrollDeductions('');
      setShowPayrollForm(false);
      fetchPayrolls();
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to process payroll');
    }
  };

  const handleMarkPayrollPaid = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/payroll/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paid' }),
      });
      setSuccess('Payroll status updated to paid!');
      fetchPayrolls();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDeletePayroll = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/payroll/${id}`, { method: 'DELETE' });
      setSuccess('Payroll record deleted.');
      fetchPayrolls();
      fetchKpis();
    } catch (err: any) {
      setError(err.message || 'Failed to delete payroll');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiRequest('/company/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name: companyName }),
      });
      setSuccess('Company settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="text-primary h-8 w-8" />
            {companyName || 'Company'} Admin Portal
          </h2>
          <p className="text-slate-500 mt-1">Manage organization directory, subscribe modules and view department analytics.</p>
        </div>
        <button 
          onClick={loadAll} 
          className="p-2 border rounded-lg hover:bg-slate-50 text-slate-600 transition"
          title="Refresh Data"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages */}
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



      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="border bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl shadow-sm">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Total Staff Strength</div>
              <div className="mt-2 text-4xl font-extrabold text-blue-900">{kpis.employeeCount}</div>
              <p className="text-xs text-blue-700 mt-2">Active employees on the directory</p>
            </div>

            <div className="border bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl shadow-sm">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Attendance Checked-In Today</div>
              <div className="mt-2 text-4xl font-extrabold text-emerald-900">{kpis.activeTodayCount}</div>
              <p className="text-xs text-emerald-700 mt-2">Checked-in on the terminal</p>
            </div>

            <div className="border bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl shadow-sm">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Payroll Net Payout</div>
              <div className="mt-2 text-4xl font-extrabold text-purple-900">₹ {kpis.totalPayrollBudget.toLocaleString()}</div>
              <p className="text-xs text-purple-700 mt-2">Monthly net budget commitment</p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Active Enabled Modules</h3>
            <div className="flex flex-wrap gap-4">
              <div className={`p-4 border rounded-xl flex items-center gap-3 transition ${modulesMap.attendance ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                <div className={`h-3 w-3 rounded-full ${modulesMap.attendance ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <div className="font-bold text-sm">Attendance Logging</div>
                  <div className="text-xs">Self check-in terminals enabled</div>
                </div>
              </div>
              <div className={`p-4 border rounded-xl flex items-center gap-3 transition ${modulesMap.leave ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                <div className={`h-3 w-3 rounded-full ${modulesMap.leave ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <div className="font-bold text-sm">Leave Management</div>
                  <div className="text-xs">Annual & sick leave flows enabled</div>
                </div>
              </div>
              <div className={`p-4 border rounded-xl flex items-center gap-3 transition ${modulesMap.payroll ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                <div className={`h-3 w-3 rounded-full ${modulesMap.payroll ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                  <div className="font-bold text-sm">Payroll Processing</div>
                  <div className="text-xs">Automatic draft payout processing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employees CRUD View */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">Company Employee Directory</h3>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary hover:opacity-90 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition text-sm shadow"
            >
              <Plus size={16} />
              Add New Employee
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateEmployee} className="bg-slate-50 border p-5 rounded-xl space-y-4 max-w-2xl">
              <h4 className="font-bold text-slate-800">Add Employee & Create Login Credentials</h4>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Employee Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. EMP-099" 
                    className="w-full p-2 border rounded"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="e.g. employee@comp.com" 
                    className="w-full p-2 border rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Login Password (Optional)</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank for auto password" 
                    className="w-full p-2 border rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                  <input 
                    type="text" 
                    placeholder="First Name" 
                    className="w-full p-2 border rounded"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Last Name" 
                    className="w-full p-2 border rounded"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Engineering" 
                    className="w-full p-2 border rounded"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Analyst" 
                    className="w-full p-2 border rounded"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-primary text-white font-semibold py-1.5 px-3 rounded hover:opacity-90 transition text-sm">Save Employee</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="border font-semibold py-1.5 px-3 rounded hover:bg-slate-100 transition text-sm">Cancel</button>
              </div>
            </form>
          )}

          {editingEmp && (
            <form onSubmit={handleUpdateEmployee} className="bg-amber-50 border border-amber-200 p-5 rounded-xl space-y-4 max-w-2xl">
              <h4 className="font-bold text-amber-900">Edit Employee: {editingEmp.employeeCode}</h4>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editingEmp.firstName}
                    onChange={(e) => setEditingEmp({ ...editingEmp, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editingEmp.lastName}
                    onChange={(e) => setEditingEmp({ ...editingEmp, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editingEmp.department || ''}
                    onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editingEmp.designation || ''}
                    onChange={(e) => setEditingEmp({ ...editingEmp, designation: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-amber-600 text-white font-semibold py-1.5 px-3 rounded hover:bg-amber-700 transition text-sm">Update Profile</button>
                <button type="button" onClick={() => setEditingEmp(null)} className="border font-semibold py-1.5 px-3 rounded hover:bg-slate-100 transition text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700 text-sm">Code</th>
                  <th className="p-4 font-bold text-slate-700 text-sm">Name</th>
                  <th className="p-4 font-bold text-slate-700 text-sm">Email</th>
                  <th className="p-4 font-bold text-slate-700 text-sm">Department</th>
                  <th className="p-4 font-bold text-slate-700 text-sm">Designation</th>
                  <th className="p-4 font-bold text-slate-700 text-sm text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-sm text-slate-900">{emp.employeeCode}</td>
                    <td className="p-4 font-medium text-slate-800">{emp.firstName} {emp.lastName}</td>
                    <td className="p-4 text-slate-600">{emp.email}</td>
                    <td className="p-4 text-slate-600">{emp.department || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{emp.designation || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button 
                          onClick={() => setEditingEmp(emp)}
                          className="p-1.5 text-primary hover:bg-slate-100 rounded transition"
                          title="Edit Employee"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete Employee"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modules tab */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900">Enable/Disable Company Modules</h3>
          <p className="text-slate-500 text-sm">Toggle modules to enable or restrict feature access for employees inside your tenant boundary.</p>
          
          <div className="grid gap-6 max-w-3xl">
            <div className="p-5 border bg-white rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Attendance Tracking Terminal</h4>
                <p className="text-slate-500 text-sm mt-1">Allows employees to self check-in/out and record attendance.</p>
              </div>
              <button 
                onClick={() => handleToggleModule('attendance')}
                className="text-blue-600 focus:outline-none transition"
              >
                {modulesMap.attendance ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-400" />}
              </button>
            </div>

            <div className="p-5 border bg-white rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Leave Planner</h4>
                <p className="text-slate-500 text-sm mt-1">Allows employees to request leave applications and review vacation balances.</p>
              </div>
              <button 
                onClick={() => handleToggleModule('leave')}
                className="text-blue-600 focus:outline-none transition"
              >
                {modulesMap.leave ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-400" />}
              </button>
            </div>

            <div className="p-5 border bg-white rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Payroll & Slips</h4>
                <p className="text-slate-500 text-sm mt-1">Allows employees read-only access to their monthly payslips.</p>
              </div>
              <button 
                onClick={() => handleToggleModule('payroll')}
                className="text-blue-600 focus:outline-none transition"
              >
                {modulesMap.payroll ? <ToggleRight size={38} className="text-blue-600" /> : <ToggleLeft size={38} className="text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
          <form onSubmit={handleSaveSettings} className="bg-white border p-6 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg">Company Settings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Domain</label>
              <input 
                type="text" 
                disabled 
                className="w-full p-2 border rounded bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
                value={domain}
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm">
              Save Changes
            </button>
          </form>

          <div className="bg-white border p-6 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg">Appearance & Theme</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Portal Accent Color</label>
              <div className="flex gap-3 mt-2">
                {['blue', 'emerald', 'indigo', 'purple', 'rose'].map((c) => (
                  <button 
                    key={c}
                    onClick={() => handleSaveTheme(c)}
                    className={`h-8 w-8 rounded-full border-2 capitalize transition ${theme === c ? 'border-slate-900 ring-2 ring-slate-400' : 'border-transparent'}`}
                    style={{ backgroundColor: c === 'emerald' ? '#10b981' : c === 'indigo' ? '#6366f1' : c === 'purple' ? '#a855f7' : c === 'rose' ? '#f43f5e' : '#3b82f6' }}
                    title={`${c} theme`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400">Themes modify layouts accent bars across active portals.</p>
          </div>
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Organization Reports Summary</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
              <h4 className="font-semibold text-slate-700">Department Headcount Distribution</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span>Engineering</span>
                  <span className="font-semibold">3 employees</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Human Resources</span>
                  <span className="font-semibold">1 employee</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Management</span>
                  <span className="font-semibold">1 employee</span>
                </div>
              </div>
            </div>

            <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
              <h4 className="font-semibold text-slate-700">Monthly Payroll Disbursements</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span>July 2026</span>
                  <span className="font-semibold">₹ 1,46,000 (Paid)</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>June 2026</span>
                  <span className="font-semibold">₹ 1,46,000 (Paid)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Management View */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Attendance Terminals & Logs</h3>
              <p className="text-slate-500 text-sm mt-0.5">Review, checkout, and audit active employee work sessions.</p>
            </div>
            <button 
              onClick={fetchAttendanceLogs}
              className="border px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Refresh Logs
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">Employee Details</th>
                  <th className="p-4 font-bold text-slate-700">Check In Time</th>
                  <th className="p-4 font-bold text-slate-700">Check Out Time</th>
                  <th className="p-4 font-bold text-slate-700">Session Status</th>
                  <th className="p-4 font-bold text-slate-700">Notes & Comments</th>
                  <th className="p-4 font-bold text-slate-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceLogs.map((log) => {
                  const emp = employees.find(e => e.id === log.employeeId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee'}</div>
                        <div className="text-xs text-slate-500 font-mono">{emp?.employeeCode || log.employeeId}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-700">{new Date(log.checkIn).toLocaleString()}</td>
                      <td className="p-4 font-mono text-slate-700">
                        {log.checkOut ? new Date(log.checkOut).toLocaleString() : <span className="text-blue-600 font-semibold flex items-center gap-1 animate-pulse">Active Session...</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 italic max-w-xs truncate" title={log.notes || ''}>
                        {log.notes || <span className="text-slate-300">No notes</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          {!log.checkOut && (
                            <button 
                              onClick={() => handleCheckOutAttendance(log.id)}
                              className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition font-semibold"
                            >
                              Checkout
                            </button>
                          )}
                          <button 
                            onClick={() => handleUpdateAttendanceNotes(log.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Notes"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteAttendance(log.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {attendanceLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No attendance records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Applications View */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Leave Applications & Planner</h3>
              <p className="text-slate-500 text-sm mt-0.5">Review, approve, or reject employee leave requests.</p>
            </div>
            <button 
              onClick={fetchLeaveRequests}
              className="border px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Refresh Requests
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">Employee Details</th>
                  <th className="p-4 font-bold text-slate-700">Leave Period</th>
                  <th className="p-4 font-bold text-slate-700">Category</th>
                  <th className="p-4 font-bold text-slate-700">Status</th>
                  <th className="p-4 font-bold text-slate-700 text-center">Approvals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.map((l) => {
                  const emp = employees.find(e => e.id === l.employeeId);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee'}</div>
                        <div className="text-xs text-slate-500 font-mono">{emp?.employeeCode || l.employeeId}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-700">
                        {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 capitalize text-slate-800">{l.type}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : l.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {l.status === 'pending' ? (
                          <div className="flex justify-center gap-1.5">
                            <button 
                              onClick={() => handleUpdateLeaveStatus(l.id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition font-semibold"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleUpdateLeaveStatus(l.id, 'rejected')}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs hover:bg-rose-700 transition font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 capitalize">Decision made ({l.status})</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No leave applications found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Processing View */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Payroll Processing & Ledger</h3>
              <p className="text-slate-500 text-sm mt-0.5">Calculate payouts, generate payslips, and dispatch monthly wages.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPayrollForm(!showPayrollForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition text-sm shadow"
              >
                <Plus size={16} /> Process Payroll
              </button>
              <button 
                onClick={fetchPayrolls}
                className="border px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <RefreshCw size={14} /> Refresh Ledger
              </button>
            </div>
          </div>

          {showPayrollForm && (
            <form onSubmit={handleCreatePayroll} className="bg-slate-50 border p-5 rounded-xl space-y-4 max-w-2xl shadow-inner">
              <h4 className="font-bold text-slate-800">Generate Payout Sheet</h4>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Employee</label>
                  <select 
                    className="w-full p-2 border rounded bg-white"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
                    <select className="w-full p-2 border rounded bg-white text-sm" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)}>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{new Date(2026, parseInt(m) - 1).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
                    <select className="w-full p-2 border rounded bg-white text-sm" value={payrollYear} onChange={(e) => setPayrollYear(e.target.value)}>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gross Amount (INR)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 85000" 
                    className="w-full p-2 border rounded"
                    value={payrollGross}
                    onChange={(e) => setPayrollGross(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Deductions (INR)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5000" 
                    className="w-full p-2 border rounded"
                    value={payrollDeductions}
                    onChange={(e) => setPayrollDeductions(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm flex justify-between items-center">
                <span className="font-semibold text-blue-900">Estimated Net Payout:</span>
                <span className="font-extrabold text-blue-950 text-lg">
                  ₹ {((parseFloat(payrollGross) || 0) - (parseFloat(payrollDeductions) || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white font-semibold py-1.5 px-3 rounded hover:bg-blue-700 transition text-sm">Save & Process</button>
                <button type="button" onClick={() => setShowPayrollForm(false)} className="border font-semibold py-1.5 px-3 rounded hover:bg-slate-100 transition text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">Employee Details</th>
                  <th className="p-4 font-bold text-slate-700">Month Period</th>
                  <th className="p-4 font-bold text-slate-700">Gross Salary</th>
                  <th className="p-4 font-bold text-slate-700">Deductions</th>
                  <th className="p-4 font-bold text-slate-700">Net Wage</th>
                  <th className="p-4 font-bold text-slate-700">Payout Status</th>
                  <th className="p-4 font-bold text-slate-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((p) => {
                  const emp = employees.find(e => e.id === p.employeeId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee'}</div>
                        <div className="text-xs text-slate-500 font-mono">{emp?.employeeCode || p.employeeId}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">
                        {new Date(p.period).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-slate-600">₹ {p.grossAmount.toLocaleString()}</td>
                      <td className="p-4 text-slate-600">₹ {p.deductions.toLocaleString()}</td>
                      <td className="p-4 text-primary font-bold">₹ {p.netAmount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          {p.status !== 'paid' && (
                            <button 
                              onClick={() => handleMarkPayrollPaid(p.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition font-semibold"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePayroll(p.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Ledger Check"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {payrolls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">No payroll checks compiled in ledger.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
