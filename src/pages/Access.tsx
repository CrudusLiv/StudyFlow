import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Access = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isLogin ? '/login' : '/signup';
      const response = await axios.post(`http://localhost:5000${url}`, { email, password });
      if (isLogin) {
        localStorage.setItem('token', response.data.token);
        navigate('/');
      } else {
        alert('Signup successful! Please log in.');
        setIsLogin(true);
      }
    } catch (error: unknown) {
      console.error('Auth error:', error);
      if (axios.isAxiosError(error) && error.response) {
        alert(error.response.data.error || 'An error occurred');
      } else {
        alert('An error occurred');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">
          {isLogin ? 'Login' : 'Sign Up'} to StudyFlow
        </h2>
        
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-black py-2 rounded hover:bg-blue-600"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-500 hover:underline"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Access;