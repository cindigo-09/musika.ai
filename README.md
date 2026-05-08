# musika.ai

SAT CLASS: Castro ; MUSIKA AI

README: MUSIKA AI ✧
Musika AI is an intelligent, web-based music player designed to solve "curation fatigue" by bridging the gap between a user's soul and the melodies of a thousand years. Built as a digital grimoire, it uses AI to match music to your current mood through natural language processing.

## 🛠️ Local Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd musika.ai
   ```

2. **Copy .env.example to .env**
   - Backend: Copy `backend/.env.example` to `backend/.env`
   - Frontend: Copy `frontend/.env.example` to `frontend/.env` (if it exists)

3. **Fill in the missing API keys and credentials**
   - Add your Supabase URL and keys
   - Add your Jamendo Client ID
   - Add your OpenRouter API Key
   - Update the VITE environment variables in the frontend .env

4. **Install dependencies**

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

5. **Run the project**
   - Start the backend server and frontend development server according to instructions in `HOW_TO_RUN_THIS_PROJECT.txt`
