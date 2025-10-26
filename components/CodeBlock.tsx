import React, { useState } from 'react';

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden my-2 border border-gray-300 dark:border-gray-700">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-300 dark:bg-gray-700">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 capitalize">{language || 'Code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto text-gray-800 dark:text-white">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;