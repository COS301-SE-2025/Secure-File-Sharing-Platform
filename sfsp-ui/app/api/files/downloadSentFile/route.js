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

		const verifyResponse = await fetch('http://localhost:5000/api/users/verify-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!verifyResponse.ok) {
            const verifyError = await verifyResponse.text();
            console.warn('Token verification failed:', verifyError);
            return NextResponse.json(
                { valid: false, message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

		const filesRes = await fetch('http://localhost:5000/api/files/downloadSentFile', {
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
		console.error('Download sent file Proxy API error:', error);
		return NextResponse.json(
			{ success: false, message: 'Service unavailable' },
			{ status: 500 }
		);
	}
}