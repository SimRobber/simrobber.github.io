// Main app initialization and service worker registration
class App {
    constructor() {
        this.isOnline = navigator.onLine;
    }

    async init() {
        try {
            // Initialize database
            await db.init();
            
            // Initialize UI
            await ui.init();
            
            // Register service worker for PWA functionality
            await this.registerServiceWorker();
            
            // Set up online/offline handling
            this.setupOnlineOfflineHandling();
            
            // Set up install prompt
            this.setupInstallPrompt();
            
            console.log('Logger app initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to initialize app. Please refresh the page.');
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', registration);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, show update notification
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    setupOnlineOfflineHandling() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('You are back online!', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        });
    }

    setupInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            deferredPrompt = e;
            
            // Show install button or notification
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.showNotification('App installed successfully!', 'success');
        });
    }

    showInstallPrompt(deferredPrompt) {
        // Create install button in settings
        const settingsModal = document.getElementById('settings-modal');
        const settingsContent = settingsModal.querySelector('.modal-content');
        
        const installSection = document.createElement('div');
        installSection.className = 'settings-section';
        installSection.innerHTML = `
            <h4>Install App</h4>
            <p>Install Logger as a native app on your device for better experience.</p>
            <button id="install-app-btn" class="btn btn-primary">Install App</button>
        `;
        
        settingsContent.insertBefore(installSection, settingsContent.firstChild);
        
        document.getElementById('install-app-btn').addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // Clear the deferredPrompt so it can only be used once
                deferredPrompt = null;
            }
        });
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span>New version available!</span>
                <button onclick="location.reload()" class="btn btn-primary" style="padding: 4px 12px; font-size: 12px;">
                    Update
                </button>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #007AFF;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #FF3B30;
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-weight: 500;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#FF3B30' : type === 'warning' ? '#FF9500' : '#34C759'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-weight: 500;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, save any pending data
        console.log('Page hidden, saving data...');
    } else {
        // Page is visible, refresh data if needed
        console.log('Page visible, refreshing data...');
    }
});

// Handle beforeunload to save data
window.addEventListener('beforeunload', () => {
    // Save any pending data
    console.log('Page unloading, saving data...');
});

// Handle errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Export for global access
window.app = new App();
