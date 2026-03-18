import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/register', data);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      alert(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="page-container">
      <div className="auth-card">
        <h2 className="text-center">Create an Account</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <input {...register('name')} placeholder="Full Name" />
            {errors.name && <span className="error-text">{errors.name.message}</span>}

            <input {...register('email')} placeholder="Email Address" />
            {errors.email && <span className="error-text">{errors.email.message}</span>}

            <input type="password" {...register('password')} placeholder="Password" />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>
          <button type="submit" className="btn">Register</button>
        </form>
        <p className="text-center mt-4">
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
}