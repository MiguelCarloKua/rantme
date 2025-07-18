'use client';
import { useState } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { LabelProps } from 'recharts';

// Types
type Message = { sender: 'bot' | 'user'; text: string };
type ChatSessions = { [sessionId: string]: Message[] };
type Session = { id: string; name: string };
type ToneType = 'empathetic' | 'motivational' | 'reflective' | 'funny';
type MoodEntry = { date: string; mood: string; session: string };

const moodScoreMap: { [key: string]: number } = {
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

const moodEmojiMap: { [key: string]: string } = {
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


const detectMood = (input: string): string => {
  const lower = input.toLowerCase();
  if (/(happy|glad|joy|grateful|cheerful|excited)/.test(lower)) return 'happy';
  if (/(sad|down|blue|depressed|unhappy|cry)/.test(lower)) return 'sad';
  if (/(angry|mad|furious|annoyed|irritated)/.test(lower)) return 'angry';
  if (/(stressed|tired|burned|overwhelmed)/.test(lower)) return 'stressed';
  if (/(anxious|worried|nervous|scared|afraid)/.test(lower)) return 'anxious';
  return 'neutral';
};

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

export default function Home() {
  const [nickname, setNickname] = useState('Nicole');
  const [hasAskedForAdvice, setHasAskedForAdvice] = useState(false);
  const [tone, setTone] = useState<ToneType>('empathetic');
  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]);



  const [sessions, setSessions] = useState<Session[]>([{
    id: 'default',
    name: 'Day 1'
  }]);

const cumulativeChartData = sessions.reduce((acc: { session: string; score: number; emoji: string }[], session, index) => {
  const entries = moodLog.filter(m => m.session === session.name);
  const sessionScore = entries.reduce((sum, { mood }) => sum + (moodScoreMap[mood] || 0), 0);

  const moodCount: { [mood: string]: number } = {};
  entries.forEach(({ mood }) => {
    moodCount[mood] = (moodCount[mood] || 0) + 1;
  });

  const dominantMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  const emoji = moodEmojiMap[dominantMood] || '❓';

  const prevScore = acc[index - 1]?.score || 0;
  acc.push({ session: session.name, score: prevScore + sessionScore, emoji });

  return acc;
}, []);



  const [messages, setMessages] = useState<ChatSessions>({
    default: [{ sender: 'bot', text: `How are you, ${nickname}?` }]
  });

  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);

  const currentMessages = messages[currentSessionId] || [];

 const getBotResponse = (
  tone: ToneType,
  userInput: string,
  hasAskedForAdvice: boolean,
  setHasAskedForAdvice: (v: boolean) => void
): string => {
  const lowerInput = userInput.toLowerCase().trim();
  const wordCount = lowerInput.split(/\s+/).length;
  const detectedMood = detectMood(lowerInput);
  const isQuestion = lowerInput.includes('?');
  const isShortInput = wordCount <= 3;

  const negativeMoods = ['sad', 'angry', 'stressed', 'anxious', 'lonely', 'tired'];
  const appreciationWords = ['thank you', 'thanks', 'ty', 'salamat', 'appreciate'];

  const responses: { [K in ToneType]: string[] } = {
    empathetic: [
      'That sounds really tough. I’m here for you.',
      'I can hear the weight in your words. Let it out.',
      'It’s okay to feel overwhelmed. You’re not alone.',
      'Let it out. I’m here for you.',
      'I’m proud of you for sharing that. You’re doing your best.'
    ],
    motivational: [
      'You’re getting through this. One step at a time!',
      'Every day you try, you grow stronger.',
      'You’ve survived all your worst days—remember that.',
      'You’ve got this. Keep moving forward.',
      'You’re capable of amazing things.'
    ],
    reflective: [
      'What do you think made you feel that way?',
      'Is this a familiar feeling or something new?',
      'What do you think triggered it?',
      'Let’s explore what’s going on together.',
      'What part of this situation hit you hardest?'
    ],
    funny: [
      'Stress is your brain doing backflips without permission.',
      'If crying burned calories, I’d be a fitness model.',
      'Overthinking level: expert. 😅',
      'Life’s weird, right? You’re doing your best!',
      'Did Mercury retrograde again or is this just life?'
    ]
  };

  const happyResponses = [
    'That’s wonderful to hear! I’m so glad things are going well for you!',
    'Hearing your happiness really warms my circuits 😊',
    'Moments like these are meant to be cherished. Thank you for sharing.',
    'You deserve all the good things happening to you.',
    'Let that joy fill you up and overflow into your next day!'
  ];

  const advicePool: string[] = [
    'Have you tried journaling your thoughts?',
    'Sometimes a deep breath and a walk can make a big difference.',
    'Talking to someone you trust can really help lighten the load.',
    'Try to focus on what you can control, and let go of what you can’t.',
    'You deserve rest too—don’t forget that.',
    'Think about one small thing you can do for yourself today.'
  ];

  // 🌟 Appreciation ends chat
  if (appreciationWords.some(word => lowerInput.includes(word))) {
    setChatEnded(true);
    return 'I’m really glad I could help. Chat with you again soon 💜';
  }

  // 🤔 Short input = prompt for more details
if (isShortInput && !isQuestion) {
  return 'I hear you. Can you tell me more about what made you feel that way?';
}

  // 😊 If mood is happy and story is long = positive response
  if (detectedMood === 'happy' && wordCount > 5) {
    return happyResponses[Math.floor(Math.random() * happyResponses.length)];
  }

  // 🧠 Long message + negative mood = ask if advice is wanted
  if (negativeMoods.includes(detectedMood) && wordCount > 5 && !hasAskedForAdvice) {
    setHasAskedForAdvice(true);
    return 'Would you like me to give you some advice or would you prefer to just vent for now?';
  }

  // 👍 User wants advice
  if (hasAskedForAdvice && /yes|sure|okay|advice|go ahead/.test(lowerInput)) {
    setHasAskedForAdvice(false);
    return 'Here’s something you might try:\n' + advicePool[Math.floor(Math.random() * advicePool.length)];
  }

  // 🙅 User declines advice
  if (hasAskedForAdvice && /no|nah|not now|just vent/.test(lowerInput)) {
    setHasAskedForAdvice(false);
    return responses[tone][Math.floor(Math.random() * responses[tone].length)];
  }

  // 🧠 Default thoughtful response
  return responses[tone][Math.floor(Math.random() * responses[tone].length)];
};


  const sendMessage = () => {
    if (!input.trim()) return;
    const mood = detectMood(input.trim());
    const date = new Date().toLocaleDateString();
    setMoodLog([...moodLog, { date, mood, session: sessions.find(s => s.id === currentSessionId)?.name || 'unknown' }]);

const updated: Message[] = [
  ...currentMessages,
  { sender: 'user', text: input.trim() },
  {
    sender: 'bot',
    text: getBotResponse(
      tone,
      input.trim(),
      hasAskedForAdvice,
      setHasAskedForAdvice
    ),
  },
];
  const createNewSession = () => {
    const id = uuidv4();
    const newName = `Day ${sessions.length + 1}`;
    const newSession: Session = { id, name: newName };
    setSessions([...sessions, newSession]);
    setMessages({
      ...messages,
      [id]: [{ sender: 'bot', text: `How are you, ${nickname}?` }],
    });
    setCurrentSessionId(id);
    setChatEnded(false);
  };

  const renameSession = (id: string, newName: string) => {
    setSessions(sessions.map(s => (s.id === id ? { ...s, name: newName } : s)));
  };

  const deleteSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    const { [id]: _, ...remainingMessages } = messages;
    setSessions(updatedSessions);
    setMessages(remainingMessages);
    setCurrentSessionId(updatedSessions[0]?.id || '');
  };

  return (
    <div className="min-h-screen flex bg-background text-primary">
      <aside className="w-64 bg-[#D8CCF1] text-white flex flex-col p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="RantMe Logo" width={36} height={36} className="rounded-md" />
          <h1 className="text-2xl font-bold text-[#9C83D3]">RantMe</h1>
        </div>

        <button
          onClick={createNewSession}
          className="bg-white text-[#9C83D3] font-bold rounded-lg px-3 py-2 shadow hover:bg-[#ede9f7] transition"
        >+ New Rant</button>

        <button
          onClick={() => setShowStats(!showStats)}
          className="bg-white text-[#9C83D3] font-semibold rounded-lg px-3 py-2 shadow hover:bg-[#ede9f7] transition"
        >📊 View Stats</button>

        <h2 className="text-sm font-semibold text-white/80 mb-2">Chat History</h2>
        <ul className="space-y-2 text-sm">
          {sessions.map(session => (
            <li key={session.id} className="relative group">
              <button
                onClick={() => setCurrentSessionId(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg ${
                  session.id === currentSessionId ? 'bg-white text-[#9C83D3]' : 'hover:bg-white/20'
                }`}>{session.name}</button>
              <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 flex gap-1">
                <button
                  onClick={() => {
                    const newName = prompt('Rename chat:', session.name);
                    if (newName) renameSession(session.id, newName);
                  }}
                  className="text-xs bg-white/30 px-1 rounded hover:bg-white/60"
                >✏️</button>
                <button
                  onClick={() => confirm('Delete this chat?') && deleteSession(session.id)}
                  className="text-xs bg-white/30 px-1 rounded hover:bg-white/60"
                >🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b">
          <label htmlFor="tone" className="text-sm font-medium text-gray-600">Bot Tone:</label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as ToneType)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="empathetic">Empathetic</option>
            <option value="motivational">Motivational</option>
            <option value="reflective">Reflective</option>
            <option value="funny">Light-hearted</option>
          </select>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {currentMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-sm px-4 py-2 rounded-lg shadow ${
                  msg.sender === 'bot' ? 'bg-white text-gray-800' : 'bg-[#9C83D3] text-white'
                }`}>{msg.text}</div>
            </div>
          ))}
        </div>

        {chatEnded ? (
          <div className="border-t bg-white p-6 text-center">
            <p className="text-[#9C83D3] font-semibold">Chat ended</p>
            <button
              onClick={createNewSession}
              className="mt-3 bg-[#9C83D3] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#856DC0]"
            >Start New Rant</button>
          </div>
        ) : (
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
            >Send</button>
          </div>
        )}

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
      <Tooltip formatter={(value: number) => [`${value} pts`, 'Mood Score']} />
      <Line type="monotone" dataKey="score" stroke="#9C83D3" strokeWidth={2} />
      <Line
        type="monotone"
        dataKey="emoji"
        stroke="#ffde59"
        strokeWidth={0}
        dot={{
          r: 8,
          stroke: '#FF8CD1',
          strokeWidth: 2,
          fill: '#fff',
        }}
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