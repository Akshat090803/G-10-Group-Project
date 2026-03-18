import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  }, [navigate]);

  return <h2>Authentication Successful! Redirecting...</h2>;
}