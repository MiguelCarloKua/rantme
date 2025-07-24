'use client';
import { useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import type { LabelProps } from 'recharts';

// Types
type Message = { sender: 'bot' | 'user'; text: string };
type ChatSessions = { [sessionId: string]: Message[] };
type Session = { id: string; name: string };
type ToneType = 'empathetic' | 'motivational' | 'reflective' | 'funny';
type MoodEntry = { date: string; mood: string; session: string };

// Offline mood scoring & emoji maps for chart
const moodScoreMap: Record<string, number> = {
  happy: 2,
  relieved: 1,
  neutral: 0,
  sad: -2,
  anxious: -1,
  angry: -2,
  tired: -1,
  stressed: -1,
  lonely: -1
};
const moodEmojiMap: Record<string, string> = {
  happy: '😊',
  relieved: '😌',
  neutral: '😐',
  sad: '😢',
  anxious: '😰',
  angry: '😠',
  tired: '😴',
  stressed: '😫',
  lonely: '😞'
};

// Fallback keyword-based mood detector
const detectMood = (input: string): string => {
  const lower = input.toLowerCase();
  if (/(happy|glad|joy|grateful|cheerful|excited)/.test(lower)) return 'happy';
  if (/(sad|down|blue|depressed|unhappy|cry)/.test(lower)) return 'sad';
  if (/(angry|mad|furious|annoyed|irritated)/.test(lower)) return 'angry';
  if (/(stressed|tired|burned|overwhelmed)/.test(lower)) return 'stressed';
  if (/(anxious|worried|nervous|scared|afraid)/.test(lower)) return 'anxious';
  return 'neutral';
};

// Custom label to render emoji on chart points
const CustomEmojiLabel = ({ x, y, value }: LabelProps) => {
  const xPos = typeof x === 'number' ? x : 0;
  const yPos = typeof y === 'number' ? y : 0;
  if (typeof value !== 'string') return null;
  return (
    <text x={xPos} y={yPos - 8} textAnchor="middle" fontSize="16" fill="#9C83D3">
      {value}
    </text>
  );
};

const botResponse = async (
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  try {
    const res = await axios.post('/api/chat', { messages: history });
    return res.data.reply as string;
  } catch (err) {
    console.error('API error:', err);
    return "Sorry, I'm having trouble understanding that right now.";
  }
};

export default function Home() {
  const [nickname] = useState('Nicole');
  const [tone] = useState<ToneType>('empathetic');
  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([
    { id: 'default', name: 'Day 1' }
  ]);
  const [messages, setMessages] = useState<ChatSessions>({
    default: [{ sender: 'bot', text: `How are you, ${nickname}?` }]
  });
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);

  const currentMessages = messages[currentSessionId] || [];

  // Prepare data for cumulative mood chart
  const cumulativeChartData = sessions.reduce<
    { session: string; score: number; emoji: string }[]
  >((acc, session, idx) => {
    const entries = moodLog.filter(m => m.session === session.name);
    const sessionScore = entries.reduce((sum, { mood }) => sum + (moodScoreMap[mood] || 0), 0);
    const moodCount: Record<string, number> = {};
    entries.forEach(({ mood }) => {
      moodCount[mood] = (moodCount[mood] || 0) + 1;
    });
    const dominantMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    const emoji = moodEmojiMap[dominantMood] || '❓';
    const prevScore = acc[idx - 1]?.score || 0;
    acc.push({ session: session.name, score: prevScore + sessionScore, emoji });
    return acc;
  }, []);

  // Async sendMessage that logs user, calls GPT, logs bot
  const sendMessage = async () => {
  if (!input.trim()) return;
  const userText = input.trim();

  // 2a) append user locally
  const newUserMsgs: Message[] = [
    ...currentMessages,
    { sender: 'user', text: userText }
  ];
  setMessages(prev => ({
    ...prev,
    [currentSessionId]: newUserMsgs
  }));

  // 2b) detect mood & log...
  // (unchanged)

  // 2c) build history for the model
  const history = newUserMsgs.map(m => ({
    role: m.sender,
    content: m.text
  })) as { role: 'user' | 'assistant'; content: string }[];

  // 2d) call the API with full history
  const replyText = await botResponse(history);

  // 2e) append bot reply
  const updatedMsgs: Message[] = [
    ...newUserMsgs,
    { sender: 'bot', text: replyText }
  ];
  setMessages(prev => ({
    ...prev,
    [currentSessionId]: updatedMsgs
  }));

  setInput('');
};

  // Session management helpers
  const createNewSession = () => {
    const id = uuidv4();
    const name = `Day ${sessions.length + 1}`;
    setSessions(prev => [...prev, { id, name }]);
    setMessages(prev => ({
      ...prev,
      [id]: [{ sender: 'bot', text: `How are you, ${nickname}?` }]
    }));
    setCurrentSessionId(id);
    setChatEnded(false);
  };
  const renameSession = (id: string, name: string) => {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, name } : s)));
  };
  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setMessages(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setCurrentSessionId(sessions.filter(s => s.id !== id)[0]?.id || '');
  };

  return (
    <div className="min-h-screen flex bg-background text-primary">
      {/* Sidebar */}
      <aside className="w-64 bg-[#D8CCF1] text-white p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="RantMe Logo" width={36} height={36} className="rounded-md" />
          <h1 className="text-2xl font-bold text-[#9C83D3]">RantMe</h1>
        </div>

        <button onClick={createNewSession} className="bg-white text-[#9C83D3] rounded-lg px-3 py-2 shadow">
          + New Rant
        </button>
        <button onClick={() => setShowStats(!showStats)} className="bg-white text-[#9C83D3] rounded-lg px-3 py-2 shadow">
          📊 View Stats
        </button>

        <h2 className="text-sm font-semibold text-white/80">Chat History</h2>
        <ul className="space-y-2 text-sm">
          {sessions.map(session => (
            <li key={session.id} className="relative group">
              <button
                onClick={() => setCurrentSessionId(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg ${
                  session.id === currentSessionId ? 'bg-white text-[#9C83D3]' : 'hover:bg-white/20'
                }`}
              >
                {session.name}
              </button>
              <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 flex gap-1">
                <button
                  onClick={() => {
                    const newName = prompt('Rename chat:', session.name);
                    if (newName) renameSession(session.id, newName);
                  }}
                  className="text-xs bg-white/30 px-1 rounded"
                >
                  ✏️
                </button>
                <button
                  onClick={() => confirm('Delete this chat?') && deleteSession(session.id)}
                  className="text-xs bg-white/30 px-1 rounded"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main chat & stats */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b">
          <label htmlFor="tone" className="text-sm font-medium text-gray-600">
            Bot Tone:
          </label>
          <select
            id="tone"
            value={tone}
            disabled
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="empathetic">Empathetic</option>
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {currentMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-sm px-4 py-2 rounded-lg shadow ${
                  msg.sender === 'bot' ? 'bg-white text-gray-800' : 'bg-[#9C83D3] text-white'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        {chatEnded ? (
          <div className="border-t bg-white p-6 text-center">
            <p className="text-[#9C83D3] font-semibold">Chat ended</p>
            <button onClick={createNewSession} className="mt-3 bg-[#9C83D3] text-white px-4 py-2 rounded-xl">
              Start New Rant
            </button>
          </div>
        ) : (
          <div className="border-t bg-white p-4 flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e =>
                e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
              }
              placeholder="your rant here..."
              className="flex-1 rounded-xl border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9C83D3]"
            />
            <button onClick={sendMessage} className="bg-[#9C83D3] text-white px-5 py-2 rounded-xl">
              Send
            </button>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="border-t bg-white p-4">
            <h3 className="text-lg font-semibold mb-2 text-[#9C83D3]">📊 Mood Stats by Session</h3>
            {moodLog.length === 0 ? (
              <p className="text-sm text-gray-500">No data recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={cumulativeChartData}>
                  <XAxis dataKey="session" padding={{ left: 20, right: 20 }} />
                  <YAxis domain={[-8, 12]} />
                  <Tooltip formatter={(v: number) => [`${v} pts`, 'Mood Score']} />
                  <Line type="monotone" dataKey="score" stroke="#9C83D3" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="emoji"
                    stroke="#ffde59"
                    strokeWidth={0}
                    dot={{ r: 8, stroke: '#FF8CD1', strokeWidth: 2, fill: '#fff' }}
                    label={<CustomEmojiLabel />}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
