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

		const filesRes = await fetch('http://localhost:5000/api/files/downloadViewFile', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify(body),
		});

		if (!filesRes.ok) {
			const errorData = await filesRes.text();
			return NextResponse.json(
				{ success: false, message: errorData },
				{ status: filesRes.status }
			);
		}

		const arrayBuffer = await filesRes.arrayBuffer();

		const response = new NextResponse(arrayBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
		});

		const nonce = filesRes.headers.get('X-Nonce');
		const fileName = filesRes.headers.get('X-File-Name');
		
		if (nonce) {
			response.headers.set('X-Nonce', nonce);
		}
		if (fileName) {
			response.headers.set('X-File-Name', fileName);
		}

		return response;

	} catch (error) {
		console.error('Download View file Proxy API error:', error);
		return NextResponse.json(
			{ success: false, message: 'Service unavailable' },
			{ status: 500 }
		);
	}
}