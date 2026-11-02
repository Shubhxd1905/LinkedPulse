"""
openrouter_service.py
=====================
Secure Server-Side OpenRouter AI Integration for LinkedIn Profile Optimizer.

- Uses OpenRouter's official chat completions API.
- Reads API credentials exclusively from server-side environment variables.
- Strictly uses FREE models (:free suffix or openrouter/free) and free-model fallback lists.
- Implements anti-fabrication prompt engineering (prevents hallucinated jobs, degrees, or metrics).
- Validates AI response structure against expected schema.
- Does not expose secrets, sensitive keys, or full stack traces.
"""

import os
import json
import re
import time
from typing import Dict, Any, List, Optional, Tuple
import requests

# Default fallback list of verified free OpenRouter models
# openrouter/free is the official dynamic router that routes to the best available free model.
DEFAULT_FREE_MODELS = [
    "nvidia/nemotron-3.5-lightning:free",
    "openrouter/free",
    "liquid/lfm-2.5-2.6b:free",
]

# Verified free vision-capable OpenRouter models
# openrouter/free automatically routes multimodal inputs to available free vision models
DEFAULT_FREE_VISION_MODELS = [
    "openrouter/free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "dots-studio/dots-3-note-preview:free",
    "google/gemma-4-31b-it:free",
]

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_TIMEOUT_SECONDS = 30


def load_env_vars():
    """
    Lightweight, zero-dependency .env loader that checks the local directory
    and the parent workspace directory. Does not overwrite already-set env vars.
    """
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
    ]
    for filepath in candidates:
        if os.path.isfile(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip('"').strip("'")
                            if key and key not in os.environ:
                                os.environ[key] = val
            except Exception:
                pass


# Initialize env loading on module import
load_env_vars()


def get_api_key() -> str:
    """Retrieve OPENROUTER_API_KEY from environment."""
    return os.environ.get("OPENROUTER_API_KEY", "").strip()


def is_openrouter_configured() -> bool:
    """Return True if an API key is present."""
    return bool(get_api_key())


def is_free_model(model: str) -> bool:
    """
    Strict safety check: Enforces that the model is legitimately free.
    Prevents any silent switching to paid models.
    """
    if not model or not isinstance(model, str):
        return False
    m = model.strip().lower()
    return m.endswith(":free") or m == "openrouter/free"


def get_configured_model() -> str:
    """Get the primary configured model, ensuring it conforms to a free model."""
    env_model = os.environ.get("OPENROUTER_MODEL", "").strip()
    if env_model:
        if is_free_model(env_model):
            return env_model
        # Log warning if non-free model was requested in a free-only setting
        print(f"[OpenRouter Security] Notice: Configured model '{env_model}' is not a free model. Falling back to default free model.")
    return DEFAULT_FREE_MODELS[0]


def get_fallback_model_list() -> List[str]:
    """
    Returns ordered list of free models to try in sequence.
    Primary configured model is first, followed by others in the fallback list.
    """
    primary = get_configured_model()
    env_fallbacks = os.environ.get("OPENROUTER_FALLBACK_MODELS", "").strip()
    
    candidates = [primary]
    if env_fallbacks:
        for m in env_fallbacks.split(","):
            m = m.strip()
            if m and is_free_model(m) and m not in candidates:
                candidates.append(m)
                
    for m in DEFAULT_FREE_MODELS:
        if is_free_model(m) and m not in candidates:
            candidates.append(m)
            
    return candidates


def is_vision_model(model: str) -> bool:
    """
    Checks if a model ID is known to support image / multimodal inputs
    and strictly conforms to free-tier requirements (:free or openrouter/free).
    """
    if not model or not is_free_model(model):
        return False
    m = model.strip().lower()
    if m == "openrouter/free":
        return True
    vision_keywords = ["omni", "vision", "note-preview", "gemma-4", "vl", "pixtral", "llama-3.2-11b-vision"]
    if any(k in m for k in vision_keywords):
        return True
    return any(m == vm.lower() for vm in DEFAULT_FREE_VISION_MODELS)


def get_configured_vision_model() -> str:
    """Get the primary configured vision model, strictly enforcing free vision models."""
    env_model = os.environ.get("OPENROUTER_VISION_MODEL", "").strip()
    if env_model:
        if is_vision_model(env_model):
            return env_model
        print(f"[OpenRouter Security] Notice: Configured vision model '{env_model}' is not a verified free vision model. Falling back to default.")
    return DEFAULT_FREE_VISION_MODELS[0]


def get_fallback_vision_model_list() -> List[str]:
    """Returns ordered list of free vision models to try in sequence."""
    primary = get_configured_vision_model()
    env_fallbacks = os.environ.get("OPENROUTER_FALLBACK_VISION_MODELS", "").strip()
    candidates = [primary]
    if env_fallbacks:
        for m in env_fallbacks.split(","):
            m = m.strip()
            if m and is_vision_model(m) and m not in candidates:
                candidates.append(m)
    for m in DEFAULT_FREE_VISION_MODELS:
        if is_vision_model(m) and m not in candidates:
            candidates.append(m)
    return candidates


def build_system_prompt() -> str:
    return (
        "You are an elite LinkedIn Profile Optimization Strategist and Talent Acquisition Executive.\n"
        "Your mission is to rewrite and elevate the candidate's profile to rank higher in recruiter searches and captivate hiring managers.\n\n"
        "STRICT ANTI-FABRICATION INTEGRITY RULES:\n"
        "1. DO NOT fabricate, invent, or hallucinate employers, job titles, university degrees, certifications, unmentioned technical skills, or achievements.\n"
        "2. DO NOT invent false numerical metrics (e.g. do not invent '$10M revenue' or 'cut latency by 90%' unless the user stated it). If original experience lacks metrics, use template placeholders like '[X%]' or strengthen the action verbs without inventing fake facts.\n"
        "3. Output MUST contain tailored, real rewritten content for this candidate. Never output the schema instructions or placeholder words as the values.\n"
        "4. FRESHER & UNAVAILABLE EXPERIENCE INTEGRITY RULES:\n"
        "   - If the candidate has no professional experience or is marked as a fresher/student: DO NOT invent employers, job titles, companies, or commercial tenure. Instead, in `optimizedAbout` and `optimizedExperience`, focus honestly on their technical foundation, academic/personal projects, and demonstrated skills. In `experienceSuggestions`, provide actionable advice for entry-level candidates (e.g. creating portfolio projects, showcasing capstones, contributing to open-source).\n"
        "   - If experience data is marked unavailable: DO NOT fabricate any work history; in `optimizedExperience`, note that work experience was not provided and suggest adding roles to unlock full recruiter assessment.\n"
        "5. CAREER GOALS & DIVERGENT PROFILE INTEGRITY RULES:\n"
        "   - The candidate's headline, About section, and skills are populated with real profile data. Do NOT treat these fields as missing simply because they reflect their current background rather than their new target role.\n"
        "   - Career Goal 1: 'Continue in My Current Career': Prioritize existing expertise, achievements, seniority, and progression within the current field.\n"
        "   - Career Goal 2: 'Transition to a New Career': Prioritize transferable skills, credible transition messaging, relevant projects, and learning gaps without penalizing past background or faking unearned titles.\n"
        "   - Career Goal 3: 'Explore a Related Role': Prioritize overlapping skills, adjacent responsibilities, relevant existing experience, and specialization opportunities. Connect their existing accomplishments to the requirements of the related role without presenting them as a complete beginner.\n"
        "   - Compare existing skills with target-role requirements honestly: suggest target skills to learn or add without falsely claiming the candidate already possesses skills not in their profile.\n\n"
        "OUTPUT FORMAT REQUIREMENTS:\n"
        "Respond ONLY with a single valid JSON object with no markdown fences, matching this schema:\n"
        "{\n"
        '  "summary": "<2-3 sentence executive assessment of profile strengths and opportunities>",\n'
        '  "optimizedHeadline": "<Tailored headline: Target Title | Core Tech Stack | Value Proposition separated by |>",\n'
        '  "optimizedAbout": "<Tailored strategic About narrative with hook, competencies, and CTA>",\n'
        '  "optimizedExperience": "<Tailored STAR-formatted bullet points highlighting impact and action verbs>",\n'
        '  "optimizedSkills": "<Tailored comma-separated list of prioritized skills aligned with the target role>",\n'
        '  "headlineSuggestions": ["<specific actionable tip 1>", "<specific actionable tip 2>"],\n'
        '  "aboutSuggestions": ["<specific actionable tip 1>", "<specific actionable tip 2>"],\n'
        '  "experienceSuggestions": ["<specific actionable tip 1>", "<specific actionable tip 2>"],\n'
        '  "skillsSuggestions": ["<specific actionable tip 1>", "<specific actionable tip 2>"],\n'
        '  "recommendedKeywords": ["<relevant keyword 1>", "<relevant keyword 2>", "<relevant keyword 3>", "<relevant keyword 4>", "<relevant keyword 5>"]\n'
        "}"
    )


def build_user_prompt(profile_data: Dict[str, Any], tone: str) -> str:
    target_role = profile_data.get("targetRole", "").strip() or "Professional"
    headline = profile_data.get("headline", "").strip() or "Not provided"
    about = profile_data.get("about", "").strip() or "Not provided"
    career_intent = profile_data.get("careerIntent", "current-field")
    
    exp_list = profile_data.get("experience", [])
    if isinstance(exp_list, list):
        formatted_exp = "\n".join([
            f"- {e.get('title', 'Role')} at {e.get('company', 'Company')} ({e.get('duration', 'Duration')}): {e.get('description', '')}"
            for e in exp_list if isinstance(e, dict)
        ])
    else:
        formatted_exp = str(exp_list)
        
    skills = profile_data.get("skills", [])
    if isinstance(skills, list):
        skills_str = ", ".join([str(s) for s in skills if str(s).strip()])
    else:
        skills_str = str(skills)

    exp_status = profile_data.get("experienceStatus", "present" if exp_list else "fresher")
    education = profile_data.get("education", "").strip()
    projects = profile_data.get("projects", "").strip()
    certifications = profile_data.get("certifications", [])
    if isinstance(certifications, list):
        cert_str = ", ".join([str(c) for c in certifications if str(c).strip()])
    else:
        cert_str = str(certifications)

    if exp_status == "fresher" or (not formatted_exp and exp_status != "unavailable"):
        exp_display = "None / Student / Early Career Fresher (Candidate has no commercial work experience)"
    elif exp_status == "unavailable" or not formatted_exp:
        exp_display = "Unavailable / Not provided"
    else:
        exp_display = formatted_exp

    tone_descriptions = {
        "recruiter": "Recruiter-Optimized: Direct, high Boolean keyword density, clear titles, crisp value proposition.",
        "thought-leader": "Thought-Leader: Visionary, inspiring, authority-building, compelling narrative and hook.",
        "tech": "Technical Specialist: Engineering depth, architectural clarity, precise technical terminology.",
        "founder": "Founder / Builder: High ownership, outcome-focused, commercial awareness, momentum."
    }
    tone_guidance = tone_descriptions.get(tone, tone_descriptions["recruiter"])

    if career_intent == "related-role":
        career_pathway_desc = f"Explore a Related Role (Targeting an adjacent specialization: {target_role})"
    elif career_intent == "career-switcher":
        career_pathway_desc = f"Transition to a New Career (Pivoting into {target_role})"
    else:
        career_pathway_desc = f"Continue in My Current Career (Advancing in existing field as {target_role})"

    prompt_lines = [
        f"TARGET ROLE: {target_role}",
        f"CAREER GOAL: {career_pathway_desc}",
        f"OPTIMIZATION TONE: {tone} ({tone_guidance})",
        f"EXPERIENCE STATUS: {exp_status}",
        "",
        "CURRENT PROFILE DATA:",
        f"• Headline: {headline}",
        f"• About / Summary:\n{about}",
        f"• Experience:\n{exp_display}",
        f"• Listed Skills: {skills_str or 'None provided'}",
    ]
    if education:
        prompt_lines.append(f"• Education / Degree: {education}")
    if projects:
        prompt_lines.append(f"• Projects / Capstones: {projects}")
    if cert_str:
        prompt_lines.append(f"• Certifications: {cert_str}")
    prompt_lines.append("\nPlease analyze and generate the optimized versions following all instructions and the exact JSON schema.")

    return "\n".join(prompt_lines)


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts JSON safely from text, stripping out any markdown formatting,
    leading/trailing thoughts (e.g. from reasoning models), or extraneous text.
    """
    if not text or not isinstance(text, str):
        raise ValueError("AI response returned empty text.")
    cleaned = text.strip()
    
    # Strip markdown code blocks if present
    if "```json" in cleaned:
        parts = cleaned.split("```json", 1)[1].split("```", 1)
        cleaned = parts[0].strip()
    elif "```" in cleaned:
        parts = cleaned.split("```", 1)[1].split("```", 1)
        cleaned = parts[0].strip()
        
    # Attempt direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Find the outermost { ... }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        snippet = cleaned[first_brace:last_brace + 1]
        try:
            return json.loads(snippet)
        except Exception:
            pass

    raise ValueError("Failed to parse valid JSON from AI model response.")


def validate_ai_output(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates and normalizes AI output schema to ensure frontend stability.
    """
    if not isinstance(data, dict):
        raise ValueError("AI response root must be a JSON dictionary.")

    required_keys = ["optimizedHeadline", "optimizedAbout", "optimizedExperience", "optimizedSkills"]
    for k in required_keys:
        if k not in data or not str(data[k]).strip():
            # If missing, provide reasonable fallback or raise
            data[k] = str(data.get(k, "")).strip()

    # Ensure suggestions and keywords are lists
    for list_key in ["headlineSuggestions", "aboutSuggestions", "experienceSuggestions", "skillsSuggestions", "recommendedKeywords"]:
        val = data.get(list_key)
        if not isinstance(val, list):
            if isinstance(val, str) and val:
                data[list_key] = [s.strip() for s in val.split(",") if s.strip()]
            else:
                data[list_key] = []
        else:
            data[list_key] = [str(item).strip() for item in val if str(item).strip()]

    if "summary" not in data or not data["summary"]:
        data["summary"] = "AI profile optimization completed successfully."

    return data


def query_openrouter_api(
    model: str,
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[int], Optional[str]]:
    """
    Sends request to OpenRouter API.
    Returns: (success: bool, parsed_json: Optional[dict], status_code: Optional[int], error_msg: Optional[str])
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "LinkedIn Profile Optimizer",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 2048,
        "reasoning": {"max_tokens": 150},
    }

    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        status = response.status_code

        if status == 200:
            resp_json = response.json()
            choices = resp_json.get("choices", [])
            if not choices:
                return False, None, 200, "Empty choices list returned by OpenRouter model."
            
            message_obj = choices[0].get("message", {})
            # Handle standard content, reasoning-augmented output, or fallback text
            raw_content = message_obj.get("content") or message_obj.get("reasoning") or ""
            
            if not raw_content and "reasoning_details" in message_obj:
                for rd in message_obj.get("reasoning_details", []):
                    if isinstance(rd, dict) and rd.get("text"):
                        raw_content = rd.get("text")
                        break

            try:
                parsed = extract_json_from_text(raw_content)
                validated = validate_ai_output(parsed)
                return True, validated, 200, None
            except Exception as parse_err:
                return False, None, 200, f"Malformed JSON from model: {str(parse_err)}"

        elif status in (401, 403):
            return False, None, status, "OpenRouter API key is invalid or unauthorized."
        elif status == 402:
            return False, None, status, "OpenRouter account credit limit reached."
        elif status == 404:
            return False, None, status, f"Model {model} is currently unavailable or decommissioned on OpenRouter (HTTP 404)."
        elif status == 429:
            return False, None, status, f"Rate limit reached for free model {model}."
        elif status in (500, 502, 503, 504):
            return False, None, status, f"OpenRouter provider temporary error ({status}) on model {model}."
        else:
            return False, None, status, f"OpenRouter returned HTTP status {status}."

    except requests.exceptions.Timeout:
        return False, None, 408, f"Request to model {model} timed out after {timeout}s."
    except requests.exceptions.RequestException as req_err:
        return False, None, 500, f"Network error connecting to OpenRouter: {str(req_err)}"
    except Exception as e:
        return False, None, 500, f"Unexpected error during model invocation: {str(e)}"


def generate_profile_optimization_ai(
    profile_data: Dict[str, Any],
    tone: str = "recruiter",
    requested_model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entry point for server-side AI optimization.
    - Verifies server configuration.
    - Tries candidate free models in sequence on retryable errors (429, 503, timeout).
    - Returns structured result or actionable error for frontend fallback.
    """
    api_key = get_api_key()
    if not api_key:
        return {
            "success": False,
            "status": "unconfigured",
            "code": "MISSING_API_KEY",
            "message": "OPENROUTER_API_KEY is not configured on the server. Please set it in your environment or .env file.",
            "useFallback": True,
        }

    # Determine free model sequence
    fallback_models = get_fallback_model_list()
    if requested_model and is_free_model(requested_model):
        if requested_model in fallback_models:
            fallback_models.remove(requested_model)
        models_to_try = [requested_model] + fallback_models
    else:
        models_to_try = fallback_models

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(profile_data, tone)

    last_error_code = 500
    last_error_message = "All free models failed or were unavailable."
    models_attempted = []

    for model in models_to_try:
        models_attempted.append(model)
        success, data, status_code, err_msg = query_openrouter_api(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            api_key=api_key,
        )

        if success and data:
            return {
                "success": True,
                "status": "success",
                "engineUsed": f"OpenRouter AI ({model})",
                "model": model,
                "isAiPowered": True,
                "data": data,
                "modelsAttempted": models_attempted,
            }

        last_error_code = status_code or 500
        last_error_message = err_msg or "Unknown error"

        # If it's a fatal auth error (401/403/402), do not waste time cycling other models
        if status_code in (401, 403, 402):
            return {
                "success": False,
                "status": "error",
                "code": "AUTH_ERROR" if status_code in (401, 403) else "INSUFFICIENT_CREDITS",
                "statusCode": status_code,
                "message": last_error_message,
                "modelsAttempted": models_attempted,
                "useFallback": True,
            }

        # Otherwise continue to next free model in the list
        print(f"[OpenRouter Fallback] Model {model} failed ({status_code}): {err_msg}. Retrying with next free model...")
        time.sleep(0.5)

    # If all free models were exhausted
    return {
        "success": False,
        "status": "error",
        "code": "RATE_LIMITED" if last_error_code == 429 else "MODELS_UNAVAILABLE",
        "statusCode": last_error_code,
        "message": f"All free AI models exhausted: {last_error_message}",
        "modelsAttempted": models_attempted,
        "useFallback": True,
    }


# =============================================================================
# IMAGE-TO-POST GENERATOR AI SERVICE (PHASE 3)
# =============================================================================

def build_image_post_system_prompt() -> str:
    return (
        "You are an elite LinkedIn content creator and ghostwriter specializing in viral tech, product, and leadership posts.\n"
        "Your task is to analyze the provided image and optional author context to craft an authentic, high-impact LinkedIn post.\n\n"
        "CRITICAL RULES & GUARDRAILS:\n"
        "1. STRICT FACTUAL ACCURACY: Base your post strictly on what is visually observable in the image (charts, UI, metrics, code, diagrams, event photos) and any context supplied by the user.\n"
        "2. ANTI-HALLUCINATION: Do NOT invent fake company names, revenue numbers, job titles, certifications, or statistics that cannot be verified from the image or context.\n"
        "3. LINKEDIN ARCHITECTURE:\n"
        "   - Hook: The opening 1-2 lines must immediately grab attention before LinkedIn's '...see more' fold (keep hook under 140 characters).\n"
        "   - Body: Clean formatting with short paragraphs, whitespace, and clear bullet points (→ or •) for scannability on mobile.\n"
        "   - Conclusion: Thought-provoking closing takeaway or conversational question that prompts comments and debate.\n"
        "   - Hashtags: 3 to 5 targeted, relevant hashtags at the bottom.\n"
        "4. ALTERNATIVE HOOKS: Provide 3 distinctly phrased, punchy alternative opening hooks (contrarian, story-driven, and metric/insight-focused).\n"
        "5. VISUAL SUMMARY: Include a crisp, 1-2 sentence description of what was actually detected in the image so the user can verify visual comprehension.\n"
        "6. FORMAT: Respond ONLY with a valid JSON object matching the requested schema. No conversational filler or markdown fences outside the JSON."
    )


def build_image_post_user_prompt(tone: str, length: str, context: str) -> str:
    target_words = "around 100-150 words" if length == "short" else ("around 350-450 words" if length == "long" else "around 200-280 words")
    tone_instructions = {
        "storytelling": "Narrative arc: personal struggle, moment of realization, concrete resolution, and big lesson.",
        "professional": "Polished, executive, data-driven, strategic business perspective.",
        "educational": "Actionable tutorial, step-by-step breakdown, 'here is how it works and what to avoid'.",
        "personal-branding": "Authentic, relatable builder journey, transparent reflections on growth and learning."
    }.get(tone.lower(), "Engaging, authentic, high-value LinkedIn voice.")

    return (
        f"Analyze the attached image and generate a LinkedIn post.\n\n"
        f"Target Tone: {tone.capitalize()} ({tone_instructions})\n"
        f"Desired Length: {length.capitalize()} ({target_words})\n"
        f"Author Context / Angle: {context if context.strip() else 'No extra context provided. Extract all themes directly from the visual content.'}\n\n"
        f"Return ONLY a JSON object with this exact structure:\n"
        f"{{\n"
        f'  "primaryPost": "<Complete, polished LinkedIn post ready to publish including hook, body, closing question, and hashtags>",\n'
        f'  "alternativeHooks": ["<Alternative hook 1>", "<Alternative hook 2>", "<Alternative hook 3>"],\n'
        f'  "hashtags": ["Hashtag1", "Hashtag2", "Hashtag3", "Hashtag4"],\n'
        f'  "visualSummary": "<Crisp 1-2 sentence description of what is visible in the image>",\n'
        f'  "toneApplied": "{tone}"\n'
        f"}}"
    )


def validate_post_ai_output(data: Dict[str, Any], requested_tone: str) -> Dict[str, Any]:
    """Validates and normalizes the AI-generated post JSON schema."""
    if not isinstance(data, dict):
        raise ValueError("AI response root must be a JSON dictionary.")

    primary_post = str(data.get("primaryPost") or data.get("content") or "").strip()
    if not primary_post:
        raise ValueError("AI response missing 'primaryPost'.")

    # Clean hooks
    hooks = data.get("alternativeHooks") or data.get("hooks") or []
    if isinstance(hooks, str):
        hooks = [h.strip() for h in hooks.split("\n") if h.strip()]
    elif isinstance(hooks, list):
        hooks = [str(h).strip() for h in hooks if str(h).strip()]
    else:
        hooks = []

    # Ensure at least 3 hooks
    if len(hooks) < 3:
        first_line = primary_post.split("\n")[0].strip()
        fallbacks = [
            f"Here is why this insight matters: {first_line[:60]}...",
            f"A quick breakdown of what this means in practice: {first_line[:50]}...",
            f"The real story behind this milestone: {first_line[:60]}..."
        ]
        for fb in fallbacks:
            if len(hooks) < 3 and fb not in hooks:
                hooks.append(fb)

    # Clean hashtags
    raw_tags = data.get("hashtags") or []
    if isinstance(raw_tags, str):
        raw_tags = [t.strip().lstrip("#") for t in raw_tags.replace(",", " ").split() if t.strip()]
    elif isinstance(raw_tags, list):
        raw_tags = [str(t).strip().lstrip("#") for t in raw_tags if str(t).strip()]
    else:
        raw_tags = []
    if not raw_tags:
        raw_tags = ["TechLeadership", "LinkedInGrowth", "Innovation", "CareerGrowth"]

    # Visual summary
    visual_summary = str(data.get("visualSummary") or data.get("imageDescription") or "").strip()
    if not visual_summary:
        visual_summary = "Image analyzed for visual patterns, textual cues, and thematic structure."

    return {
        "primaryPost": primary_post,
        "alternativeHooks": hooks[:3],
        "hashtags": raw_tags[:6],
        "visualSummary": visual_summary,
        "toneApplied": str(data.get("toneApplied") or requested_tone).strip()
    }


def generate_post_from_heuristics(
    tone: str = "storytelling",
    length: str = "medium",
    context: str = "",
    error_reason: str = "Vision AI service was temporarily unavailable."
) -> Dict[str, Any]:
    """
    Transparent local fallback engine for generating LinkedIn post drafts
    when free vision AI models are rate-limited, congested, or unconfigured.
    Never pretends that the image was analyzed by AI.
    """
    ctx = context.strip() if context else "Sharing a milestone and the technical lessons we learned along the way."
    tone_lower = tone.lower()

    if tone_lower == "educational":
        hook = "3 actionable lessons from our latest engineering milestone:"
        body = (
            f"{hook}\n\n"
            f"When we started working on this, we faced multiple architectural challenges.\n\n"
            f"Here is what worked best:\n\n"
            f"1. Decouple critical path bottlenecks early\n"
            f"2. Validate real user access patterns before optimizing\n"
            f"3. Instrument granular observability from day one\n\n"
            f"Context: {ctx}\n\n"
            f"What has been your biggest takeaway when tackling similar problems?\n\n"
            f"#Engineering #SoftwareArchitecture #TechTips #WebDev"
        )
        hooks = [
            "3 actionable lessons from our latest engineering milestone:",
            "Most teams overcomplicate this. Here is the simpler way:",
            "The counter-intuitive approach that saved our team weeks of rework:"
        ]
        tags = ["Engineering", "SoftwareArchitecture", "TechTips", "WebDev"]
    elif tone_lower == "professional":
        hook = "Delivering measurable results requires aligning technical execution with strategic vision."
        body = (
            f"{hook}\n\n"
            f"Looking at our recent metrics, the impact of intentional engineering decisions is clear:\n\n"
            f"• Streamlined system latency and infrastructure reliability\n"
            f"• Enhanced developer throughput and delivery velocity\n"
            f"• Delivered a scalable baseline for upcoming quarters\n\n"
            f"Focus area: {ctx}\n\n"
            f"How is your organization approaching continuous improvement in today's landscape?\n\n"
            f"#TechLeadership #EngineeringManagement #CloudArchitecture #Innovation"
        )
        hooks = [
            "Delivering measurable results requires aligning technical execution with strategic vision.",
            "Behind every significant metric is an aligned, focused team.",
            "Strategic investments in reliability consistently yield the highest ROI."
        ]
        tags = ["TechLeadership", "EngineeringManagement", "CloudArchitecture", "Innovation"]
    elif tone_lower == "personal-branding":
        hook = "One year ago, I didn't think this level of progress was possible."
        body = (
            f"{hook}\n\n"
            f"It's easy to look at the finished result and miss the messy iterations behind it.\n\n"
            f"Here is the truth:\n"
            f"→ We had failed attempts\n"
            f"→ We had to rethink our assumptions twice\n"
            f"→ But showing up consistently changed the game\n\n"
            f"Key focus: {ctx}\n\n"
            f"If you're in the middle of building something challenging today, keep going.\n\n"
            f"#PersonalBranding #CareerGrowth #BuilderJourney #Mindset"
        )
        hooks = [
            "One year ago, I didn't think this level of progress was possible.",
            "The hardest part of building isn't starting — it's staying consistent through the messy middle.",
            "A transparent reflection on what it actually took to reach this milestone."
        ]
        tags = ["PersonalBranding", "CareerGrowth", "BuilderJourney", "Mindset"]
    else:  # storytelling
        hook = "We just reached a milestone that seemed out of reach six months ago."
        body = (
            f"{hook}\n\n"
            f"Here is what happened behind the scenes:\n\n"
            f"→ We simplified our core architecture\n"
            f"→ We eliminated redundant processes\n"
            f"→ We stayed focused on real customer outcomes\n\n"
            f"Context: {ctx}\n\n"
            f"The biggest lesson? Growth isn't about doing more things. It's about doing the right things with relentless focus.\n\n"
            f"What's the most valuable lesson you've learned recently?\n\n"
            f"#Growth #TechJourney #Milestone #Leadership"
        )
        hooks = [
            "We just reached a milestone that seemed out of reach six months ago.",
            "The breakthrough didn't come from working longer hours. It came from changing how we thought.",
            "They told us this approach wouldn't scale. Here is what happened next:"
        ]
        tags = ["Growth", "TechJourney", "Milestone", "Leadership"]

    return {
        "primaryPost": body,
        "alternativeHooks": hooks,
        "hashtags": tags,
        "visualSummary": f"Image received and validated. Vision AI analysis was bypassed ({error_reason}). Draft generated via local heuristic templates.",
        "toneApplied": tone
    }


def query_openrouter_vision_api(
    model: str,
    system_prompt: str,
    user_prompt: str,
    image_data_uri: str,
    api_key: str,
    timeout: int = 40,
    requested_tone: str = "storytelling",
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[int], Optional[str]]:
    """Sends multimodal vision request to OpenRouter API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "LinkedIn Post Studio",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_data_uri
                        }
                    }
                ]
            }
        ],
        "temperature": 0.3,
        "max_tokens": 2048,
        "reasoning": {"max_tokens": 150},
    }

    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        status = response.status_code

        if status == 200:
            resp_json = response.json()
            choices = resp_json.get("choices", [])
            if not choices:
                return False, None, 200, "Empty choices list returned by OpenRouter vision model."

            message_obj = choices[0].get("message", {})
            raw_content = message_obj.get("content") or message_obj.get("reasoning") or ""

            if not raw_content and "reasoning_details" in message_obj:
                for rd in message_obj.get("reasoning_details", []):
                    if isinstance(rd, dict) and rd.get("text"):
                        raw_content = rd.get("text")
                        break

            try:
                parsed = extract_json_from_text(raw_content)
                validated = validate_post_ai_output(parsed, requested_tone=requested_tone)
                return True, validated, 200, None
            except Exception as parse_err:
                return False, None, 200, f"Malformed JSON from vision model: {str(parse_err)}"

        elif status in (401, 403):
            return False, None, status, "OpenRouter API key is invalid or unauthorized."
        elif status == 402:
            return False, None, status, "OpenRouter account credit limit reached."
        elif status == 404:
            return False, None, status, f"Vision model {model} is currently unavailable on OpenRouter (HTTP 404)."
        elif status == 429:
            return False, None, status, f"Rate limit reached for free vision model {model}."
        elif status in (500, 502, 503, 504):
            return False, None, status, f"OpenRouter provider temporary error ({status}) on model {model}."
        else:
            return False, None, status, f"OpenRouter returned HTTP status {status}."

    except requests.exceptions.Timeout:
        return False, None, 408, f"Request to vision model {model} timed out after {timeout}s."
    except requests.exceptions.RequestException as req_err:
        return False, None, 500, f"Network error connecting to OpenRouter: {str(req_err)}"
    except Exception as e:
        return False, None, 500, f"Unexpected error during vision model invocation: {str(e)}"


def generate_post_from_image_ai(
    image_data_uri: str,
    tone: str = "storytelling",
    length: str = "medium",
    context: str = "",
    requested_model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main entry point for image-to-post AI generation.
    - Validates image input.
    - Ensures API key is present.
    - Tries candidate free vision models in sequence.
    - Falls back to transparent heuristic generator if free AI models are unavailable.
    """
    if not image_data_uri or not isinstance(image_data_uri, str):
        return {
            "success": False,
            "status": "error",
            "code": "INVALID_IMAGE",
            "message": "Image data URI must be a valid base64-encoded string.",
            "useFallback": False,
        }

    api_key = get_api_key()
    if not api_key:
        fallback_data = generate_post_from_heuristics(
            tone=tone, length=length, context=context,
            error_reason="OPENROUTER_API_KEY is not configured on the server."
        )
        return {
            "success": False,
            "status": "fallback",
            "code": "MISSING_API_KEY",
            "message": "Server API key not configured. Generated draft using local heuristic engine.",
            "engineUsed": "Local Heuristic Engine (No API Key)",
            "isAiPowered": False,
            "useFallback": True,
            "data": fallback_data,
        }

    # Determine free vision models sequence
    fallback_models = get_fallback_vision_model_list()
    if requested_model and is_vision_model(requested_model):
        if requested_model in fallback_models:
            fallback_models.remove(requested_model)
        models_to_try = [requested_model] + fallback_models
    else:
        models_to_try = fallback_models

    system_prompt = build_image_post_system_prompt()
    user_prompt = build_image_post_user_prompt(tone, length, context)

    last_error_code = 500
    last_error_message = "All free vision models were unavailable."
    models_attempted = []

    for model in models_to_try:
        models_attempted.append(model)
        success, data, status_code, err_msg = query_openrouter_vision_api(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            image_data_uri=image_data_uri,
            api_key=api_key,
            requested_tone=tone,
        )

        if success and data:
            return {
                "success": True,
                "status": "success",
                "engineUsed": f"OpenRouter AI ({model})",
                "model": model,
                "isAiPowered": True,
                "data": data,
                "modelsAttempted": models_attempted,
            }

        last_error_code = status_code or 500
        last_error_message = err_msg or "Unknown error"

        # If it's a fatal auth error (401/403/402), do not waste time cycling
        if status_code in (401, 403, 402):
            fallback_data = generate_post_from_heuristics(
                tone=tone, length=length, context=context,
                error_reason=f"OpenRouter auth/credit error ({status_code}): {last_error_message}"
            )
            return {
                "success": False,
                "status": "fallback",
                "code": "AUTH_ERROR" if status_code in (401, 403) else "INSUFFICIENT_CREDITS",
                "statusCode": status_code,
                "message": last_error_message,
                "engineUsed": "Local Heuristic Engine (Auth Fallback)",
                "isAiPowered": False,
                "modelsAttempted": models_attempted,
                "useFallback": True,
                "data": fallback_data,
            }

        print(f"[OpenRouter Vision Fallback] Model {model} failed ({status_code}): {err_msg}. Retrying with next free vision model...")
        time.sleep(0.5)

    # All free vision models exhausted -> Return transparent heuristic draft with clear status
    fallback_data = generate_post_from_heuristics(
        tone=tone, length=length, context=context,
        error_reason=f"Free vision AI models exhausted ({last_error_code}): {last_error_message}"
    )
    return {
        "success": False,
        "status": "fallback",
        "code": "RATE_LIMITED" if last_error_code == 429 else "VISION_MODELS_UNAVAILABLE",
        "statusCode": last_error_code,
        "message": f"Free AI vision models unavailable: {last_error_message}. Fallback draft generated.",
        "engineUsed": "Local Heuristic Engine (Vision Fallback)",
        "isAiPowered": False,
        "modelsAttempted": models_attempted,
        "useFallback": True,
        "data": fallback_data,
    }
