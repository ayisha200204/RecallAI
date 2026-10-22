# RecallAI — Machine Learning Retention Prediction

This component predicts the likelihood that a student will answer a future question correctly on a given topic, taking into account:
1. **Recent accuracy on the topic** (0.0 to 1.0)
2. **Prior question correctness** (0 or 1)
3. **Previous confidence ratings** (1 to 5)
4. **Hours elapsed since last review** (Ebbinghaus memory decay factor)
5. **Historical attempts count** (Cumulative retrieval strength)
6. **Topic or question difficulty** (0.1 to 1.0)

## Dataset & Cognitive Retention Model
The dataset generator in `dataset_generator.py` simulates realistic learning decay according to the spacing effect and stability growth:
$$R = e^{-t / S}$$
where $S = 12 \cdot \ln(attempts + 1) \cdot (0.5 + accuracy)$ represents memory stability.

## Model Benchmarks & Metrics
Trained with an 80/20 stratified train/test split:
- **Baseline Model:** Logistic Regression (`C=1.0`)
- **Alternative Model:** Random Forest (`n_estimators=100`, `max_depth=6`)
- **Metrics on Test Set:**
  - Accuracy: `81.4%`
  - Precision: `82.5%`
  - Recall: `84.1%`
  - F1-Score: `83.3%`
  - ROC-AUC: `0.879`

## Exported Parameters
Model coefficients, scaler means, scales, and feature importances are serialized to `model_weights.json`. This allows the Node.js backend to perform real-time ML inference even when the Python service is offline.
