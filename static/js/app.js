// Application State
let appState = {
    notes: [],
    activeFilter: 'all',
    searchQuery: '',
    lastUpdated: null
};

// DOM Elements
const btnRefresh = document.getElementById('btnRefresh');
const btnExport = document.getElementById('btnExport');
const themeToggle = document.getElementById('themeToggle');
const statusInfo = document.getElementById('statusInfo');
const searchInput = document.getElementById('searchInput');
const filtersContainer = document.getElementById('filtersContainer');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const feedGrid = document.getElementById('feedGrid');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const modalClose = document.getElementById('modalClose');
const tweetTextarea = document.getElementById('tweetTextarea');
const charCounter = document.getElementById('charCounter');
const btnPostTweet = document.getElementById('btnPostTweet');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh button
    btnRefresh.addEventListener('click', () => {
        fetchNotes(true);
    });

    // Export CSV button
    btnExport.addEventListener('click', () => {
        exportFilteredNotesToCSV();
    });

    // Theme toggle button
    themeToggle.addEventListener('click', () => {
        toggleTheme();
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        renderNotes();
    });

    // Filter chips
    filtersContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        // Toggle active class
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        appState.activeFilter = chip.dataset.type;
        renderNotes();
    });

    // Modal close
    modalClose.addEventListener('click', closeTweetModal);
    
    // Close modal on overlay click
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Handle ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });

    // Textarea typing for tweet character count
    tweetTextarea.addEventListener('input', () => {
        updateCharCount();
    });

    // Send tweet
    btnPostTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    });
}

// Fetch Notes from API
async function fetchNotes(forceRefresh = false) {
    // UI Loading state
    btnRefresh.classList.add('loading');
    btnRefresh.disabled = true;
    
    // If it's a first load or we have no data, show main loader
    if (appState.notes.length === 0) {
        loadingState.style.display = 'flex';
        feedGrid.style.display = 'none';
        emptyState.style.display = 'none';
    }

    try {
        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        appState.notes = data.notes;
        appState.lastUpdated = new Date(data.last_updated * 1000);
        
        // Show warning if backend sent one (e.g. fallback to cache)
        if (data.warning) {
            console.warn(data.warning);
            showStatusWarning(data.warning);
        } else {
            updateStatusText();
        }

        renderNotes();
    } catch (error) {
        console.error('Failed to fetch release notes:', error);
        showStatusError(error.message);
        
        // If we don't have notes, show empty state
        if (appState.notes.length === 0) {
            feedGrid.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.querySelector('h3').textContent = 'Error loading updates';
            emptyState.querySelector('p').textContent = error.message || 'Please check your connection and try again.';
        }
    } finally {
        // UI reset loading state
        btnRefresh.classList.remove('loading');
        btnRefresh.disabled = false;
        loadingState.style.display = 'none';
    }
}

// Update Last Updated Timestamp
function updateStatusText() {
    if (!appState.lastUpdated) return;
    
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeStr = appState.lastUpdated.toLocaleTimeString(undefined, options);
    const dateStr = appState.lastUpdated.toLocaleDateString();
    
    statusInfo.textContent = `Last updated: ${dateStr} ${timeStr}`;
    statusInfo.style.color = 'var(--text-muted)';
}

function showStatusWarning(message) {
    statusInfo.textContent = 'Using cached data (Fetch warning)';
    statusInfo.style.color = 'var(--color-deprecation-text)';
    alertNotification(message, 'warning');
}

function showStatusError(message) {
    statusInfo.textContent = 'Sync Error';
    statusInfo.style.color = 'var(--color-fix-text)';
    alertNotification(`Error: ${message}`, 'error');
}

// Simple Toast Notification
function alertNotification(message, type = 'info') {
    // Create toast dynamically
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '10px';
    toast.style.color = 'white';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    toast.style.zIndex = '2000';
    toast.style.backdropFilter = 'var(--glass-blur)';
    toast.style.animation = 'slideIn 0.3s ease forwards';
    
    if (type === 'error') {
        toast.style.background = 'rgba(239, 68, 68, 0.9)';
        toast.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    } else if (type === 'warning') {
        toast.style.background = 'rgba(245, 158, 11, 0.9)';
        toast.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    } else {
        toast.style.background = 'rgba(59, 130, 246, 0.9)';
        toast.style.border = '1px solid rgba(59, 130, 246, 0.4)';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Add simple CSS slide-in animation to document if it doesn't exist
    if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Render Notes to Grid
function renderNotes() {
    feedGrid.innerHTML = '';
    
    // Filter logic
    const filteredNotes = appState.notes.filter(note => {
        // Category Filter
        const matchesFilter = appState.activeFilter === 'all' || 
                             note.type.toLowerCase() === appState.activeFilter.toLowerCase();
        
        // Search Query Filter
        const matchesSearch = !appState.searchQuery || 
                              note.type.toLowerCase().includes(appState.searchQuery) ||
                              note.date.toLowerCase().includes(appState.searchQuery) ||
                              note.content_text.toLowerCase().includes(appState.searchQuery);
                              
        return matchesFilter && matchesSearch;
    });

    // Handle Empty State
    if (filteredNotes.length === 0) {
        feedGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = 'No release notes found';
        emptyState.querySelector('p').textContent = 'Try adjusting your search query or filter tags.';
        return;
    }

    emptyState.style.display = 'none';
    feedGrid.style.display = 'grid';

    // Render cards
    filteredNotes.forEach((note, index) => {
        const typeClass = note.type.toLowerCase();
        
        // Prepare DOM structure for card
        const card = document.createElement('article');
        card.className = `card ${typeClass}`;
        // Animation delay for cascading entry effect
        card.style.animation = 'fadeInUp 0.4s ease forwards';
        card.style.animationDelay = `${Math.min(index * 0.05, 0.8)}s`;
        card.style.opacity = '0';
        
        // Make sure links in release notes open in a new tab
        let contentHtml = note.content_html;
        // Simple regex replace to add target="_blank" and rel="noopener noreferrer" to anchors
        contentHtml = contentHtml.replace(/<a\s+(href="[^"]*")/gi, '<a $1 target="_blank" rel="noopener noreferrer"');

        card.innerHTML = `
            <div>
                <div class="card-header">
                    <span class="card-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${note.date}
                    </span>
                    <span class="badge ${typeClass}">${note.type}</span>
                </div>
                <div class="card-body">
                    ${contentHtml}
                </div>
            </div>
            <div class="card-footer">
                <a href="${note.link}" class="btn-original" target="_blank" rel="noopener noreferrer">
                    Original Source
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                <div class="card-actions">
                    <button class="btn-copy" data-index="${index}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                    <button class="btn-tweet" data-index="${index}">
                        <svg viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                        Tweet
                    </button>
                </div>
            </div>
        `;

        // Event handlers
        const btnTweet = card.querySelector('.btn-tweet');
        btnTweet.addEventListener('click', () => {
            openTweetModal(note);
        });

        const btnCopy = card.querySelector('.btn-copy');
        btnCopy.addEventListener('click', () => {
            copyNoteToClipboard(note, btnCopy);
        });

        feedGrid.appendChild(card);
    });

    // Register card animation style
    if (!document.getElementById('card-animation-style')) {
        const style = document.createElement('style');
        style.id = 'card-animation-style';
        style.textContent = `
            @keyframes fadeInUp {
                from { transform: translateY(15px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Open Tweet Composer Modal
function openTweetModal(note) {
    // Pre-compose Tweet text
    // Format: New #GoogleCloud #BigQuery [Type]: [Text snippet] [Link]
    const hashTags = "#GoogleCloud #BigQuery";
    const header = `New BigQuery ${note.type}: `;
    const link = note.link;
    
    // Character limit for Twitter is 280.
    // Let's calculate the available space for the description text.
    // Twitter counts any URL as 23 characters.
    const urlLength = 23;
    const reservedLength = header.length + urlLength + hashTags.length + 4; // 4 spaces/newlines
    const availableLength = 280 - reservedLength;
    
    let description = note.content_text;
    if (description.length > availableLength) {
        description = description.substring(0, availableLength - 3) + '...';
    }
    
    const tweetText = `${header}"${description}"\n\n${link}\n${hashTags}`;
    
    tweetTextarea.value = tweetText;
    updateCharCount();
    
    tweetModal.classList.add('active');
    // Lock background scroll
    document.body.style.overflow = 'hidden';
    
    // Auto-focus textarea
    setTimeout(() => {
        tweetTextarea.focus();
        tweetTextarea.setSelectionRange(tweetText.length, tweetText.length);
    }, 100);
}

// Close Tweet Composer Modal
function closeTweetModal() {
    tweetModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Update Character Counter and validate input
function updateCharCount() {
    const text = tweetTextarea.value;
    
    // Compute length considering Twitter's URL wrapping (always 23 chars for URLs)
    // Find URLs in text and count them as 23 chars
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let textLengthWithoutUrls = text;
    urls.forEach(url => {
        textLengthWithoutUrls = textLengthWithoutUrls.replace(url, '');
    });
    
    const finalLength = textLengthWithoutUrls.length + (urls.length * 23);
    
    charCounter.textContent = `${finalLength} / 280`;
    
    // Reset classes
    charCounter.className = 'char-counter';
    
    if (finalLength > 280) {
        charCounter.classList.add('error');
        btnPostTweet.disabled = true;
    } else if (finalLength > 255) {
        charCounter.classList.add('warning');
        btnPostTweet.disabled = false;
    } else {
        btnPostTweet.disabled = finalLength === 0;
    }
}

// Copy note content to clipboard
function copyNoteToClipboard(note, btnElement) {
    const textToCopy = `BigQuery ${note.type} Update (${note.date})\n\nDescription:\n${note.content_text}\n\nOriginal Source: ${note.link}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Dynamic toast feedback
        alertNotification('Copied to clipboard!', 'success');
        
        // Button visual feedback
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        btnElement.classList.add('copied');
        
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alertNotification('Failed to copy to clipboard', 'error');
    });
}

// Get the current filtered notes list
function getFilteredNotes() {
    return appState.notes.filter(note => {
        const matchesFilter = appState.activeFilter === 'all' || 
                             note.type.toLowerCase() === appState.activeFilter.toLowerCase();
        
        const matchesSearch = !appState.searchQuery || 
                              note.type.toLowerCase().includes(appState.searchQuery) ||
                              note.date.toLowerCase().includes(appState.searchQuery) ||
                              note.content_text.toLowerCase().includes(appState.searchQuery);
                              
        return matchesFilter && matchesSearch;
    });
}

// Export the filtered notes as CSV
function exportFilteredNotesToCSV() {
    const notesToExport = getFilteredNotes();
    
    if (notesToExport.length === 0) {
        alertNotification('No notes available to export', 'warning');
        return;
    }
    
    // CSV Header
    let csvContent = "Date,Type,Description,Link\r\n";
    
    // CSV rows
    notesToExport.forEach(note => {
        // Escape double quotes in description and type
        const dateEscaped = `"${note.date.replace(/"/g, '""')}"`;
        const typeEscaped = `"${note.type.replace(/"/g, '""')}"`;
        const textEscaped = `"${note.content_text.replace(/"/g, '""')}"`;
        const linkEscaped = `"${note.link.replace(/"/g, '""')}"`;
        
        csvContent += `${dateEscaped},${typeEscaped},${textEscaped},${linkEscaped}\r\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const filterName = appState.activeFilter !== 'all' ? `_${appState.activeFilter}` : '';
    link.setAttribute("download", `bigquery_release_notes${filterName}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alertNotification(`Exported ${notesToExport.length} items to CSV!`, 'success');
}

// Initialize theme from local storage
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

// Toggle light/dark theme
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    alertNotification(
        `Switched to ${isLight ? 'Light' : 'Dark'} Mode`,
        'success'
    );
}
