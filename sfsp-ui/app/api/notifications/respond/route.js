import {NextResponse} from 'next/server';
import { enforceCsrf } from '../../_utils/csrf';

export async function POST(request) {
	const deny = enforceCsrf(request);
	if(deny){
		return deny;
	}
	try{
		const token = request.cookies.get('auth_token')?.value;
		
		if(!token){
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

		const body = await request.json();

		const backendRes = await fetch('http://localhost:5000/api/notifications/respond', {
			method: 'POST',
			headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if(!backendRes.ok){
			return NextResponse.json(
				result,
				{ status: backendRes.status }
			);
		}

		const result = await backendRes.json();
		return NextResponse.json(result);
				
	}catch(error){
		console.error('Notifications API error:', error);
		return NextResponse.json(
			{ success: false, message: 'Service unavailable' },
			{ status: 500 }
		);
	}
}