import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      filename?: string;
      contentType?: string;
      categorySlug?: string;
      projectSlug?: string;
    };

    if (!body.filename || !body.categorySlug || !body.projectSlug) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Upload URL not wired yet. Connect S3/R2 signer in this route." },
      { status: 501 }
    );
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
