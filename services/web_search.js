// services/web_search.js

/**
 * Fetches live web search results via your backend proxy (which calls Tavily)
 * and formats them into plain text with citations.
 * @param {string} query - User search question
 * @returns {Promise<{contextText: string, sources: Array<{title: string, url: string}>}>}
 */
async function fetchWebContext(query) {
    if (!CONFIG.BACKEND_BASE_URL || CONFIG.BACKEND_BASE_URL.includes("your-backend-worker")) {
        throw new Error("Backend URL is not configured in config.js");
    }

    const response = await fetch(`${CONFIG.BACKEND_BASE_URL}/api/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: query,
            search_depth: "basic",
            max_results: 5,
            include_answer: false
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Search Backend Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const results = data.results || [];

    // Transform JSON output into clean plain text + extract source citations
    let contextText = "";
    const sources = [];

    results.forEach((item, index) => {
        const sourceNum = index + 1;
        contextText += `[Source ${sourceNum}]\nTitle: ${item.title}\nURL: ${item.url}\nContent: ${item.content}\n\n`;
        sources.push({
            title: item.title,
            url: item.url
        });
    });

    return { contextText, sources };
}
