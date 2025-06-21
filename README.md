# ChatAI

ChatAI is a smart chat platform built with **FastAPI** on the backend and **React** on the frontend.  
It supports JWT login, sending/receiving messages, voice-to-text, and AI-powered replies.

---

##  Project Structure

```
ChatAI/
├── frontend-chatAI/     # React frontend
├── backend-chatAI/      # FastAPI backend
```
## Requirements

- Node.js 18+
- Python 3.10+
- pip
- Git

---

##  Installation
```bash
git clone https://github.com/Abdulrhman999109/ChatAI.git
cd ChatAI
```
---

### Setup the frontend
```bash
cd frontend-chatAI
npm install
```
---

### Setup the backend
```bash
cd backend-chatAI
pip install -r requirements.txt
```
---

##  Environment Variables

### backend-chatAI/.env
```bash
OPENAI_API_KEY=your_openai_key
JWT_SECRET_KEY=your_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
```

### frontend-chatAI/.env
```bash
VITE_API_BASE_URL=http://localhost:8000
```
---

## Run the App

### Backend
```bash
cd backend-chatAI
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend-chatAI
npm run dev
```
---


**Note:** This project is customizable — feel free to adjust keys, colors, or branding as needed.
