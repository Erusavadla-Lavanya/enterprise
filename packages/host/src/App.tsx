import { lazy, Suspense, useEffect, useState } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import SuperAdmin from './pages/SuperAdmin';
import TenantAdmin from './pages/TenantAdmin';
import EmployeeDashboard from './pages/EmployeeDashboard';
import { Shield, Building, User, LogOut, Lock } from 'lucide-react';
import { apiRequest } from './utils/api';

const Auth = lazy(() => import('auth/App'));

const applyTenantTheme = async (userObj?: any) => {
  try {
    let domain = '';
    const loggedInUser = userObj || JSON.parse(sessionStorage.getItem('hrms.user') || 'null');
    
    if (loggedInUser && loggedInUser.email && loggedInUser.role !== 'super_admin') {
      domain = loggedInUser.email.split('@')[1];
    } else {
      domain = 'acme.com';
    }

    const response = await fetch(`${process.env.API_URL || 'http://localhost:4000/api'}/company/settings/theme?domain=${domain}`);
    if (response.ok) {
      const theme = await response.json();
      const root = document.documentElement;
      root.style.setProperty('--primary', theme.primary || '#3b82f6');
      root.style.setProperty('--secondary', theme.secondary || '#1e3a8a');
      root.style.setProperty('--font-family', theme.fontFamily || 'Inter, sans-serif');
      document.body.style.fontFamily = theme.fontFamily || 'Inter, sans-serif';
    }
  } catch (err) {
    console.error('Failed to load tenant theme settings:', err);
  }
};

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);

  const loadUser = () => {
    const userStr = sessionStorage.getItem('hrms.user');
    console.log('Host loadUser: current hrms.user in sessionStorage:', userStr);
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      setUser(null);
    }
  };

  const fetchAndStoreModules = async (userObj: any) => {
    if (!userObj) {
      sessionStorage.removeItem('hrms.modules');
      setActiveModules([]);
      return;
    }
    if (userObj.role === 'super_admin') {
      const all = ['attendance', 'payroll', 'leave', 'employees', 'auth'];
      sessionStorage.setItem('hrms.modules', all.join(','));
      setActiveModules(all);
      return;
    }
    try {
      const company = await apiRequest('/company/settings');
      const tenantModules = company.tenantModules || [];
      const filteredMods = tenantModules
        .filter((tm: any) => {
          return tm.status === 'active';
        })
        .map((tm: any) => tm.module.name.toLowerCase());

      sessionStorage.setItem('hrms.modules', filteredMods.join(','));
      setActiveModules(filteredMods);
    } catch (err) {
      console.error('Failed to load company modules:', err);
    }
  };

  useEffect(() => {
    console.log('Host MainLayout mounted, current path:', location.pathname);
    loadUser();
    applyTenantTheme();
    const storedUser = sessionStorage.getItem('hrms.user');
    if (storedUser) {
      fetchAndStoreModules(JSON.parse(storedUser));
    }

    const handleAuthSession = (e: any) => {
      console.log('Host: Received hrms:auth-session event with details:', e.detail);
      sessionStorage.setItem('hrms.user', JSON.stringify(e.detail));
      loadUser();
      const updatedUser = e.detail;
      applyTenantTheme(updatedUser);
      fetchAndStoreModules(updatedUser);

      console.log('Host: Redirecting user with role:', updatedUser?.role);
      if (updatedUser?.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else if (updatedUser?.role === 'tenant_admin') {
        navigate('/company/dashboard');
      } else {
        navigate('/employee/home');
      }
    };

    const handleLogout = () => {
      console.log('Host: Received hrms:auth-logout event');
      sessionStorage.removeItem('hrms.user');
      sessionStorage.removeItem('hrms.modules');
      setUser(null);
      setActiveModules([]);
      applyTenantTheme(null);
      window.location.href = '/login';
    };

    const handleUnauthorized = () => {
      console.log('Host: Received hrms:auth-unauthorized event');
      navigate('/unauthorized');
    };

    const handleModulesUpdated = () => {
      const storedModules = sessionStorage.getItem('hrms.modules') || '';
      console.log('Host: Modules updated event, new list:', storedModules);
      setActiveModules(storedModules.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean));
    };

    window.addEventListener('hrms:auth-session', handleAuthSession);
    window.addEventListener('hrms:auth-logout', handleLogout);
    window.addEventListener('hrms:auth-unauthorized', handleUnauthorized);
    window.addEventListener('hrms:modules-updated', handleModulesUpdated);

    return () => {
      window.removeEventListener('hrms:auth-session', handleAuthSession);
      window.removeEventListener('hrms:auth-logout', handleLogout);
      window.removeEventListener('hrms:auth-unauthorized', handleUnauthorized);
      window.removeEventListener('hrms:modules-updated', handleModulesUpdated);
    };
  }, [navigate]);

  const handleSignOut = async () => {
    sessionStorage.setItem('hrms.loggedOut', 'true');
    try {
      await fetch(`${process.env.API_URL || 'http://localhost:4000/api'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Failed to clear cookie on backend during signout:', e);
    }
    window.dispatchEvent(new CustomEvent('hrms:auth-logout'));
  };

  const isPublicRoute = ['/login', '/register', '/403', '/unauthorized'].includes(location.pathname);
  console.log('Host MainLayout rendering. Path:', location.pathname, 'isPublicRoute:', isPublicRoute, 'User state:', user?.email);

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 w-full">
        <Suspense fallback={<p className="text-slate-500">Loading auth screen...</p>}>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/403" element={
              <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl border text-center space-y-4 border-slate-200">
                <Lock className="mx-auto text-rose-500 h-16 w-16" />
                <h1 className="text-2xl font-bold text-slate-800">403 - Access Denied</h1>
                <p className="text-slate-500 text-sm">You do not have the required permissions or subscriptions to view this page.</p>
                <button onClick={() => navigate('/')} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg w-full transition hover:bg-secondary">
                  Go to Dashboard
                </button>
              </div>
            } />
            <Route path="/unauthorized" element={
              <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl border text-center space-y-4 border-slate-200">
                <Lock className="mx-auto text-rose-500 h-16 w-16" />
                <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
                <p className="text-slate-500 text-sm font-semibold text-rose-600">You are not allowed to visit this portal. Contact Admin.</p>
                <button onClick={() => {
                  sessionStorage.setItem('hrms.loggedOut', 'true');
                  navigate('/login');
                }} className="bg-primary text-white font-semibold py-2 px-4 rounded-lg w-full transition hover:bg-secondary">
                  Back to Login
                </button>
              </div>
            } />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col w-full">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between text-slate-800 shadow-sm select-none">
        <h1 className="text-xl font-bold tracking-tight cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
          HRMS <span className="text-primary font-extrabold">Enterprise</span>
        </h1>
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 flex items-center gap-1.5 capitalize bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold">
              {user.role === 'super_admin' ? <Shield size={12} /> : user.role === 'tenant_admin' ? <Building size={12} /> : <User size={12} />}
              {user.role.replace('_', ' ')}
            </span>
            <span className="text-slate-600 font-medium">{user.email}</span>
            <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-800 transition flex items-center gap-1 font-semibold">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row w-full gap-0 overflow-hidden">
        {/* Sidebar Nav */}
        {user && (
          <nav className="w-full md:w-[260px] flex flex-col gap-1 bg-slate-100 text-slate-850 border-r border-slate-200 min-h-[calc(100vh-68px)] p-5 select-none shadow-sm">
            {user.role === 'super_admin' && (
              <>
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-200/60 mb-2 select-none uppercase tracking-wider">Admin Dashboard</div>
                <button onClick={() => navigate('/admin/dashboard')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/dashboard' || location.pathname === '/admin/tenants' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Tenants
                </button>
                <button onClick={() => navigate('/admin/modules')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/modules' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Global Modules
                </button>
                <button onClick={() => navigate('/admin/system')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/system' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  System Settings & Logs
                </button>

                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-200/60 my-2 select-none uppercase tracking-wider">Functional Modules</div>
                <button onClick={() => navigate('/admin/employees')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/employees' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Employees Directory
                </button>
                <button onClick={() => navigate('/admin/attendance')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/attendance' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Attendance Management
                </button>
                <button onClick={() => navigate('/admin/leave')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/leave' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Leave Applications
                </button>
                <button onClick={() => navigate('/admin/payroll')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/admin/payroll' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Payroll Processing
                </button>
              </>
            )}
            {user.role === 'tenant_admin' && (
              <>
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-200/60 mb-2 select-none uppercase tracking-wider">Company Dashboard</div>
                <button onClick={() => navigate('/company/dashboard')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/dashboard' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Overview
                </button>
                <button onClick={() => navigate('/company/employees')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/employees' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Employees Directory
                </button>
                <button onClick={() => navigate('/company/modules')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/modules' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Module Subscriptions
                </button>
                <button onClick={() => navigate('/company/settings')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/settings' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Settings & Customization
                </button>
                <button onClick={() => navigate('/company/reports')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/reports' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Reports
                </button>
                {activeModules.includes('attendance') && (
                  <button onClick={() => navigate('/company/attendance')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/attendance' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                    Attendance Management
                  </button>
                )}
                {activeModules.includes('leave') && (
                  <button onClick={() => navigate('/company/leave')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/leave' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                    Leave Applications
                  </button>
                )}
                {activeModules.includes('payroll') && (
                  <button onClick={() => navigate('/company/payroll')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/company/payroll' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                    Payroll Processing
                  </button>
                )}
              </>
            )}
            {user.role === 'employee' && (
              <>
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-200/60 mb-2 select-none uppercase tracking-wider">Employee Dashboard</div>
                <button onClick={() => navigate('/employee/home')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/employee/home' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                  Profile Feed
                </button>
                {activeModules.includes('attendance') && (
                  <button onClick={() => navigate('/employee/attendance')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/employee/attendance' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                    Attendance Logging
                  </button>
                )}
                {activeModules.includes('leave') && (
                  <button onClick={() => navigate('/employee/leave')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/employee/leave' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                    Leave Planner
                  </button>
                )}
                {activeModules.includes('payroll') && (
                  <button onClick={() => navigate('/employee/payroll')} className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${location.pathname === '/employee/payroll' ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-200/60 text-slate-600 hover:text-slate-800'}`}>
                    My Payslips
                  </button>
                )}
              </>
            )}
          </nav>
        )}

        {/* Workspace Content */}
        <main className="flex-1 bg-white p-8 overflow-y-auto min-h-[calc(100vh-68px)]">
          <Routes>
            {/* Super Admin Dashboard Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/tenants" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/modules" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/system" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/employees" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/attendance" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/leave" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/admin/payroll" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />

            {/* Tenant Admin Dashboard Routes */}
            <Route path="/company/dashboard" element={
              <ProtectedRoute allowedRoles={['tenant_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/employees" element={
              <ProtectedRoute allowedRoles={['tenant_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/modules" element={
              <ProtectedRoute allowedRoles={['tenant_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/settings" element={
              <ProtectedRoute allowedRoles={['tenant_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/reports" element={
              <ProtectedRoute allowedRoles={['tenant_admin']}>
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/attendance" element={
              <ProtectedRoute allowedRoles={['tenant_admin']} module="attendance">
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/leave" element={
              <ProtectedRoute allowedRoles={['tenant_admin']} module="leave">
                <TenantAdmin />
              </ProtectedRoute>
            } />
            <Route path="/company/payroll" element={
              <ProtectedRoute allowedRoles={['tenant_admin']} module="payroll">
                <TenantAdmin />
              </ProtectedRoute>
            } />

            {/* Employee Dashboard Routes */}
            <Route path="/employee/home" element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/employee/attendance" element={
              <ProtectedRoute allowedRoles={['employee']} module="attendance">
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/employee/leave" element={
              <ProtectedRoute allowedRoles={['employee']} module="leave">
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/employee/payroll" element={
              <ProtectedRoute allowedRoles={['employee']} module="payroll">
                <EmployeeDashboard />
              </ProtectedRoute>
            } />

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const userStr = sessionStorage.getItem('hrms.user');
  const location = useLocation();
  console.log('Host HomeRedirect: active hrms.user is:', userStr);
  if (!userStr) {
    return <Navigate to={`/login${location.search}`} replace />;
  }
  const user = JSON.parse(userStr);
  if (user.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === 'tenant_admin') {
    return <Navigate to="/company/dashboard" replace />;
  } else if (user.role === 'employee') {
    return <Navigate to="/employee/home" replace />;
  }
  return <Navigate to="/login" replace />;
}

interface ProtectedRouteProps {
  allowedRoles: string[];
  module?: string;
  children: React.ReactNode;
}

function ProtectedRoute({ allowedRoles, module, children }: ProtectedRouteProps) {
  const userStr = sessionStorage.getItem('hrms.user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  if (module && user.role !== 'super_admin') {
    const activeModulesStr = sessionStorage.getItem('hrms.modules') || '';
    const activeModules = activeModulesStr.split(',').map((m) => m.trim().toLowerCase());
    if (!activeModules.includes(module.toLowerCase())) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <MemoryRouter>
      <MainLayout />
    </MemoryRouter>
  );
}
