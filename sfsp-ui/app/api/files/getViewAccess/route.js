import { NextResponse } from "next/server";

export async function POST(request) {
  try {
	const body = await request.json();
	const token = request.cookies.get("auth_token")?.value;

	if (!token) {
	  return NextResponse.json(
		{ success: false, message: "Authentication required" },
		{ status: 401 }
	  );
	}

	const backendRes = await fetch("http://localhost:5000/api/files/getViewAccess", {
	  method: 'POST',
	  headers: {
		"Content-Type": "application/json",
		'Authorization': `Bearer ${token}` 
	  },
	  body: JSON.stringify(body),
	});

	if (!backendRes.ok) {
	  const errorData = await backendRes.json();
	  return NextResponse.json(errorData, { status: backendRes.status });
	}

	const result = await backendRes.json();
	return NextResponse.json(result);
  } catch (error) {
	console.error("Access logs API error:", error);
	return NextResponse.json(
	  { success: false, message: "Service unavailable" },
	  { status: 500 }
	);
  }
}
