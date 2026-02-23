import json
import os
import re
from dateutil import parser as dtparser
import requests
from pathlib import Path
from typing import List, Dict, Any, Optional

GH_USERNAME = os.environ.get("GH_USERNAME", "EduardoSA8006")
API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {
    "Accept": "application/vnd.github+json",
    **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}),
}

README_PATH = "README.md"
SHIELDS_DIR = Path("assets/shields")
GIFS_DIR = Path("assets/gifs")
CONFIG_PATH = Path("scripts/repos.config.json")

SHIELDS_DIR.mkdir(parents=True, exist_ok=True)
GIFS_DIR.mkdir(parents=True, exist_ok=True)


def load_config(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_repo(owner: str, name: str) -> Optional[dict]:
    url = f"{API}/repos/{owner}/{name}"
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def human_dt(iso: str) -> str:
    dt = dtparser.isoparse(iso)
    return dt.strftime("%d %b %Y")


def build_repo_line(owner: str, repo_meta: dict, icon: Optional[str], description_override: Optional[str], badges_cfg: Dict[str, Any]) -> str:
    name = repo_meta["name"]
    full = repo_meta["full_name"]
    desc = description_override or repo_meta.get("description") or "Sem descrição"
    html_url = repo_meta["html_url"]
    pushed = human_dt(repo_meta["pushed_at"])

    parts: List[str] = []
    icon_md = f'<img src="{icon}" width="20"/>' if icon else ""
    prefix = f"- {icon_md} " if icon_md else "- "
    parts.append(f'{prefix}<a href="{html_url}"><b>{name}</b></a> — {desc}')
    parts.append("  <br/>")

    stars_style = badges_cfg.get("stars_style", "social")
    show_last_commit = badges_cfg.get("show_last_commit", True)
    show_updated_date = badges_cfg.get("show_updated_date", True)

    stars_badge = f"https://img.shields.io/github/stars/{full}?style={stars_style}"
    parts.append(f'  <img alt="stars" src="{stars_badge}"/>')

    if show_last_commit:
        last_commit_badge = f"https://img.shields.io/github/last-commit/{full}?logo=git"
        parts.append(f'  <img alt="last commit" src="{last_commit_badge}"/>')

    if show_updated_date:
        parts.append(f"  <sub>Atualizado: {pushed}</sub>")

    # Optional GIF inline preview if exists and matches repo name
    gif_name = f"{name}.gif"
    gif_path = GIFS_DIR / gif_name
    if gif_path.is_file():
        parts.append(f'\n  <img src="assets/gifs/{gif_name}" alt="{name}" width="460"/>')

    parts.append("")  # ending newline
    return "\n".join(parts)


def build_selected_sections(cfg: Dict[str, Any]) -> str:
    badges_cfg = cfg.get("badges", {})
    sections = cfg.get("sections", [])
    lines: List[str] = []
    for section in sections:
        title = section.get("title", "").strip()
        if title:
            lines.append(f"<h3>{title}</h3>")
        repos = section.get("repos", [])
        for item in repos:
            name = item["name"]
            icon = item.get("icon")
            desc = item.get("description")
            meta = fetch_repo(GH_USERNAME, name)
            if not meta or meta.get("archived") or meta.get("fork"):
                # Skip archived/forks or missing
                continue
            lines.append(build_repo_line(GH_USERNAME, meta, icon, desc, badges_cfg))
        lines.append("")  # blank line after each section
    return "\n".join(lines).strip()


def build_gif_gallery(cfg: Dict[str, Any], selected_repo_names: List[str]) -> str:
    gallery_cfg = cfg.get("gif_gallery", {})
    if not gallery_cfg.get("enabled", True):
        return '<div align="center"><i>Galeria de demos desativada nas configurações.</i></div>'

    only_selected = gallery_cfg.get("only_selected_repos", True)
    columns = int(gallery_cfg.get("columns", 2))
    width = int(gallery_cfg.get("width", 360))

    # Collect GIFs and associate with repo if present
    items = []
    for gif in sorted(GIFS_DIR.glob("*.gif")):
        repo_name = gif.stem
        if only_selected and repo_name not in selected_repo_names:
            continue
        url = f"https://github.com/{GH_USERNAME}/{repo_name}"
        title = repo_name.replace("-", " ").replace("_", " ").title()
        # Try to fetch stars for ordering, but don't fail if missing
        stars = 0
        try:
            meta = fetch_repo(GH_USERNAME, repo_name)
            if meta:
                stars = int(meta.get("stargazers_count", 0))
        except Exception:
            stars = 0
        items.append(
            {
                "repo_name": repo_name,
                "gif_path": f"assets/gifs/{gif.name}",
                "url": url,
                "title": title,
                "stars": stars,
            }
        )

    # Order by stars desc then title
    items.sort(key=lambda x: (x["stars"], x["repo_name"].lower()), reverse=True)

    if not items:
        return '<div align="center"><i>Adicione GIFs em <code>assets/gifs</code> com o mesmo nome do repositório (ex.: meu-app.gif)</i></div>'

    html = ['<div align="center">', "<table>"]
    for i in range(0, len(items), columns):
        html.append("<tr>")
        for col in range(columns):
            if i + col < len(items):
                it = items[i + col]
                html.append('<td align="center" valign="top">')
                html.append(f'<a href="{it["url"]}">')
                html.append(f'<img src="{it["gif_path"]}" alt="{it["title"]}" width="{width}"/>')
                html.append("<br/>")
                html.append(f"<sub><b>{it['title']}</b></sub></a>")
                html.append("</td>")
            else:
                html.append("<td></td>")
        html.append("</tr>")
    html.append("</table>")
    html.append("</div>")
    return "\n".join(html)


def update_readme_section(readme_path: str, start_tag: str, end_tag: str, new_content: str) -> None:
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(
        rf"(<!-- {re.escape(start_tag)} -->)(.*?)(<!-- {re.escape(end_tag)} -->)",
        re.DOTALL,
    )
    replacement = f"<!-- {start_tag} -->\n{new_content}\n<!-- {end_tag} -->"
    new_md, count = re.subn(pattern, replacement, content)
    if count == 0:
        # Append at the end if markers not found
        new_md = content + f"\n\n{replacement}\n"

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(new_md)


def fetch_total_commits() -> int:
    """Fetch total commit count (public + private) via the search API."""
    if not TOKEN:
        return 0
    url = f"{API}/search/commits?q=author:{GH_USERNAME}"
    r = requests.get(
        url,
        headers={**HEADERS, "Accept": "application/vnd.github.cloak-preview"},
        timeout=30,
    )
    r.raise_for_status()
    return int(r.json().get("total_count", 0))


def write_commit_activity_shield() -> None:
    count = fetch_total_commits()
    payload = {
        "schemaVersion": 1,
        "label": "Commits",
        "message": str(count) if count > 0 else "N/A",
        "color": "blue" if count > 0 else "grey",
        "namedLogo": "git",
    }
    with open(SHIELDS_DIR / "commit-activity.json", "w", encoding="utf-8") as f:
        json.dump(payload, f)


def main() -> None:
    cfg = load_config(CONFIG_PATH)

    # Selected repo names for filtering things like GIF gallery
    selected_repo_names: List[str] = []
    for section in cfg.get("sections", []):
        for item in section.get("repos", []):
            selected_repo_names.append(item["name"])

    # Build dynamic sections
    md_repos = build_selected_sections(cfg)
    md_gifs = build_gif_gallery(cfg, selected_repo_names)

    # Update README
    update_readme_section(README_PATH, "REPOS:START", "REPOS:END", md_repos)
    update_readme_section(README_PATH, "GIFS:START", "GIFS:END", md_gifs)

    # Update shields endpoint
    write_commit_activity_shield()


if __name__ == "__main__":
    main()