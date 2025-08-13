import json
import os
import re
from datetime import datetime, timezone
from dateutil import parser as dtparser
import requests
from pathlib import Path
from typing import List, Dict

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

SHIELDS_DIR.mkdir(parents=True, exist_ok=True)
GIFS_DIR.mkdir(parents=True, exist_ok=True)


def fetch_all_repos(user: str) -> List[dict]:
    repos: List[dict] = []
    page = 1
    while True:
        url = f"{API}/users/{user}/repos?per_page=100&page={page}&type=owner&sort=updated"
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        repos.extend(data)
        page += 1
    return repos


def human_dt(iso: str) -> str:
    dt = dtparser.isoparse(iso)
    return dt.strftime("%d %b %Y")


def build_repo_line(repo: dict) -> str:
    name = repo["name"]
    full = repo["full_name"]
    desc = repo.get("description") or "Sem descrição"
    stars = repo.get("stargazers_count", 0)
    pushed = human_dt(repo["pushed_at"])
    html_url = repo["html_url"]
    stars_badge = f"https://img.shields.io/github/stars/{full}?style=social"
    last_commit_badge = f"https://img.shields.io/github/last-commit/{full}?logo=git"

    # GIF associado (procura por arquivo com mesmo nome do repo)
    gif_name = f"{name}.gif"
    gif_path = GIFS_DIR / gif_name
    gif_md = ""
    if gif_path.is_file():
        gif_md = f'\n    <img src="assets/gifs/{gif_name}" alt="{name}" width="460"/>'

    return (
        f'- <a href="{html_url}"><b>{name}</b></a> — {desc} \n'
        f"  <br/>\n"
        f'  <img alt="stars" src="{stars_badge}"/> '
        f'  <img alt="last commit" src="{last_commit_badge}"/> '
        f"  <sub>Atualizado: {pushed}</sub>"
        f"{gif_md}\n"
    )


def build_gif_gallery(repos: List[dict]) -> str:
    """
    Gera uma tabela HTML com 2 colunas a partir de arquivos .gif em assets/gifs.
    Se o nome do gif corresponder ao nome de um repositório, cria link para o repo.
    Ordena por estrelas (desc) quando possível, caso contrário por nome.
    """
    repo_by_name: Dict[str, dict] = {r["name"]: r for r in repos}
    items = []
    for gif in sorted(GIFS_DIR.glob("*.gif")):
        repo_name = gif.stem
        repo = repo_by_name.get(repo_name)
        stars = repo.get("stargazers_count", 0) if repo else 0
        url = f"https://github.com/{GH_USERNAME}/{repo_name}" if repo else None
        title = repo_name.replace("-", " ").replace("_", " ").title()
        items.append(
            {
                "repo_name": repo_name,
                "gif_path": f"assets/gifs/{gif.name}",
                "url": url,
                "title": title,
                "stars": stars,
            }
        )

    # ordenar por estrelas desc e nome
    items.sort(key=lambda x: (x["stars"], x["repo_name"].lower()), reverse=True)

    if not items:
        return (
            '<div align="center"><i>Adicione GIFs em <code>assets/gifs</code> com o mesmo nome do repositório (ex.: meu-app.gif)</i></div>'
        )

    # montar tabela 2 colunas
    html = ['<div align="center">', "<table>"]
    for i in range(0, len(items), 2):
        html.append("<tr>")
        for col in range(2):
            if i + col < len(items):
                it = items[i + col]
                html.append('<td align="center">')
                if it["url"]:
                    html.append(f'<a href="{it["url"]}">')
                html.append(
                    f'<img src="{it["gif_path"]}" alt="{it["title"]}" width="360"/>'
                )
                if it["url"]:
                    html.append("<br/>")
                    html.append(f"<sub><b>{it['title']}</b></sub></a>")
                else:
                    html.append("<br/>")
                    html.append(f"<sub><b>{it['title']}</b></sub>")
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
        # Se as tags não existirem, apenas anexa ao final
        new_md = content + f"\n\n{replacement}\n"

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(new_md)


def main() -> None:
    repos = fetch_all_repos(GH_USERNAME)
    # filtra
    repos = [r for r in repos if not r.get("fork") and not r.get("archived")]
    # ordena: stars desc, depois pushed_at desc
    repos.sort(
        key=lambda r: (
            r.get("stargazers_count", 0),
            dtparser.isoparse(r["pushed_at"]).timestamp(),
        ),
        reverse=True,
    )

    # Top N repos
    top = repos[:12]
    lines = [build_repo_line(r) for r in top]
    md_repos = "\n".join(lines).strip()

    # GIF gallery
    md_gifs = build_gif_gallery(repos)

    # Atualiza seções no README
    update_readme_section(README_PATH, "REPOS:START", "REPOS:END", md_repos)
    update_readme_section(README_PATH, "GIFS:START", "GIFS:END", md_gifs)

    # Gera JSON para badge custom de atividade
    now = datetime.now(timezone.utc)
    payload = {
        "schemaVersion": 1,
        "label": "commit activity",
        "message": now.strftime("%Y-%m-%d %H:%M UTC"),
        "color": "blue",
        "labelColor": "black",
        "isError": False,
        "namedLogo": "git",
    }
    with open(SHIELDS_DIR / "commit-activity.json", "w", encoding="utf-8") as f:
        json.dump(payload, f)


if __name__ == "__main__":
    main()