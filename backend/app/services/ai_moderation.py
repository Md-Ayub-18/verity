import re
from typing import Dict, Any, List
from datetime import datetime, timezone

# Categorized safety keywords & patterns
HATE_SPEECH_KEYWORDS = {
    "hate", "idiot", "stupid", "worthless", "trash", "loser", "shut up",
    "disgusting", "terrible person", "subhuman", "scum", "pathetic", "moron",
    "hate you", "go back to", "inferior race", "slur"
}

HARMFUL_KEYWORDS = {
    "kill", "die", "self-harm", "self harm", "suicide", "hurt yourself",
    "kill yourself", "overdose", "poison", "bomb", "shoot", "stab", "attack"
}

MISLEADING_PATTERNS = [
    r"miracle\s+cure", r"100%\s+guaranteed\s+cure", r"drink\s+bleach",
    r"vaccines\s+cause", r"earth\s+is\s+flat", r"send\s+otp",
    r"double\s+your\s+money", r"deepfake\s+leak", r"guaranteed\s+profit",
    r"doctors\s+don't\s+want\s+you\s+to\s+know", r"fake\s+news\s+alert"
]

TOXIC_KEYWORDS = HATE_SPEECH_KEYWORDS | HARMFUL_KEYWORDS | {"ugly"}

SPAM_PATTERNS = [
    r"buy\s+now", r"free\s+crypto", r"click\s+here\s+to\s+win",
    r"follow\s+back\s+instantly", r"make\s+\$\d+\s+a\s+day", r"whatsapp\s+\+\d+"
]

AI_MARKERS = [
    "as an ai", "in conclusion,", "delve into", "it is important to remember",
    "testament to", "furthermore,", "tapestry of", "moreover,"
]

CHILD_RESTRICTED_WORDS = {
    "alcohol", "beer", "wine", "smoke", "vape", "drugs", "violence",
    "weapon", "fight", "blood", "kill", "dating", "casino", "gambling"
}

def _match_word_or_phrase(phrase: str, lower_text: str) -> bool:
    pattern = r"\b" + re.escape(phrase) + r"\b"
    return re.search(pattern, lower_text) is not None

def analyze_content(text: str, is_child_author: bool = False) -> Dict[str, Any]:
    """
    Modular content moderation pipeline:
    Checks hate speech, harmful/violent content, misleading claims, spam, AI generation signals, and child-safety rules.
    """
    if not text:
        return {
            "is_flagged": False,
            "moderation_status": "approved",
            "is_ai_generated": False,
            "ai_label_explanation": None,
            "flag_reason": None,
            "toxicity_score": 0.0,
            "spam_score": 0.0
        }

    lower_text = text.lower()
    flagged = False
    flag_reasons: List[str] = []

    # 1. Hate Speech / Harassment detection
    hate_hits = [w for w in HATE_SPEECH_KEYWORDS if _match_word_or_phrase(w, lower_text)]
    if hate_hits:
        flagged = True
        flag_reasons.append(f"Hate Speech / Abusive Language ({', '.join(sorted(hate_hits)[:3])})")

    # 2. Harmful / Violent / Self-harm detection
    harm_hits = [w for w in HARMFUL_KEYWORDS if _match_word_or_phrase(w, lower_text)]
    if harm_hits:
        flagged = True
        flag_reasons.append(f"Harmful Content ({', '.join(sorted(harm_hits)[:3])})")

    # 3. Misleading / Misinformation detection
    misleading_hits = [p for p in MISLEADING_PATTERNS if re.search(p, lower_text)]
    if misleading_hits:
        flagged = True
        flag_reasons.append("Misleading or Deceptive Claim")

    toxic_hits = set(hate_hits) | set(harm_hits)
    toxicity_score = min(len(toxic_hits) * 0.45, 1.0)

    # 4. Spam detection
    spam_hits = [p for p in SPAM_PATTERNS if re.search(p, lower_text)]
    spam_score = min(len(spam_hits) * 0.5, 1.0)
    if spam_score >= 0.5:
        flagged = True
        flag_reasons.append("Commercial Spam / Scam")

    # 5. AI-generated text heuristic
    ai_hits = [marker for marker in AI_MARKERS if marker in lower_text]
    is_ai_detected = len(ai_hits) >= 1 or (len(lower_text) > 400 and "furthermore" in lower_text and "moreover" in lower_text)
    ai_explanation = None
    if is_ai_detected:
        ai_explanation = f"Detected structured phrasing patterns characteristic of synthetic AI generation ({', '.join(ai_hits)})"

    # 6. Child account strict safety check
    if is_child_author:
        child_violations = [w for w in CHILD_RESTRICTED_WORDS if _match_word_or_phrase(w, lower_text)]
        if child_violations:
            flagged = True
            flag_reasons.append(f"Age-Restricted Elements ({', '.join(child_violations)})")

    moderation_status = "pending_review" if flagged else "approved"

    return {
        "is_flagged": flagged,
        "moderation_status": moderation_status,
        "is_ai_generated": is_ai_detected,
        "ai_label_explanation": ai_explanation,
        "flag_reason": "; ".join(flag_reasons) if flag_reasons else None,
        "toxicity_score": toxicity_score,
        "spam_score": spam_score
    }
