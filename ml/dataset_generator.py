"""
RecallAI - Synthetic Student Learning Trajectory Dataset Generator
==================================================================
Generates realistic student study logs based on cognitive science principles:
- Spacing effect and forgetting curve (retention decays over time elapsed)
- Question difficulty penalty
- Prior topic accuracy and mastery accumulation
- Confidence rating calibration
"""

import json
import math
import random

def generate_synthetic_study_data(num_samples=2500, seed=42):
    random.seed(seed)
    records = []

    topics = [
        {"name": "Processes and Threads", "base_difficulty": 0.4},
        {"name": "CPU Scheduling", "base_difficulty": 0.55},
        {"name": "Deadlocks", "base_difficulty": 0.7},
        {"name": "Memory Management", "base_difficulty": 0.65},
        {"name": "Virtual Memory", "base_difficulty": 0.75},
        {"name": "File Systems", "base_difficulty": 0.5},
    ]

    for i in range(num_samples):
        topic = random.choice(topics)
        
        # Feature 1: Topic / Question difficulty (0.1 = very easy, 0.9 = very hard)
        difficulty = min(0.95, max(0.1, topic["base_difficulty"] + random.gauss(0, 0.12)))

        # Feature 2: Historical attempts count on this topic (1 to 15)
        attempts_count = max(1, int(random.expovariate(1 / 4.0)) + 1)
        attempts_count = min(15, attempts_count)

        # Feature 3: Recent accuracy on topic (0.0 to 1.0)
        recent_accuracy = max(0.0, min(1.0, random.betaovariate(2.5, 1.8)))

        # Feature 4: Hours elapsed since last review (0.1 to 168 hours / 7 days)
        hours_since_last_attempt = max(0.1, random.expovariate(1 / 36.0))
        hours_since_last_attempt = min(240.0, hours_since_last_attempt)

        # Feature 5: Prior average self-rated confidence (1 to 5)
        # Correlated with accuracy plus subjective bias
        confidence_rating = min(5, max(1, int(round(recent_accuracy * 4 + 1 + random.gauss(0, 0.6)))))

        # Feature 6: Previous question correctness (0 or 1)
        previous_correct = 1 if random.random() < recent_accuracy else 0

        # Ground truth probability based on Ebbinghaus forgetting & cognitive model:
        # Retention R = e^(-t / S), where S = stability increases with attempts & past accuracy
        stability = 12.0 * math.log(attempts_count + 1) * (0.5 + recent_accuracy)
        time_decay = math.exp(-hours_since_last_attempt / max(1.0, stability))

        # Log-odds calculation:
        logit = (
            2.2 * recent_accuracy
            + 0.8 * previous_correct
            + 0.45 * (confidence_rating / 5.0)
            + 0.6 * time_decay
            + 0.25 * math.log(attempts_count)
            - 2.5 * difficulty
            - 0.3
        )
        prob = 1.0 / (1.0 + math.exp(-logit))

        # Outcome binary label
        will_answer_correctly = 1 if random.random() < prob else 0

        records.append({
            "sample_id": i + 1,
            "topic": topic["name"],
            "difficulty": round(difficulty, 3),
            "attempts_count": attempts_count,
            "recent_accuracy": round(recent_accuracy, 3),
            "hours_since_last_attempt": round(hours_since_last_attempt, 1),
            "confidence_rating": confidence_rating,
            "previous_correct": previous_correct,
            "will_answer_correctly": will_answer_correctly
        })

    return records

if __name__ == "__main__":
    data = generate_synthetic_study_data(3000)
    with open("synthetic_student_dataset.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {len(data)} synthetic student learning records.")
