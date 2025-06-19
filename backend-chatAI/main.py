from fastapi import FastAPI, HTTPException, Form, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4
import requests
import bcrypt
import time
import os
from jose import JWTError, jwt
from dotenv import load_dotenv
import openai

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
TOKEN_EXPIRE_SECONDS = int(os.getenv("TOKEN_EXPIRE_SECONDS", 86400))
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
ASSEMBLYAI_TRANSCRIBE_URL = "https://api.assemblyai.com/v2/transcript"

openai.api_key = OPENAI_API_KEY

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

class MessageRequest(BaseModel):
    conversation_id: str
    content: str

class UpdateTitleRequest(BaseModel):
    title: str

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

@app.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    url = f"{SUPABASE_URL}/rest/v1/users?userName=eq.{username}&select=*"
    response = requests.get(url, headers=HEADERS)
    users = response.json()
    if not isinstance(users, list) or not users:
        raise HTTPException(status_code=401, detail="User not found")

    user = users[0]
    if not user.get("is_password_hashed"):
        if user["password"] != password:
            raise HTTPException(status_code=401, detail="Incorrect password")
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        update_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user['id']}"
        update_payload = {"password": hashed_pw, "is_password_hashed": True}
        res = requests.patch(update_url, headers=HEADERS, json=update_payload)
        if res.status_code >= 400:
            raise HTTPException(status_code=500, detail="Failed to update password")
    else:
        if not bcrypt.checkpw(password.encode(), user["password"].encode()):
            raise HTTPException(status_code=401, detail="Incorrect password")

    payload = {"sub": user["id"], "exp": int(time.time() + TOKEN_EXPIRE_SECONDS)}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"message": "Login successful", "username": username, "token": token}

@app.get("/me")
def get_current_user(payload=Depends(verify_token)):
    user_id = payload["sub"]
    url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=id,userName,created_at"
    response = requests.get(url, headers=HEADERS)
    users = response.json()
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": users[0]}

@app.get("/conversations/{user_id}")
def get_conversations(user_id: str):
    url = f"{SUPABASE_URL}/rest/v1/conversations?user_id=eq.{user_id}&is_visible=eq.true&select="
    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")
    return response.json()

@app.get("/chat/{conv_id}")
def get_messages(conv_id: str):
    url = f"{SUPABASE_URL}/rest/v1/messages?conversation_id=eq.{conv_id}"
    response = requests.get(url, headers=HEADERS)
    return response.json()

@app.post("/messages")
def send_message(message: MessageRequest, payload=Depends(verify_token)):
    conv_url = f"{SUPABASE_URL}/rest/v1/conversations?id=eq.{message.conversation_id}&select=id,title"
    conv_res = requests.get(conv_url, headers=HEADERS)
    if conv_res.status_code != 200 or not conv_res.json():
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation = conv_res.json()[0]
    update_url = f"{SUPABASE_URL}/rest/v1/conversations?id=eq.{message.conversation_id}"

    if not conversation.get("title") or conversation["title"].strip().lower() == "untitled":
        generated_title = generate_title_from_ai(message.content)
        if generated_title:
            requests.patch(update_url, headers=HEADERS, json={"title": generated_title})

    requests.patch(update_url, headers=HEADERS, json={"is_visible": True})

    user_msg = {
        "conversation_id": message.conversation_id,
        "role": "user",
        "content": message.content
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/messages", headers=HEADERS, json=user_msg)

    ai_content = generate_ai_reply(message.content)
    ai_reply = {
        "conversation_id": message.conversation_id,
        "role": "ai",
        "content": ai_content
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/messages", headers=HEADERS, json=ai_reply)

    return {
        "message": "Message sent",
        "user_message": user_msg,
        "ai_response": ai_reply
    }

def generate_title_from_ai(text: str) -> str:
    prompt = f"Suggest a short and relevant conversation title (3-5 words max) in English only, no quotes or punctuation:\n{text}"
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that generates short conversation titles in English."},
                {"role": "user", "content": prompt}
            ]
        )
        title = response.choices[0].message["content"].strip()
        clean_title = title.strip('"').strip("'").strip()
        return clean_title if clean_title else "Untitled"
    except:
        return "Untitled"


@app.post("/conversations")
def create_conversation(payload=Depends(verify_token)):
    conversation_id = str(uuid4())
    conversation = {
        "id": conversation_id,
        "user_id": payload["sub"],
        "is_visible": False
    }
    res = requests.post(f"{SUPABASE_URL}/rest/v1/conversations", headers=HEADERS, json=conversation)
    if res.status_code >= 400:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    return {"message": "Conversation created", "conversation_id": conversation_id}

@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, payload=Depends(verify_token)):
    user_id = payload["sub"]
    requests.delete(f"{SUPABASE_URL}/rest/v1/messages?conversation_id=eq.{conversation_id}", headers=HEADERS)
    res = requests.delete(f"{SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}", headers=HEADERS)
    if res.status_code >= 400:
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    return {"message": "Conversation and all messages deleted"}

@app.patch("/conversations/{conversation_id}")
def update_conversation_title(conversation_id: str, data: UpdateTitleRequest, payload=Depends(verify_token)):
    user_id = payload["sub"]
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/conversations?id=eq.{conversation_id}&user_id=eq.{user_id}",
        headers=HEADERS,
        json={"title": data.title}
    )
    if res.status_code >= 400:
        raise HTTPException(status_code=500, detail="Failed to update conversation title")
    return {"message": "Conversation title updated"}

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), language: str = Form("en")):
    try:
        audio_bytes = await audio.read()
        upload_res = requests.post(
            ASSEMBLYAI_UPLOAD_URL,
            headers={"authorization": ASSEMBLYAI_API_KEY},
            data=audio_bytes
        )
        audio_url = upload_res.json()["upload_url"]

        body = {"audio_url": audio_url, "language_code": language}
        if language == "ar":
            body["speech_model"] = "nano"

        transcribe_res = requests.post(
            ASSEMBLYAI_TRANSCRIBE_URL,
            headers={"authorization": ASSEMBLYAI_API_KEY, "content-type": "application/json"},
            json=body
        )
        transcript_id = transcribe_res.json()["id"]

        while True:
            poll = requests.get(
                f"{ASSEMBLYAI_TRANSCRIBE_URL}/{transcript_id}",
                headers={"authorization": ASSEMBLYAI_API_KEY}
            )
            result = poll.json()
            if result["status"] == "completed":
                return {"text": result["text"]}
            elif result["status"] == "error":
                raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
            time.sleep(1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

def generate_ai_reply(user_input: str) -> str:
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_input}
            ]
        )
        return response.choices[0].message["content"].strip()
    except:
        return "Sorry, I couldn't generate a response."
