import { NextResponse } from 'next/server';

export async function PATCH(request) {
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

		const filesRes = await fetch('http://localhost:5000/api/files/updateFilePath', {
			method: 'PATCH',
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
		console.error('Files metadata API error:', error);
		return NextResponse.json(
			{ success: false, message: 'Service unavailable' },
			{ status: 500 }
		);
	}
}