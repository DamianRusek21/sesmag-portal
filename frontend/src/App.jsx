import { useEffect, useState } from 'react';

function App() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [changes, setChanges] = useState([]);
  const [formData, setFormData] = useState({
    phone: '',
    department: '',
    job_title: '',
    bio: '',
    location: '',
    public_info: '',
    private_info: ''
  });
  const [message, setMessage] = useState('');

  const loadData = () => {
    fetch('http://localhost:5000/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));

    fetch('http://localhost:5000/api/profiles')
      .then(res => res.json())
      .then(data => {
        setProfiles(data);

        if (data.length > 0) {
          const first = data[0];
          setFormData({
            phone: first.phone || '',
            department: first.department || '',
            job_title: first.job_title || '',
            bio: first.bio || '',
            location: first.location || '',
            public_info: first.public_info || '',
            private_info: first.private_info || ''
          });
        }
      })
      .catch(err => console.error(err));

    fetch('http://localhost:5000/api/manager/changes')
      .then(res => res.json())
      .then(data => setChanges(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('http://localhost:5000/api/profiles/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setMessage('Profile updated successfully.');
      loadData();
    } else {
      setMessage('Failed to update profile.');
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4">SESMag HR Portal</h1>

      <div className="alert alert-info">
        This system allows employees to manage their profiles and managers to review updates.
      </div>

      <section className="mb-5">
        <h2>Users</h2>

        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5">
        <h2>Edit Employee Profile</h2>

        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit} className="card p-4">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-control"
                name="department"
                value={formData.department}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Job Title</label>
              <input
                type="text"
                className="form-control"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-control"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="col-12 mb-3">
              <label className="form-label">Bio</label>
              <textarea
                className="form-control"
                name="bio"
                rows="3"
                value={formData.bio}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className="col-12 mb-3">
              <label className="form-label">Public Info</label>
              <textarea
                className="form-control"
                name="public_info"
                rows="2"
                value={formData.public_info}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className="col-12 mb-3">
              <label className="form-label">Private Info</label>
              <textarea
                className="form-control"
                name="private_info"
                rows="2"
                value={formData.private_info}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Save Profile
          </button>
        </form>
      </section>

      <section className="mb-5">
        <h2>Profiles</h2>

        <div className="row">
          {profiles.map(profile => (
            <div className="col-md-6 mb-3" key={profile.id}>
              <div className="card p-3 h-100">
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

      <section>
        <h2>Manager Change Requests</h2>

        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {changes.map(change => (
                <tr key={change.id}>
                  <td>{change.id}</td>
                  <td>{change.full_name}</td>
                  <td>{change.field_name}</td>
                  <td>{change.old_value}</td>
                  <td>{change.new_value}</td>
                  <td>{change.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;