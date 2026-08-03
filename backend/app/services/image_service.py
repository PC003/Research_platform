"""Image Generation Service using Playwright and Jinja2."""

import os
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from playwright.async_api import async_playwright

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True
)

class ImageService:
    async def _render_html_to_image(self, html_content: str, width: int = 1920, height: int = 1080) -> bytes:
        """Helper to render HTML to a PNG screenshot using Playwright."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=2 # Retina quality
            )
            page = await context.new_page()
            
            # Use data URL or direct content. direct content is safer.
            await page.set_content(html_content, wait_until="networkidle")
            
            # Small delay to ensure Chart.js animations finish if any, 
            # though it's best to disable animations in Chart.js config for headless rendering.
            await page.wait_for_timeout(500) 
            
            screenshot = await page.screenshot(type="png", full_page=True)
            await browser.close()
            return screenshot

    async def generate_analytics_image(self, data: dict) -> bytes:
        """Generates the analytics summary poster.
        
        Args:
            data: Dictionary containing month, year, and chart data metrics.
        """
        template = jinja_env.get_template("analytics-poster.html")
        html_content = template.render(**data)
        
        # Reference landscape size: 1920x1080
        return await self._render_html_to_image(html_content, width=1920, height=1080)

    async def generate_student_poster(self, data: dict) -> bytes:
        """Generates the student recognition poster.
        
        Args:
            data: Dictionary containing month, year, achievement type, and students list.
        """
        template = jinja_env.get_template("student-poster.html")
        html_content = template.render(**data)
        
        # Reference portrait size: 1080x1350
        return await self._render_html_to_image(html_content, width=1080, height=1350)

image_service = ImageService()
