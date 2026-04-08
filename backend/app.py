from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

from analyzer import (
    analyze_metadata,
    calculate_suspicion_score,
    detect_noise_variance,
    perform_ela,
)

app = FastAPI()

# ✅ CORS (React ke liye zaroori)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "FoodForensics API is running"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # 🔍 Analysis
        ela_image, ela_score = perform_ela(image)
        metadata = analyze_metadata(image)
        noise = detect_noise_variance(image)

        score, risk = calculate_suspicion_score(
            metadata, ela_score, noise
        )

        # ⚠️ Image return nahi kar rahe (React me baad me handle karenge)
        return {
            "success": True,
            "score": score,
            "risk": risk,
            "ela_score": ela_score,
            "noise": noise,
            "metadata": metadata
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }