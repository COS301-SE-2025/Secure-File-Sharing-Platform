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

		console.log('🔍 Profile route - Token exists:', !!token);
		const backendRes = await fetch('http://localhost:5000/api/users/profile', {
			method: 'GET',
			headers: {'Authorization': `Bearer ${token}` }
		});
		if(!backendRes.ok){
			return NextResponse.json(
				console.log("This is the error from backendRes in profiles route"),
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