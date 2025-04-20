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

    async function performSearch(query) {
        // Clear previous results
        resultsList.innerHTML = '';
        currentResults = [];
        currentPage = 1;
        
        // Get current year
        const currentYear = new Date().getFullYear();
        
        // Add UK and year filter to the query
        const fullQuery = `${query} ${currentYear} site:.uk`;
        
        // Search using DuckDuckGo
        await searchDuckDuckGo(fullQuery);
    }

    async function searchDuckDuckGo(query) {
        try {
            // DuckDuckGo's HTML endpoint
            const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Accept': 'text/html',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract results from the HTML
            const resultElements = doc.querySelectorAll('.result');
            
            resultElements.forEach(element => {
                const titleElement = element.querySelector('.result__title');
                const snippetElement = element.querySelector('.result__snippet');
                const linkElement = element.querySelector('.result__url');
                
                if (titleElement && snippetElement && linkElement) {
                    currentResults.push({
                        title: titleElement.textContent.trim(),
                        snippet: snippetElement.textContent.trim(),
                        link: linkElement.href
                    });
                }
            });
            
            if (currentResults.length === 0) {
                displayError('No results found. Please try a different search term.');
                updatePaginationControls();
                return;
            }

            // Update pagination controls
            updatePaginationControls();
            
            // Display first page
            displayCurrentPage();
        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            displayError('Search failed. Please try again later.');
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
        errorItem.textContent = message;
        resultsList.appendChild(errorItem);
    }
}); 