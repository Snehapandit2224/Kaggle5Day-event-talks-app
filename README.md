# BigQuery Release Notes Tracker

A premium, modern, and interactive web application that fetches, aggregates, parses, and searches the latest release notes for Google Cloud BigQuery. Built using **Python Flask** on the backend and **vanilla HTML, JavaScript, and CSS** on the frontend. 

It provides an elegant interface for tracking updates, filtering by category (Features, Changes, Deprecations, Fixes), and custom-precomposing updates to share on Twitter/X via an integrated composer modal.

---

## ✨ Features

- **Granular Note Parsing**: Daily release notes logs often combine multiple distinct features, fixes, and changes. The server-side XML parser splits these compound entry logs by `<h3>` tags to render separate cards for individual updates.
- **Interactive UI & Filtering**: A responsive interface built on a glassmorphic design system. Features real-time search queries and category tags (*Features*, *Changes*, *Deprecations*, *Fixes*).
- **Server Caching**: Implements a 1-hour in-memory cache on the Flask server to prevent rate-limiting from Google's servers, with support for an manual force-refresh.
- **Fallback Resilience**: If a manual sync fails, the server serves the cached notes and notifies the frontend to display a warning toast rather than crashing.
- **Custom Twitter/X Composer**: A front-end modal that parses character counts (factoring in Twitter's 23-character URL wraps) and dynamically truncates text to fit within the 280-character limit before redirecting to X's Web Intent.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+ / Flask
- **Frontend**: Plain HTML5, Vanilla CSS3 (custom HSL color palette, CSS Grid/Flexbox), and Vanilla JavaScript (ES6)
- **Data Source**: Google Cloud BigQuery Release Notes Atom Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`)

---

## 📁 File Structure

```
C:\Users\pandi\Desktop\Kaggle_5day_AI_Agents\Second_Project
├── app.py                   # Flask server, cache system, and XML feed parser
├── templates/
│   └── index.html           # HTML template for main view and composer modal
├── static/
│   ├── css/
│   │   └── style.css        # Premium responsive dark stylesheet
│   └── js/
│       └── app.js           # Client-side state, API calls, and tweet logic
├── .gitignore               # Configured git exclusions for Python & Flask
└── README.md                # Project documentation
```

- **Backend Core**: [app.py](file:///C:/Users/pandi/Desktop/Kaggle_5day_AI_Agents/Second_Project/app.py)
- **Frontend HTML**: [templates/index.html](file:///C:/Users/pandi/Desktop/Kaggle_5day_AI_Agents/Second_Project/templates/index.html)
- **Frontend CSS**: [static/css/style.css](file:///C:/Users/pandi/Desktop/Kaggle_5day_AI_Agents/Second_Project/static/css/style.css)
- **Frontend JavaScript**: [static/js/app.js](file:///C:/Users/pandi/Desktop/Kaggle_5day_AI_Agents/Second_Project/static/js/app.js)

---

## 🚀 Installation & Local Development

### 1. Prerequisites
- Python 3.8+ installed on your system.
- Flask installed (`pip install flask`).

### 2. Setup & Execution
Clone the repository, navigate to the folder, and start the development server:

```bash
# Run the application
python app.py
```

By default, the server runs in debug mode on **`http://127.0.0.1:5000`**. Open this address in your web browser.

---

## 💻 How the Request & Response Flow Works

When the user triggers a **Refresh** action:
1. The client script ([app.js](file:///C:/Users/pandi/Desktop/Kaggle_5day_AI_Agents/Second_Project/static/js/app.js)) locks the UI and animates the refresh spinner.
2. An asynchronous HTTP request is sent to the Flask route `/api/notes?refresh=true`.
3. The server ([app.py](file:///C:/Users/pandi/Desktop/Kaggle_5day_AI_Agents/Second_Project/app.py)) queries the Google Cloud Atom Feed XML, parses the structure using `xml.etree.ElementTree`, segments items using `<h3>` tags, updates the local cache, and returns JSON.
4. The client updates its global state, re-renders the filtered card grid, displays a success toast notification, and unlocks the refresh UI.
