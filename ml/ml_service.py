"""
RecallAI - ML Prediction Microservice (FastAPI)
==============================================
Exposes real-time student performance prediction API.
Runs on port 8000 when active.
"""

import json
import math
import os
from typing import Dict, Any, List

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

script_dir = os.path.dirname(os.path.abspath(__file__))
weights_path = os.path.join(script_dir, "model_weights.json")

with open(weights_path, "r") as f:
    MODEL_DATA = json.load(f)

def predict_single(features: Dict[str, float]) -> Dict[str, Any]:
    names = MODEL_DATA["feature_names"]
    means = MODEL_DATA["scaler"]["mean"]
    scales = MODEL_DATA["scaler"]["scale"]
    coefs = MODEL_DATA["logistic_regression"]["coefficients"]
    intercept = MODEL_DATA["logistic_regression"]["intercept"]

    # Normalize features
    z_sum = intercept
    contributions = {}
    for i, name in enumerate(names):
        val = float(features.get(name, means[i]))
        z_val = (val - means[i]) / (scales[i] if scales[i] != 0 else 1.0)
        contrib = z_val * coefs[i]
        z_sum += contrib
        contributions[name] = round(contrib, 3)

    probability = 1.0 / (1.0 + math.exp(-z_sum))
    
    # Recommendation logic
    if probability < 0.45:
        recommendation = "High risk of forgetting: review fundamental concepts and flashcards today."
        urgency = "high"
    elif probability < 0.70:
        recommendation = "Moderate retention: complete a 3-question active recall practice session."
        urgency = "medium"
    else:
        recommendation = "High stability: schedule a spaced review session in 4 days."
        urgency = "low"

    return {
        "success_probability": round(probability, 4),
        "predicted_outcome": 1 if probability >= 0.5 else 0,
        "urgency": urgency,
        "recommendation": recommendation,
        "feature_contributions": contributions,
        "model_type": MODEL_DATA["model_type"],
        "is_prototype": True,
        "prototype_notice": MODEL_DATA["prototype_notice"]
    }

if HAS_FASTAPI:
    app = FastAPI(title="RecallAI ML Service", version="1.0.0")

    class PredictRequest(BaseModel):
        recent_accuracy: float = Field(0.6, ge=0.0, le=1.0)
        previous_correct: int = Field(1, ge=0, le=1)
        confidence_rating: float = Field(3.0, ge=1.0, le=5.0)
        hours_since_last_attempt: float = Field(24.0, ge=0.0)
        attempts_count: int = Field(3, ge=1)
        difficulty: float = Field(0.5, ge=0.0, le=1.0)

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "RecallAI ML Prediction Engine"}

    @app.get("/metrics")
    def metrics():
        return {
            "logistic_regression": MODEL_DATA["logistic_regression"]["metrics"],
            "random_forest": MODEL_DATA["random_forest"]["metrics"],
            "prototype_notice": MODEL_DATA["prototype_notice"]
        }

    @app.post("/predict")
    def predict(req: PredictRequest):
        return predict_single(req.dict())

    if __name__ == "__main__":
        uvicorn.run(app, host="127.0.0.1", port=8000)
else:
    if __name__ == "__main__":
        print("FastAPI not installed. Testing analytical predictor directly:")
        res = predict_single({
            "recent_accuracy": 0.4,
            "previous_correct": 0,
            "confidence_rating": 2,
            "hours_since_last_attempt": 72,
            "attempts_count": 2,
            "difficulty": 0.7
        })
        print(json.dumps(res, indent=2))
