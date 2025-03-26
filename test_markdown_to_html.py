import unittest
from markdown_to_html import markdown_to_html

class TestMarkdownToHtml(unittest.TestCase):
    def test_heading(self):
        self.assertEqual(markdown_to_html("# Heading 1"), "<h1>Heading 1</h1>")

    def test_bold_text(self):
        self.assertEqual(markdown_to_html("**bold**"), "<strong>bold</strong>")

    def test_italic_text(self):
        self.assertEqual(markdown_to_html("*italic*"), "<em>italic</em>")

    def test_unordered_list(self):
        markdown = "- Item 1\n- Item 2\n- Item 3"
        html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"
        self.assertEqual(markdown_to_html(markdown), html)

if __name__ == "__main__":
    unittest.main()
