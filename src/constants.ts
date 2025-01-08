export const CONSTANTS = {
    API: {
        DEFAULT_API_URL: "http://localhost:8892",
        DEFAULT_AI_URL: "http://localhost:11434",
        DEFAULT_SYSTEM_PROMPT: "Please summarize this content, it may be a video transcript or the contents of a webpage. You may receive json, and css please focus on the content of the page. It is very important to remain unbiased. Highlight important parts of the content however keep it relatively short so we're able to get the overall idea of the content, highlight any important areas that need focus. For a top X list always list the items in order.",
        DEFAULT_CHUNK_SUMMARY_PROMPT: `
            Please condense the content provided while maintaining the original structure and format. Do not summarize or combine sections; instead, rephrase and remove unnecessary words or filler to reduce the overall length. Each piece of content should remain distinct and in the same order as the input. The goal is to make the content concise while preserving its meaning and intent, ensuring it fits within token limits without losing key information or context.`,
        DEFAULT_NUM_CTX: 8000
    },
    UI: {
        SCROLL_TOLERANCE: 100
    }
};