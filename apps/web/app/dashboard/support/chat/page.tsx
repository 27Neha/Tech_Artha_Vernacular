'use client';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../../TranslationProvider';

type Message = { id: string; sender: 'user' | 'ai'; text: string; isError?: boolean };

const SUGGESTED_QUESTIONS = [
  "What is an SIP?",
  "How is my portfolio doing?",
  "Explain Mutual Funds",
];

export default function ChatbotPage() {
  const router = useRouter();
  const { lang, setLang, t } = useTranslation();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am the TechArtha AI Assistant. How can I help you with your investments today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    const newMsg: Message = { id: Date.now().toString(), sender: 'user', text };
    
    // Capture the history before updating state
    const history = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:3000/assistant/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({ message: text, history, locale: lang })
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      const data = await res.json();
      
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: t('support.aiError') || 'I am currently unable to connect to the AI engine. Please try again later or escalate to our team.',
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shrink-0 shadow-sm z-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-3xl leading-none text-[var(--dark)]">←</button>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold text-[var(--dark)] flex items-center gap-2">
              TechArtha AI <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </h1>
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Online</p>
          </div>
        </div>
        
        {/* Escalation Button */}
        <button 
          onClick={() => alert("Redirecting to WhatsApp to talk to our team...")} 
          className="text-[10px] font-bold bg-gray-100 text-[var(--dark)] px-2 py-1 rounded-md"
        >
          Talk to our team
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-[var(--primary)] text-white rounded-tr-sm' : msg.isError ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-sm' : 'bg-white text-[var(--dark)] shadow-sm border border-gray-100 rounded-tl-sm'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && !isTyping && (
        <div className="p-4 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSend(q)}
              className="whitespace-nowrap bg-white border border-[var(--primary)] text-[var(--primary)] text-xs font-bold px-4 py-2 rounded-full hover:bg-[var(--primary-light)] transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:border-[var(--primary)] transition-all">
          <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[var(--primary)] transition-all shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask TechArtha AI..." 
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--dark)]"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${input.trim() && !isTyping ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">TechArtha AI can make mistakes. Verify important info.</p>
      </div>
    </div>
  );
}
