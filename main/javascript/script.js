// Main script for ByteShield Cybersecurity Blog

document.addEventListener('DOMContentLoaded', function() {
    // Simulate old-school loading
    initPageLoad();
    
    // Add retro cursor effect for links
    initRetroCursor();
    
    // Update hit counter
    updateHitCounter();
    
    // Add "new" labels to recent content
    addNewLabels();
    
    // Add console easter egg
    addConsoleEasterEgg();
});

// Simulate old-school page loading effect
function initPageLoad() {
    document.body.style.opacity = '0';
    setTimeout(function() {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 1s ease-in';
    }, 300);
}

// Add retro cursor effect on hover for links
function initRetroCursor() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('mouseover', function() {
            this.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' style=\'fill:none;stroke:%23ff8c00;stroke-width:2\'><text x=\'0\' y=\'20\' style=\'fill:%23ff8c00;font-size:20px\'>></text></svg>") 0 0, auto';
        });
    });
}

// Update hit counter
function updateHitCounter() {
    const hitCounter = document.querySelector('.hit-counter');
    if (hitCounter) {
        // Get count from localStorage or initialize
        let count = localStorage.getItem('visitorCount');
        
        if (!count) {
            // Start with the value displayed in HTML
            count = parseInt(hitCounter.textContent.replace('Visitors: ', ''));
        } else {
            count = parseInt(count);
        }
        
        // Increment count
        count++;
        
        // Store back in localStorage
        localStorage.setItem('visitorCount', count);
        
        // Update display
        hitCounter.textContent = 'Visitors: ' + count.toString().padStart(6, '0');
    }
}

// Add a "new" label to recent content
function addNewLabels() {
    const today = new Date();
    const postDates = document.querySelectorAll('.post-meta');
    
    postDates.forEach(date => {
        const dateText = date.textContent.split('|')[0].replace('Posted on ', '').trim();
        const postDate = new Date(dateText);
        
        // If post is less than 7 days old
        if ((today - postDate) / (1000 * 60 * 60 * 24) < 7) {
            const newLabel = document.createElement('span');
            newLabel.textContent = ' NEW! ';
            newLabel.style.color = 'var(--highlight)';
            newLabel.className = 'blink';
            date.appendChild(newLabel);
        }
    });
}

// Add console easter egg
function addConsoleEasterEgg() {
    console.log(
        "%c    ____        __        _____ __    _      __    __   \n" +
        "   / __ )__  __/ /____   / ___// /_  (_)__  / /___/ /   \n" +
        "  / __  / / / / __/ _ \\  \\__ \\/ __ \\/ / _ \\/ / __  /    \n" +
        " / /_/ / /_/ / /_/  __/ ___/ / / / / /  __/ / /_/ /     \n" +
        "/_____/\\__, /\\__/\\___/ /____/_/ /_/_/\\___/_/\\__,_/      \n" +
        "      /____/                                            \n" +
        "%cWelcome, fellow security enthusiast! Explore the source.",
        "color: #ff8c00; font-family: monospace;",
        "color: #e0e0e0; font-family: monospace;"
    );
}

// Function to toggle dark/light mode (for future implementation)
function toggleDarkMode() {
    // This is a placeholder for adding a theme toggle feature later
    document.documentElement.classList.toggle('light-mode');
}