import sys
import os
import re
import json
import html

def extract_title_and_content(filepath):
    """Reads the HTML file and extracts its title and raw content."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Attempt to find the <title> tag. Fallback to filename if not found.
    title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else os.path.basename(filepath)
    # Normalize whitespace/newlines so the title stays a single-line box label
    title = re.sub(r'\s+', ' ', title).strip()

    return title, content

def generate_hub(files, output_file="index.html"):
    pages_metadata = []
    pages_content_dict = {}
    
    # Process each file passed in via command line
    for f in files:
        if os.path.isfile(f):
            title, content = extract_title_and_content(f)
            page_id = f"page_{len(pages_metadata)}"
            
            pages_metadata.append({'id': page_id, 'title': title})
            # Store the raw HTML string in our dictionary to be serialized to JSON later
            pages_content_dict[page_id] = content
        else:
            print(f"Warning: File not found - {f}")

    if not pages_metadata:
        print("Error: No valid HTML files were processed.")
        return

    # Serialize the content dictionary to a safe JSON string for JavaScript
    json_payload = json.dumps(pages_content_dict)
    
    # CRITICAL FIX: Escape closing tags to prevent the browser from prematurely ending the inline <script> block
    json_payload = json_payload.replace('</', '<\\/')

    # The main HTML template for our single-file output
    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jacob Pincock's Hub</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background: #f4f4f9; 
        }
        header { 
            background: #2c3e50; 
            color: white; 
            padding: 2rem; 
            text-align: center; 
        }
        #home-screen { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 30px; 
            padding: 50px; 
            justify-content: center; 
        }
        .box {
            width: 220px; 
            height: 220px;
            background: white; 
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            display: flex; 
            align-items: center; 
            justify-content: center; 
            text-align: center;
            cursor: pointer; 
            transition: transform 0.2s, box-shadow 0.2s; 
            padding: 20px;
            font-size: 1.25rem; 
            font-weight: 600; 
            color: #34495e;
            border: 2px solid transparent;
        }
        .box:hover { 
            transform: translateY(-8px); 
            box-shadow: 0 12px 20px rgba(0,0,0,0.15); 
            border-color: #3498db;
        }
        .page-container {
            display: none;
            position: fixed;
            inset: 0;
            background: white;
            z-index: 10;
            flex-direction: column;
            min-height: 100dvh;
            overflow: hidden;
        }
        .nav-bar {
            width: 100%;
            height: 50px;
            background: #2c3e50;
            display: flex;
            align-items: center;
            padding: 0 15px;
            flex: 0 0 50px;
        }
        .back-btn {
            padding: 8px 16px; 
            background: #e74c3c; 
            color: white;
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: background 0.2s;
        }
        .back-btn:hover { background: #c0392b; }
        iframe {
            flex: 1 1 auto;
            min-height: 0;
            width: 100%;
            border: none;
            background: white;
            display: block;
        }
    </style>
</head>
<body>
    <div id="home-view">
        <header>
            <h1>Jacob Pincock's Hub</h1>
            <p>Select a page below to view its contents.</p>
        </header>
        <div id="home-screen">
            __BOXES_HTML__
        </div>
    </div>

    __PAGES_HTML__

    <script>
        // Safely injected JSON containing all the raw HTML files
        const pageData = __JSON_PAYLOAD__;

        function showPage(pageId) {
            document.getElementById('home-view').style.display = 'none';
            const container = document.getElementById(pageId);
            container.style.display = 'flex';
            
            // Dynamically inject the HTML to start the context
            const iframe = container.querySelector('iframe');
            iframe.srcdoc = pageData[pageId];
            
            window.scrollTo(0, 0);
        }

        function goHome(pageId) {
            const container = document.getElementById(pageId);
            container.style.display = 'none';
            document.getElementById('home-view').style.display = 'block';
            
            // Wipe the iframe to destroy the WebGL context and free memory
            const iframe = container.querySelector('iframe');
            iframe.srcdoc = '';
        }
    </script>
</body>
</html>
"""

    boxes_html = ""
    pages_html = ""

    # Generate the HTML for the boxes and the empty iframe containers
    for page in pages_metadata:
        # Escape any HTML in titles and ensure single-line display
        safe_title = html.escape(page["title"])
        boxes_html += f'<div class="box" onclick="showPage(\'{page["id"]}\')">{safe_title}</div>\n            '
        
        pages_html += f"""
    <div id="{page["id"]}" class="page-container">
        <div class="nav-bar">
            <button class="back-btn" onclick="goHome('{page["id"]}')">← Back to Hub</button>
        </div>
        <iframe srcdoc=""></iframe>
    </div>
        """

    # Inject everything into the template
    final_html = html_template.replace('__BOXES_HTML__', boxes_html)
    final_html = final_html.replace('__PAGES_HTML__', pages_html)
    final_html = final_html.replace('__JSON_PAYLOAD__', json_payload)

    # Write the final output
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write(final_html)

    print(f"Success! Generated '{output_file}' containing {len(pages_metadata)} bundled pages.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python combine_html.py <file1.html> <file2.html> [more_files.html...]")
        sys.exit(1)
    
    input_files = sys.argv[1:]
    generate_hub(input_files)