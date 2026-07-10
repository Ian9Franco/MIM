import { NextResponse } from "next/server";

async function translateChunk(text: string) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Translate responded with ${res.status}`);
  }

  const data = await res.json();
  if (!data || !data[0]) return text;

  return data[0]
    .map((item: any) => item[0])
    .filter((x: any) => x)
    .join("");
}

function splitLinePrefix(line: string) {
  const match = line.match(/^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/);
  if (match) return { prefix: match[1], body: match[2] };

  const indent = line.match(/^(\s+)(.*)$/);
  if (indent) return { prefix: indent[1], body: indent[2] };

  return { prefix: "", body: line };
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const source = typeof text === "string" ? text.replace(/\r\n/g, "\n") : "";
    if (!source.trim()) {
      return NextResponse.json({ translatedText: "" });
    }

    const translatedLines = await Promise.all(
      source.split("\n").map(async (line) => {
        if (!line.trim()) return line;
        const { prefix, body } = splitLinePrefix(line);
        if (!body.trim()) return line;
        return `${prefix}${await translateChunk(body.trim())}`;
      })
    );

    const translatedText = translatedLines.join("\n");

    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error("[API Translate Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
