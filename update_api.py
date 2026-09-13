import re

with open('js/config.js', 'r', encoding='utf-8') as f:
    config = f.read()

# Replace the API_URL line
new_api = 'https://script.google.com/macros/s/AKfycbxf23-zTUmObChWqjTmqsFjCDfnanSUYQWZ9eD4XZlmsKsL0PO7YE4zMN0n64PS2qjr/exec'
config = re.sub(r'API_URL:\s*[\'"].*?[\'"]', f"API_URL: '{new_api}'", config)

with open('js/config.js', 'w', encoding='utf-8') as f:
    f.write(config)
