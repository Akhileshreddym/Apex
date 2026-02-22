import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { selfieBase64 } = await req.json();

        if (!selfieBase64) {
            return NextResponse.json({ error: "No selfie provided" }, { status: 400 });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        // Call OpenRouter with Gemini 3 Pro Image Preview
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://apex-f1.vercel.app",
                "X-Title": "APEX F1 Strategy Simulator",
            },
            body: JSON.stringify({
                model: "google/gemini-3-pro-image-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: selfieBase64,
                                },
                            },
                            {
                                type: "text",
                                text: "Take this person's face and create a professional F1 racing driver portrait. Place them in a dark racing suit with subtle red accents. The background should be dark and moody, like an official F1 team photo. Keep their facial features exactly the same. Make it look like a real motorsport photograph, not cartoonish. Output ONLY the image.",
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter error:", errorText);
            // Return the original selfie as fallback
            return NextResponse.json({ portraitUrl: selfieBase64, fallback: true });
        }

        const data = await response.json();

        // Check if the response contains an image
        const choice = data.choices?.[0]?.message;
        if (choice?.content) {
            // If Gemini returned image content, try to extract it
            const content = choice.content;

            // Check for inline image in content parts
            if (Array.isArray(content)) {
                for (const part of content) {
                    if (part.type === "image_url" || part.image_url) {
                        return NextResponse.json({ portraitUrl: part.image_url?.url || part.url });
                    }
                }
            }

            // If text-only response came back (model can't generate images), use selfie as fallback
            return NextResponse.json({ portraitUrl: selfieBase64, fallback: true });
        }

        // Fallback: return the selfie itself
        return NextResponse.json({ portraitUrl: selfieBase64, fallback: true });
    } catch (error) {
        console.error("Portrait generation error:", error);
        return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }
}
