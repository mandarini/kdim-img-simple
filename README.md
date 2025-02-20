# Anthropic Image Summarizer

A modern web application that uses Claude 3 to analyze and generate detailed descriptions of images. Built with React, Supabase, and Anthropic's Claude API.

![Anthropic Image Summarizer](https://images.unsplash.com/photo-1633409361618-c73427e4e206?auto=format&fit=crop&q=80&w=2080)

## Features

- 🖼️ Upload and analyze up to 5 images simultaneously
- 🤖 AI-powered image analysis using Claude 3
- 📝 Generates titles, descriptions, and keywords for each image
- 🔒 Secure authentication with Supabase
- 📊 Rate limiting (10 images per day per user)
- 📱 Responsive design with Tailwind CSS
- 🎨 Modern UI with drag-and-drop support

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase Edge Functions, PostgreSQL
- **AI**: Anthropic Claude 3
- **Authentication**: Supabase Auth
- **Hosting**: Supabase

## Prerequisites

- Node.js 18+
- Supabase account
- Anthropic API key

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For the Edge Function, set up in Supabase dashboard:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your_project_ref
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy analyze-image
   ```

## Database Schema

The application uses a single table for managing user upload limits:

```sql
CREATE TABLE user_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_count integer DEFAULT 0,
  last_upload_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

## API Response Format

The Edge Function returns an array of image analysis results:

```typescript
interface ImageMetadata {
  title: string;      // Concise but descriptive title
  description: string; // 2-3 sentence description
  keywords: string[]; // Up to 10 relevant keywords
}
```

## Rate Limiting

- Users are limited to 10 image analyses per day
- The count resets at midnight UTC
- Limits are enforced both client-side and server-side

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Authentication required for all API endpoints
- CORS headers properly configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own purposes.