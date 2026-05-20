import os
import asyncio
from contextlib import asynccontextmanager
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import lancedb
from sentence_transformers import SentenceTransformer
from mistralai import Mistral
from fastapi.middleware.cors import CORSMiddleware

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
DB_URI = "./lancedb_school_data"


with console.status("[bold green]Loading Embedding Model (BAAI/bge-small-en-v1.5)...", spinner="dots"):
    model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    console.log("[bold green]✓ Embedding Model Loaded Successfully.[/bold green]")
mistral_client = Mistral(api_key=MISTRAL_API_KEY)

db_table = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_table
    try:
        if os.path.exists(DB_URI):
            db = await lancedb.connect_async(DB_URI)
            db_table = await db.open_table("abdi_adama_docs")
            print("Successfully connected to LanceDB.")
        else:
            print(f"ERROR: DB Path {DB_URI} not found!")
    except Exception as e:
        print(f"Startup Error: {e}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@app.get("/")
async def root():
    return {"message": "Abdi Adama API is online"}

@app.post("/chat")
async def handle_query(request: ChatRequest):
    if db_table is None:
        raise HTTPException(status_code=500, detail="Database not initialized.")

    try:
        user_query = request.messages[-1].content
        
        #Generate Embedding
        query_vector = await asyncio.to_thread(
            lambda: model.encode(user_query, normalize_embeddings=True).tolist()
        )

        #Search
        search_result = await db_table.search(query_vector)
        results = await search_result.limit(5).to_list()

        #Filter
        relevant_results = [r for r in results if r.get("_distance", 1.0) < 0.45]
        final_results = relevant_results if relevant_results else results[:1]
        context_string = "\n\n---\n\n".join([r.get("text", "") for r in final_results])

        #LLM
        system_prompt = f"""
            # ROLE
            You are the "Abdi Adama School Virtual Chatbot." Your mission is to provide students, parents, and staff with accurate, helpful, and professional information based strictly on the provided school records.

            # CONTEXT INFORMATION
            The following is the only source of truth for this conversation:
            -------------------
            {context_string}
            -------------------

            # OPERATIONAL RULES
            1. **Source Grounding**: Answer questions ONLY using the information provided in the CONTEXT above. 
            2. **Strict Fallback**: If the answer is not explicitly mentioned in the CONTEXT, respond with: "I'm sorry, I don't have specific information regarding that in my current records. Please contact the school administration office directly for more details."
        """

        response = await mistral_client.chat.complete_async(
            model='mistral-small-latest',
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
        )

        return {"content": response.choices[0].message.content}

    except Exception as e:
        print(f"Runtime Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))