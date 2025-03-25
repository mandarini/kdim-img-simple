# Photo Summarizer

A web application that allows authenticated users to upload up to 10 images, analyze them using an external API, and view AI-generated summaries including title, description, and keywords for each image. Users can export the results as a CSV and copy metadata to their clipboard.

---

## ✨ Features

- 🔐 Google authentication using Supabase (auth-only)
- 📁 Drag & drop image uploader (up to 10 JPEG/PNG images, 20MB each)
- 📊 AI-powered summarization of each image via an external API
- 🖼️ Image preview thumbnails before and after summarization
- ✅ Results include: Title, Description, and Keywords
- 📋 Copy metadata to clipboard with one click
- 📄 Export all results to CSV

---

## 🚀 Tech Stack

- **React + TypeScript**
- **Tailwind CSS**
- **Supabase** (auth only)
- **External API** for image analysis
- **Lucide React** icons

---

## 📦 Folder Structure

```bash
src/
├── App.tsx                 # Main app logic and UI
├── components/
│   ├── ImageUploader.tsx   # Drag & drop image uploader
│   ├── AuthButton.tsx      # Sign in/out with Supabase
│   └── StatusBanner.tsx    # Status messages
├── lib/
│   ├── supabase.ts         # Supabase client (auth only)
│   └── analyse-image.ts    # Handles image processing and API call
├── types/
│   └── index.ts            # Shared types
```

---

## 🔧 Configuration

### 1. Environment Variables

Create a `.env` file with the following:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-image-api.com
```

> ✅ Only `auth` is used from Supabase. No image data is stored.

---

## 🧠 How It Works

1. User logs in with Google using Supabase Auth
2. User uploads up to 10 images
3. Images are previewed client-side
4. When "Summarize" is clicked:
   - Each image is sent to the API with:
     - `image` (form data)
     - `userId` (from Supabase session)
     - `Authorization: Bearer <access_token>` header
5. The API returns metadata (`title`, `description`, `keywords`)
6. Metadata is displayed under each image
7. Users can copy metadata or export as CSV

---

## 🔐 Authentication

- Supabase is used **only** for Google login.
- Access token is passed to the image analysis API as a Bearer token in the request header.

---

## 🧪 Example API Request

```http
POST /analyze
Authorization: Bearer eyJhbGci...
Content-Type: multipart/form-data

FormData:
- image: <uploaded-file>
- userId: abc-123
```

---

## ✅ To Run Locally

```bash
git clone https://github.com/mandarini/kdim-img-simple
cd image-summarizer
npm install
npm run dev
```

Then open: [http://localhost:5173](http://localhost:5173)


---

## 🙌 Credits

- Auth: Supabase
- UI: Tailwind + Lucide Icons
- Summarization API: External Python service


