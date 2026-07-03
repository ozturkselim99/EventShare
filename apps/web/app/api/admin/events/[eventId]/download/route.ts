import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;

    const cookieStore = await cookies();
    const token = cookieStore.get("es_access_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "No token" }, { status: 401 });
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"}/admin/events/${eventId}/download`;

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend error: ${response.status}` },
        { status: response.status },
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=media.zip",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
