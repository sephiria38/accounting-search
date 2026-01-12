import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [laws, setLaws] = useState([]);
  const [selectedLaw, setSelectedLaw] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Chat state
  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [databaseOnlyMode, setDatabaseOnlyMode] = useState(true); // Default to database-only mode

  // Message history limit to prevent memory leak
  const MAX_MESSAGES = 50;

  // Fetch available laws on mount
  useEffect(() => {
    fetch('/api/laws')
      .then(res => res.json())
      .then(data => setLaws(data))
      .catch(err => console.error('Failed to fetch laws:', err));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (selectedLaw) {
        params.append('lawId', selectedLaw);
      }

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ?
        <mark key={i}>{part}</mark> : part
    );
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const userMessage = chatInput;
    setChatInput('');
    setChatLoading(true);

    // Add user message to chat
    let newMessages = [...chatMessages, { role: 'user', content: userMessage }];

    // Limit message history to prevent memory leak
    if (newMessages.length > MAX_MESSAGES) {
      newMessages = newMessages.slice(-MAX_MESSAGES);
    }

    setChatMessages(newMessages);

    try {
      // Only send recent history to API (last 10 messages)
      const recentHistory = newMessages.slice(-11, -1);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: recentHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          databaseOnly: databaseOnlyMode
        })
      });

      const data = await response.json();

      if (response.ok) {
        let updatedMessages = [...newMessages, { role: 'model', content: data.message }];
        // Limit again after adding response
        if (updatedMessages.length > MAX_MESSAGES) {
          updatedMessages = updatedMessages.slice(-MAX_MESSAGES);
        }
        setChatMessages(updatedMessages);
      } else {
        setChatMessages([...newMessages, {
          role: 'model',
          content: `エラー: ${data.error || '応答の取得に失敗しました'}`
        }]);
      }
    } catch (err) {
      console.error('Chat failed:', err);
      setChatMessages([...newMessages, {
        role: 'model',
        content: 'エラー: サーバーとの通信に失敗しました'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChatHistory = () => {
    setChatMessages([]);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>会計法令検索</h1>
        <div className="mode-toggle">
          <button
            className={`mode-button ${!chatMode ? 'active' : ''}`}
            onClick={() => setChatMode(false)}
          >
            <span className="mode-icon">🔍</span>
            検索
          </button>
          <button
            className={`mode-button ${chatMode ? 'active' : ''}`}
            onClick={() => setChatMode(true)}
          >
            <span className="mode-icon">💬</span>
            AI相談
          </button>
        </div>
        {chatMode && (
          <div className="ai-mode-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={databaseOnlyMode}
                onChange={(e) => setDatabaseOnlyMode(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-text">
                {databaseOnlyMode ? '📚 データベースのみ' : '🌐 検索+参照'}
              </span>
            </label>
          </div>
        )}
      </header>

      <main className="main">
        {!chatMode ? (
        <>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="検索キーワードを入力..."
                className="search-input"
              />
              <button type="submit" className="search-button" disabled={loading}>
                {loading ? '検索中...' : '検索'}
              </button>
            </div>

            {laws.length > 0 && (
              <div className="filter-container">
                <select
                  value={selectedLaw}
                  onChange={(e) => setSelectedLaw(e.target.value)}
                  className="law-select"
                >
                  <option value="">すべての法令</option>
                  {laws.map(law => (
                    <option key={law.id} value={law.id}>
                      {law.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>

          <div className="results-container">
          {loading && <div className="loading">検索中...</div>}

          {!loading && searched && results.length === 0 && (
            <div className="no-results">
              検索結果がありません
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="results-header">
                {results.length} 件の結果が見つかりました
              </div>
              <div className="results-list">
                {results.map((result, index) => (
                  <div key={index} className="result-item">
                    <div className="result-meta">
                      <span className="law-name">{result.lawName}</span>
                      <span className="section-title">{result.sectionTitle}</span>
                    </div>
                    <h3 className="result-title">
                      {result.articleNumber && (
                        <span className="article-number">{result.articleNumber}. </span>
                      )}
                      {highlightText(result.articleTitle, searchQuery)}
                    </h3>
                    <p className="result-content">
                      {highlightText(result.articleContent, searchQuery)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          </div>
        </>
        ) : (
        <div className="chat-container">
          {chatMessages.length > 0 && (
            <div className="chat-header">
              <button onClick={clearChatHistory} className="clear-button">
                🗑️ 履歴をクリア
              </button>
              <span className="message-count">{chatMessages.length}件のメッセージ</span>
            </div>
          )}
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div className="chat-welcome">
                <h2>💬 AI相談モード</h2>
                <p>会計法令について質問してください。AIが関連する法令を検索して回答します。</p>
                <div className="example-questions">
                  <p className="example-title">質問例：</p>
                  <div className="example-item">• インボイス制度について教えて</div>
                  <div className="example-item">• 交際費の損金算入の条件は？</div>
                  <div className="example-item">• 減価償却の計算方法は？</div>
                  <div className="example-item">• 収益認識の5ステップとは？</div>
                </div>
              </div>
            )}
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <strong>{msg.role === 'user' ? 'あなた' : 'AI'}</strong>
                  </div>
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-message model">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="message-header">
                    <strong>AI</strong>
                  </div>
                  <div className="message-text">
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleChatSubmit} className="chat-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="会計法令について質問してください..."
              className="chat-input"
              disabled={chatLoading}
            />
            <button type="submit" className="chat-button" disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? '⏳' : '📤'}
            </button>
          </form>
        </div>
        )}
      </main>
    </div>
  );
}

export default App;
