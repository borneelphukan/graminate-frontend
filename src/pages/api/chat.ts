// api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import axios from "axios";

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

  const { message, userId, token } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Invalid message" });
  }

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "User ID is missing" });
  }

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Auth token is missing" });
  }

  const nestApiUrl = process.env.NESTJS_API_URL || "http://localhost:3001";

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_contacts",
        description:
          "Get a list of all contacts for the current user from the CRM system.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_companies",
        description:
          "Get a list of all companies for the current user from the CRM system.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_contracts",
        description:
          "Get a list of all contracts or deals for the current user from the CRM system.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_receipts",
        description:
          "Get a list of all receipts for the current user from the CRM system.",
        parameters: { type: "object", properties: {} },
      },
    },
  ];

  const currentDate = new Date().toString();
  const systemPrompt = `The current date and time is ${currentDate}. You are a helpful assistant for Graminate, an agricultural platform. You are an expert in agricultural sciences. You can also help users by fetching their data, like contacts, companies, contracts, and receipts from the system using the provided tools. When asked to fetch data, use the tools. When asked about agriculture, provide expert advice. For any other topics, politely decline and state your purpose. When presenting lists of data like contacts, format them clearly and always use markdown tables.`;

  const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: message },
    ];

  try {
    const initialResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = initialResponse.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls) {
      const availableFunctions = {
        get_contacts: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/contacts/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (
              apiResponse.data.contacts &&
              apiResponse.data.contacts.length > 0
            ) {
              return JSON.stringify(
                apiResponse.data.contacts.map((c: any) => ({
                  name: `${c.first_name} ${c.last_name || ""}`.trim(),
                  phone: c.phone_number,
                  email: c.email,
                  type: c.type,
                }))
              );
            }
            return JSON.stringify({ message: "No contacts found." });
          } catch (error) {
            console.error("Error fetching contacts from NestJS API:", error);
            return JSON.stringify({ error: "Failed to fetch contacts." });
          }
        },
        get_companies: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/companies/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (
              apiResponse.data.companies &&
              apiResponse.data.companies.length > 0
            ) {
              return JSON.stringify(
                apiResponse.data.companies.map((c: any) => ({
                  company_name: c.company_name,
                  contact_person: c.contact_person,
                  email: c.email,
                  phone: c.phone_number,
                  type: c.type,
                }))
              );
            }
            return JSON.stringify({ message: "No companies found." });
          } catch (error) {
            console.error("Error fetching companies from NestJS API:", error);
            return JSON.stringify({ error: "Failed to fetch companies." });
          }
        },
        get_contracts: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/contracts/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (
              apiResponse.data.contracts &&
              apiResponse.data.contracts.length > 0
            ) {
              return JSON.stringify(
                apiResponse.data.contracts.map((c: any) => ({
                  deal_name: c.deal_name,
                  partner: c.partner,
                  stage: c.stage,
                  amount: c.amount,
                  end_date: c.end_date,
                }))
              );
            }
            return JSON.stringify({ message: "No contracts found." });
          } catch (error) {
            console.error("Error fetching contracts from NestJS API:", error);
            return JSON.stringify({ error: "Failed to fetch contracts." });
          }
        },
        get_receipts: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/receipts/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (
              apiResponse.data.receipts &&
              apiResponse.data.receipts.length > 0
            ) {
              return JSON.stringify(
                apiResponse.data.receipts.map((r: any) => ({
                  title: r.title,
                  bill_to: r.bill_to,
                  due_date: r.due_date,
                  receipt_date: r.receipt_date,
                }))
              );
            }
            return JSON.stringify({ message: "No receipts found." });
          } catch (error) {
            console.error("Error fetching receipts from NestJS API:", error);
            return JSON.stringify({ error: "Failed to fetch receipts." });
          }
        },
      };

      conversationHistory.push(responseMessage);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function
          .name as keyof typeof availableFunctions;
        const functionToCall = availableFunctions[functionName];
        const functionResponse = await functionToCall();
        conversationHistory.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: functionResponse,
        });
      }

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
      });

      return res
        .status(200)
        .json({ answer: finalResponse.choices[0].message.content });
    } else {
      const answer = responseMessage.content?.trim();
      return res.status(200).json({ answer });
    }
  } catch (error: unknown) {
    console.error("OpenAI API or downstream error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch response from the assistant." });
  }
}
