document.addEventListener('DOMContentLoaded', () => {
    const resultsList = document.getElementById('resultsList');
    const quickSearchButtons = document.querySelectorAll('.quick-search-btn');
    const buildSearchButton = document.getElementById('buildSearch');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');

    let currentResults = [];
    let currentPage = 1;
    const resultsPerPage = 10;

    // Check if CORS proxy access is needed
    checkCorsProxyAccess();

    // Handle quick search buttons
    quickSearchButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const query = button.getAttribute('data-query');
            await performSearch(query);
        });
    });

    // Handle custom search builder
    buildSearchButton.addEventListener('click', async () => {
        const category = document.getElementById('category').value;
        const type = document.getElementById('type').value;
        const additionalTerms = document.getElementById('additionalTerms').value.trim();
        
        let query = `${category} ${type}`;
        if (additionalTerms) {
            query += ` ${additionalTerms}`;
        }
        
        await performSearch(query);
    });

    // Handle pagination
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    });

    nextPageButton.addEventListener('click', () => {
        if (currentPage < Math.ceil(currentResults.length / resultsPerPage)) {
            currentPage++;
            displayCurrentPage();
        }
    });

    async function checkCorsProxyAccess() {
        try {
            const response = await fetch('https://cors-anywhere.herokuapp.com/corsdemo');
            const text = await response.text();
            if (text.includes('Request temporary access to the demo server')) {
                displayError('Please visit <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">this link</a> and click the button to request temporary access to the demo server. Then try your search again.');
            }
        } catch (error) {
            console.error('CORS proxy check error:', error);
        }
    }

    async function performSearch(query) {
        // Clear previous results
        resultsList.innerHTML = '';
        currentResults = [];
        currentPage = 1;
        
        // Get current year
        const currentYear = new Date().getFullYear();
        
        // Add UK and year filter to the query
        const fullQuery = `${query} ${currentYear} site:.uk`;
        
        // Search using DuckDuckGo with CORS proxy
        await searchDuckDuckGo(fullQuery);
    }

    async function searchDuckDuckGo(query) {
        try {
            // Use a CORS proxy to access DuckDuckGo
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            
            console.log('Searching for:', query);
            
            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Accept': 'text/html',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.status === 403) {
                displayError('Access to the search service is currently restricted. Please visit <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">this link</a> and click the button to request temporary access to the demo server. Then try your search again.');
                return;
            }
            
            const html = await response.text();
            console.log('Received HTML response');
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Try different selectors for DuckDuckGo results
            const resultElements = doc.querySelectorAll('.result, .web-result, .result__body, .zci-result');
            
            console.log('Found result elements:', resultElements.length);
            
            resultElements.forEach(element => {
                // Try different selectors for title, snippet, and link
                const titleElement = element.querySelector('.result__title, .result__a, .web-result__title, .zci__title');
                const snippetElement = element.querySelector('.result__snippet, .result__a, .web-result__description, .zci__description');
                const linkElement = element.querySelector('.result__url, .result__a, .web-result__url, .zci__url');
                
                if (titleElement && snippetElement && linkElement) {
                    const title = titleElement.textContent.trim();
                    const snippet = snippetElement.textContent.trim();
                    const link = linkElement.href || linkElement.getAttribute('href');
                    
                    if (title && snippet && link) {
                        currentResults.push({
                            title: title,
                            snippet: snippet,
                            link: link
                        });
                    }
                }
            });
            
            console.log('Processed results:', currentResults.length);
            
            if (currentResults.length === 0) {
                // If no results found, try alternative search
                await searchAlternative(query);
                return;
            }

            // Update pagination controls
            updatePaginationControls();
            
            // Display first page
            displayCurrentPage();
        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            if (error.message.includes('corsdemo')) {
                displayError('Please visit <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">this link</a> and click the button to request temporary access to the demo server. Then try your search again.');
            } else {
                displayError('Search failed. Please try again later.');
            }
        }
    }

    async function searchAlternative(query) {
        try {
            // Try alternative search method using DuckDuckGo's API
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            
            const response = await fetch(proxyUrl + targetUrl, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.status === 403) {
                return; // Already handled in the main search function
            }
            
            const data = await response.json();
            
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                data.RelatedTopics.forEach(topic => {
                    if (topic.Text && topic.FirstURL) {
                        currentResults.push({
                            title: topic.Text.split('.')[0],
                            snippet: topic.Text,
                            link: topic.FirstURL
                        });
                    }
                });
                
                if (currentResults.length > 0) {
                    updatePaginationControls();
                    displayCurrentPage();
                    return;
                }
            }
            
            displayError('No results found. Please try a different search term.');
            updatePaginationControls();
        } catch (error) {
            console.error('Alternative search error:', error);
            // Don't display error here as it's already handled in the main search function
        }
    }

    function displayCurrentPage() {
        resultsList.innerHTML = '';
        
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = Math.min(startIndex + resultsPerPage, currentResults.length);
        const pageResults = currentResults.slice(startIndex, endIndex);
        
        pageResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            resultItem.innerHTML = `
                <h3>${result.title}</h3>
                <p>${result.snippet}</p>
                <a href="${result.link}" target="_blank">View Promotion</a>
                <p class="source">Source: DuckDuckGo</p>
            `;
            
            resultsList.appendChild(resultItem);
        });

        // Update pagination info
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = Math.ceil(currentResults.length / resultsPerPage);
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(currentResults.length / resultsPerPage);
        
        prevPageButton.disabled = currentPage <= 1;
        nextPageButton.disabled = currentPage >= totalPages;
        
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;
    }

    function displayError(message) {
        const errorItem = document.createElement('div');
        errorItem.className = 'result-item error';
        errorItem.innerHTML = message;
        resultsList.appendChild(errorItem);
    }
}); 