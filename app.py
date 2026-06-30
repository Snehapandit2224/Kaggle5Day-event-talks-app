from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import time

app = Flask(__name__)

# Simple in-memory cache
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 3600  # 1 hour in seconds

def clean_html(html_str):
    if not html_str:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', html_str)
    # Decode basic HTML entities
    clean = clean.replace('&nbsp;', ' ')
    clean = clean.replace('&lt;', '<')
    clean = clean.replace('&gt;', '>')
    clean = clean.replace('&amp;', '&')
    clean = clean.replace('&quot;', '"')
    clean = clean.replace('&#39;', "'")
    # Clean up whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def parse_html_content(html, date_str, base_link):
    if not html:
        return []
    
    # Split the HTML content by <h3> tags
    pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(html)
    
    parsed_items = []
    
    # Clean the base link if it already contains a fragment
    clean_base_link = base_link.split('#')[0]
    
    # If no <h3> tags found, treat the whole content as one general item
    if not matches:
        clean_text = clean_html(html)
        # Create anchor from date
        anchor = date_str.replace(' ', '_').replace(',', '')
        parsed_items.append({
            'date': date_str,
            'type': 'General',
            'content_html': html,
            'content_text': clean_text,
            'link': f"{clean_base_link}#{anchor}"
        })
        return parsed_items
        
    for index, (note_type, note_content) in enumerate(matches):
        note_type = note_type.strip()
        note_content = note_content.strip()
        
        # Clean HTML tags to get plain text
        clean_text = clean_html(note_content)
        
        # Create a unique anchor link for this specific sub-item
        anchor_date = date_str.replace(' ', '_').replace(',', '')
        anchor = f"{anchor_date}_{index}"
        item_link = f"{clean_base_link}#{anchor}"
        
        parsed_items.append({
            'date': date_str,
            'type': note_type,
            'content_html': note_content,
            'content_text': clean_text,
            'link': item_link
        })
        
    return parsed_items

def fetch_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityFeedReader/1.0'}
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()

    # Parse XML
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    root = ET.fromstring(xml_data)
    
    all_notes = []
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
        link = link_elem.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse and split entry content
        notes = parse_html_content(content_html, date_str, link)
        all_notes.extend(notes)
        
    return all_notes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check cache
    if not force_refresh and cache['data'] is not None and (current_time - cache['last_updated'] < CACHE_DURATION):
        return jsonify({
            'notes': cache['data'],
            'cached': True,
            'last_updated': cache['last_updated']
        })
        
    try:
        notes = fetch_release_notes()
        
        # Update cache
        cache['data'] = notes
        cache['last_updated'] = current_time
        
        return jsonify({
            'notes': notes,
            'cached': False,
            'last_updated': current_time
        })
    except Exception as e:
        # If fetch fails but we have cached data, return cache with a warning
        if cache['data'] is not None:
            return jsonify({
                'notes': cache['data'],
                'cached': True,
                'last_updated': cache['last_updated'],
                'warning': f"Failed to fetch fresh data: {str(e)}. Displaying cached version."
            })
        return jsonify({'error': f"Failed to fetch release notes: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
