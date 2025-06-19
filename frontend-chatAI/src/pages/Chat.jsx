import { useEffect, useState, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { FaMicrophone } from 'react-icons/fa';
import { Globe } from 'lucide-react';
import logo from '../myLogo.png';

function CodeBlockWithCopy({ code }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = code;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert("Copy failed. Please copy manually.");
      }
    } catch (err) {
      alert("Copy failed. Please copy manually.");
    }

    document.body.removeChild(textArea);
  };

  return (
    <div className="relative bg-gray-900 dark:bg-gray-300  dark:text-gray-900 rounded-md pt-7 font-mono overflow-x-auto">
      <button
        onClick={copyToClipboard}
        className={`absolute top-1 right-2 px-2 py-0.5 text-xs rounded z-10 text-white  ${
          copied ? 'bg-green-500' : 'bg-blue-600'
        }`}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="m-0 p-2 whitespace-pre-wrap break-words text-gray-300 dark:text-gray-900">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function RenderMessageContent({ content }) {
  const parts = content.split(/```/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          const firstLineEnd = part.indexOf('\n');
          let language = '';
          let code = part;

          if (firstLineEnd !== -1) {
            const firstLine = part.slice(0, firstLineEnd).trim();
            const rest = part.slice(firstLineEnd + 1);
            if (/^\w+$/.test(firstLine)) {
              language = firstLine;
              code = rest;
            }
          }

          return (
            <div key={idx} className="mb-3 relative">
              {language && (
                <div className="absolute top-1 left-2 text-xs font-bold text-blue-600 dark:text-blue-400 select-none">
                  {language}
                </div>
              )}
              <CodeBlockWithCopy code={code} />
            </div>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-wrap m-0 text-sm text-gray-800 dark:text-gray-200">
            {part}
          </p>
        );
      })}
    </>
  );
}

function Chat() {
  const { id } = useParams();
  const { title, fetchConversations } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showDeletedPopup, setShowDeletedPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchMessages = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          setMessages(sorted);
        } else {
          setMessages([]);
        }
      });
  };

  useEffect(() => {
    fetchMessages();
    const intervalId = setInterval(fetchMessages, 5000);
    return () => clearInterval(intervalId);
  }, [id, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.lang-menu')) setShowLangMenu(false);
    };
    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => sendAudioToBackend(chunks);

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!mediaRecorder) return;
    mediaRecorder.stop();
    setIsRecording(false);
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  };

  const sendAudioToBackend = async (chunks) => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('language', selectedLanguage);
    setIsTranscribing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data?.text) setNewMessage(data.text);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversation_id: id, content: newMessage }),
    });

    const responseData = await res.json();

    if (!res.ok && res.status === 404 && responseData.detail?.includes('Conversation not found')) {
      setShowDeletedPopup(true);
      return;
    }

    if (responseData?.user_message && responseData?.ai_response) {
      setMessages((prev) => [...prev, responseData.user_message, responseData.ai_response]);
      setNewMessage('');
    }
  };

  const handleMicClick = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const cleanTitle = (title) => title?.replace(/^"+|"+$/g, '').trim() || 'Untitled';

  return (
    <div className="w-full relative flex flex-col h-screen overflow-hidden dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 px-2 py-2 border-b dark:border-gray-700 flex items-center gap-2 shadow-md sticky top-0 z-10">
        <img src={logo} alt="Logo" className="h-6 w-10 object-contain md:hidden" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">{cleanTitle(title)}</h1>
      </div>

      <div className="flex-1 py-10 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 pb-0">
        <div className="space-y-4">
          {messages.map((msg, index) =>
            msg?.role && msg?.content ? (
              <div
                key={index}
                className={`p-3 rounded-lg w-fit max-w-full ${
                  msg.role === 'user'
                    ? 'bg-blue-100 text-black dark:bg-blue-500 dark:text-white self-end text-right ml-auto'
                    : 'bg-gray-200 text-black dark:bg-gray-800 dark:text-white self-start'
                }`}
              >
                <RenderMessageContent content={msg.content} />
              </div>
            ) : null
          )}
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
            placeholder={isTranscribing ? 'Transcribing voice... Please wait' : 'Type your message...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            readOnly={isTranscribing}
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
                    {lang === 'en' ? 'English' : 'Arabic'}
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
            {[3, 5, 4, 6].map((h, i) => (
              <div key={i} className={`wave-bar animate-wave h-${h} w-1 bg-red-500 delay-${i * 100}`} />
            ))}
          </div>
        )}
      </form>

      {showDeletedPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg max-w-sm w-full text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversation Not Found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              It seems this conversation was automatically deleted due to inactivity.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-[#00E3B2] to-[#7C5EFF] text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Back to Conversations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
