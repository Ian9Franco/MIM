import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ translatedText: "" });
    }

    // Google Translate unofficial API supporting auto-detect of any source language
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Translate responded with ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data[0]) {
      return NextResponse.json({ translatedText: text });
    }

    // Combine all translated parts
    const translatedText = data[0]
      .map((item: any) => item[0])
      .filter((x: any) => x)
      .join("");

    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error("[API Translate Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
