import dotenv from 'dotenv';
import OpenAI from 'openai';

// Configure dotenv
dotenv.config();

// Set up OpenAI configuration
const openai = new OpenAI({
    organization: process.env.organization,
    project: process.env.project,
    apiKey: process.env.APIKEY,
});

export async function sendPrompt(content) {
    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: content }],
        stream: true,
    });

    let result = '';
    for await (const chunk of stream) {
        result += chunk.choices[0]?.delta?.content || "";
    }
    return result;
}