This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the following in your terminal to install all required dependencies:

```bash
npm install 
```
then 
```bash
npm install axios uuid recharts
```

then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features
Emotion-Aware Chatbot
Chat with an AI assistant that adjusts its tone based on your emotion (empathetic, motivational, reflective, or funny).

Real-Time Emotion Detection
Each message is analyzed using a transformer model to detect emotion, and the chatbot adjusts its response accordingly.

Mood-Adaptive Backgrounds
The background gradient dynamically changes to match your emotional state.

Mood Tracking Analytics
Visualize your emotional history using an interactive mood graph, with emojis that reflect your dominant emotion per day.

Checklist System
Add, complete, and track tasks with a built-in to-do list. Helps manage academic deadlines and personal goals.

Multi-Day Chat Sessions
Rant across multiple sessions. Each session is logged and can be revisited from the sidebar.

## How to Use It
Start Chatting
Type your thoughts or feelings in the chat input and hit Send. The AI will respond with a tone that you selected from the dropdown.

View Mood Stats
Click on View Stats in the sidebar to see how your mood changes across sessions. The system computes your mood score and shows a weekly summary.

Use the Checklist
Click on Checklist to add your academic or personal tasks. Set a due date and mark them complete when done.

Switch Between Sessions
Use the chat history panel to jump between chat sessions. Each day is stored with its own mood logs and messages.

