import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  useEffect(() => {
    api.get('/')
      .then(res => setUsers(res.data))
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  const setup2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCode(res.data.data.qrCode);
    } catch (error) {
      alert('Failed to initiate 2FA setup');
    }
  };

  const confirm2FA = async () => {
    try {
      await api.post('/auth/2fa/verify-setup', { twoFactorCode: verifyCode });
      alert('2FA Successfully Enabled!');
      setQrCode('');
    } catch (error) {
      alert('Invalid code. Try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>User Management Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Securely view and manage system users.</p>
        </div>
        <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={logout}>
          Log Out
        </button>
      </div>

      <div className="panel" style={{ borderLeft: '4px solid var(--primary)' }}>
        <h3>Security Settings</h3>
        <p style={{ marginBottom: '16px' }}>Protect your account with Two-Factor Authentication.</p>
        
        {!qrCode ? (
          <button className="btn" style={{ width: 'auto' }} onClick={setup2FA}>
            Enable 2-Factor Authentication
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'white', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <img src={qrCode} alt="2FA QR Code" style={{ display: 'block' }} />
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <p style={{ fontWeight: 500 }}>Scan this QR code with your Authenticator app</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <input 
                  value={verifyCode} 
                  onChange={e => setVerifyCode(e.target.value)} 
                  placeholder="6-digit code" 
                  maxLength="6"
                />
                <button className="btn" style={{ width: '120px' }} onClick={confirm2FA}>Verify</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h3>Registered Users ({users.length})</h3>
      
      <div className="user-grid">
        {users.map((user) => (
          <div key={user.id} className="user-card">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h4 className="user-name">{user.name}</h4>
            <p className="user-email">{user.email}</p>
            
            <div className="user-badges">
              <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-gray'}`}>
                {user.role || 'user'}
              </span>
              
              {user.is_email_verified && (
                <span className="badge badge-green">Verified</span>
              )}
              
              {user.two_factor_enabled && (
                <span className="badge badge-blue">2FA Enabled</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}