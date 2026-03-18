import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const [needs2FA, setNeeds2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onLoginSubmit = async (data) => {
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.data?.twoFactorRequired) {
        setNeeds2FA(true);
        setTempUserId(res.data.data.tempUserId);
      } else {
        localStorage.setItem('accessToken', res.data.data.accessToken);
        navigate('/dashboard');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Login failed');
    }
  };

  const on2FASubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/2fa/login', { userId: tempUserId, twoFactorCode });
      localStorage.setItem('accessToken', res.data.data.accessToken);
      navigate('/dashboard');
    } catch (error) {
      console.log("Login",error)
      alert('Invalid 2FA Code');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3001/users/auth/google';
  };

  if (needs2FA) {
    return (
      <div className="page-container">
        <div className="auth-card">
          <h2 className="text-center">Two-Factor Authentication</h2>
          <p className="text-center mb-4 text-muted">Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={on2FASubmit}>
            <div className="form-group">
              <input 
                value={twoFactorCode} 
                onChange={(e) => setTwoFactorCode(e.target.value)} 
                placeholder="000000" 
                maxLength="6"
                className="text-center"
                style={{ fontSize: '24px', letterSpacing: '4px' }}
              />
            </div>
            <button type="submit" className="btn">Verify Code</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="auth-card">
        <h2 className="text-center">Welcome Back</h2>
        <form onSubmit={handleSubmit(onLoginSubmit)}>
          <div className="form-group">
            <input {...register('email')} placeholder="Email Address" />
            {errors.email && <span className="error-text">{errors.email.message}</span>}

            <input type="password" {...register('password')} placeholder="Password" />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>
          <button type="submit" className="btn">Log In</button>
        </form>

        <hr />
        
        <button onClick={handleGoogleLogin} className="btn btn-google">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        
        <p className="text-center mt-4">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}