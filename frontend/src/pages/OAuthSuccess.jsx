import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
   
      localStorage.setItem('token', token);
      
      
      navigate('/dashboard', { replace: true });
   
    } else {
      // If no token is found, send them back to login
      navigate('/login', { replace: true });
    }
  }, [navigate, location]);

  return (
    <div className="flex items-center justify-center h-screen">
      <h2>Completing authentication...</h2>
    </div>
  );
};

export default OAuthSuccess;