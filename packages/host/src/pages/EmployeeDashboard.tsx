import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { 
  User, Clock, Calendar, FileText, CheckCircle, 
  XCircle, AlertCircle, Play, Square, LogOut 
} from 'lucide-react';

export default function EmployeeDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = () => {
    if (location.pathname.includes('/employee/attendance')) return 'attendance';
    if (location.pathname.includes('/employee/leave')) return 'leave';
    if (location.pathname.includes('/employee/payroll')) return 'payroll';
    return 'home';
  };

  const activeTab = getTabFromPath();
  const [user, setUser] = useState<any>(null);

  // Attendance states
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);

  // Leaves states
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('annual');

  // Payroll states
  const [payrolls, setPayrolls] = useState<any[]>([]);

  // Banners
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadUserData = () => {
    const userStr = sessionStorage.getItem('hrms.user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  };

  const getSubscribedModules = () => {
    const modulesStr = sessionStorage.getItem('hrms.modules') || 'attendance,payroll,leave';
    return modulesStr.split(',').map((m: string) => m.trim().toLowerCase());
  };

  const activeModules = getSubscribedModules();

  const fetchAttendance = async () => {
    try {
      const data = await apiRequest('/attendance');
      setAttendanceLogs(data);
      const activeCheckIn = data.find((log: any) => !log.checkOut);
      if (activeCheckIn) {
        setIsCheckedIn(true);
        setCurrentAttendanceId(activeCheckIn.id);
      } else {
        setIsCheckedIn(false);
        setCurrentAttendanceId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaves = async () => {
    try {
      const data = await apiRequest('/leave');
      setLeaves(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayrolls = async () => {
    try {
      const data = await apiRequest('/payroll');
      setPayrolls(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    loadUserData();
    if (activeTab === 'attendance' && activeModules.includes('attendance')) {
      await fetchAttendance();
    } else if (activeTab === 'leave' && activeModules.includes('leave')) {
      await fetchLeaves();
    } else if (activeTab === 'payroll' && activeModules.includes('payroll')) {
      await fetchPayrolls();
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const handleCheckIn = async () => {
    setError('');
    setSuccess('');
    try {
      const response = await apiRequest('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          checkIn: new Date().toISOString(),
          status: 'present',
          notes: 'Checked in via Self Portal',
        }),
      });
      setSuccess('Checked in successfully!');
      setIsCheckedIn(true);
      setCurrentAttendanceId(response.id);
      fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    if (!currentAttendanceId) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/attendance/${currentAttendanceId}/checkout`, {
        method: 'POST',
      });
      setSuccess('Checked out successfully!');
      setIsCheckedIn(false);
      setCurrentAttendanceId(null);
      fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Check-out failed');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!leaveStart || !leaveEnd) {
      setError('Please provide both start date and end date.');
      return;
    }

    try {
      await apiRequest('/leave', {
        method: 'POST',
        body: JSON.stringify({
          startDate: leaveStart,
          endDate: leaveEnd,
          type: leaveType,
        }),
      });
      setSuccess('Leave request applied successfully! Status is pending approval.');
      setLeaveStart('');
      setLeaveEnd('');
      fetchLeaves();
    } catch (err: any) {
      setError(err.message || 'Failed to apply for leave');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hello, {user?.email}!</h2>
          <p className="text-blue-100 text-sm mt-1">Welcome to your personalized portal dashboard. Here is your dashboard overview.</p>
        </div>
        <div className="h-12 w-12 bg-white/20 flex items-center justify-center rounded-xl backdrop-blur-md">
          <User className="h-6 w-6 text-white" />
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg">
          {error}
        </div>
      )}



      {/* Feed Home */}
      {activeTab === 'home' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border rounded-xl bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg border-b pb-2">Profile Details</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <div><strong>Email:</strong> {user?.email}</div>
              <div><strong>Access Role:</strong> <span className="capitalize">{user?.role}</span></div>
              <div className="flex flex-wrap gap-1 mt-1">
                <strong>Granular Permissions:</strong>
                {user?.permissions?.map((p: string) => (
                  <span key={p} className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border rounded-xl bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg border-b pb-2">Announcements</h3>
            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
              <div className="font-semibold text-slate-900 text-sm">System Update Completed</div>
              <p className="text-slate-500 text-xs">The HRMS Platform migration to Multi-Tenant isolation is now complete.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
              <div className="font-semibold text-slate-900 text-sm">Welcome Tenant Admins!</div>
              <p className="text-slate-500 text-xs">All companies can now customize their active module subscriptions.</p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance logging view */}
      {activeTab === 'attendance' && activeModules.includes('attendance') && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Self Clock-In / Out</h3>
              <p className="text-slate-500 text-sm mt-1">
                {isCheckedIn ? 'You are currently Clocked In.' : 'You are currently Clocked Out.'}
              </p>
            </div>
            <div>
              {isCheckedIn ? (
                <button 
                  onClick={handleCheckOut}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition shadow"
                >
                  <Square size={16} />
                  Clock Out
                </button>
              ) : (
                <button 
                  onClick={handleCheckIn}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition shadow"
                >
                  <Play size={16} />
                  Clock In
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <h3 className="p-4 font-bold text-slate-900 border-b">Recent Attendance History</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">Check In Time</th>
                  <th className="p-4 font-bold text-slate-700">Check Out Time</th>
                  <th className="p-4 font-bold text-slate-700">Status</th>
                  <th className="p-4 font-bold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-4 font-mono">{new Date(log.checkIn).toLocaleString()}</td>
                    <td className="p-4 font-mono">{log.checkOut ? new Date(log.checkOut).toLocaleString() : 'Active...'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${log.status === 'present' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 italic">{log.notes || 'N/A'}</td>
                  </tr>
                ))}
                {attendanceLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500 italic">No attendance logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Application */}
      {activeTab === 'leave' && activeModules.includes('leave') && (
        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={handleApplyLeave} className="lg:col-span-1 border rounded-xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Apply for Leave</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Type</label>
              <select 
                className="w-full p-2 border rounded bg-white text-sm"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
              </select>
            </div>
            <button type="submit" className="bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-lg w-full transition text-sm">
              Submit Request
            </button>
          </form>

          <div className="lg:col-span-2 bg-white border rounded-xl overflow-hidden shadow-sm">
            <h3 className="p-4 font-bold text-slate-900 border-b">Leave Applications</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">Dates</th>
                  <th className="p-4 font-bold text-slate-700">Type</th>
                  <th className="p-4 font-bold text-slate-700 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td className="p-4 font-mono">
                      {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 capitalize">{l.type}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : l.status === 'rejected' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500 italic">No leave applications found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll slips view */}
      {activeTab === 'payroll' && activeModules.includes('payroll') && (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <h3 className="p-4 font-bold text-slate-900 border-b">My Monthly Payslips</h3>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-700">Disbursement Month</th>
                <th className="p-4 font-bold text-slate-700">Gross Payout</th>
                <th className="p-4 font-bold text-slate-700">Deductions</th>
                <th className="p-4 font-bold text-slate-700">Net Salary</th>
                <th className="p-4 font-bold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.map((p) => (
                <tr key={p.id}>
                  <td className="p-4 font-bold">
                    {new Date(p.period).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="p-4">₹ {p.grossAmount.toLocaleString()}</td>
                  <td className="p-4">₹ {p.deductions.toLocaleString()}</td>
                  <td className="p-4 text-primary font-semibold">₹ {p.netAmount.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {payrolls.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">No payslips generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
