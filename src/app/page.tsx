'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'How are you feeling today Nicole?' }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: 'user', text: input.trim() }]);
    setInput('');
  };

  return (
    <div className="min-h-screen flex bg-background text-primary">
      <aside className="w-64 bg-[#D8CCF1] text-white flex flex-col p-6 space-y-4">

        <div className="flex items-center gap-3 mb-6">
          <Image
            src="/logo.png"
            alt="RantMe Logo"
            width={36}
            height={36}
            className="rounded-md"
          />
          <h1 className="text-2xl font-bold text-[#9C83D3]">RantMe</h1>
        </div>
        <h2 className="text-sm font-semibold text-white/80 mb-2">Chat History</h2>
        <ul className="space-y-2 text-sm">
          <li><button className="w-full text-left px-3 py-2 rounded-lg bg-white text-[#9C83D3] font-semibold shadow hover:bg-[#ede9f7] transition">Nicole’s Session</button></li>
          <li><button className="w-full text-left hover:bg-white/20 px-3 py-2 rounded-lg">Guest #123</button></li>
          <li><button className="w-full text-left hover:bg-white/20 px-3 py-2 rounded-lg">Guest #456</button></li>
        </ul>
      </aside>

      {/* ✅ Chat Panel */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div className={`chat-bubble ${msg.sender === 'bot' ? 'chat-bubble-bot' : 'chat-bubble-user'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* ✅ Footer Input */}
        <div className="border-t bg-white p-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="your rant here..."
            className="flex-1 rounded-xl border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9C83D3]"
          />
          <button
            onClick={sendMessage}
            className="bg-[#9C83D3] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#856DC0] transition"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
