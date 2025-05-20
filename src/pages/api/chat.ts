import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Invalid message" });
  }

  try {
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in agricultural sciences and only respond to questions related to agriculture. Anything other than agriculture, always point out that you can only response to queries regarding agriculture.",
        },
        { role: "user", content: message },
      ],
    });

    const answer = chatResponse.choices[0]?.message?.content?.trim();

    return res.status(200).json({ answer });
  } catch (error: unknown) {
    console.error("OpenAI API error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch response from ChatGPT" });
  }
}
