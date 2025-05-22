# Supabase Authentication Integration

This project uses Supabase for authentication in a Next.js 13+ application. The authentication utilities are organized in the `lib/` folder for clean separation of concerns.

## Overview

Our authentication system provides:

- **User Authentication**: Email/password sign-in functionality
- **Session Management**: Automatic session handling via Supabase
- **Secure Data Handling**: Built-in security features from Supabase

The main components include the Supabase client initialization and helper functions like `loginUser` for streamlined authentication workflows.

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Configure Environment Variables

Create a `.env.local` file in your project root (`app/`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

**Where to find these values:**
1. Go to your Supabase dashboard
2. Navigate to Project Settings → Data API
3. Copy the Project URL and anon/public key

## Project Structure

```
lib/
├── supabaseClient.js
└── auth/
    └── login.js   
    └── register.js
    └── hash.js
```

## Implementation

### Supabase Client (`lib/supabaseClient.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication Helper (`lib/auth/login.js`)

```javascript
import { supabase } from '../supabaseClient';

export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return { error: error.message };
  return { data };
}
```

**Function Behavior:**
- **Success**: Returns `{ data }` containing user and session information
- **Failure**: Returns `{ error }` with descriptive error message

## Usage Example

### Login Page Implementation (`app/login/page.js`)

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const { data, error } = await loginUser(formData);
  
  if (error) {
    setMessage(error);
  } else {
    setMessage('Login successful!');
    router.push('/');
  }
};
```