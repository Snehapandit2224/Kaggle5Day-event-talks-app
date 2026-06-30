import urllib.request
import xml.etree.ElementTree as ET
import re

def fetch_and_parse():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return []

    # Parse XML
    try:
        # Atom namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            date_str = title.text if title is not None else "Unknown Date"
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry.find("atom:link", ns)
            link = link_elem.get('href') if link_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Now let's try to split by <h3> (or <h2> or similar headers) to extract individual items
            # The structure is typically <h3>Type</h3><p>Description</p>...
            items = parse_html_content(content_html, date_str, link)
            entries.extend(items)
            
        return entries
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

def parse_html_content(html, date_str, base_link):
    if not html:
        return []
    
    # Split the HTML content by <h3> tags
    # Example: <h3>Change</h3><p>...</p><h3>Feature</h3><p>...</p>
    # We can use regex to find all matches of <h3>...</h3> and the text that follows them.
    pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(html)
    
    parsed_items = []
    
    # If no <h3> tags found, return the whole HTML as a single item
    if not matches:
        # Clean html tags for text snippet
        clean_text = clean_html(html)
        parsed_items.append({
            'date': date_str,
            'type': 'General',
            'content_html': html,
            'content_text': clean_text,
            'link': base_link
        })
        return parsed_items
        
    for index, (note_type, note_content) in enumerate(matches):
        note_type = note_type.strip()
        note_content = note_content.strip()
        
        # Clean HTML tags to get plain text for tweeting
        clean_text = clean_html(note_content)
        
        # We can add an anchor link if possible, e.g. base_link + #some_id
        # Let's clean the note_type or use the entry date to make an anchor
        anchor = f"{date_str.replace(' ', '_').replace(',', '')}_{index}"
        item_link = f"{base_link}#{anchor}"
        
        parsed_items.append({
            'date': date_str,
            'type': note_type,
            'content_html': note_content,
            'content_text': clean_text,
            'link': item_link
        })
        
    return parsed_items

def clean_html(html_str):
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

if __name__ == '__main__':
    items = fetch_and_parse()
    print(f"Total parsed release note items: {len(items)}")
    for i, item in enumerate(items[:5]):
        print(f"\nItem {i+1}:")
        print(f"Date: {item['date']}")
        print(f"Type: {item['type']}")
        print(f"Link: {item['link']}")
        print(f"Text Preview: {item['content_text'][:150]}...")
