import {NextResponse} from 'next/server';

export async function GET(request) {
	try{
		const token = request.cookies.get('auth_token')?.value;
		console.log('🔍 Profile route - Retrieved token from cookies:', !!token);
		
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

		const backendRes = await fetch('http://localhost:5000/api/users/profile', {
			method: 'GET',
			headers: {'Authorization': `Bearer ${token}` }
		});
		if(!backendRes.ok){
			return NextResponse.json(
				result,
				{ status: backendRes.status }
			);
		}
		console.log("The response from backendRes in profiles route is okay");

		const result = await backendRes.json();
		console.log('✅ Profile retrieved:', result);
		return NextResponse.json(result);
				
	}catch(error){
		console.error('Profiles API error:', error);
		return NextResponse.json(
			{ success: false, message: 'Service unavailable' },
			{ status: 500 }
		);
	}
}