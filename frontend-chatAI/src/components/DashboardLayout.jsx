import { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useParams } from 'react-router-dom';
import { Plus, Trash2, Menu, Pencil } from 'lucide-react';
import SiteBrand from './SiteBrand';

export default function DashboardLayout() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editConv, setEditConv] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConv, setDeleteConv] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, []);

  const cleanTitle = (title) => title?.replace(/^"+|"+$/g, '').trim() || 'New Conversation';

  const fetchConversations = async () => {
    const token = localStorage.getItem('token');
    const meRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    const user_id = meData.user.sub || meData.user.id;
    const convRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/conversations/${user_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const convData = await convRes.json();
    const sorted = Array.isArray(convData)
      ? convData.sort((a, b) =>
          new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
        )
      : [];
    setConversations(sorted);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
    const intervalId = setInterval(fetchConversations, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const createConversation = async () => {
    const token = localStorage.getItem('token');
    const titleToUse = 'New Conversation';
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: titleToUse }),
    });
    const data = await res.json();
    const newConv = { id: data.conversation_id, title: titleToUse };
    setConversations((prev) => [newConv, ...prev]);
    navigate(`/dashboard/chat/${newConv.id}`);
  };

  const updateConversationTitle = async (convId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/conversations/${convId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: editTitle }),
    });
    const data = await res.json();
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: editTitle } : c))
    );
    setEditConv(null);
  };

  const deleteConversation = async (convId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (id === convId) navigate('/dashboard');
    setDeleteConv(null);
  };

  const currentChat = conversations.find((conv) => conv.id === id);

  return (
    <div className="w-screen min-h-screen flex flex-col md:flex-row overflow-hidden dark:bg-gray-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {!sidebarOpen && (
        <button
          className="md:hidden fixed top-1 right-2 z-30 text-[#00E3B2] bg-white dark:bg-gray-900 p-2 rounded-full"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>
      )}


      <aside
        className={`bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 w-48 xs:w-56 sm:w-64 transform md:relative z-20 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-slate-900 dark:bg-gray-900 px-4 py-5 border-b border-gray-800 flex flex-col items-center space-y-3">
          <SiteBrand />
          <button
            onClick={async () => {
              setSidebarOpen(false);
              await createConversation();
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E3B2] to-[#7C5EFF] hover:opacity-90 text-white py-2 px-4 rounded-lg w-full"
          >
            <Plus size={20} /> New Conversation
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 bg-slate-900 dark:bg-gray-900 custom-scrollbar">
          {loading && <div className="text-gray-400 text-center">Loading...</div>}
          {error && <div className="text-red-400 text-center">{error}</div>}

          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="bg-slate-800 hover:bg-gray-700 p-3 rounded-lg flex items-center justify-between"
              >
                <Link
                  to={`/dashboard/chat/${conv.id}`}
                  className="flex-1 text-white truncate"
                  onClick={() => setSidebarOpen(false)}
                >
                  {cleanTitle(conv.title)}
                </Link>
                <button
                  onClick={() => {
                    setEditConv(conv.id);
                    setEditTitle(cleanTitle(conv.title));
                  }}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setDeleteConv(conv.id)}
                  className="text-red-400 hover:text-red-600 ml-3"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto dark:bg-gray-950">
        <Outlet context={{ title: currentChat?.title || 'New Conversation', fetchConversations }} />
      </main>

      {editConv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-80 shadow-xl text-black dark:text-white">
            <h2 className="text-lg font-semibold mb-3">Edit Title</h2>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full border px-3 py-2 rounded-md bg-white dark:bg-gray-800 dark:text-white"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditConv(null)}
                className="bg-gray-300 hover:bg-gray-400 text-black dark:text-gray-800 px-4 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => updateConversationTitle(editConv)}
                className="bg-gradient-to-r from-[#00E3B2] to-[#7C5EFF] hover:opacity-90 text-white px-4 py-1 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-80 shadow-xl text-black dark:text-white">
            <h2 className="text-lg font-semibold mb-3">Delete Conversation</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete this conversation?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConv(null)}
                className="bg-gray-300 hover:bg-gray-400 text-black dark:text-gray-800 px-4 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConversation(deleteConv)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
