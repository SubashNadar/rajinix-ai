// src/components/AiInteraction.jsx
import React, { useState } from "react";
import { parseAIResponse } from "./Response";
import "./AiInteraction.css";
function AiInteraction() {
  // --- State Variables ---
  const [prompt, setPrompt] = useState(""); // User's input prompt
  const [responses, setResponses] = useState([]); // List of AI responses
  const [isLoading, setIsLoading] = useState(false); // API call loading state
  const [error, setError] = useState(null); // Error message from API
  const [isEditing, setIsEditing] = useState(false); // Is the response area editable?
  const [editedResponse, setEditedResponse] = useState(""); // Temp state for editing
  const [editingIndex, setEditingIndex] = useState(-1); // Index of response being edited

  // --- Handlers ---

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSubmitPrompt = async (event) => {
    event.preventDefault(); // Prevent default form submission if wrapped in a form
    if (!prompt.trim() || isLoading) return; // Prevent empty or duplicate submissions

    setIsLoading(true);
    setError(null); // Clear previous response
    setIsEditing(false); // Exit edit mode on new submission

    try {
      // Replace with your actual API endpoint and configuration
      const apiEndpoint = "/api/generate";
      console.log("Sending prompt:", prompt);
      console.log("API Endpoint:", apiEndpoint);
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      if (!res.ok) {
        // Try to get error details from response body, otherwise use status text
        let errorMsg = `Error: ${res.status} ${res.statusText}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (parseError) {
          // Ignore if response body isn't valid JSON
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      if (!data.response) {
        throw new Error("Received empty response from AI.");
      }

      // Add new response to the list
      setResponses([
        ...responses,
        {
          prompt: prompt,
          response: data.response,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Clear prompt after successful submission
      setPrompt("");
    } catch (err) {
      console.error("API Call Failed:", err);
      // Check if err is an Error object before accessing message
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to get response: ${message}`);
    } finally {
      setIsLoading(false); // End loading state regardless of outcome
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Optional: Show temporary success message/feedback
        console.log("Response copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        // Optional: Show error feedback to the user
        setError("Failed to copy text to clipboard.");
      });
  };

  const handleEditToggle = (index) => {
    if (!isEditing) {
      // Entering edit mode
      setEditedResponse(responses[index].response);
      setEditingIndex(index);
    } else {
      // Saving edit mode (update response in the list)
      const updatedResponses = [...responses];
      updatedResponses[editingIndex].response = editedResponse;
      setResponses(updatedResponses);
      setEditingIndex(-1);
    }
    setIsEditing(!isEditing);
  };

  const handleEditedResponseChange = (event) => {
    setEditedResponse(event.target.value);
  };

  // --- Render Logic ---
  return (
    <div className="ai-interaction-container">
      <h2>Hello Rajini-AI</h2>
      <link rel="icon" href="%PUBLIC_URL%/favicon.png" />
      {/* Response Area */}
      {responses.length > 0 && (
        <div className="responses-container">
          {responses.length > 0 ? (
            responses.map((item, index) => (
              // Updated response-item structure with card styling
              <div key={index} className="response-item card">
                <div className="response-prompt">
                  <strong>Prompt:</strong> {item.prompt}
                </div>

                <div className="response-content">
                  {parseAIResponse(item.response)}
                </div>
              </div>
            ))
          ) : (
            <p>No responses yet. Send a prompt to get started.</p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && <div className="error-message">Error: {error}</div>}

      {/* Loading Indicator */}
      {isLoading && <div className="loading-indicator">Processing...</div>}

      {/* Prompt Input Area */}
      <form onSubmit={handleSubmitPrompt} className="prompt-form">
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={handlePromptChange}
          placeholder="Enter your prompt here..."
          rows={4}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="submit-button"
        >
          {isLoading ? "Generating..." : "Send Prompt"}
        </button>
      </form>
    </div>
  );
}

export default AiInteraction;
