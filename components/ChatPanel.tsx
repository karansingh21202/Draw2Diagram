import React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, GenerationMode, ImageGenerationStyle } from '../types';
import { UserIcon, AiIcon, SendIcon, LoadingDots } from './icons/Icons';
import CodeBlock from './CodeBlock';

type CodeLanguage = 'python' | 'terraform' | 'html' | 'mermaid';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode: GenerationMode, language?: CodeLanguage, imageStyle?: ImageGenerationStyle) => void;
  isLoading: boolean;
  selectedElementCount: number;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading, selectedElementCount }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<GenerationMode>('chat');
  const [language, setLanguage] = useState<CodeLanguage>('python');
  const [imageStyle, setImageStyle] = useState<ImageGenerationStyle>('match');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim(), mode, language, imageStyle);
      setInput('');
    }
  };

  const codeLanguages: { id: CodeLanguage, name: string }[] = [
      { id: 'python', name: 'Python' },
      { id: 'terraform', name: 'Terraform' },
      { id: 'html', name: 'HTML/CSS' },
      { id: 'mermaid', name: 'Mermaid.js' },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 px-4">
                <AiIcon className="w-16 h-16 mb-4"/>
                <h3 className="text-lg font-semibold">Draw & Chat</h3>
                <p className="text-sm">Describe the diagram you want to create, or draw something and ask the AI to modify it or generate code from it.</p>
             </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white"><AiIcon/></div>}
              <div
                className={`max-w-xs md:max-w-sm rounded-xl ${
                  msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none px-4 py-3' : 'bg-transparent p-0'
                }`}
              >
                {msg.type === 'code' ? (
                  <CodeBlock language={msg.language} code={msg.text} />
                ) : (
                  <p className={`text-sm whitespace-pre-wrap ${msg.sender === 'ai' && 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl rounded-bl-none px-4 py-3'}`}>{msg.text}</p>
                )}
              </div>
               {msg.sender === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white"><UserIcon/></div>}
            </div>
          ))}
          {isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'user' && (
             <div className="flex gap-3">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white"><AiIcon/></div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl rounded-bl-none px-4 py-3">
                   <LoadingDots />
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-2 mb-2">
            <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg flex text-sm border border-gray-200 dark:border-gray-600 w-full">
                <button onClick={() => setMode('chat')} className={`flex-1 px-3 py-1 rounded-md transition-colors ${mode === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Chat</button>
                <button onClick={() => setMode('image')} className={`flex-1 px-3 py-1 rounded-md transition-colors ${mode === 'image' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Edit Image</button>
                <button onClick={() => setMode('code')} className={`flex-1 px-3 py-1 rounded-md transition-colors ${mode === 'code' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Code</button>
            </div>
            {mode === 'image' && (
                <>
                    <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg flex text-xs border border-gray-200 dark:border-gray-600 w-full">
                        <button onClick={() => setImageStyle('match')} className={`flex-1 px-2 py-1 rounded-md transition-colors ${imageStyle === 'match' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Match Style</button>
                        <button onClick={() => setImageStyle('generate')} className={`flex-1 px-2 py-1 rounded-md transition-colors ${imageStyle === 'generate' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Generate New</button>
                    </div>
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400 px-2">
                        {imageStyle === 'match' ? 'Keeps your drawing\'s original look & feel.' : 'Creates a new image with full creative freedom.'}
                    </div>
                    <div className="text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md border border-amber-200 dark:border-amber-700/50">
                       <b>Warning:</b> 
                       {selectedElementCount > 0 
                         ? " Replaces selected shapes with a flattened image."
                         : " Replaces your entire diagram with a flattened image."
                       }
                    </div>
                </>
            )}
             {mode === 'code' && (
                <select value={language} onChange={e => setLanguage(e.target.value as CodeLanguage)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                    {codeLanguages.map(lang => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
                </select>
            )}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
                mode === 'chat' ? "Describe a diagram or ask to edit..." :
                mode === 'image' ? "Describe how to change the image..." :
                "Add context for code generation..."
            }
            disabled={isLoading}
            className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
