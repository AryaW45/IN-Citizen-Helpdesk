// app.js

const chatContainer = document.getElementById("chat-container");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const statusIndicator = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");

// Memory array to keep track of turn-by-turn conversation context
const conversationHistory = [];

// System prompt defining the assistant's personality and instructions
const SYSTEM_PROMPT = `You are an official Citizen Helpdesk Assistant. 
Your goal is to answer user queries with high accuracy using the live web search context provided to you.

Guidelines:
1. Always base your response on the provided live web search context.
2. Provide clear, direct, and structured answers.
3. Cite sources inline using [Source 1], [Source 2], etc.
4. If the search context doesn't contain sufficient details, state what is available and politely advise the user.`;

// Auto-resize textarea dynamically as the user types (Gemini style)
userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = userInput.scrollHeight + "px";
    if (userInput.scrollHeight > 200) {
        userInput.style.overflowY = "auto";
    } else {
        userInput.style.overflowY = "hidden";
    }
});

// Handle keyboard shortcuts (Enter to submit, Shift + Enter for new line)
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
});

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query) return;

    // 1. Render User Message
    appendMessage("user", query);
    userInput.value = "";
    
    // Reset textarea height back to default after submission
    userInput.style.height = "auto";
    userInput.style.overflowY = "hidden";

    // 2. Show Processing Status
    updateStatus(true, "Searching the live web via Tavily...");

    try {
        // 3. Step 2 to 5: Fetch live web search snippets
        const { contextText, sources } = await fetchWebContext(query);

        updateStatus(true, "Synthesizing live answer with Qwen (Groq)...");

        // 4. Construct messages payload with conversation memory + live web context
        const userPromptWithContext = `Live Web Search Context:\n${contextText}\n\nUser Question: ${query}`;
        
        const apiMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationHistory,
            { role: "user", content: userPromptWithContext }
        ];

        // 5. Step 6: Query Groq API
        const botAnswer = await callGroqAPI(apiMessages);

        // 6. Save turn in memory
        conversationHistory.push({ role: "user", content: query });
        conversationHistory.push({ role: "assistant", content: botAnswer });

        // 7. Render Bot Response
        appendMessage("assistant", botAnswer, sources);

    } catch (error) {
        console.error(error);
        appendMessage("assistant", `⚠️ **Error:** ${error.message}`);
    } finally {
        updateStatus(false);
    }
});

/**
 * Calls the Groq Chat Completions API.
 */
async function callGroqAPI(messages) {
    if (!CONFIG.GROQ_API_KEY || CONFIG.GROQ_API_KEY.includes("[Groq key🔵]")) {
        throw new Error("Missing Groq API Key in config.js");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${CONFIG.GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: CONFIG.GROQ_MODEL,
            messages: messages,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Groq API Error (${response.status})`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Helper to display user and bot chat messages in the UI.
 */
function appendMessage(role, text, sources = []) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", `${role}-message`);

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");
    contentDiv.textContent = text;
    msgDiv.appendChild(contentDiv);

    // Render source chips if available
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement("div");
        sourcesDiv.classList.add("sources-container");

        const titleDiv = document.createElement("div");
        titleDiv.classList.add("sources-title");
        titleDiv.textContent = "Cited Live Sources:";
        sourcesDiv.appendChild(titleDiv);

        const listDiv = document.createElement("div");
        listDiv.classList.add("sources-list");

        sources.forEach((src, idx) => {
            const link = document.createElement("a");
            link.classList.add("source-chip");
            link.href = src.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = `[${idx + 1}] ${src.title}`;
            listDiv.appendChild(link);
        });

        sourcesDiv.appendChild(listDiv);
        msgDiv.appendChild(sourcesDiv);
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Helper to update loading status text.
 */
function updateStatus(show, text = "") {
    if (show) {
        statusText.textContent = text;
        statusIndicator.classList.remove("hidden");
    } else {
        statusIndicator.classList.add("hidden");
    }
}