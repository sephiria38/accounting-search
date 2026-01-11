const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load law data
const lawsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'laws.json'), 'utf8')
);

// Get all laws
app.get('/api/laws', (req, res) => {
  const laws = lawsData.laws.map(law => ({
    id: law.id,
    name: law.name,
    category: law.category
  }));
  res.json(laws);
});

// Search endpoint
app.get('/api/search', (req, res) => {
  const { q, lawId } = req.query;

  if (!q || q.trim() === '') {
    return res.json({ results: [] });
  }

  const searchTerm = q.toLowerCase();
  const results = [];

  lawsData.laws.forEach(law => {
    // Filter by lawId if provided
    if (lawId && law.id !== lawId) {
      return;
    }

    law.sections.forEach(section => {
      section.articles.forEach(article => {
        // Search in title and content
        const matchInTitle = article.title && article.title.toLowerCase().includes(searchTerm);
        const matchInContent = article.content && article.content.toLowerCase().includes(searchTerm);

        if (matchInTitle || matchInContent) {
          results.push({
            lawId: law.id,
            lawName: law.name,
            sectionId: section.id,
            sectionTitle: section.title,
            articleId: article.id,
            articleNumber: article.number,
            articleTitle: article.title,
            articleContent: article.content,
            // Highlight matched text
            highlights: {
              title: matchInTitle,
              content: matchInContent
            }
          });
        }
      });
    });
  });

  res.json({
    query: q,
    count: results.length,
    results
  });
});

// Get specific law details
app.get('/api/laws/:lawId', (req, res) => {
  const { lawId } = req.params;
  const law = lawsData.laws.find(l => l.id === lawId);

  if (!law) {
    return res.status(404).json({ error: 'Law not found' });
  }

  res.json(law);
});

// Define the search function for Gemini to use
const searchFunction = {
  name: "search_accounting_law",
  description: "企業会計原則などの会計法令を検索します。キーワードを指定して関連する条文を検索できます。",
  parameters: {
    type: "object",
    properties: {
      q: {
        type: "string",
        description: "検索キーワード（必須）"
      },
      lawId: {
        type: "string",
        description: "特定の法令IDでフィルタリング（オプション）"
      }
    },
    required: ["q"]
  }
};

// Function to execute the search tool
async function executeSearchTool(functionCall) {
  const { q, lawId } = functionCall.args;

  if (!q || q.trim() === '') {
    return { results: [] };
  }

  const searchTerm = q.toLowerCase();
  const results = [];

  lawsData.laws.forEach(law => {
    if (lawId && law.id !== lawId) {
      return;
    }

    law.sections.forEach(section => {
      section.articles.forEach(article => {
        const matchInTitle = article.title && article.title.toLowerCase().includes(searchTerm);
        const matchInContent = article.content && article.content.toLowerCase().includes(searchTerm);

        if (matchInTitle || matchInContent) {
          results.push({
            lawId: law.id,
            lawName: law.name,
            sectionId: section.id,
            sectionTitle: section.title,
            articleId: article.id,
            articleNumber: article.number,
            articleTitle: article.title,
            articleContent: article.content
          });
        }
      });
    });
  });

  return {
    query: q,
    count: results.length,
    results: results.slice(0, 10) // Limit to 10 results for AI context
  };
}

// Chat endpoint with Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize the model with function calling and system instruction
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      tools: [{
        functionDeclarations: [searchFunction]
      }],
      systemInstruction: {
        parts: [{ text: "あなたは会計法令の専門家です。ユーザーの質問に対して、search_accounting_law関数を使って関連する法令を検索し、わかりやすく説明してください。" }]
      }
    });

    // Build chat history
    const chatHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: chatHistory
    });

    // Send message and handle function calls
    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle function calls
    while (response.candidates[0].content.parts.some(part => part.functionCall)) {
      const functionCall = response.candidates[0].content.parts.find(part => part.functionCall).functionCall;

      console.log('Function call:', functionCall.name, functionCall.args);

      // Execute the function
      const functionResult = await executeSearchTool(functionCall);

      // Send function response back to the model
      result = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: functionResult
        }
      }]);

      response = result.response;
    }

    // Extract text response
    const textResponse = response.candidates[0].content.parts
      .filter(part => part.text)
      .map(part => part.text)
      .join('');

    res.json({
      message: textResponse,
      history: await chat.getHistory()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
