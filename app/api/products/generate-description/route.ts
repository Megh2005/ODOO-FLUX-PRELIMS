import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "@/lib/authHelper";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    try {
      await requireAuth();
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (e.message === "NO_COMPANY") {
        return NextResponse.json({ success: false, error: "Company setup required", noCompany: true }, { status: 403 });
      }
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }

    // 2. Parse request payload
    const body = await request.json();
    const { productName, category, itemType } = body;

    if (!productName) {
      return NextResponse.json({ success: false, error: "Product name is required to generate description" }, { status: 400 });
    }

    // 3. Obtain Gemini API Key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your environment/dotenv settings."
      }, { status: 500 });
    }

    // 4. Initialize GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(apiKey);

    // 5. Construct domain-first, category-analyzing search prompt
    const prompt = `Perform a domain, category, and product analysis for this item:
- Target Product Category: ${category || "General"}
- Exact Product Name: ${productName}
- Item Type: ${itemType || "GOODS"}

Instructions:
1. FIRST, analyze the Product Category ("${category || "General"}") to establish the exact industry domain (e.g. Food & Beverages, Bakery, Dairy, Groceries, Electronics, Apparel, Hardware, Pharmaceuticals, etc.).
2. SECOND, analyze the Product Name ("${productName}") specifically within that Category domain. Perform a web search if needed to reference real-world product specifications, ingredients, freshness, or key features.
3. THIRD, generate a concise, highly accurate, professional description (maximum 12 to 18 words) that highlights key properties, quality, or usage appropriate for this specific category.

Constraints:
- Never assume the product is a construction material unless the category is explicitly hardware or raw construction materials.
- Match the description strictly to the category "${category || "General"}" and item "${productName}".
- Do not wrap in quotation marks or add intro/outro text. Output ONLY the raw description text.`;

    let description = "";
    const modelCandidates = ["gemini-3.1-flash-lite"];

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          tools: [{ googleSearch: {} } as any],
        });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        description = response.text().trim();
        if (description) break;
      } catch (e: any) {
        // Fallback without search tool if tool schema is restricted
        try {
          const modelNoTool = genAI.getGenerativeModel({ model: modelName });
          const result = await modelNoTool.generateContent(prompt);
          const response = await result.response;
          description = response.text().trim();
          if (description) break;
        } catch (err) {}
      }
    }

    if (!description) {
      return NextResponse.json({ success: false, error: "Failed to generate description with available models" }, { status: 500 });
    }

    // Clean up surrounding quotes if present
    description = description.replace(/^["']|["']$/g, "").trim();

    return NextResponse.json({ success: true, description });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
