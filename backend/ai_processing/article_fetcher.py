import requests
from bs4 import BeautifulSoup

class ArticleFetchingError(Exception):
    """Custom exception for article fetching failures."""
    pass

def fetch_article_text(url: str) -> str:
    """
    Fetches and extracts the main text content from a URL.

    A simple heuristic is used: find all paragraph <p> tags and join them.
    This works for many news sites and blogs but might fail on complex layouts.

    Args:
        url: The URL of the article to fetch.

    Returns:
        The extracted text content of the article.

    Raises:
        ArticleFetchingError: If the URL cannot be fetched or parsed.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()  # Raise an exception for bad status codes

        soup = BeautifulSoup(response.content, "html.parser")
        paragraphs = soup.find_all('p')
        article_text = ' '.join([p.get_text() for p in paragraphs])

        return ' '.join(article_text.split()) # Normalize whitespace
    except requests.exceptions.RequestException as e:
        raise ArticleFetchingError(f"Failed to fetch or read URL: {e}") from e