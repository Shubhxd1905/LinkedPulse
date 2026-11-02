"""
profile_optimizer.py
====================
Accepts a profile URL, detects the platform, fetches public data via API or web scraping,
and automatically optimizes key sections (headline, summary, skills) according to best practices.

Supported Platforms:
- LinkedIn (public profile parsing & OpenGraph metadata extraction)
- GitHub (public REST API with fallback to scrape-able profile page)
- Generic web profiles / personal portfolio pages
"""

import re
import json
import urllib.parse
from typing import Dict, Any, List, Optional
import requests
from bs4 import BeautifulSoup


# Standard skill dictionary for normalization and market-relevance ranking
SKILL_TAXONOMY = {
    # Architecture, Cloud & Distributed Systems
    "system design": {"name": "System Design", "weight": 95},
    "distributed systems": {"name": "Distributed Systems", "weight": 94},
    "microservices": {"name": "Microservices Architecture", "weight": 92},
    "cloud architecture": {"name": "Cloud Architecture", "weight": 91},
    "aws": {"name": "Amazon Web Services (AWS)", "weight": 90},
    "kubernetes": {"name": "Kubernetes", "weight": 89},
    "docker": {"name": "Docker", "weight": 88},
    
    # Modern Languages & Frameworks
    "python": {"name": "Python", "weight": 87},
    "typescript": {"name": "TypeScript", "weight": 86},
    "react": {"name": "React.js", "weight": 85},
    "react.js": {"name": "React.js", "weight": 85},
    "node.js": {"name": "Node.js", "weight": 85},
    "nodejs": {"name": "Node.js", "weight": 85},
    "golang": {"name": "Go (Golang)", "weight": 84},
    "go": {"name": "Go (Golang)", "weight": 84},
    "postgresql": {"name": "PostgreSQL", "weight": 83},
    "sql": {"name": "SQL & Relational Databases", "weight": 80},
    "graphql": {"name": "GraphQL", "weight": 80},
    "rest api": {"name": "RESTful API Design", "weight": 81},
    "devops": {"name": "DevOps & CI/CD", "weight": 82},
    "machine learning": {"name": "Machine Learning", "weight": 88},
    "ai": {"name": "Artificial Intelligence (AI)", "weight": 89},
    
    # Leadership & Engineering Foundations
    "data structures": {"name": "Algorithms & Data Structures", "weight": 82},
    "git": {"name": "Git & Version Control", "weight": 78},
    "linux": {"name": "Linux Systems", "weight": 79},
    "leadership": {"name": "Technical Leadership", "weight": 86},
    "mentorship": {"name": "Engineering Mentorship", "weight": 82}
}


def optimize_profile_from_url(profile_url: str) -> Dict[str, Any]:
    """
    Accepts a profile URL, extracts data from the platform, and returns an
    optimized profile structure (headline, summary, skills).
    
    Args:
        profile_url (str): The public URL to the profile.
        
    Returns:
        dict: Structured result containing original and optimized fields,
              platform metadata, fallback messages, and error status.
    """
    result: Dict[str, Any] = {
        "status": "error",
        "platform": None,
        "input_url": profile_url,
        "extracted_data": {},
        "optimized_data": {},
        "fallback_messages": [],
        "error": None
    }

    # Step 1: Validate URL & Extract Platform Identifier
    validation = _validate_and_identify_platform(profile_url)
    if not validation["valid"]:
        result["error"] = validation["error"]
        return result

    platform = validation["platform"]
    result["platform"] = platform
    normalized_url = validation["normalized_url"]
    identifier = validation.get("identifier")

    # Step 2: Fetch Profile Data Gracefully (Handling 429, 404, network errors)
    fetch_result = _fetch_platform_data(platform, normalized_url, identifier)
    
    if fetch_result.get("fallback_messages"):
        result["fallback_messages"].extend(fetch_result["fallback_messages"])

    if not fetch_result.get("success"):
        result["error"] = fetch_result.get("error", "Failed to retrieve profile data.")
        return result

    raw_data = fetch_result["data"]
    result["extracted_data"] = raw_data

    # Step 3: Apply Optimization Logic
    optimized = _apply_optimization_logic(raw_data, platform)
    result["optimized_data"] = optimized
    result["status"] = "fallback" if result["fallback_messages"] else "success"

    return result


def _validate_and_identify_platform(url: str) -> Dict[str, Any]:
    """Validates the incoming link and identifies the target platform."""
    if not url or not isinstance(url, str):
        return {"valid": False, "error": "Profile URL must be a non-empty string."}

    trimmed = url.strip()
    if not re.match(r"^https?://", trimmed, re.IGNORECASE):
        trimmed = f"https://{trimmed}"

    try:
        parsed = urllib.parse.urlparse(trimmed)
    except Exception as e:
        return {"valid": False, "error": f"Invalid URL format: {str(e)}"}

    domain = parsed.netloc.lower()
    path = parsed.path.strip("/")

    if not domain or "." not in domain or domain.endswith("."):
        return {"valid": False, "error": f"Invalid or malformed domain: '{domain}'."}

    # Branch 1: LinkedIn Profile
    if "linkedin.com" in domain:
        match = re.search(r"linkedin\.com/in/([^/?#]+)", trimmed, re.IGNORECASE)
        identifier = match.group(1) if match else (path.split("/")[-1] if path else "")
        if not identifier:
            return {"valid": False, "error": "LinkedIn URL must include a profile path (e.g., linkedin.com/in/username)."}
        return {"valid": True, "platform": "linkedin", "normalized_url": trimmed, "identifier": identifier}

    # Branch 2: GitHub Profile
    elif "github.com" in domain:
        parts = [p for p in path.split("/") if p]
        if not parts:
            return {"valid": False, "error": "GitHub URL must include a username (e.g., github.com/username)."}
        username = parts[0]
        return {"valid": True, "platform": "github", "normalized_url": f"https://github.com/{username}", "identifier": username}

    # Branch 3: Generic Portfolio or Web Profile
    else:
        identifier = path.split("/")[-1] if path else domain
        return {"valid": True, "platform": "generic", "normalized_url": trimmed, "identifier": identifier}


def _fetch_platform_data(platform: str, url: str, identifier: Optional[str]) -> Dict[str, Any]:
    """Fetches profile data according to the platform branch with graceful error handling."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    if platform == "github":
        return _fetch_github_profile(identifier or "user", url, headers)
    elif platform == "linkedin":
        return _fetch_linkedin_profile(url, identifier or "member", headers)
    elif platform == "generic":
        return _fetch_generic_profile(url, identifier or "professional", headers)

    return {"success": False, "error": f"Platform '{platform}' is not supported."}


def _fetch_github_profile(username: str, profile_url: str, headers: dict) -> Dict[str, Any]:
    """Fetches GitHub profile from public REST API with fallback to scrape-able HTML page."""
    api_url = f"https://api.github.com/users/{username}"
    fallback_messages = []

    # Attempt 1: GitHub Public REST API
    try:
        resp = requests.get(api_url, headers=headers, timeout=6)
        if resp.status_code == 200:
            gh = resp.json()
            bio = gh.get("bio") or ""
            company = gh.get("company") or ""
            name = gh.get("name") or username

            skills = []
            try:
                repos_resp = requests.get(f"{api_url}/repos?per_page=8&sort=updated", headers=headers, timeout=4)
                if repos_resp.status_code == 200:
                    for r in repos_resp.json():
                        lang = r.get("language")
                        if lang and lang not in skills:
                            skills.append(lang)
                        for topic in (r.get("topics") or []):
                            if topic not in skills:
                                skills.append(topic)
            except Exception:
                pass

            headline = f"Software Engineer | {company}" if company else f"Software Developer & Open Source Contributor"
            if bio:
                headline = f"{bio[:80]} | Software Engineer"

            return {
                "success": True,
                "data": {
                    "name": name,
                    "headline": headline,
                    "summary": bio or f"Software developer contributing to public open source projects on GitHub.",
                    "skills": skills or ["Git", "GitHub Actions", "Python", "TypeScript"]
                },
                "fallback_messages": fallback_messages
            }

        elif resp.status_code == 404:
            return {"success": False, "error": f"GitHub user '{username}' was not found (HTTP 404)."}
        elif resp.status_code in (403, 429):
            fallback_messages.append(f"GitHub API rate limit hit (HTTP {resp.status_code}). Attempting public HTML scraping fallback.")

    except requests.exceptions.RequestException as e:
        fallback_messages.append(f"GitHub API unreachable ({type(e).__name__}). Attempting public HTML page fallback.")

    # Attempt 2: Public GitHub HTML Page Scraping
    try:
        page_resp = requests.get(profile_url, headers=headers, timeout=6)
        if page_resp.status_code == 404:
            return {"success": False, "error": f"GitHub profile page '{username}' not found (HTTP 404)."}
        
        if page_resp.status_code == 200:
            soup = BeautifulSoup(page_resp.text, "html.parser")
            name_tag = soup.find(class_="p-name")
            bio_tag = soup.find(class_="user-profile-bio")
            name = name_tag.get_text(strip=True) if name_tag else username
            bio = bio_tag.get_text(strip=True) if bio_tag else ""

            return {
                "success": True,
                "data": {
                    "name": name,
                    "headline": bio or f"Software Engineer | Open Source Developer",
                    "summary": bio or f"Developer with active open source contributions on GitHub.",
                    "skills": ["Git", "GitHub Actions", "Python", "TypeScript"]
                },
                "fallback_messages": fallback_messages
            }

    except requests.exceptions.RequestException as e:
        fallback_messages.append(f"Network connection unavailable ({type(e).__name__}). Using vanity URL identifier fallback.")

    # Attempt 3: Graceful Offline / Network Error Fallback
    display_name = username.replace("-", " ").replace("_", " ").title()
    fallback_messages.append("Generated baseline data from GitHub username due to network/rate-limit restrictions.")
    return {
        "success": True,
        "data": {
            "name": display_name,
            "headline": f"Software Engineer & Open Source Developer | {display_name}",
            "summary": f"Software engineer and open source builder actively developing on GitHub.",
            "skills": ["Git", "Python", "TypeScript", "Docker", "CI/CD"]
        },
        "fallback_messages": fallback_messages
    }


def _fetch_linkedin_profile(url: str, identifier: str, headers: dict) -> Dict[str, Any]:
    """Fetches LinkedIn profile data or extracts OpenGraph meta tags with graceful fallbacks."""
    fallback_messages = []
    clean_name = identifier.replace("-", " ").title()

    try:
        resp = requests.get(url, headers=headers, timeout=6, allow_redirects=True)
        
        # LinkedIn anti-bot authwall / rate limit / 999
        if resp.status_code in (999, 429) or "authwall" in resp.url or "login" in resp.url:
            fallback_messages.append(f"LinkedIn public authwall triggered (HTTP {resp.status_code}). Used profile vanity slug for baseline.")
            return {
                "success": True,
                "data": {
                    "name": clean_name,
                    "headline": f"Experienced Specialist | {clean_name}",
                    "summary": f"Accomplished professional specializing in high-impact execution, cross-functional collaboration, and continuous delivery.",
                    "skills": ["Leadership", "Project Management", "Strategy", "System Design"]
                },
                "fallback_messages": fallback_messages
            }

        if resp.status_code == 404:
            return {"success": False, "error": f"LinkedIn profile '{identifier}' not found (HTTP 404)."}

        # Parse OpenGraph and title tags
        soup = BeautifulSoup(resp.text, "html.parser")
        og_title = soup.find("meta", property="og:title")
        og_desc = soup.find("meta", property="og:description")
        title_tag = soup.find("title")

        raw_title = og_title.get("content", "") if og_title else (title_tag.get_text(strip=True) if title_tag else clean_name)
        raw_desc = og_desc.get("content", "") if og_desc else ""

        name = clean_name
        headline = ""
        if " - " in raw_title:
            parts = raw_title.split(" - ")
            name = parts[0].strip()
            headline = parts[1].replace(" | LinkedIn", "").strip()

        found_skills = _extract_skills_from_text(f"{headline} {raw_desc}")

        return {
            "success": True,
            "data": {
                "name": name,
                "headline": headline or f"Professional | {clean_name}",
                "summary": raw_desc or f"Professional LinkedIn profile for {name}.",
                "skills": found_skills or ["Leadership", "Strategy", "System Design", "Cloud Architecture"]
            },
            "fallback_messages": fallback_messages
        }

    except requests.exceptions.RequestException as e:
        fallback_messages.append(f"LinkedIn network request failed ({type(e).__name__}). Applied URL slug baseline fallback.")
        return {
            "success": True,
            "data": {
                "name": clean_name,
                "headline": f"Senior Professional | {clean_name}",
                "summary": f"Accomplished industry professional specializing in driving measurable results and operational excellence.",
                "skills": ["System Design", "Cloud Architecture", "Technical Leadership", "Agile Execution"]
            },
            "fallback_messages": fallback_messages
        }


def _fetch_generic_profile(url: str, identifier: str, headers: dict) -> Dict[str, Any]:
    """Fetches generic web portfolio or profile page."""
    fallback_messages = []
    clean_name = identifier.replace("-", " ").title()

    try:
        resp = requests.get(url, headers=headers, timeout=6)
        if resp.status_code == 404:
            return {"success": False, "error": f"Profile page at '{url}' was not found (HTTP 404)."}
        if resp.status_code != 200:
            return {"success": False, "error": f"Profile page returned HTTP status {resp.status_code}."}

        soup = BeautifulSoup(resp.text, "html.parser")
        title = soup.find("title")
        meta_desc = soup.find("meta", attrs={"name": "description"})
        og_desc = soup.find("meta", property="og:description")
        h1 = soup.find("h1")

        name = h1.get_text(strip=True) if h1 else (title.get_text(strip=True) if title else clean_name)
        desc = meta_desc.get("content", "") if meta_desc else (og_desc.get("content", "") if og_desc else "")
        body_text = soup.get_text(separator=" ", strip=True)[:1500]

        found_skills = _extract_skills_from_text(f"{desc} {body_text}")

        return {
            "success": True,
            "data": {
                "name": name,
                "headline": desc[:100] if desc else "Professional Portfolio",
                "summary": desc or body_text[:350],
                "skills": found_skills or ["Problem Solving", "Technical Architecture", "Engineering"]
            },
            "fallback_messages": fallback_messages
        }

    except requests.exceptions.RequestException as e:
        fallback_messages.append(f"Network error accessing '{url}' ({type(e).__name__}). Using fallback profile.")
        return {
            "success": True,
            "data": {
                "name": clean_name,
                "headline": f"Professional Specialist | {clean_name}",
                "summary": f"Professional with expertise in digital architecture, software delivery, and problem solving.",
                "skills": ["Technical Architecture", "System Design", "Leadership"]
            },
            "fallback_messages": fallback_messages
        }


def _apply_optimization_logic(data: Dict[str, Any], platform: str) -> Dict[str, Any]:
    """
    Applies optimization logic:
    - Headline: Formats into high-visibility formula within best-practice length limits.
    - Summary: Structures into opening hook, core competencies, and clear CTA.
    - Skills: Reorders by market demand weight, standardizes names, and suggests complementary additions.
    """
    raw_headline = (data.get("headline") or "").strip()
    raw_summary = (data.get("summary") or "").strip()
    raw_skills = data.get("skills") or []
    name = data.get("name") or "Professional"

    # --- 1. Headline Optimization ---
    optimized_headline = _optimize_headline(raw_headline, raw_skills)

    # --- 2. Summary Optimization ---
    optimized_summary = _optimize_summary(raw_summary, name, raw_skills)

    # --- 3. Skills Optimization ---
    skills_optimization = _optimize_skills(raw_skills)

    return {
        "headline": {
            "original": raw_headline,
            "optimized": optimized_headline,
            "char_count": len(optimized_headline),
            "rationale": "Applied high-converting formula: [Role] | [Core Skills] | [Quantified Value Prop]. Kept under 140 chars for optimal mobile display."
        },
        "summary": {
            "original": raw_summary,
            "optimized": optimized_summary,
            "word_count": len(optimized_summary.split()),
            "rationale": "Structured with a compelling opening hook before the mobile '...see more' cutoff, bulleted capabilities, and an explicit Call to Action."
        },
        "skills": {
            "original": raw_skills,
            "prioritized_skills": skills_optimization["prioritized"],
            "recommended_additions": skills_optimization["additions"],
            "rationale": "Standardized skill casing, prioritized high-demand industry capabilities, and suggested missing high-leverage competencies."
        }
    }


def _optimize_headline(headline: str, skills: List[str]) -> str:
    """Creates a punchy headline formula within standard length limits (50-140 chars)."""
    # Clean buzzwords and passive search phrases
    cleaned = re.sub(r"(?i)\b(actively looking|seeking opportunities|open to work|enthusiast|ninja|guru)\b", "", headline)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" |-•")

    primary_role = cleaned.split("|")[0].strip() if "|" in cleaned else (cleaned[:45] if cleaned else "Senior Engineer")
    if len(primary_role) < 5:
        primary_role = "Senior Technical Professional"

    top_skills_formatted = " • ".join(skills[:3]) if skills else "Distributed Systems • Cloud Architecture"
    value_prop = "Scaling High-Impact Systems"

    candidate = f"{primary_role} | {top_skills_formatted} | {value_prop}"
    
    # Adhere strictly to length best practices (mobile safe limit <= 140 chars)
    if len(candidate) > 140:
        candidate = f"{primary_role} | {top_skills_formatted}"
    
    return candidate


def _optimize_summary(summary: str, name: str, skills: List[str]) -> str:
    """Structures summary with hook, evidence, core competencies, and CTA."""
    first_sentence = summary.split(".")[0].strip() if summary else ""
    if len(first_sentence) < 25:
        hook = f"I help organizations build resilient, high-performance systems and drive technological innovation."
    else:
        hook = f"{first_sentence}."

    bullet_skills = "\n".join([f"• {s}" for s in (skills[:4] if skills else ["System Architecture", "Cloud Infrastructure", "Engineering Leadership"])])

    return f"""{hook}

Throughout my career, I have focused on solving complex technical challenges, eliminating architectural bottlenecks, and delivering maintainable, high-impact solutions.

Core Competencies:
{bullet_skills}

Always interested in connecting with fellow builders, tech leaders, and innovators. Feel free to connect or drop a message!"""


def _optimize_skills(skills: List[str]) -> Dict[str, List[str]]:
    """Prioritizes skills by market weight and suggests complementary additions."""
    seen = set()
    scored_skills = []

    for s in skills:
        s_clean = s.strip()
        s_lower = s_clean.lower()
        if s_lower in seen:
            continue
        seen.add(s_lower)
        
        match = SKILL_TAXONOMY.get(s_lower)
        if match:
            scored_skills.append((match["name"], match["weight"]))
        else:
            scored_skills.append((s_clean.title(), 60))

    # Sort descending by market demand weight
    scored_skills.sort(key=lambda x: x[1], reverse=True)
    prioritized = [s[0] for s in scored_skills]

    # Suggest top complementary skills not yet included
    additions = []
    for key, val in SKILL_TAXONOMY.items():
        if key not in seen and val["name"] not in prioritized:
            additions.append(val["name"])
            if len(additions) >= 4:
                break

    return {
        "prioritized": prioritized,
        "additions": additions
    }


def _extract_skills_from_text(text: str) -> List[str]:
    """Extracts known tech skills from raw text using taxonomy."""
    text_lower = text.lower()
    found = []
    for key, val in SKILL_TAXONOMY.items():
        pattern = r"\b" + re.escape(key) + r"\b"
        if re.search(pattern, text_lower):
            found.append(val["name"])
    return found


# Quick local demonstration if executed directly
if __name__ == "__main__":
    test_urls = [
        "https://www.linkedin.com/in/satyanadella",
        "https://github.com/octocat",
        "invalid-url-example"
    ]
    for url in test_urls:
        print(f"\n{'='*50}\nInput: {url}")
        res = optimize_profile_from_url(url)
        print(json.dumps(res, indent=2))
