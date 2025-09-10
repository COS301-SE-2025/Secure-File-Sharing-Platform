import {NextResponse} from 'next/server';

export async function POST(request) {
	try{
		const token = request.cookies.get('auth_token')?.value;
		
		if(!token){
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}

		const body = await request.json();

		const backendRes = await fetch('http://localhost:5000/api/notifications/get', {
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