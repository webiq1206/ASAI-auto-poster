import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

interface VehicleListingInput {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  mileage?: number | null;
  price?: string | null;
  condition?: string | null;
  bodyType?: string | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  drivetrain?: string | null;
  engine?: string | null;
  features?: string[] | null;
  descriptionRaw?: string | null;
  previousDescriptions?: string[];
  dealerPhone?: string | null;
  dealerCity?: string | null;
  dealerState?: string | null;
}

export async function generateListing(vehicle: VehicleListingInput): Promise<{
  title: string;
  description: string;
}> {
  const ai = getClient();

  const recentContext = vehicle.previousDescriptions?.length
    ? `\n\nPrevious listings for this vehicle (DO NOT repeat these):\n${vehicle.previousDescriptions.join("\n---\n")}`
    : "";

  const response = await ai.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are an expert automotive marketplace listing writer. Write compelling Facebook Marketplace vehicle listings that drive engagement and leads.

Rules:
- Title: [Year] [Make] [Model] [Trim if applicable] - [Key selling point]
- Description: 2-4 short paragraphs, conversational tone
- Highlight key features and condition
- Include mileage and price context
- End with call to action mentioning the dealer's phone if provided
- Keep it under 300 words
- Do NOT use excessive capitalization or spammy language
- Make each listing unique even for the same vehicle
- Respond in JSON format: {"title": "...", "description": "..."}`,
    messages: [
      {
        role: "user",
        content: `Generate a Facebook Marketplace listing for this vehicle:

Year: ${vehicle.year}
Make: ${vehicle.make}
Model: ${vehicle.model}
${vehicle.trim ? `Trim: ${vehicle.trim}` : ""}
${vehicle.mileage ? `Mileage: ${vehicle.mileage.toLocaleString()} miles` : ""}
${vehicle.price ? `Price: $${vehicle.price}` : ""}
${vehicle.condition ? `Condition: ${vehicle.condition}` : ""}
${vehicle.bodyType ? `Body Type: ${vehicle.bodyType}` : ""}
${vehicle.exteriorColor ? `Exterior: ${vehicle.exteriorColor}` : ""}
${vehicle.interiorColor ? `Interior: ${vehicle.interiorColor}` : ""}
${vehicle.transmission ? `Transmission: ${vehicle.transmission}` : ""}
${vehicle.fuelType ? `Fuel: ${vehicle.fuelType}` : ""}
${vehicle.drivetrain ? `Drivetrain: ${vehicle.drivetrain}` : ""}
${vehicle.engine ? `Engine: ${vehicle.engine}` : ""}
${vehicle.features?.length ? `Features: ${vehicle.features.join(", ")}` : ""}
${vehicle.descriptionRaw ? `Dealer Notes: ${vehicle.descriptionRaw}` : ""}
${vehicle.dealerCity ? `Location: ${vehicle.dealerCity}, ${vehicle.dealerState}` : ""}
${vehicle.dealerPhone ? `Dealer Phone: ${vehicle.dealerPhone}` : ""}
${recentContext}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`,
    description: text,
  };
}

export async function generateChatbotResponse(params: {
  vehicleInfo: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  dealerPhone?: string | null;
}): Promise<string> {
  const ai = getClient();

  const response = await ai.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    system: `You are an AI assistant for a car dealership on Facebook Marketplace. Your job is to answer questions about vehicles, qualify leads, and guide them toward scheduling an appointment or calling.

Rules:
- Keep responses to 1-3 sentences
- Answer the customer's question first, then guide the conversation
- Never discuss financing terms, rates, or monthly payments
- If the customer seems frustrated, offer to connect them with a real person
- Always be helpful, professional, and conversational
${params.dealerPhone ? `- Dealer phone: ${params.dealerPhone}` : ""}

Vehicle info:
${params.vehicleInfo}`,
    messages: params.conversationHistory,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
