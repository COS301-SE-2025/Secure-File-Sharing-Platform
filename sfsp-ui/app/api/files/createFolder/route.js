import { NextResponse } from 'next/server';

export async function POST(request) {
	try {
		const body = await request.json();
		const token = request.cookies.get('auth_token')?.value;
		
		if (!token) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}

		const filesRes = await fetch('http://localhost:5000/api/files/createFolder', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify(body),
		});

		if (!filesRes.ok) {
			const errorData = await filesRes.json();
			console.log('❌ Backend error:', errorData);
			return NextResponse.json(errorData, { status: filesRes.status });
		}

		const result = await filesRes.json();
		return NextResponse.json(result);

	} catch (error) {
		console.error('CreateFolder proxy error metadata API error:', error);
		return NextResponse.json(
			{ success: false, message: 'Service unavailable' },
			{ status: 500 }
		);
	}
}