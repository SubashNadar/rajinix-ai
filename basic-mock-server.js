// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001; // Use environment port or default
const { GoogleGenerativeAI } = require("@google/generative-ai");
// --- Configuration ---
const apiKey = process.env.GEMINI_API_KEY;
const modelName = "gemini-1.5-flash-latest"; // Or use 'gemini-1.5-flash', 'gemini-1.5-pro-latest' etc.

// --- Validation ---
if (!apiKey) {
  // Throw an error during module load if the key is missing.
  // This prevents the service from being used incorrectly.
  throw new Error(
    "FATAL ERROR: GEMINI_API_KEY not found. Please set it in your .env file."
  );
}

// --- Initialize the Generative AI Client (do this once) ---
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName }); // Get model instance once

const generatePrompt = (userInput) => `
You are a helpful AI assistant. Your task is to respond to the user's request with clear, accurate information.
User Prompt:
"${userInput}"
`;

let conversationHistory = "";

async function getGeminiResponse(promptText) {
  console.log(`Sending prompt to Gemini (${modelName}): "${promptText}"`);

  try {
    // Combine the conversation history with the current prompt
    const fullPrompt = generatePrompt(
      conversationHistory + "\nUser: " + promptText
    );

    // Send the prompt and wait for the result using the pre-initialized model
    const result = await model.generateContent(fullPrompt);

    // Extract the response text
    const response = await result.response;
    const text = response.text();
    console.log("--- Gemini Response Received ---");

    // Update the conversation history
    conversationHistory += "\nUser: " + promptText + "\nAI: " + text;
    // Start summarization in the background
    summarizeConversationInBackground(conversationHistory);
    console.log("----------------------------");
    return text; // Return the successful response
  } catch (error) {
    console.error("Error calling Gemini API in geminiService:", error.message);
    if (error.message.includes("API key not valid")) {
      console.error(
        "Hint: Please ensure your GEMINI_API_KEY in the .env file is correct."
      );
    } else if (
      error.message.includes("quota") ||
      error.message.includes("rate limit")
    ) {
      console.error(
        "Hint: You might have exceeded the free tier usage limits."
      );
    }
    // Re-throw the error so the consumer knows something went wrong
    throw new Error(`Gemini API request failed: ${error.message}`);
  }
}

async function summarizeConversationInBackground(history) {
  try {
    const summaryPrompt = `Summarize the following conversation:\n${history}`;
    const summaryResult = await model.generateContent(summaryPrompt);
    const summaryResponse = await summaryResult.response;
    const summaryText = summaryResponse.text();
    console.log("--- Conversation Summary ---");
    console.log(summaryText);

    // Update the conversation history with the summary
    conversationHistory = summaryText;
  } catch (error) {
    console.error("Error during summarization:", error.message);
  }
}

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing for frontend requests
app.use(express.json()); // Enable parsing of JSON request bodies

// --- API Route ---
// Use 'async' for the route handler because getGeminiResponse is async
app.post("/api/generate", async (req, res) => {
  // 1. Get the prompt from the request body
  console.log(
    `[${new Date().toISOString()}] Received request for /api/generate`
  );
  const prompt = req.body.prompt;
  console.log(
    `[${new Date().toISOString()}] Received request for /api/generate`
  );

  // 2. Validate the prompt
  if (!prompt) {
    console.warn("Request received without a prompt.");
    // Send a Bad Request response if prompt is missing
    return res
      .status(400)
      .json({ error: "Prompt is required in the request body." });
  }

  console.log("Prompt received:", prompt); // Log the actual prompt

  try {
    // 3. Call the imported function and wait for the result
    console.log("Calling getGeminiResponse...");
    const responseText = await getGeminiResponse(prompt);
    console.log("Successfully received response from Gemini service.");

    // 4. Send the successful response back to the client
    res.status(200).json({ response: responseText });
  } catch (error) {
    // 5. Handle errors from getGeminiResponse (or other issues)
    console.error("Error processing /api/generate request:", error); // Log the full error server-side

    // Send a generic Server Error response back to the client
    // Avoid exposing detailed internal error messages to the client
    res
      .status(500)
      .json({ error: "Failed to get response from the AI service." });
  }
});

// --- Basic Root Route (Optional) ---
app.get("/", (req, res) => {
  res.send("AI Proxy Server is running!");
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Verify API key presence on startup (optional but helpful)
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "Warning: GEMINI_API_KEY is not set in the environment. API calls will likely fail."
    );
  } else {
    console.log("GEMINI_API_KEY loaded successfully.");
  }
});
