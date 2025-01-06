export const CONSTANTS = {
    API: {
        DEFAULT_API_URL: "http://localhost:8892",
        DEFAULT_AI_URL: "http://localhost:11434",
        DEFAULT_AI_MODEL: "mistral",
        DEFAULT_SYSTEM_PROMPT: "You are a helpful AI assistant. Please provide concise, unbiased summaries.",
        DEFAULT_CHUNK_SUMMARY_PROMPT: `
            Please condense the content provided while maintaining the original structure and format. Do not summarize or combine sections; instead, rephrase and remove unnecessary words or filler to reduce the overall length. Each piece of content should remain distinct and in the same order as the input. The goal is to make the content concise while preserving its meaning and intent, ensuring it fits within token limits without losing key information or context.`,
        DEFAULT_NUM_CTX: 8000
    },
    UI: {
        SCROLL_TOLERANCE: 100
    }
};