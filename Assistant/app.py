import os
import time
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer
from mistralai import Mistral
from fastapi.middleware.cors import CORSMiddleware
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

# Qdrant Imports
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

load_dotenv()

# -------------------
# ENV + CONFIG
# -------------------
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "YOUR_API_KEY")
COLLECTION_NAME = "abdi_adama_docs"

# -------------------
# MODELS
# -------------------
embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
mistral_client = Mistral(api_key=MISTRAL_API_KEY)

# Global Qdrant Client Instance
qdrant_db = None


# -------------------
# LIFESPAN STARTUP
# -------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global qdrant_db
    try:
        # Runs Qdrant locally using disk-based storage
        qdrant_db = QdrantClient(path="./qdrant_school_data")
        
        # Create the collection if it doesn't exist
        if not qdrant_db.collection_exists(collection_name=COLLECTION_NAME):
            qdrant_db.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            print(f"Created new Qdrant Collection: {COLLECTION_NAME}")
        else:
            print(f"Opened existing Qdrant Collection: {COLLECTION_NAME}")

    except Exception as e:
        qdrant_db = None
        print(f"Qdrant Startup Error: {e}")
    yield


# -------------------
# APP
# -------------------
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------
# REQUEST MODELS
# -------------------
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

class DocumentRequest(BaseModel):
    text: str


# -------------------
# ROOT
# -------------------
@app.get("/")
async def root():
    return {"message": "Abdi Adama API with Qdrant Vector DB is online"}


# -------------------
# CHAT (RAG)
# -------------------
@app.post("/chat")
async def handle_query(request: ChatRequest):
    if qdrant_db is None:
        raise HTTPException(status_code=500, detail="Vector Database not initialized.")

    try:
        user_query = request.messages[-1].content

        # Get query embedding
        query_vector = await asyncio.to_thread(
            lambda: embedding_model.encode(user_query, normalize_embeddings=True).tolist()
        )

        # Search the Vector DB
        search_response = qdrant_db.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=5
        )
        search_results = search_response.points

        # Convert cosine similarity score to distance (1 - score) to match your safety threshold
        relevant = []
        for point in search_results:
            distance = 1.0 - point.score
            if distance < 0.45:
                relevant.append(point.payload.get("text", ""))

        # Fallback to top result if nothing is below the threshold distance
        if not relevant and search_results:
            relevant = [search_results[0].payload.get("text", "")]

        context = "\n\n---\n\n".join(relevant)

        system_prompt = (
            "You are a helpful school assistant.\n\n"
            f"Context:\n{context}"
        )

        response = await mistral_client.chat.complete_async(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
        )

        return {"content": response.choices[0].message.content}

    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# GET DOCS
# -------------------
@app.get("/getdocs")
async def get_documents(limit: int = 100):
    if qdrant_db is None:
        raise HTTPException(status_code=500, detail="Vector Database not initialized.")

    try:
        # Scroll API retrieves points from Qdrant
        records, _ = qdrant_db.scroll(
            collection_name=COLLECTION_NAME,
            limit=limit,
            with_vectors=False
        )

        documents = [{"chunk_id": r.id, "text": r.payload.get("text")} for r in records]
        return {"count": len(documents), "documents": documents}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# ADD DOCS
# -------------------
@app.post("/postdocs")
async def add_document(request: DocumentRequest):
    if qdrant_db is None:
        raise HTTPException(status_code=500, detail="Vector Database not initialized.")

    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""],
        )

        chunks = splitter.split_text(request.text)
        base_id = int(time.time() * 1000)

        points = []

        for i, chunk in enumerate(chunks):
            vector = await asyncio.to_thread(
                lambda: embedding_model.encode(chunk, normalize_embeddings=True).tolist()
            )

            # Map chunk data to Qdrant Point format
            points.append(
                PointStruct(
                    id=base_id + i,
                    vector=vector,
                    payload={"text": chunk}
                )
            )

        # Bulk upsert into Qdrant Collection
        qdrant_db.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

        return {
            "message": "Document added successfully to Qdrant",
            "chunks_created": len(chunks),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# UPDATE DOC
# -------------------
@app.put("/docs/{chunk_id}")
async def update_document(chunk_id: int, request: DocumentRequest):
    if qdrant_db is None:
        raise HTTPException(status_code=500, detail="Vector Database not initialized.")

    try:
        new_vector = await asyncio.to_thread(
            lambda: embedding_model.encode(request.text, normalize_embeddings=True).tolist()
        )

        # Upserting a point with an existing ID updates it
        qdrant_db.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(
                    id=chunk_id,
                    vector=new_vector,
                    payload={"text": request.text}
                )
            ]
        )

        return {"message": f"Chunk {chunk_id} updated in Qdrant"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# DELETE DOC
# -------------------
@app.delete("/docs/{chunk_id}")
async def delete_document(chunk_id: int):
    if qdrant_db is None:
        raise HTTPException(status_code=500, detail="Vector Database not initialized.")

    try:
        # Delete specific point by ID
        qdrant_db.delete(
            collection_name=COLLECTION_NAME,
            points_selector=[chunk_id]
        )
        return {"message": f"Chunk {chunk_id} deleted from Qdrant"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# CLEAR ALL DOCS
# -------------------
@app.delete("/docs")
async def clear_all_documents():
    global qdrant_db

    if qdrant_db is None:
        raise HTTPException(status_code=500, detail="Vector Database not initialized.")

    try:
        # Recreate the collection to clear all records instantly
        qdrant_db.delete_collection(collection_name=COLLECTION_NAME)
        qdrant_db.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )

        return {
            "message": "All documents deleted from Qdrant successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))