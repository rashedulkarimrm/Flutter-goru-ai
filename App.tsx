
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Message, ChatState, ChatSession, User } from './types';
import { geminiService } from './services/geminiService';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: "👋 নমস্কার! আমি আপনার Flutter AI গুরু। আমি আপনাকে Flutter এবং Dart দিয়ে চমৎকার অ্যাপ তৈরি করতে সাহায্য করতে পারি। আপনি আমাকে কোডের ফাইল (.dart), কনফিগারেশন (.yaml), পিডিএফ অথবা ছবি পাঠাতে পারেন।\n\nHi! I'm your Flutter AI Guru. You can send me code files, pubspec.yaml, PDFs, or images for analysis.",
  timestamp: new Date()
};

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>(() => {
    const saved = localStorage.getItem('flutter_guru_chats');
    const savedUser = localStorage.getItem('flutter_guru_user');
    
    let initialState = {
      user: savedUser ? JSON.parse(savedUser) : null,
      sessions: [],
      activeSessionId: '',
      isLoading: false,
      error: null,
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialState = {
          ...initialState,
          sessions: parsed.sessions || [],
          activeSessionId: parsed.activeSessionId || '',
        };
      } catch (e) {
        console.error("Failed to parse saved chats", e);
      }
    }

    if (initialState.sessions.length === 0) {
      const initialId = Date.now().toString();
      initialState.sessions = [{
        id: initialId,
        title: 'New Chat',
        messages: [INITIAL_MESSAGE],
        updatedAt: Date.now()
      }];
      initialState.activeSessionId = initialId;
    }

    return initialState;
  });

  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [googleInitError, setGoogleInitError] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string, data: string, mimeType: string, size: number } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const activeSession = useMemo(() => 
    state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0],
    [state.sessions, state.activeSessionId]
  );

  const handleCredentialResponse = useCallback((response: any) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const user: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      };
      setState(prev => ({ ...prev, user }));
      localStorage.setItem('flutter_guru_user', JSON.stringify(user));
    } catch (err) {
      console.error("Login failed", err);
      setState(prev => ({ ...prev, error: "লগইন করার সময় সমস্যা হয়েছে।" }));
    }
  }, []);

  const handleGuestLogin = () => {
    const guestUser: User = {
      id: 'guest_' + Date.now(),
      name: 'Guest User',
      email: 'guest@flutterai.guru',
      picture: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
    };
    setState(prev => ({ ...prev, user: guestUser }));
    localStorage.setItem('flutter_guru_user', JSON.stringify(guestUser));
  };

  useEffect(() => {
    if (!state.user) {
      let retryCount = 0;
      const maxRetries = 50;

      const initGoogle = () => {
        // @ts-ignore
        if (window.google?.accounts?.id && googleBtnRef.current) {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: "77243953496-mka9m1v6c3t6u4e4e9m9m9m9m9m9m9m9.apps.googleusercontent.com",
            callback: handleCredentialResponse,
            auto_select: false,
          });

          // @ts-ignore
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_blue",
            size: "large",
            text: "signin_with",
            shape: "pill",
            width: 280
          });
          return true;
        }
        return false;
      };

      const interval = setInterval(() => {
        if (initGoogle()) {
          clearInterval(interval);
        } else {
          retryCount++;
          if (retryCount >= maxRetries) {
            clearInterval(interval);
            setGoogleInitError(true);
          }
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [state.user, handleCredentialResponse]);

  useEffect(() => {
    localStorage.setItem('flutter_guru_chats', JSON.stringify({
      sessions: state.sessions,
      activeSessionId: state.activeSessionId
    }));
  }, [state.sessions, state.activeSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages]);

  const handleLogout = () => {
    setState(prev => ({ ...prev, user: null }));
    localStorage.removeItem('flutter_guru_user');
    // @ts-ignore
    window.google?.accounts?.id?.disableAutoSelect();
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [INITIAL_MESSAGE],
      updatedAt: Date.now()
    };
    setState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      activeSessionId: newId
    }));
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMenuOpen(false);
    setState(prev => {
      const newSessions = prev.sessions.filter(s => s.id !== id);
      if (newSessions.length === 0) {
        const resetId = Date.now().toString();
        return {
          ...prev,
          sessions: [{ id: resetId, title: 'New Chat', messages: [INITIAL_MESSAGE], updatedAt: Date.now() }],
          activeSessionId: resetId
        };
      }
      return {
        ...prev,
        sessions: newSessions,
        activeSessionId: prev.activeSessionId === id ? newSessions[0].id : prev.activeSessionId
      };
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage({ data: base64String, mimeType: file.type });
        setSelectedFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedFile({
          name: file.name,
          data: base64String,
          mimeType: file.type || 'application/octet-stream',
          size: file.size
        });
        setSelectedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedMedia = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage && !selectedFile) || state.isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      file: selectedFile || undefined,
      timestamp: new Date(),
    };

    const currentInput = input;
    const currentImage = selectedImage;
    const currentFile = selectedFile;
    
    let newTitle = activeSession.title;
    if (activeSession.messages.length <= 1) {
      newTitle = input.slice(0, 30) || (currentImage ? "Image Analysis" : "File Analysis");
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      sessions: prev.sessions.map(s => 
        s.id === prev.activeSessionId 
          ? { ...s, title: newTitle, messages: [...s.messages, userMessage], updatedAt: Date.now() }
          : s
      )
    }));
    
    setInput('');
    removeSelectedMedia();

    try {
      const history = activeSession.messages.map(msg => {
        const parts: any[] = [{ text: msg.content }];
        if (msg.image) parts.push({ inlineData: { data: msg.image.data, mimeType: msg.image.mimeType } });
        if (msg.file) parts.push({ inlineData: { data: msg.file.data, mimeType: msg.file.mimeType } });
        return { role: msg.role === 'user' ? 'user' : 'model', parts };
      });

      const attachments = [];
      if (currentImage) attachments.push({ data: currentImage.data, mimeType: currentImage.mimeType });
      if (currentFile) attachments.push({ data: currentFile.data, mimeType: currentFile.mimeType });

      const aiResponse = await geminiService.generateResponse(
        currentInput || "Analyze the attached content.", 
        history, 
        attachments.length > 0 ? attachments : undefined
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: prev.sessions.map(s => 
          s.id === prev.activeSessionId 
            ? { ...s, messages: [...s.messages, assistantMessage], updatedAt: Date.now() }
            : s
        )
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "দুঃখিত, কোনো একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      }));
    }
  };

  if (!state.user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl relative z-10 text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Flutter AI Guru</h1>
            <p className="text-slate-400 font-medium">আপনার প্রোফেশনাল ফ্লাটার ডেভেলপিং অ্যাসিস্ট্যান্ট</p>
          </div>

          <div className="space-y-4 flex flex-col items-center">
            <div className="flex justify-center min-h-[50px] w-full" ref={googleBtnRef}>
              {googleInitError && (
                <p className="text-red-400 text-sm">গুগল লগইন লোড হতে সমস্যা হচ্ছে।</p>
              )}
            </div>
            
            <div className="w-full flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-slate-800"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">অথবা</span>
              <div className="h-px flex-1 bg-slate-800"></div>
            </div>

            <button 
              onClick={handleGuestLogin}
              className="w-full max-w-[280px] py-3 px-6 rounded-full border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 text-slate-300 font-semibold transition-all flex items-center justify-center gap-2 group"
            >
              <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              গেস্ট হিসেবে প্রবেশ করুন
            </button>

            <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">লগইন করার মাধ্যমে আপনি আমাদের শর্তাবলীতে সম্মতি প্রদান করছেন।</p>
          </div>

          <div className="pt-8 border-t border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Powered by Gemini 3 Pro</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-40 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-800">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">History</h3>
            {state.sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => {
                  setState(prev => ({ ...prev, activeSessionId: session.id }));
                  setIsSidebarOpen(false);
                }}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all border ${
                  state.activeSessionId === session.id 
                    ? 'bg-blue-600/10 border-blue-600/50 text-blue-400' 
                    : 'bg-transparent border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="flex-1 text-sm font-medium truncate pr-6">{session.title}</span>
                <button 
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="absolute right-2 p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             <div className="flex items-center gap-3">
               <img src={state.user.picture} alt={state.user.name} className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800" />
               <div className="flex-1 overflow-hidden">
                 <p className="text-xs font-semibold text-slate-200 truncate">{state.user.name}</p>
                 <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 font-medium">Sign Out</button>
               </div>
             </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold tracking-tight text-white line-clamp-1">{activeSession.title}</h1>
              <p className="hidden md:block text-[10px] text-blue-400 font-medium uppercase tracking-widest">
                {state.user.id.startsWith('guest_') ? 'Viewing as Guest' : `Logged in as ${state.user.name.split(' ')[0]}`}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              title="Options"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                  <button 
                    onClick={() => handleDeleteSession(activeSession.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="max-w-4xl mx-auto space-y-8 pb-32">
            {activeSession.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[95%] md:max-w-[85%] rounded-2xl px-4 md:px-5 py-3 md:py-4 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 rounded-tr-none' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none shadow-xl'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                      {msg.role === 'user' ? 'You' : 'Guru'}
                    </span>
                    <span className="text-[10px] opacity-40">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {msg.image && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-md">
                      <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} alt="User uploaded" className="max-h-80 w-auto object-contain mx-auto" />
                    </div>
                  )}

                  {msg.file && (
                    <div className="mb-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-blue-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-slate-200">{msg.file.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{formatFileSize(msg.file.size)} · {msg.file.mimeType.split('/')[1]}</p>
                      </div>
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
              </div>
            ))}

            {state.isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-6 py-4 flex items-center gap-3 shadow-xl">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs md:text-sm text-slate-400 font-medium tracking-tight">Processing...</span>
                </div>
              </div>
            )}

            {state.error && (
              <div className="flex justify-center">
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-6 py-3 rounded-xl text-xs md:text-sm font-medium">
                  {state.error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            {(selectedImage || selectedFile) && (
              <div className="mb-2 p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 animate-in slide-in-from-bottom-2">
                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center">
                  {selectedImage ? (
                    <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <button type="button" onClick={removeSelectedMedia} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl-lg hover:bg-red-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-slate-200 truncate">{selectedImage ? 'Image Selected' : selectedFile?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">Ready to analyze. Add a question below.</p>
                </div>
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600/20 rounded-2xl blur-xl group-focus-within:bg-blue-600/30 transition-all duration-500 opacity-0 group-focus-within:opacity-100"></div>
              <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl focus-within:border-blue-500/50 transition-all">
                <div className="flex items-center pl-1 md:pl-2 gap-0.5 md:gap-1">
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <input type="file" ref={docInputRef} onChange={handleFileSelect} accept=".dart,.yaml,.json,.txt,.pdf,.md,.log" className="hidden" />
                  
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 md:p-3 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all" title="Attach image">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>

                  <button type="button" onClick={() => docInputRef.current?.click()} className="p-2 md:p-3 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all" title="Attach file">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                </div>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Flutter AI Guru..."
                  className="flex-1 bg-transparent border-none outline-none px-3 md:px-4 py-3 md:py-4 text-slate-200 placeholder-slate-500 text-sm md:text-base"
                  disabled={state.isLoading}
                />
                
                <button
                  type="submit"
                  disabled={state.isLoading || (!input.trim() && !selectedImage && !selectedFile)}
                  className={`mr-1 md:mr-2 p-2 md:p-2.5 rounded-xl transition-all ${
                    (input.trim() || selectedImage || selectedFile) && !state.isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
