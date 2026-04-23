import { useEffect, useState } from 'react';
import './App.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const API = import.meta.env.VITE_API_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [changes, setChanges] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [databaseOverview, setDatabaseOverview] = useState(null);
  const [message, setMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [guidedMode, setGuidedMode] = useState(true);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [formData, setFormData] = useState({
    phone: '',
    department: '',
    job_title: '',
    bio: '',
    location: '',
    public_info: '',
    private_info: ''
  });

  const authHeaders = token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    : { 'Content-Type': 'application/json' };

  useEffect(() => {
    if (token) {
      loadCurrentUser();
    }
  }, [token]);

  const loadCurrentUser = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load user');
      }

      const data = await res.json();
      setUser(data);
      await loadData(data.role);
    } catch (err) {
      console.error(err);
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
      setMessage('Session expired. Please log in again.');
    }
  };

  const loadData = async (role) => {
    try {
      const [profileRes, myRequestsRes] = await Promise.all([
        fetch(`${API}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/profiles/my-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const profileData = await profileRes.json();
      const myRequestsData = await myRequestsRes.json();

      setFormData({
        phone: profileData.phone || '',
        department: profileData.department || '',
        job_title: profileData.job_title || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        public_info: profileData.public_info || '',
        private_info: profileData.private_info || ''
      });

      setMyRequests(Array.isArray(myRequestsData) ? myRequestsData : []);

      if (role === 'manager' || role === 'admin') {
        const [usersRes, profilesRes, changesRes, dashboardRes, chartRes] = await Promise.all([
          fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/manager/changes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/manager/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/manager/chart-data`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setUsers(await usersRes.json());
        setProfiles(await profilesRes.json());
        setChanges(await changesRes.json());
        setDashboard(await dashboardRes.json());
        setChartData(await chartRes.json());
      }

      if (role === 'admin') {
        const [logsRes, dbOverviewRes] = await Promise.all([
          fetch(`${API}/manager/activity-logs`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API}/manager/database-overview`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setActivityLogs(await logsRes.json());
        setDatabaseOverview(await dbOverviewRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setMessage('Login successful');
    } catch (err) {
      console.error(err);
      setMessage('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setUsers([]);
    setProfiles([]);
    setChanges([]);
    setMyRequests([]);
    setDashboard(null);
    setChartData(null);
    setActivityLogs([]);
    setDatabaseOverview(null);
    setMessage('Logged out');
  };

  const handleProfileChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitChanges = async (e) => {
    e.preventDefault();

    try {
      let endpoint = `${API}/profiles/request-change`;
      let method = 'POST';

      if (user.role === 'admin') {
        endpoint = `${API}/profiles/me/direct-update`;
        method = 'PUT';
      }

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders,
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Failed to save changes');
        return;
      }

      setMessage(data.message);
      await loadData(user.role);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save changes');
    }
  };

  const improveBioWithAI = async () => {
    try {
      setAiLoading(true);

      const res = await fetch(`${API}/ai/improve-bio`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ bio: formData.bio })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'AI failed');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        bio: data.improved
      }));

      setMessage('Bio improved with AI');
    } catch (err) {
      console.error(err);
      setMessage('AI failed');
    } finally {
      setAiLoading(false);
    }
  };

  const reviewChange = async (id, action) => {
    try {
      const res = await fetch(`${API}/manager/changes/${id}/${action}`, {
        method: 'PUT',
        headers: authHeaders
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || `Failed to ${action} request`);
        return;
      }

      setMessage(data.message);
      await loadData(user.role);
    } catch (err) {
      console.error(err);
      setMessage(`Failed to ${action} request`);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      const res = await fetch(`${API}/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ role: newRole })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Failed to update role');
        return;
      }

      setMessage(data.message);
      await loadData(user.role);
    } catch (err) {
      console.error(err);
      setMessage('Failed to update role');
    }
  };

  const roleBadgeClass =
    user?.role === 'admin'
      ? 'badge-role badge-admin'
      : user?.role === 'manager'
      ? 'badge-role badge-manager'
      : 'badge-role badge-employee';

  const getStatusBadge = (status) => {
    if (status === 'approved') return 'badge-status badge-approved';
    if (status === 'rejected') return 'badge-status badge-rejected';
    return 'badge-status badge-pending';
  };

  const getUserRoleBadgeClass = (role) => {
    if (role === 'admin') return 'badge-role badge-admin';
    if (role === 'manager') return 'badge-role badge-manager';
    return 'badge-role badge-employee';
  };

  const pieColors = ['#2563eb', '#16a34a', '#7c3aed', '#f59e0b'];

  const roleDescription =
    user?.role === 'employee'
      ? 'Employee view: simple profile editing, AI support, and request tracking.'
      : user?.role === 'manager'
      ? 'Manager view: review employee requests only, with no self-approval allowed.'
      : 'Admin view: direct profile updates, role control, logs, database overview, and full system visibility.';

  if (!token || !user) {
    return (
      <div className="page-shell">
        <div className="topbar">
          <div className="container main-container">
            <h1>SESMag HR Portal</h1>
            <div className="topbar-subtitle">
              Role-based profile system designed for different user needs and responsibilities
            </div>
          </div>
        </div>

        <div className="container main-container py-4">
          <div className="row justify-content-center">
            <div className="col-md-7 col-lg-5">
              <div className="login-card">
                <h2 className="section-title mb-3">Sign In</h2>
                <p className="subtle-text mb-4">
                  Login as an employee, manager, or admin.
                </p>

                {message && <div className="alert alert-info status-alert">{message}</div>}

                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-100 py-2">
                    Login
                  </button>
                </form>

                <div className="auth-note">
                  <div><strong>Employee:</strong> damian@example.com / password123</div>
                  <div><strong>Manager:</strong> manager@example.com / password123</div>
                  <div><strong>Admin:</strong> admin@example.com / password123</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="topbar">
        <div className="container main-container d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h1>SESMag HR Portal</h1>
            <div className="topbar-subtitle">
              Logged in as <strong>{user.full_name}</strong>{' '}
              <span className={roleBadgeClass}>{user.role}</span>
            </div>
            <div className="role-description mt-2">{roleDescription}</div>
          </div>

          <button className="btn btn-outline-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container main-container pb-4">
        {message && <div className="alert alert-info status-alert">{message}</div>}

        <section className="section-card sesmag-panel">
          <h2 className="section-title">SESMag Role Support</h2>
          <p>
            This system changes the experience based on the user’s role and level of responsibility.
            Employees get a guided workflow, managers get review tools, and admins get full system oversight.
          </p>

          {user.role === 'employee' && (
            <button
              type="button"
              className="btn btn-outline-primary guided-toggle"
              onClick={() => setGuidedMode(!guidedMode)}
            >
              Guided Mode: {guidedMode ? 'On' : 'Off'}
            </button>
          )}

          <div className="row g-3 mt-2">
            <div className="col-md-4">
              <div className={`role-box ${user.role === 'employee' ? 'role-box-active' : ''}`}>
                <h5>Employee</h5>
                <p>Own profile only</p>
                <p>AI bio helper</p>
                <p>Request history</p>
              </div>
            </div>

            <div className="col-md-4">
              <div className={`role-box ${user.role === 'manager' ? 'role-box-active' : ''}`}>
                <h5>Manager</h5>
                <p>Employee request review</p>
                <p>No self-approval</p>
                <p>Dashboard analytics</p>
              </div>
            </div>

            <div className="col-md-4">
              <div className={`role-box ${user.role === 'admin' ? 'role-box-active' : ''}`}>
                <h5>Admin</h5>
                <p>Direct profile updates</p>
                <p>Role management</p>
                <p>Logs + database overview</p>
              </div>
            </div>
          </div>
        </section>

        {(user.role === 'manager' || user.role === 'admin') && dashboard && (
          <section className="mb-4">
            <h2 className="section-title">Dashboard</h2>
            <div className="row g-3">
              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Total Users</div>
                  <div className="kpi-value">{dashboard.total_users}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Employees</div>
                  <div className="kpi-value">{dashboard.total_employees}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Managers</div>
                  <div className="kpi-value">{dashboard.total_managers}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Admins</div>
                  <div className="kpi-value">{dashboard.total_admins}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="kpi-card">
                  <div className="kpi-label">Pending Requests</div>
                  <div className="kpi-value">{dashboard.pending_requests}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="kpi-card">
                  <div className="kpi-label">Approved Requests</div>
                  <div className="kpi-value">{dashboard.approved_requests}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="kpi-card">
                  <div className="kpi-label">Rejected Requests</div>
                  <div className="kpi-value">{dashboard.rejected_requests}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {(user.role === 'manager' || user.role === 'admin') && chartData && (
          <section className="mb-4">
            <h2 className="section-title">Analytics</h2>
            <div className="row g-3">
              <div className="col-lg-6">
                <div className="section-card">
                  <h5 className="mb-3">Users by Department</h5>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData.users_by_department}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="section-card">
                  <h5 className="mb-3">Role Distribution</h5>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={chartData.role_distribution}
                          dataKey="count"
                          nameKey="role"
                          outerRadius={90}
                          label
                        >
                          {chartData.role_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="col-lg-12">
                <div className="section-card">
                  <h5 className="mb-3">Request Status Distribution</h5>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData.request_status_distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#16a34a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {user.role === 'admin' && databaseOverview && (
          <section className="mb-4">
            <h2 className="section-title">Database Overview</h2>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Total Users</div>
                  <div className="kpi-value">{databaseOverview.totals.users}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Total Profiles</div>
                  <div className="kpi-value">{databaseOverview.totals.profiles}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Change Requests</div>
                  <div className="kpi-value">{databaseOverview.totals.change_requests}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="kpi-card">
                  <div className="kpi-label">Activity Logs</div>
                  <div className="kpi-value">{databaseOverview.totals.activity_logs}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="section-card">
          <h2 className="section-title">
            {user.role === 'admin' ? 'Admin Profile (Direct Save)' : 'My Profile'}
          </h2>

          <form onSubmit={handleSubmitChanges}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Phone</label>
                <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleProfileChange} />
                {user.role === 'employee' && guidedMode && (
                  <div className="guided-tip">Use a phone number where HR can reach you if needed.</div>
                )}
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Department</label>
                <input type="text" className="form-control" name="department" value={formData.department} onChange={handleProfileChange} />
                {user.role === 'employee' && guidedMode && (
                  <div className="guided-tip">This helps managers organize profiles by team or department.</div>
                )}
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Job Title</label>
                <input type="text" className="form-control" name="job_title" value={formData.job_title} onChange={handleProfileChange} />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Location</label>
                <input type="text" className="form-control" name="location" value={formData.location} onChange={handleProfileChange} />
              </div>

              <div className="col-12 mb-3">
                <label className="form-label">Bio</label>
                <textarea className="form-control" name="bio" value={formData.bio} onChange={handleProfileChange} />

                {user.role === 'employee' && guidedMode && (
                  <div className="guided-tip">
                    Write a short summary about your background or role. You can use the AI helper to make it clearer.
                  </div>
                )}
              </div>

              {user.role === 'employee' && (
                <div className="col-12 mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={improveBioWithAI}
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Improving Bio...' : 'Improve Bio with AI'}
                  </button>
                </div>
              )}

              <div className="col-12 mb-3">
                <label className="form-label">Public Info</label>
                <textarea className="form-control" name="public_info" value={formData.public_info} onChange={handleProfileChange} />
              </div>

              <div className="col-12 mb-4">
                <label className="form-label">Private Info</label>
                <textarea className="form-control" name="private_info" value={formData.private_info} onChange={handleProfileChange} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary px-4 py-2">
              {user.role === 'admin' ? 'Save Changes Directly' : 'Submit Change Request'}
            </button>

            {user.role === 'employee' && guidedMode && (
              <div className="guided-tip mt-3">
                Your update will not change the profile immediately. It will be sent as a request for a manager to review.
              </div>
            )}

            {user.role === 'admin' && (
              <div className="guided-tip mt-3">
                Admin updates are saved directly because admins have full system authority.
              </div>
            )}
          </form>
        </section>

        <section className="mb-4">
          <h2 className="section-title">My Request History</h2>
          <div className="table-wrap">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Field</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Status</th>
                    <th>Reviewed By</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.length > 0 ? (
                    myRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.id}</td>
                        <td>{request.field_name}</td>
                        <td>{request.old_value}</td>
                        <td>{request.new_value}</td>
                        <td>
                          <span className={getStatusBadge(request.status)}>
                            {request.status}
                          </span>
                        </td>
                        <td>{request.reviewer_name || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center subtle-text py-4">
                        No requests submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {(user.role === 'manager' || user.role === 'admin') && (
          <>
            <section className="mb-4">
              <h2 className="section-title">Users</h2>
              <div className="table-wrap">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        {user.role === 'admin' && <th>Admin Controls</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.full_name}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={getUserRoleBadgeClass(u.role)}>
                              {u.role}
                            </span>
                          </td>
                          {user.role === 'admin' && (
                            <td>
                              {u.role === 'admin' ? (
                                <span className="subtle-text">Locked</span>
                              ) : (
                                <div className="d-flex gap-2 flex-wrap">
                                  {u.role !== 'manager' && (
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => handleRoleChange(u.id, 'manager')}
                                    >
                                      Promote to Manager
                                    </button>
                                  )}

                                  {u.role !== 'employee' && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => handleRoleChange(u.id, 'employee')}
                                    >
                                      Set as Employee
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="mb-4">
              <h2 className="section-title">Profiles</h2>
              <div className="row g-3">
                {profiles.map((profile) => (
                  <div className="col-md-6" key={profile.id}>
                    <div className="profile-panel">
                      <h5>{profile.full_name}</h5>
                      <p><strong>Department:</strong> {profile.department}</p>
                      <p><strong>Job Title:</strong> {profile.job_title}</p>
                      <p><strong>Location:</strong> {profile.location}</p>
                      <p><strong>Bio:</strong> {profile.bio}</p>
                      <p><strong>Public Info:</strong> {profile.public_info}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-4">
              <h2 className="section-title">
                {user.role === 'manager' ? 'Employee Change Requests' : 'Change Requests'}
              </h2>

              <div className="table-wrap">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Field</th>
                        <th>Old Value</th>
                        <th>New Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {changes.map((change) => (
                        <tr key={change.id}>
                          <td>{change.id}</td>
                          <td>{change.full_name}</td>
                          <td>
                            <span className={getUserRoleBadgeClass(change.requester_role)}>
                              {change.requester_role}
                            </span>
                          </td>
                          <td>{change.field_name}</td>
                          <td>{change.old_value}</td>
                          <td>{change.new_value}</td>
                          <td>
                            <span className={getStatusBadge(change.status)}>
                              {change.status}
                            </span>
                          </td>
                          <td>
                            {change.status === 'pending' ? (
                              <>
                                <button
                                  className="btn btn-success btn-sm me-2"
                                  onClick={() => reviewChange(change.id, 'approve')}
                                >
                                  Approve
                                </button>

                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => reviewChange(change.id, 'reject')}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="subtle-text">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {user.role === 'admin' && (
          <section className="mb-4">
            <h2 className="section-title">Activity Logs</h2>
            <div className="table-wrap">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Created At</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{log.full_name || 'System'}</td>
                        <td>{log.role || '-'}</td>
                        <td>{log.action_type}</td>
                        <td>{log.description}</td>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;