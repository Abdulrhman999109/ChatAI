import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../myLogo.png';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');

      localStorage.setItem('token', data.token);

      const convRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ title: 'New Conversation' }),
      });

      const convData = await convRes.json();
      if (!convRes.ok) throw new Error(convData.detail || 'Failed to create conversation');

      navigate(`/dashboard/chat/${convData.conversation_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00E3B2] to-[#7C5EFF] dark:from-slate-900 dark:to-slate-800 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700"
      >
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="w-30 h-14 sm:w-30 sm:h-16" />
        </div>

        <h2 className="text-2xl sm:text-xl font-bold mb-6 text-center text-slate-800 dark:text-slate-100">
          Login
        </h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="mb-6">
          <label className="block mb-2 text-lg text-slate-700 dark:text-slate-300">
            Username
          </label>
          <input
            type="text"
            placeholder='Enter Username...'
            className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00E3B2]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-lg text-slate-700 dark:text-slate-300">
            Password
          </label>
          <input
            type="password"
            placeholder='Enter Password...'
            className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C5EFF]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[#00E3B2] to-[#7C5EFF] text-white py-3 rounded-lg hover:opacity-90 transition-all text-lg font-medium flex items-center justify-center"
          disabled={loading}
        >
          {loading && (
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
          )}
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

export default Login;
