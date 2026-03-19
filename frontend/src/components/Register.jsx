import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, UserPlus, User } from 'lucide-react';
import { authAPI, setAuthToken, setUser } from '../services/api';
import AuthShell from './AuthShell';

const Register = ({ onRegister, switchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.first_name || !formData.last_name) {
      setError('All fields are required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.register(
        formData.email,
        formData.password,
        formData.first_name,
        formData.last_name
      );

      setAuthToken(response.data.token);
      setUser(response.data.user);
      onRegister(response.data.user);
    } catch (registrationError) {
      console.error('Registration error:', registrationError);
      setError(registrationError.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your"
      accentTitle="InnerVerse"
      subtitle="Set up your account and start building a more intelligent nutrition journey."
      secondaryText="Already have an account?"
      secondaryActionLabel="Log in"
      secondaryAction={switchToLogin}
    >
      {error && (
        <div className="mb-4 rounded-[20px] border border-[#efc9c9] bg-[#fff3f3] px-4 py-3 text-sm text-[#b13f3f]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#4d596c]">First name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa5b8]" />
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="First"
                className="w-full rounded-[20px] border border-[#dbe2ef] bg-white px-12 py-4 text-base text-[#111827] shadow-[0_12px_24px_rgba(56,78,61,0.04)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#4d596c]">Last name</label>
            <div className="relative">
              <UserPlus className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa5b8]" />
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="Last"
                className="w-full rounded-[20px] border border-[#dbe2ef] bg-white px-12 py-4 text-base text-[#111827] shadow-[0_12px_24px_rgba(56,78,61,0.04)]"
              />
            </div>
          </div>
        </div>

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
              placeholder="Create a password"
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

        <div>
          <label className="mb-2 block text-sm font-medium text-[#4d596c]">Confirm password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa5b8]" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              className="w-full rounded-[20px] border border-[#dbe2ef] bg-white px-12 py-4 pr-12 text-base text-[#111827] shadow-[0_12px_24px_rgba(56,78,61,0.04)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8f98aa]"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#90a0b6]">Use at least 6 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`mt-2 flex w-full items-center justify-center rounded-[22px] px-6 py-4 text-lg font-semibold transition ${
            loading
              ? 'cursor-not-allowed bg-[#d9d9d9] text-[#767676]'
              : 'bg-[#18ef0f] text-[#10151d] shadow-[0_22px_40px_rgba(35,221,24,0.22)] hover:translate-y-[-1px]'
          }`}
        >
          <UserPlus className="mr-3 h-5 w-5" />
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
