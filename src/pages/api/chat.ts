// api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  sender: "user" | "bot";
  text: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { history, userId, token } = req.body;

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "Invalid history" });
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
    {
      type: "function",
      function: {
        name: "get_sales_records",
        description:
          "Get a list of all sales records for the current user. Useful for questions about revenue, what was sold, and to whom.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_expense_records",
        description:
          "Get a list of all expense records for the current user. Useful for questions about costs, spending, COGS, and operating expenses.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_poultry_egg_records",
        description:
          "Get poultry egg collection and grading records. Can be filtered by a specific flock name if provided.",
        parameters: {
          type: "object",
          properties: {
            flock_name: {
              type: "string",
              description: "The name of the flock to filter egg records by.",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_warehouses",
        description:
          "Get a list of all warehouses for the current user, including their name, type, and location.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_inventory_items",
        description:
          "Get a list of inventory items. Can be filtered by a specific warehouse name if provided by the user.",
        parameters: {
          type: "object",
          properties: {
            warehouse_name: {
              type: "string",
              description:
                "The name of the warehouse to filter inventory items by. If omitted, items from all warehouses are returned.",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_labour_records",
        description:
          "Get a list of all employees (labour) for the current user, including their personal details, role, and contact information.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_labour_payments",
        description:
          "Get a list of salary payments made to employees. Can be filtered by employee name.",
        parameters: {
          type: "object",
          properties: {
            employee_name: {
              type: "string",
              description:
                "The full name of the employee to filter payment records for.",
            },
          },
          required: [],
        },
      },
    },
  ];

  const currentDate = new Date().toString();
  const systemPrompt = `The current date and time is ${currentDate}. You are a helpful assistant for Graminate, an agricultural platform. You are an expert in agricultural sciences. You can also help users by fetching their data, like contacts, companies, contracts, receipts, sales, expenses, poultry, warehouses, inventory, and employee (labour) data from the system using the provided tools. You can calculate financial metrics like total revenue, total expenses, and profit from this data. When asked about poultry eggs, remember that egg sizes (small, medium, large, extra-large) are based on Indian standards. When asked to fetch data, use the tools. For any other topics, politely decline and state your purpose. When presenting lists of data, format them clearly and always use markdown tables.`;

  const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history.map((message: Message & { name?: string }) => {
        // If you ever support function/tool messages, add 'name' as required by OpenAI types
        if (message.sender === "user") {
          return {
            role: "user",
            content: message.text,
          } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam;
        } else if (message.sender === "bot" && message.name) {
          // If the message is from a function/tool, include the 'name' property
          return {
            role: "function",
            name: message.name,
            content: message.text,
          } as OpenAI.Chat.Completions.ChatCompletionFunctionMessageParam;
        } else {
          return {
            role: "assistant",
            content: message.text,
          } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
        }
      }),
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
            return JSON.stringify({ error: "Failed to fetch receipts." });
          }
        },
        get_sales_records: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/sales/user/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (apiResponse.data.sales && apiResponse.data.sales.length > 0) {
              return JSON.stringify(
                apiResponse.data.sales.map((s: any) => ({
                  sale_name: s.sales_name,
                  date: s.sales_date,
                  occupation: s.occupation,
                  items: s.items_sold.join(", "),
                  total_amount: s.quantities_sold.reduce(
                    (sum: number, qty: number, idx: number) =>
                      sum +
                      qty *
                        (s.prices_per_unit && s.prices_per_unit[idx]
                          ? s.prices_per_unit[idx]
                          : 0),
                    0
                  ),
                }))
              );
            }
            return JSON.stringify({ message: "No sales records found." });
          } catch (error) {
            return JSON.stringify({ error: "Failed to fetch sales records." });
          }
        },
        get_expense_records: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/expenses/user/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (
              apiResponse.data.expenses &&
              apiResponse.data.expenses.length > 0
            ) {
              return JSON.stringify(
                apiResponse.data.expenses.map((e: any) => ({
                  title: e.title,
                  date: e.date_created,
                  occupation: e.occupation,
                  category: e.category,
                  amount: e.expense,
                }))
              );
            }
            return JSON.stringify({ message: "No expense records found." });
          } catch (error) {
            return JSON.stringify({
              error: "Failed to fetch expense records.",
            });
          }
        },
        get_poultry_egg_records: async (args: { flock_name?: string }) => {
          try {
            const { flock_name } = args;
            const flocksResponse = await axios.get(
              `${nestApiUrl}/api/flock/user/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const flocks = flocksResponse.data.flocks || [];

            if (flocks.length === 0) {
              return JSON.stringify({ message: "No poultry flocks found." });
            }

            let targetFlocks = flocks;
            if (flock_name) {
              const foundFlock = flocks.find(
                (f: any) =>
                  f.flock_name.toLowerCase() === flock_name.toLowerCase()
              );
              if (foundFlock) {
                targetFlocks = [foundFlock];
              } else {
                return JSON.stringify({
                  message: `Could not find a flock named "${flock_name}". Please check the name.`,
                });
              }
            }

            const allEggRecords = [];
            for (const flock of targetFlocks) {
              const eggResponse = await axios.get(
                `${nestApiUrl}/api/poultry-eggs/${userId}?flockId=${flock.flock_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (
                eggResponse.data.records &&
                eggResponse.data.records.length > 0
              ) {
                const recordsWithFlockName = eggResponse.data.records.map(
                  (rec: any) => ({ ...rec, flock_name: flock.flock_name })
                );
                allEggRecords.push(...recordsWithFlockName);
              }
            }

            if (allEggRecords.length === 0) {
              return JSON.stringify({
                message: flock_name
                  ? `No egg records found for flock "${flock_name}".`
                  : "No egg records found for any of your flocks.",
              });
            }

            return JSON.stringify(
              allEggRecords.map((r) => ({
                flock_name: r.flock_name,
                date_collected: r.date_collected,
                small_eggs: r.small_eggs,
                medium_eggs: r.medium_eggs,
                large_eggs: r.large_eggs,
                extra_large_eggs: r.extra_large_eggs,
                total_eggs: r.total_eggs,
                broken_eggs: r.broken_eggs,
              }))
            );
          } catch (error) {
            return JSON.stringify({
              error: "Failed to fetch poultry egg records.",
            });
          }
        },
        get_warehouses: async () => {
          try {
            const apiResponse = await axios.get(
              `${nestApiUrl}/api/warehouse/user/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (
              apiResponse.data.warehouses &&
              apiResponse.data.warehouses.length > 0
            ) {
              return JSON.stringify(
                apiResponse.data.warehouses.map((w: any) => ({
                  name: w.name,
                  type: w.type,
                  location: [w.city, w.state].filter(Boolean).join(", "),
                  capacity: w.storage_capacity,
                }))
              );
            }
            return JSON.stringify({ message: "No warehouses found." });
          } catch (error) {
            return JSON.stringify({ error: "Failed to fetch warehouses." });
          }
        },
        get_inventory_items: async (args: { warehouse_name?: string }) => {
          try {
            const { warehouse_name } = args;
            let warehouseId = null;

            if (warehouse_name) {
              const warehousesResponse = await axios.get(
                `${nestApiUrl}/api/warehouse/user/${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const warehouse = warehousesResponse.data.warehouses?.find(
                (w: any) =>
                  w.name.toLowerCase() === warehouse_name.toLowerCase()
              );

              if (warehouse) {
                warehouseId = warehouse.warehouse_id;
              } else {
                return JSON.stringify({
                  message: `Warehouse '${warehouse_name}' not found.`,
                });
              }
            }

            const inventoryUrl = warehouseId
              ? `${nestApiUrl}/api/inventory/${userId}?warehouse_id=${warehouseId}`
              : `${nestApiUrl}/api/inventory/${userId}`;

            const inventoryResponse = await axios.get(inventoryUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (
              inventoryResponse.data.items &&
              inventoryResponse.data.items.length > 0
            ) {
              return JSON.stringify(
                inventoryResponse.data.items.map((item: any) => ({
                  item_name: item.item_name,
                  item_group: item.item_group,
                  quantity: item.quantity,
                  units: item.units,
                  price_per_unit: item.price_per_unit,
                  minimum_limit: item.minimum_limit,
                }))
              );
            }

            const message = warehouse_name
              ? `No inventory items found in warehouse '${warehouse_name}'.`
              : "No inventory items found.";

            return JSON.stringify({ message });
          } catch (error) {
            return JSON.stringify({
              error: "Failed to fetch inventory items.",
            });
          }
        },
        get_labour_records: async () => {
          try {
            const response = await axios.get(
              `${nestApiUrl}/api/labour/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.labours && response.data.labours.length > 0) {
              return JSON.stringify(
                response.data.labours.map((l: any) => ({
                  full_name: l.full_name,
                  role: l.role,
                  contact: l.contact_number,
                  city: l.city,
                  state: l.state,
                  base_salary: l.base_salary,
                }))
              );
            }
            return JSON.stringify({ message: "No employees found." });
          } catch (error) {
            return JSON.stringify({ error: "Failed to fetch employees." });
          }
        },
        get_labour_payments: async (args: { employee_name?: string }) => {
          try {
            const { employee_name } = args;

            const labourResponse = await axios.get(
              `${nestApiUrl}/api/labour/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const allLabours = labourResponse.data.labours || [];

            if (allLabours.length === 0) {
              return JSON.stringify({ message: "No employees found." });
            }

            let targetLabours = allLabours;
            if (employee_name) {
              const foundLabour = allLabours.find(
                (l: any) =>
                  l.full_name.toLowerCase() === employee_name.toLowerCase()
              );
              if (foundLabour) {
                targetLabours = [foundLabour];
              } else {
                return JSON.stringify({
                  message: `Employee '${employee_name}' not found.`,
                });
              }
            }

            const allPayments = [];
            for (const labour of targetLabours) {
              const paymentResponse = await axios.get(
                `${nestApiUrl}/api/labour_payment/${labour.labour_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const payments =
                paymentResponse.data.payments ||
                paymentResponse.data.data?.payments ||
                [];
              const paymentsWithEmployeeName = payments.map((p: any) => ({
                ...p,
                full_name: labour.full_name,
              }));
              allPayments.push(...paymentsWithEmployeeName);
            }

            if (allPayments.length === 0) {
              return JSON.stringify({ message: "No payment records found." });
            }

            return JSON.stringify(
              allPayments.map((p) => ({
                employee_name: p.full_name,
                payment_date: p.payment_date,
                total_amount: p.total_amount,
                payment_status: p.payment_status,
              }))
            );
          } catch (error) {
            return JSON.stringify({
              error: "Failed to fetch labour payments.",
            });
          }
        },
      };

      conversationHistory.push(responseMessage);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function
          .name as keyof typeof availableFunctions;
        const functionToCall = availableFunctions[functionName];
        const functionArgs = toolCall.function.arguments
          ? JSON.parse(toolCall.function.arguments)
          : {};
        const functionResponse = await functionToCall(functionArgs);

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
