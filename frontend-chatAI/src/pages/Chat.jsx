import { useEffect, useState, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { FaMicrophone } from 'react-icons/fa';
import { Globe } from 'lucide-react';
import logo from '../myLogo.png';

function Chat() {
  const { id } = useParams();
  const { title } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const messagesEndRef = useRef(null);

  const cleanTitle = (title) => title?.replace(/^"+|"+$/g, '').trim() || 'Untitled';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.lang-menu')) setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          content:
            selectedLanguage === 'ar'
              ? 'كيف يمكنني مساعدتك اليوم؟'
              : 'How can I assist you today?',
        },
      ]);
    }
  }, [selectedLanguage]);

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
      setNewMessage(
        selectedLanguage === 'ar'
          ? 'هذه واجهة فقط، لا يتم تحويل الصوت.'
          : 'UI-only: audio is not transcribed.'
      );
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setNewMessage(
          selectedLanguage === 'ar'
            ? 'هذه واجهة فقط، لا يتم تحويل الصوت'
            : 'UI-only: audio is not transcribed.'
        );
      }, 2000);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMsg = { role: 'user', content: newMessage };
    const aiReply = {
      role: 'assistant',
      content:
         'This is a mock reply from the UI only.',
    };

    setMessages((prev) => [...prev, userMsg, aiReply]);
    setNewMessage('');
  };

  return (
    <div className="w-full relative flex flex-col h-screen overflow-hidden dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 px-2 py-2 border-b dark:border-gray-700 flex items-center gap-2 shadow-md sticky top-0 z-10">
        <img src={logo} alt="Logo" className="h-6 w-10 object-contain md:hidden" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">{cleanTitle(title)}</h1>
      </div>

      <div className="flex-1 py-5 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 pb-28">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg w-fit max-w-full ${
                msg.role === 'user'
                  ? 'bg-blue-100 text-black dark:bg-blue-500 dark:text-white self-end text-right ml-auto'
                  : 'bg-gray-200 text-black dark:bg-gray-800 dark:text-white self-start'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center flex-1">
          <input
            type="text"
            className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-l-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
            placeholder={
              selectedLanguage === 'ar'
                ? (isRecording ? 'جاري التسجيل...' : 'Type your message...')
                : (isRecording ? 'Recording...' : 'Type your message...')
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            readOnly={isRecording}
            autoComplete="off"
            autoFocus
          />

          <div className="relative lang-menu ml-2">
            <button
              type="button"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={() => setShowLangMenu(!showLangMenu)}
              title="Recording Language"
            >
              <Globe size={20} className="text-gray-900 dark:text-white" />
            </button>
            {showLangMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-32 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded shadow z-20">
                {['en', 'ar'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedLanguage === lang ? 'font-bold text-blue-600' : ''
                    }`}
                  >
                    {lang === 'en' ? 'English' : 'العربية'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleMicClick}
            className={`px-4 py-3 ${
              isRecording
                ? 'bg-red-100 border border-red-500 text-red-600'
                : 'bg-white dark:bg-gray-900 dark:text-white text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
            } transition-colors duration-200 rounded-none`}
            title="Voice Recording"
          >
            <FaMicrophone size={16} />
          </button>

          <button
            type="submit"
            className="bg-gradient-to-r from-[#00E3B2] to-[#7C5EFF] text-white px-6 py-3 rounded-r-lg hover:opacity-90 transition-opacity duration-200"
          >
            Send
          </button>
        </div>

        {isRecording && (
          <div className="ml-4 flex gap-1 items-end h-6">
            {[12, 20, 16, 24].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 animate-wave"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

      </form>
    </div>
  );
}

export default Chat;
