import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ChatRoom from './pages/ChatRoom.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl mb-4 mx-auto flex items-center justify-center glow-pink" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
          <span className="text-3xl">🔒</span>
        </div>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#FF6B9D', borderTopColor: 'transparent' }} />
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  if (user.role === 'admin') return <AdminDashboard />;
  return <ChatRoom />;
}
