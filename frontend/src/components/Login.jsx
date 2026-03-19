import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authAPI, setAuthToken, setUser } from '../services/api';
import AuthShell from './AuthShell';

const Login = ({ onLogin, switchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData.email, formData.password);
      setAuthToken(response.data.token);
      setUser(response.data.user);
      onLogin(response.data.user);
    } catch (loginError) {
      console.error('Login error:', loginError);
      setError(loginError.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome to"
      accentTitle="InnerVerse"
      subtitle="Your journey to intelligent nutrition starts here."
      secondaryText="Don’t have an account?"
      secondaryActionLabel="Sign up"
      secondaryAction={switchToRegister}
    >
      {error && (
        <div className="mb-4 rounded-[20px] border border-[#efc9c9] bg-[#fff3f3] px-4 py-3 text-sm text-[#b13f3f]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#4d596c]">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa5b8]" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              className="w-full rounded-[20px] border border-[#dbe2ef] bg-white px-12 py-4 text-base text-[#111827] shadow-[0_12px_24px_rgba(56,78,61,0.04)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#4d596c]">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa5b8]" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="w-full rounded-[20px] border border-[#dbe2ef] bg-white px-12 py-4 pr-12 text-base text-[#111827] shadow-[0_12px_24px_rgba(56,78,61,0.04)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8f98aa]"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`mt-2 w-full rounded-[22px] px-6 py-4 text-lg font-semibold transition ${
            loading
              ? 'cursor-not-allowed bg-[#d9d9d9] text-[#767676]'
              : 'bg-[#18ef0f] text-[#10151d] shadow-[0_22px_40px_rgba(35,221,24,0.22)] hover:translate-y-[-1px]'
          }`}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
