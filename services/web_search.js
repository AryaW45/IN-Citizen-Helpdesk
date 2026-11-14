// services/web_search.js

/**
 * Fetches live web search results from Tavily and formats them into plain text.
 * @param {string} query - User search question
 * @returns {Promise<{contextText: string, sources: Array<{title: string, url: string}>}>}
 */
async function fetchWebContext(query) {
    if (!CONFIG.SEARCH_API_KEY || CONFIG.SEARCH_API_KEY.includes("[tavily key🔴]")) {
        throw new Error("Missing Tavily API Key in config.js");
    }

    const payload = {
        api_key: CONFIG.SEARCH_API_KEY,
        query: query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false
    };

    const response = await fetch(CONFIG.TAVILY_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Tavily Search API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const results = data.results || [];

    // Step 5: Transform JSON output into clean plain text + extract source citations
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