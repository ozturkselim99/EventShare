import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request, context) {
  try {
    console.log("=== DOWNLOAD ROUTE START ===");
    
    const params = await context.params;
    const eventId = params.eventId;
    console.log("EventId:", eventId);
    
    const cookieStore = await cookies();
    const token = cookieStore.get("es_access_token")?.value;
    console.log("Has token:", !!token);

    if (!token) {
      console.log("No token - returning 401");
      return NextResponse.json({ message: "No token" }, { status: 401 });
    }

    const apiUrl = `http://localhost:3001/api/v1/admin/events/${eventId}/download`;
    console.log("Fetching from:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Backend status:", response.status);

    if (!response.ok) {
      console.log("Backend error - status:", response.status);
      return NextResponse.json(
        { message: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    console.log("Downloaded bytes:", buffer.byteLength);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=media.zip",
      },
    });
  } catch (err) {
    console.error("=== ROUTE ERROR ===");
    console.error("Error:", err);
    console.error("Stack:", err.stack);
    return NextResponse.json(
      { message: "Error: " + err.message },
      { status: 500 }
    );
  }
}
