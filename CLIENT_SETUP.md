# Rajinix-AI Client Setup Guide

A React-based AI chatbot application powered by Google's Gemini AI API.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Gemini API Key

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rajinix-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

**Get your Gemini API Key:**
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Sign in with your Google account
- Create a new API key
- Copy and paste it into your `.env` file

### 4. Start the Backend Server

In one terminal:

```bash
node basic-mock-server.js
```

The server will start on `http://localhost:3001`

### 5. Start the React App

In another terminal:

```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
rajinix-ai/
├── public/
│   ├── favicon.png          # App icon
│   └── index.html           # HTML template
├── src/
│   ├── components/
│   │   ├── AiInteraction.jsx    # Main chat component
│   │   ├── AiInteraction.css    # Component styles
│   │   └── Response.jsx         # Response parser
│   ├── App.js               # Root component
│   └── index.js             # Entry point
├── basic-mock-server.js     # Express backend server
├── .env                     # Environment variables
└── package.json             # Dependencies
```

## Features

- 💬 Real-time AI chat interface
- 🎨 Markdown and code block rendering
- 📋 Copy code functionality
- 🔄 Conversation history with auto-summarization
- 🎯 Clean, modern UI

## Available Scripts

### `npm start`
Runs the React app in development mode at [http://localhost:3000](http://localhost:3000)

### `node basic-mock-server.js`
Starts the Express backend server on port 3001

### `npm test`
Launches the test runner

### `npm run build`
Builds the app for production to the `build` folder

## Configuration

### Backend Server (basic-mock-server.js)

- **Port:** Default 3001 (configurable via PORT env variable)
- **Model:** gemini-1.5-flash-latest
- **CORS:** Enabled for frontend requests
- **Features:**
  - Conversation history tracking
  - Automatic conversation summarization
  - Error handling and logging

### Frontend (React App)

- **Proxy:** Configured to proxy API requests to `http://localhost:3001`
- **API Endpoint:** `/api/generate`
- **Features:**
  - Response parsing with markdown support
  - Code syntax highlighting
  - Copy-to-clipboard functionality

## Troubleshooting

### Server won't start
- Ensure `.env` file exists with valid `GEMINI_API_KEY`
- Check if port 3001 is available
- Verify all dependencies are installed: `npm install`

### API Key errors
- Verify your Gemini API key is correct
- Check if you've exceeded free tier limits
- Ensure no extra spaces in `.env` file

### CORS errors
- Ensure backend server is running on port 3001
- Check proxy configuration in `package.json`

### Port conflicts
- Change PORT in `.env` file
- Update proxy in `package.json` to match

## Dependencies

### Frontend
- react ^19.1.0
- react-dom ^19.1.0
- react-scripts 5.0.1

### Backend
- express ^5.1.0
- cors ^2.8.5
- @google/generative-ai ^0.24.1
- dotenv ^16.5.0

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to version control
- Keep your API key secure
- Add `.env` to `.gitignore`
- Use environment variables for sensitive data

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs in the terminal
3. Check browser console for frontend errors

## License

ISC

## Author

Subash
