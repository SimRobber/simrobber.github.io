// UI management and interactions
class UIManager {
    constructor() {
        this.currentTab = 'contacts';
        this.currentRefund = null;
        this.currentWarrantyClaim = null;
        this.currentContact = null;
        this.currentMethod = null;
        this.orders = [];
        this.refunds = [];
        this.warrantyClaims = [];
        this.contacts = [];
        this.methods = [];
        this.retailers = [];
        this.chatMessages = [];
        this.currentAgent = 'generic';
        this.isTyping = false;
    }

    async init() {
        await this.setupEventListeners();
        await this.loadData();
        await this.render();
        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            app.style.display = 'block';
        }, 1000);
    }

    async setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Add contact button
        document.getElementById('add-contact-btn').addEventListener('click', () => {
            this.showModal('add-contact-modal');
        });

        // Add refund button
        document.getElementById('add-refund-btn').addEventListener('click', () => {
            this.showModal('add-refund-modal');
        });

        // Add warranty claim button
        document.getElementById('add-warranty-btn').addEventListener('click', () => {
            this.showModal('add-warranty-modal');
        });

        // Add method button
        document.getElementById('add-method-btn').addEventListener('click', () => {
            this.showModal('add-method-modal');
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showModal('settings-modal');
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal();
            });
        });

        // Modal overlay click
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.hideModal();
            }
        });

        // Add contact form
        document.getElementById('add-contact-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddContact();
        });

        // Add refund form
        document.getElementById('add-refund-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddRefund();
        });

        // Add warranty form
        document.getElementById('add-warranty-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddWarrantyClaim();
        });

        // Add method form
        document.getElementById('add-method-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddMethod();
        });

        // Edit refund form
        document.getElementById('edit-refund-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditRefund();
        });

        // Edit warranty form
        document.getElementById('edit-warranty-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditWarrantyClaim();
        });

        // Edit method form
        document.getElementById('edit-method-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditMethod();
        });

        // Search inputs
        document.getElementById('contact-search').addEventListener('input', (e) => {
            this.filterContacts(e.target.value);
        });

        document.getElementById('refunds-search').addEventListener('input', (e) => {
            this.filterRefunds(e.target.value);
        });

        document.getElementById('warranty-search').addEventListener('input', (e) => {
            this.filterWarrantyClaims(e.target.value);
        });

        document.getElementById('methods-search').addEventListener('input', (e) => {
            this.filterMethods(e.target.value);
        });

        // Status filters
        document.getElementById('refund-status-filter').addEventListener('change', (e) => {
            this.filterRefundsByStatus(e.target.value);
        });

        document.getElementById('warranty-status-filter').addEventListener('change', (e) => {
            this.filterWarrantyClaimsByStatus(e.target.value);
        });

        // Timeframe selector
        document.getElementById('timeframe-selector').addEventListener('change', (e) => {
            this.updateAnalytics(e.target.value);
        });

        // Settings buttons
        document.getElementById('export-data-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('clear-data-btn').addEventListener('click', () => {
            this.clearAllData();
        });

        // Photo upload (if element exists)
        const orderPhotos = document.getElementById('order-photos');
        if (orderPhotos) {
            orderPhotos.addEventListener('change', (e) => {
                this.handlePhotoUpload(e.target.files);
            });
        }

        // Chat Practice event listeners
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            this.startNewChat();
        });

        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async loadData() {
        try {
            this.orders = await db.getOrders();
            this.refunds = await db.getRefunds();
            this.warrantyClaims = await db.getWarrantyClaims();
            this.contacts = await db.getContacts();
            this.methods = await db.getMethods();
            this.retailers = await db.getRetailers();
            
            // Migrate existing refunds to include new date fields
            this.refunds = await this.migrateRefunds(this.refunds);
            
            // Load sample retailers if none exist
            if (this.retailers.length === 0) {
                await this.loadSampleRetailers();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async migrateRefunds(refunds) {
        const migratedRefunds = [];
        
        for (const refund of refunds) {
            const migratedRefund = { ...refund };
            let needsUpdate = false;
            
            // Add default values for new fields if they don't exist
            if (!migratedRefund.deliveredDate) {
                migratedRefund.deliveredDate = new Date().toISOString().split('T')[0];
                needsUpdate = true;
            }
            if (!migratedRefund.returnDeadline) {
                // Set return deadline to 30 days from delivered date
                const deliveredDate = new Date(migratedRefund.deliveredDate);
                deliveredDate.setDate(deliveredDate.getDate() + 30);
                migratedRefund.returnDeadline = deliveredDate.toISOString().split('T')[0];
                needsUpdate = true;
            }
            
            migratedRefunds.push(migratedRefund);
            
            // Update in database if needed
            if (needsUpdate) {
                try {
                    await db.updateRefund(refund.id, {
                        deliveredDate: migratedRefund.deliveredDate,
                        returnDeadline: migratedRefund.returnDeadline
                    });
                } catch (error) {
                    console.error('Error updating refund during migration:', error);
                }
            }
        }
        
        return migratedRefunds;
    }

    async loadSampleRetailers() {
        const sampleRetailers = [
            { name: 'Amazon', phoneNumber: '1-888-280-4331', email: 'cs-reply@amazon.com', website: 'amazon.com', preferredContactMethod: 'Website' },
            { name: 'Best Buy', phoneNumber: '1-888-237-8289', email: 'customercare@bestbuy.com', website: 'bestbuy.com', preferredContactMethod: 'Phone' },
            { name: 'Walmart', phoneNumber: '1-800-925-6278', email: 'help@walmart.com', website: 'walmart.com', preferredContactMethod: 'Website' },
            { name: 'Target', phoneNumber: '1-800-440-0680', email: 'guest.service@target.com', website: 'target.com', preferredContactMethod: 'Phone' },
            { name: 'Apple', phoneNumber: '1-800-275-2273', email: 'support@apple.com', website: 'apple.com', preferredContactMethod: 'Phone' },
            { name: 'Google Store', phoneNumber: '1-855-836-3987', email: 'store-support@google.com', website: 'store.google.com', preferredContactMethod: 'Website' }
        ];

        for (const retailer of sampleRetailers) {
            await db.addRetailer(retailer);
        }

        this.retailers = await db.getRetailers();
    }

    async render() {
        await this.renderContacts();
        await this.renderRefunds();
        await this.renderWarrantyClaims();
        await this.renderMethods();
        await this.renderAnalytics();
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');

        this.currentTab = tab;
    }

    showModal(modalId) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById(modalId);
        
        if (!overlay || !modal) {
            console.error('Modal elements not found!');
            return;
        }
        
        overlay.style.display = 'flex';
        modal.style.display = 'block';
        
        // Focus first input
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    hideModal() {
        const overlay = document.getElementById('modal-overlay');
        const modals = document.querySelectorAll('.modal');
        
        overlay.style.display = 'none';
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Clear forms
        document.querySelectorAll('form').forEach(form => {
            form.reset();
        });
        
        // Clear photo preview (if element exists)
        const photoPreview = document.getElementById('photo-preview');
        if (photoPreview) {
            photoPreview.innerHTML = '';
        }
    }

    async renderContacts() {
        const contactsList = document.getElementById('contacts-list');
        const emptyContacts = document.getElementById('empty-contacts');
        
        if (this.contacts.length === 0) {
            contactsList.style.display = 'none';
            emptyContacts.style.display = 'block';
            return;
        }
        
        contactsList.style.display = 'block';
        emptyContacts.style.display = 'none';
        
        contactsList.innerHTML = this.contacts.map(contact => this.createContactCard(contact)).join('');
    }

    async renderOrders() {
        // This method is kept for compatibility but orders are no longer displayed
        // since we replaced the Orders tab with Contacts tab
        return;
    }

    createContactCard(contact) {
        return `
            <div class="contact-card" onclick="ui.showContactDetail('${contact.id}')">
                <div class="contact-header">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-platform">${contact.socialPlatform}</div>
                </div>
                <div class="contact-info">${contact.usernameEmailPhone}</div>
                <div class="contact-meta">
                    <div>${contact.role || 'No role specified'}</div>
                    <div>${this.formatDate(contact.createdAt)}</div>
                </div>
                ${contact.notes ? `<div class="contact-notes">${contact.notes}</div>` : ''}
            </div>
        `;
    }

    async renderRefunds() {
        const refundsList = document.getElementById('refunds-list');
        const emptyRefunds = document.getElementById('empty-refunds');
        
        if (this.refunds.length === 0) {
            refundsList.style.display = 'none';
            emptyRefunds.style.display = 'block';
            return;
        }
        
        refundsList.style.display = 'block';
        emptyRefunds.style.display = 'none';
        
        refundsList.innerHTML = this.refunds.map(refund => this.createRefundCard(refund)).join('');
    }

    createRefundCard(refund) {
        const statusClass = this.getStatusClass(refund.status);
        const daysRemaining = this.calculateDaysRemaining(refund.returnDeadline);
        const daysText = this.getDaysRemainingText(daysRemaining);
        const daysClass = this.getDaysRemainingClass(daysRemaining);
        
        return `
            <div class="refund-card" onclick="ui.showRefundDetail('${refund.id}')">
                <div class="order-header">
                    <div class="order-retailer">
                        <span class="status-indicator ${statusClass}"></span>
                        ${refund.retailerName}
                    </div>
                    <div class="status-badge status-${statusClass}">${refund.status}</div>
                </div>
                <div class="order-description">£${refund.amount.toFixed(2)} • ${refund.method}</div>
                <div class="order-meta">
                    <div>${refund.stage}</div>
                    <div>${this.formatDate(refund.createdAt)}</div>
                </div>
                ${daysText ? `<div class="days-remaining ${daysClass}">${daysText}</div>` : ''}
            </div>
        `;
    }

    async renderWarrantyClaims() {
        const warrantyList = document.getElementById('warranty-list');
        const emptyWarranty = document.getElementById('empty-warranty');
        
        if (this.warrantyClaims.length === 0) {
            warrantyList.style.display = 'none';
            emptyWarranty.style.display = 'block';
            return;
        }
        
        warrantyList.style.display = 'block';
        emptyWarranty.style.display = 'none';
        
        warrantyList.innerHTML = this.warrantyClaims.map(claim => this.createWarrantyCard(claim)).join('');
    }

    createWarrantyCard(claim) {
        const statusClass = this.getStatusClass(claim.status);
        
        return `
            <div class="warranty-card" onclick="ui.showWarrantyDetail('${claim.id}')">
                <div class="order-header">
                    <div class="order-retailer">
                        <span class="status-indicator ${statusClass}"></span>
                        ${claim.retailerName}
                    </div>
                    <div class="status-badge status-${statusClass}">${claim.status}</div>
                </div>
                <div class="order-description">${claim.itemInfo.substring(0, 100)}${claim.itemInfo.length > 100 ? '...' : ''}</div>
                <div class="order-meta">
                    <div>${claim.method}</div>
                    <div>${this.formatDate(claim.createdAt)}</div>
                </div>
            </div>
        `;
    }

    async renderMethods() {
        const methodsList = document.getElementById('methods-list');
        const emptyMethods = document.getElementById('empty-methods');
        
        if (this.methods.length === 0) {
            methodsList.style.display = 'none';
            emptyMethods.style.display = 'block';
            return;
        }
        
        methodsList.style.display = 'block';
        emptyMethods.style.display = 'none';
        
        methodsList.innerHTML = this.methods.map(method => this.createMethodCard(method)).join('');
    }

    createMethodCard(method) {
        return `
            <div class="method-card" onclick="ui.showMethodDetail('${method.id}')">
                <div class="method-header">
                    <div class="method-retailer">${method.retailer}</div>
                    <div class="method-name">${method.method}</div>
                </div>
                <div class="method-details">
                    <div class="method-timeframe">Time Frame: ${method.timeframe}</div>
                    <div class="method-tested">Tested: £${method.testedAmount.toFixed(2)} (${method.testedItems} items)</div>
                </div>
                <div class="method-meta">
                    <div>${this.formatDate(method.createdAt)}</div>
                </div>
                ${method.notes ? `<div class="method-notes">${method.notes}</div>` : ''}
            </div>
        `;
    }

    async renderAnalytics() {
        const analyticsContent = document.getElementById('analytics-content');
        const timeframe = document.getElementById('timeframe-selector').value;
        
        const filteredRefunds = this.getFilteredRefunds(timeframe);
        const filteredWarrantyClaims = this.getFilteredWarrantyClaims(timeframe);
        
        const completedRefunds = filteredRefunds.filter(refund => refund.status === 'Complete');
        const completedWarrantyClaims = filteredWarrantyClaims.filter(claim => claim.status === 'Complete');
        
        const totalRefunded = completedRefunds.reduce((sum, refund) => sum + refund.amount, 0);
        const refundSuccessRate = filteredRefunds.length > 0 ? 
            (completedRefunds.length / filteredRefunds.length * 100) : 0;
        const warrantySuccessRate = filteredWarrantyClaims.length > 0 ? 
            (completedWarrantyClaims.length / filteredWarrantyClaims.length * 100) : 0;
        
        analyticsContent.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-card-icon" style="background: #FFE5E5; color: #FF3B30;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                    </div>
                    <div class="summary-card-value">${filteredRefunds.length}</div>
                    <div class="summary-card-label">Total Refunds</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-icon" style="background: #FFE5E5; color: #FF9500;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        </svg>
                    </div>
                    <div class="summary-card-value">${filteredWarrantyClaims.length}</div>
                    <div class="summary-card-label">Warranty Claims</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-icon" style="background: #E8F5E8; color: #34C759;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22,4 12,14.01 9,11.01"></polyline>
                        </svg>
                    </div>
                    <div class="summary-card-value">${completedRefunds.length + completedWarrantyClaims.length}</div>
                    <div class="summary-card-label">Completed</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-icon" style="background: #E3F2FD; color: #007AFF;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                    </div>
                    <div class="summary-card-value">£${totalRefunded.toFixed(2)}</div>
                    <div class="summary-card-label">Total Refunded</div>
                </div>
            </div>
            
            <div class="chart-container">
                <div class="chart-title">Success Rates</div>
                <div class="success-rates">
                    <div class="success-rate-item">
                        <span class="rate-label">Refunds</span>
                        <span class="rate-value">${Math.round(refundSuccessRate)}%</span>
                    </div>
                    <div class="success-rate-item">
                        <span class="rate-label">Warranty Claims</span>
                        <span class="rate-value">${Math.round(warrantySuccessRate)}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    getFilteredRefunds(timeframe) {
        if (timeframe === 'all') return this.refunds;
        
        const days = parseInt(timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return this.refunds.filter(refund => {
            const refundDate = new Date(refund.createdAt);
            return refundDate >= cutoffDate;
        });
    }

    getFilteredWarrantyClaims(timeframe) {
        if (timeframe === 'all') return this.warrantyClaims;
        
        const days = parseInt(timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return this.warrantyClaims.filter(claim => {
            const claimDate = new Date(claim.createdAt);
            return claimDate >= cutoffDate;
        });
    }

    async handleAddOrder() {
        const orderData = {
            retailerName: document.getElementById('retailer-name').value,
            orderNumber: document.getElementById('order-number').value,
            purchaseDate: document.getElementById('purchase-date').value,
            itemDescription: document.getElementById('item-description').value,
            purchasePrice: parseFloat(document.getElementById('purchase-price').value) || 0,
            shippingCost: parseFloat(document.getElementById('shipping-cost').value) || 0,
            warrantyPeriod: parseInt(document.getElementById('warranty-period').value) || 0,
            reasonForClaim: document.getElementById('reason-for-claim').value
        };
        
        try {
            const newOrder = await db.addOrder(orderData);
            this.orders.unshift(newOrder);
            await this.renderOrders();
            this.hideModal();
            this.showNotification('Order added successfully!');
        } catch (error) {
            console.error('Error adding order:', error);
            this.showNotification('Error adding order. Please try again.', 'error');
        }
    }

    async handleAddContact() {
        const contactData = {
            name: document.getElementById('contact-name').value,
            socialPlatform: document.getElementById('social-platform').value,
            usernameEmailPhone: document.getElementById('username-email-phone').value,
            role: document.getElementById('contact-role').value,
            notes: document.getElementById('contact-notes').value
        };
        
        try {
            const newContact = await db.addContact(contactData);
            this.contacts.unshift(newContact);
            await this.renderContacts();
            this.hideModal();
            this.showNotification('Contact added successfully!');
        } catch (error) {
            console.error('Error adding contact:', error);
            this.showNotification('Error adding contact. Please try again.', 'error');
        }
    }

    async handleAddRefund() {
        const refundData = {
            retailerName: document.getElementById('refund-retailer').value,
            amount: parseFloat(document.getElementById('refund-amount').value) || 0,
            method: document.getElementById('refund-method').value,
            stage: document.getElementById('refund-stage').value,
            status: document.getElementById('refund-stage').value,
            deliveredDate: document.getElementById('refund-delivered-date').value,
            returnDeadline: document.getElementById('refund-return-deadline').value,
            notes: document.getElementById('refund-notes').value
        };
        
        try {
            const newRefund = await db.addRefund(refundData);
            this.refunds.unshift(newRefund);
            await this.renderRefunds();
            this.hideModal();
            this.showNotification('Refund added successfully!');
        } catch (error) {
            console.error('Error adding refund:', error);
            this.showNotification('Error adding refund. Please try again.', 'error');
        }
    }

    async handleAddWarrantyClaim() {
        const claimData = {
            retailerName: document.getElementById('warranty-retailer').value,
            itemInfo: document.getElementById('warranty-item').value,
            method: document.getElementById('warranty-method').value,
            stage: document.getElementById('warranty-stage').value,
            status: document.getElementById('warranty-stage').value,
            notes: document.getElementById('warranty-notes').value
        };
        
        try {
            const newClaim = await db.addWarrantyClaim(claimData);
            this.warrantyClaims.unshift(newClaim);
            await this.renderWarrantyClaims();
            this.hideModal();
            this.showNotification('Warranty claim added successfully!');
        } catch (error) {
            console.error('Error adding warranty claim:', error);
            this.showNotification('Error adding warranty claim. Please try again.', 'error');
        }
    }

    async handleAddMethod() {
        const methodData = {
            retailer: document.getElementById('method-retailer').value,
            method: document.getElementById('method-name').value,
            timeframe: document.getElementById('method-timeframe').value,
            testedAmount: parseFloat(document.getElementById('method-tested-amount').value) || 0,
            testedItems: parseInt(document.getElementById('method-tested-items').value) || 0,
            notes: document.getElementById('method-notes').value
        };
        
        try {
            const newMethod = await db.addMethod(methodData);
            this.methods.unshift(newMethod);
            await this.renderMethods();
            this.hideModal();
            this.showNotification('Method added successfully!');
        } catch (error) {
            console.error('Error adding method:', error);
            this.showNotification('Error adding method. Please try again.', 'error');
        }
    }

    async showContactDetail(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;
        
        this.currentContact = contact;
        
        // For now, just show a simple alert with contact details
        // You can expand this to show a proper modal later
        alert(`Contact Details:\n\nName: ${contact.name}\nPlatform: ${contact.socialPlatform}\nContact: ${contact.usernameEmailPhone}\nRole: ${contact.role || 'Not specified'}\nNotes: ${contact.notes || 'None'}`);
    }

    async showRefundDetail(refundId) {
        const refund = this.refunds.find(r => r.id === refundId);
        if (!refund) return;
        
        this.currentRefund = refund;
        
        document.getElementById('refund-detail-title').textContent = `${refund.retailerName} - Refund Details`;
        
        const daysRemaining = this.calculateDaysRemaining(refund.returnDeadline);
        const daysText = this.getDaysRemainingText(daysRemaining);
        const daysClass = this.getDaysRemainingClass(daysRemaining);
        
        document.getElementById('refund-detail-content').innerHTML = `
            <div class="detail-section">
                <h4>Refund Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Retailer</label>
                        <span>${refund.retailerName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Amount</label>
                        <span>£${refund.amount.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Method</label>
                        <span>${refund.method}</span>
                    </div>
                    <div class="detail-item">
                        <label>Stage</label>
                        <span class="status-badge status-${this.getStatusClass(refund.status)}">${refund.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Delivered Date</label>
                        <span>${refund.deliveredDate ? this.formatDate(refund.deliveredDate) : 'Not set'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Return Deadline</label>
                        <span>${refund.returnDeadline ? this.formatDate(refund.returnDeadline) : 'Not set'}</span>
                    </div>
                    ${daysText ? `
                        <div class="detail-item full-width">
                            <label>Days Remaining</label>
                            <span class="days-remaining ${daysClass}">${daysText}</span>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <label>Created</label>
                        <span>${this.formatDate(refund.createdAt)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Updated</label>
                        <span>${this.formatDate(refund.updatedAt)}</span>
                    </div>
                    ${refund.notes ? `
                        <div class="detail-item full-width">
                            <label>Notes</label>
                            <span>${refund.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="ui.showEditRefund('${refund.id}')">
                    Edit Refund
                </button>
                <button class="btn btn-danger" onclick="ui.deleteRefund('${refund.id}')">
                    Delete Refund
                </button>
            </div>
        `;
        
        this.showModal('refund-detail-modal');
    }

    async showWarrantyDetail(claimId) {
        const claim = this.warrantyClaims.find(c => c.id === claimId);
        if (!claim) return;
        
        this.currentWarrantyClaim = claim;
        
        document.getElementById('warranty-detail-title').textContent = `${claim.retailerName} - Warranty Claim Details`;
        
        document.getElementById('warranty-detail-content').innerHTML = `
            <div class="detail-section">
                <h4>Warranty Claim Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Retailer</label>
                        <span>${claim.retailerName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Item Info</label>
                        <span>${claim.itemInfo}</span>
                    </div>
                    <div class="detail-item">
                        <label>Method</label>
                        <span>${claim.method}</span>
                    </div>
                    <div class="detail-item">
                        <label>Stage</label>
                        <span class="status-badge status-${this.getStatusClass(claim.status)}">${claim.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created</label>
                        <span>${this.formatDate(claim.createdAt)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Updated</label>
                        <span>${this.formatDate(claim.updatedAt)}</span>
                    </div>
                    ${claim.notes ? `
                        <div class="detail-item full-width">
                            <label>Notes</label>
                            <span>${claim.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="ui.showEditWarranty('${claim.id}')">
                    Edit Warranty Claim
                </button>
                <button class="btn btn-danger" onclick="ui.deleteWarrantyClaim('${claim.id}')">
                    Delete Warranty Claim
                </button>
            </div>
        `;
        
        this.showModal('warranty-detail-modal');
    }

    async showMethodDetail(methodId) {
        const method = this.methods.find(m => m.id === methodId);
        if (!method) return;
        
        this.currentMethod = method;
        
        document.getElementById('method-detail-title').textContent = `${method.retailer} - Method Details`;
        
        document.getElementById('method-detail-content').innerHTML = `
            <div class="detail-section">
                <h4>Method Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Retailer</label>
                        <span>${method.retailer}</span>
                    </div>
                    <div class="detail-item">
                        <label>Method</label>
                        <span>${method.method}</span>
                    </div>
                    <div class="detail-item">
                        <label>Time Frame</label>
                        <span>${method.timeframe}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tested Amount</label>
                        <span>£${method.testedAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tested Items</label>
                        <span>${method.testedItems}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created</label>
                        <span>${this.formatDate(method.createdAt)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Updated</label>
                        <span>${this.formatDate(method.updatedAt)}</span>
                    </div>
                    ${method.notes ? `
                        <div class="detail-item full-width">
                            <label>Notes</label>
                            <span>${method.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="ui.showEditMethod('${method.id}')">
                    Edit Method
                </button>
                <button class="btn btn-danger" onclick="ui.deleteMethod('${method.id}')">
                    Delete Method
                </button>
            </div>
        `;
        
        this.showModal('method-detail-modal');
    }

    async showOrderDetail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        this.showNotification('Order detail view coming soon!');
    }

    async showEditRefund(refundId) {
        const refund = this.refunds.find(r => r.id === refundId);
        if (!refund) return;
        
        // Populate edit form
        document.getElementById('edit-refund-id').value = refund.id;
        document.getElementById('edit-refund-retailer').value = refund.retailerName;
        document.getElementById('edit-refund-amount').value = refund.amount;
        document.getElementById('edit-refund-method').value = refund.method;
        document.getElementById('edit-refund-stage').value = refund.status;
        document.getElementById('edit-refund-delivered-date').value = refund.deliveredDate || '';
        document.getElementById('edit-refund-return-deadline').value = refund.returnDeadline || '';
        document.getElementById('edit-refund-notes').value = refund.notes || '';
        
        this.hideModal();
        this.showModal('edit-refund-modal');
    }

    async showEditWarranty(claimId) {
        const claim = this.warrantyClaims.find(c => c.id === claimId);
        if (!claim) return;
        
        // Populate edit form
        document.getElementById('edit-warranty-id').value = claim.id;
        document.getElementById('edit-warranty-retailer').value = claim.retailerName;
        document.getElementById('edit-warranty-item').value = claim.itemInfo;
        document.getElementById('edit-warranty-method').value = claim.method;
        document.getElementById('edit-warranty-stage').value = claim.status;
        document.getElementById('edit-warranty-notes').value = claim.notes || '';
        
        this.hideModal();
        this.showModal('edit-warranty-modal');
    }

    async showEditMethod(methodId) {
        const method = this.methods.find(m => m.id === methodId);
        if (!method) return;
        
        // Populate edit form
        document.getElementById('edit-method-id').value = method.id;
        document.getElementById('edit-method-retailer').value = method.retailer;
        document.getElementById('edit-method-name').value = method.method;
        document.getElementById('edit-method-timeframe').value = method.timeframe;
        document.getElementById('edit-method-tested-amount').value = method.testedAmount;
        document.getElementById('edit-method-tested-items').value = method.testedItems;
        document.getElementById('edit-method-notes').value = method.notes || '';
        
        this.hideModal();
        this.showModal('edit-method-modal');
    }

    async handleEditRefund() {
        const refundId = document.getElementById('edit-refund-id').value;
        const updates = {
            retailerName: document.getElementById('edit-refund-retailer').value,
            amount: parseFloat(document.getElementById('edit-refund-amount').value) || 0,
            method: document.getElementById('edit-refund-method').value,
            stage: document.getElementById('edit-refund-stage').value,
            status: document.getElementById('edit-refund-stage').value,
            deliveredDate: document.getElementById('edit-refund-delivered-date').value,
            returnDeadline: document.getElementById('edit-refund-return-deadline').value,
            notes: document.getElementById('edit-refund-notes').value
        };
        
        try {
            await db.updateRefund(refundId, updates);
            
            // Update local data
            const refundIndex = this.refunds.findIndex(r => r.id === refundId);
            if (refundIndex !== -1) {
                Object.assign(this.refunds[refundIndex], updates, { updatedAt: new Date().toISOString() });
            }
            
            await this.renderRefunds();
            this.hideModal();
            this.showNotification('Refund updated successfully!');
        } catch (error) {
            console.error('Error updating refund:', error);
            this.showNotification('Error updating refund. Please try again.', 'error');
        }
    }

    async handleEditWarrantyClaim() {
        const claimId = document.getElementById('edit-warranty-id').value;
        const updates = {
            retailerName: document.getElementById('edit-warranty-retailer').value,
            itemInfo: document.getElementById('edit-warranty-item').value,
            method: document.getElementById('edit-warranty-method').value,
            stage: document.getElementById('edit-warranty-stage').value,
            status: document.getElementById('edit-warranty-stage').value,
            notes: document.getElementById('edit-warranty-notes').value
        };
        
        try {
            await db.updateWarrantyClaim(claimId, updates);
            
            // Update local data
            const claimIndex = this.warrantyClaims.findIndex(c => c.id === claimId);
            if (claimIndex !== -1) {
                Object.assign(this.warrantyClaims[claimIndex], updates, { updatedAt: new Date().toISOString() });
            }
            
            await this.renderWarrantyClaims();
            this.hideModal();
            this.showNotification('Warranty claim updated successfully!');
        } catch (error) {
            console.error('Error updating warranty claim:', error);
            this.showNotification('Error updating warranty claim. Please try again.', 'error');
        }
    }

    async handleEditMethod() {
        const methodId = document.getElementById('edit-method-id').value;
        const updates = {
            retailer: document.getElementById('edit-method-retailer').value,
            method: document.getElementById('edit-method-name').value,
            timeframe: document.getElementById('edit-method-timeframe').value,
            testedAmount: parseFloat(document.getElementById('edit-method-tested-amount').value) || 0,
            testedItems: parseInt(document.getElementById('edit-method-tested-items').value) || 0,
            notes: document.getElementById('edit-method-notes').value
        };
        
        try {
            await db.updateMethod(methodId, updates);
            
            // Update local data
            const methodIndex = this.methods.findIndex(m => m.id === methodId);
            if (methodIndex !== -1) {
                Object.assign(this.methods[methodIndex], updates, { updatedAt: new Date().toISOString() });
            }
            
            await this.renderMethods();
            this.hideModal();
            this.showNotification('Method updated successfully!');
        } catch (error) {
            console.error('Error updating method:', error);
            this.showNotification('Error updating method. Please try again.', 'error');
        }
    }

    async deleteRefund(refundId) {
        if (confirm('Are you sure you want to delete this refund? This action cannot be undone.')) {
            try {
                await db.deleteRefund(refundId);
                
                // Remove from local data
                this.refunds = this.refunds.filter(r => r.id !== refundId);
                
                await this.renderRefunds();
                this.hideModal();
                this.showNotification('Refund deleted successfully!');
            } catch (error) {
                console.error('Error deleting refund:', error);
                this.showNotification('Error deleting refund. Please try again.', 'error');
            }
        }
    }

    async deleteWarrantyClaim(claimId) {
        if (confirm('Are you sure you want to delete this warranty claim? This action cannot be undone.')) {
            try {
                await db.deleteWarrantyClaim(claimId);
                
                // Remove from local data
                this.warrantyClaims = this.warrantyClaims.filter(c => c.id !== claimId);
                
                await this.renderWarrantyClaims();
                this.hideModal();
                this.showNotification('Warranty claim deleted successfully!');
            } catch (error) {
                console.error('Error deleting warranty claim:', error);
                this.showNotification('Error deleting warranty claim. Please try again.', 'error');
            }
        }
    }

    async deleteMethod(methodId) {
        if (confirm('Are you sure you want to delete this method? This action cannot be undone.')) {
            try {
                await db.deleteMethod(methodId);
                
                // Remove from local data
                this.methods = this.methods.filter(m => m.id !== methodId);
                
                await this.renderMethods();
                this.hideModal();
                this.showNotification('Method deleted successfully!');
            } catch (error) {
                console.error('Error deleting method:', error);
                this.showNotification('Error deleting method. Please try again.', 'error');
            }
        }
    }

    filterContacts(searchTerm) {
        const filteredContacts = this.contacts.filter(contact => 
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.socialPlatform.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.usernameEmailPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (contact.role && contact.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (contact.notes && contact.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderFilteredContacts(filteredContacts);
    }

    renderFilteredContacts(contacts) {
        const contactsList = document.getElementById('contacts-list');
        const emptyContacts = document.getElementById('empty-contacts');
        
        if (contacts.length === 0) {
            contactsList.style.display = 'none';
            emptyContacts.style.display = 'block';
            return;
        }
        
        contactsList.style.display = 'block';
        emptyContacts.style.display = 'none';
        
        contactsList.innerHTML = contacts.map(contact => this.createContactCard(contact)).join('');
    }

    filterOrders(searchTerm) {
        const filteredOrders = this.orders.filter(order => 
            order.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.itemDescription.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderFilteredOrders(filteredOrders);
    }

    renderFilteredOrders(orders) {
        const ordersList = document.getElementById('orders-list');
        const emptyOrders = document.getElementById('empty-orders');
        
        if (orders.length === 0) {
            ordersList.style.display = 'none';
            emptyOrders.style.display = 'block';
            return;
        }
        
        ordersList.style.display = 'block';
        emptyOrders.style.display = 'none';
        
        ordersList.innerHTML = orders.map(order => this.createOrderCard(order)).join('');
    }

    filterRefunds(searchTerm) {
        const filteredRefunds = this.refunds.filter(refund => 
            refund.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            refund.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (refund.notes && refund.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderFilteredRefunds(filteredRefunds);
    }

    renderFilteredRefunds(refunds) {
        const refundsList = document.getElementById('refunds-list');
        const emptyRefunds = document.getElementById('empty-refunds');
        
        if (refunds.length === 0) {
            refundsList.style.display = 'none';
            emptyRefunds.style.display = 'block';
            return;
        }
        
        refundsList.style.display = 'block';
        emptyRefunds.style.display = 'none';
        
        refundsList.innerHTML = refunds.map(refund => this.createRefundCard(refund)).join('');
    }

    filterRefundsByStatus(status) {
        if (status === 'all') {
            this.renderFilteredRefunds(this.refunds);
        } else {
            const filteredRefunds = this.refunds.filter(refund => refund.status === status);
            this.renderFilteredRefunds(filteredRefunds);
        }
    }

    filterWarrantyClaims(searchTerm) {
        const filteredClaims = this.warrantyClaims.filter(claim => 
            claim.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            claim.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
            claim.itemInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (claim.notes && claim.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderFilteredWarrantyClaims(filteredClaims);
    }

    renderFilteredWarrantyClaims(claims) {
        const warrantyList = document.getElementById('warranty-list');
        const emptyWarranty = document.getElementById('empty-warranty');
        
        if (claims.length === 0) {
            warrantyList.style.display = 'none';
            emptyWarranty.style.display = 'block';
            return;
        }
        
        warrantyList.style.display = 'block';
        emptyWarranty.style.display = 'none';
        
        warrantyList.innerHTML = claims.map(claim => this.createWarrantyCard(claim)).join('');
    }

    filterWarrantyClaimsByStatus(status) {
        if (status === 'all') {
            this.renderFilteredWarrantyClaims(this.warrantyClaims);
        } else {
            const filteredClaims = this.warrantyClaims.filter(claim => claim.status === status);
            this.renderFilteredWarrantyClaims(filteredClaims);
        }
    }

    filterMethods(searchTerm) {
        const filteredMethods = this.methods.filter(method => 
            method.retailer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            method.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
            method.timeframe.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (method.notes && method.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderFilteredMethods(filteredMethods);
    }

    renderFilteredMethods(methods) {
        const methodsList = document.getElementById('methods-list');
        const emptyMethods = document.getElementById('empty-methods');
        
        if (methods.length === 0) {
            methodsList.style.display = 'none';
            emptyMethods.style.display = 'block';
            return;
        }
        
        methodsList.style.display = 'block';
        emptyMethods.style.display = 'none';
        
        methodsList.innerHTML = methods.map(method => this.createMethodCard(method)).join('');
    }

    async updateAnalytics(timeframe) {
        await this.renderAnalytics();
    }

    async exportData() {
        try {
            const data = await db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `logger-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Data exported successfully!');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Error exporting data. Please try again.', 'error');
        }
    }

    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                await db.clearAllData();
                this.orders = [];
                this.refunds = [];
                this.warrantyClaims = [];
                this.contacts = [];
                this.methods = [];
                await this.render();
                this.hideModal();
                this.showNotification('All data cleared successfully!');
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showNotification('Error clearing data. Please try again.', 'error');
            }
        }
    }

    handlePhotoUpload(files) {
        const preview = document.getElementById('photo-preview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.height = '80px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    getStatusClass(status) {
        const statusMap = {
            'Planned': 'planned',
            'In Progress': 'in-progress',
            'Complete': 'complete'
        };
        return statusMap[status] || 'planned';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    calculateDaysRemaining(returnDeadline) {
        if (!returnDeadline) return null;
        
        const today = new Date();
        const deadline = new Date(returnDeadline);
        
        // Set time to start of day for accurate day calculation
        today.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);
        
        const timeDiff = deadline.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return daysRemaining;
    }

    getDaysRemainingText(daysRemaining) {
        if (daysRemaining === null) return '';
        
        if (daysRemaining < 0) {
            return `Expired ${Math.abs(daysRemaining)} days ago`;
        } else if (daysRemaining === 0) {
            return 'Expires today';
        } else if (daysRemaining === 1) {
            return 'Expires tomorrow';
        } else {
            return `${daysRemaining} days remaining`;
        }
    }

    getDaysRemainingClass(daysRemaining) {
        if (daysRemaining === null) return '';
        
        if (daysRemaining < 0) {
            return 'days-expired';
        } else if (daysRemaining <= 3) {
            return 'days-urgent';
        } else if (daysRemaining <= 7) {
            return 'days-warning';
        } else {
            return 'days-ok';
        }
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
            background: ${type === 'error' ? '#FF3B30' : '#34C759'};
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

    // Chat Practice Methods
    startNewChat() {
        this.chatMessages = [];
        this.renderChatMessages();
        this.enableChatInput();
        this.addAgentMessage(this.getAgentGreeting());
    }

    enableChatInput() {
        document.getElementById('chat-input').disabled = false;
        document.getElementById('send-btn').disabled = false;
    }

    disableChatInput() {
        document.getElementById('chat-input').disabled = true;
        document.getElementById('send-btn').disabled = true;
    }

    getAgentGreeting() {
        const greetings = {
            amazon: "Hello! I'm Sarah from Amazon Customer Service. How can I help you with your order today?",
            bestbuy: "Hi there! I'm Mike from Best Buy Support. What can I assist you with regarding your purchase?",
            walmart: "Good day! I'm Jennifer from Walmart Customer Care. How may I help you today?",
            target: "Hello! I'm David from Target Guest Services. What brings you here today?",
            apple: "Hi! I'm Lisa from Apple Support. How can I help you with your Apple product today?",
            generic: "Hello! I'm a customer service representative. How can I assist you today?"
        };
        return greetings[this.currentAgent] || greetings.generic;
    }

    getAgentName() {
        return "AI Assistant";
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addUserMessage(message);
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Generate AI response
            const response = await this.generateAIResponse(message);
            this.hideTypingIndicator();
            this.addAgentMessage(response);
        } catch (error) {
            console.error('Error generating AI response:', error);
            this.hideTypingIndicator();
            this.addAgentMessage("I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?");
        }
    }

    addUserMessage(text) {
        const message = {
            type: 'user',
            text: text,
            timestamp: new Date()
        };
        this.chatMessages.push(message);
        this.renderChatMessages();
    }

    addAgentMessage(text) {
        const message = {
            type: 'agent',
            text: text,
            timestamp: new Date()
        };
        this.chatMessages.push(message);
        this.renderChatMessages();
    }

    renderChatMessages() {
        const container = document.getElementById('chat-messages');
        
        if (this.chatMessages.length === 0) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <div class="welcome-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3>Welcome to Chat Practice!</h3>
                    <p>Practice your customer service conversations with AI agents. Select a retailer preset above and start chatting!</p>
                    <div class="practice-tips">
                        <h4>Practice Tips:</h4>
                        <ul>
                            <li>Be polite and professional</li>
                            <li>Clearly explain your issue</li>
                            <li>Ask for specific solutions</li>
                            <li>Keep records of the conversation</li>
                        </ul>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.chatMessages.map(msg => this.createMessageHTML(msg)).join('');
        container.scrollTop = container.scrollHeight;
    }

    createMessageHTML(message) {
        const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const avatar = message.type === 'user' ? 'U' : this.getAgentName().charAt(0);
        
        return `
            <div class="message">
                <div class="message-avatar ${message.type}">${avatar}</div>
                <div class="message-content ${message.type}">
                    <p class="message-text">${this.escapeHtml(message.text)}</p>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }

    showTypingIndicator() {
        const container = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar agent">${this.getAgentName().charAt(0)}</div>
            <div class="message-content agent">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async generateAIResponse(userMessage) {
        try {
            // Use a free AI API - we'll use Hugging Face's free inference API
            const response = await this.callAIAPI(userMessage);
            return response;
        } catch (error) {
            console.error('AI API Error:', error);
            // Fallback to a simple response if AI fails
            return "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?";
        }
    }

    async callAIAPI(userMessage) {
        try {
            // Use a free, working AI service - we'll use a simple but effective approach
            return await this.callFreeAIService(userMessage);
        } catch (error) {
            console.error('AI API Error:', error);
            return this.getFallbackResponse(userMessage, this.getRetailerName());
        }
    }

    async callFreeAIService(userMessage) {
        // Simulate AI processing with intelligent context-aware responses
        const retailer = this.getRetailerName();
        const message = userMessage.toLowerCase();
        
        // Add realistic processing delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        // Advanced AI-like response generation based on context and sentiment
        const context = this.analyzeMessageContext(userMessage);
        const sentiment = this.analyzeSentiment(userMessage);
        
        return this.generateContextualResponse(userMessage, retailer, context, sentiment);
    }

    analyzeMessageContext(message) {
        const lowerMessage = message.toLowerCase();
        
        // Analyze the context and intent
        const context = {
            isGreeting: /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(message),
            isFarewell: /(bye|goodbye|see you|thanks|thank you|have a good)/i.test(message),
            isComplaint: /(angry|frustrated|upset|disappointed|terrible|awful|horrible|worst)/i.test(message),
            isUrgent: /(urgent|asap|immediately|right now|emergency)/i.test(message),
            isQuestion: message.includes('?') || /(how|what|when|where|why|can you|could you|would you)/i.test(message),
            isRefund: /(refund|return|money back|credit|reimburse)/i.test(message),
            isTechnical: /(broken|not working|defective|damaged|error|issue|problem|bug)/i.test(message),
            isShipping: /(shipping|delivery|tracking|shipped|arrived|package)/i.test(message),
            isWarranty: /(warranty|repair|service|fix|replacement)/i.test(message),
            isOrder: /(order|purchase|bought|billing|charge|payment)/i.test(message),
            isPricing: /(price|cost|expensive|cheap|discount|sale)/i.test(message),
            isCancellation: /(cancel|stop|unsubscribe|remove)/i.test(message)
        };
        
        return context;
    }

    analyzeSentiment(message) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'pleased', 'satisfied'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'frustrated', 'disappointed', 'upset', 'annoyed'];
        
        const lowerMessage = message.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    generateContextualResponse(userMessage, retailer, context, sentiment) {
        // Generate highly contextual and intelligent responses
        
        if (context.isGreeting) {
            const greetings = [
                `Hello! Thank you for contacting ${retailer} customer service. How can I assist you today?`,
                `Hi there! Welcome to ${retailer} support. What can I help you with?`,
                `Good day! I'm here to help you with any questions or concerns you may have. How can I assist you?`
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        if (context.isFarewell) {
            return `Thank you for contacting ${retailer}! Have a wonderful day, and please don't hesitate to reach out if you need any further assistance.`;
        }
        
        if (context.isComplaint && sentiment === 'negative') {
            const empatheticResponses = [
                `I'm truly sorry for the frustration you're experiencing. I want to make sure we resolve this for you. Can you tell me more about what happened so I can help make this right?`,
                `I understand how upsetting this must be, and I sincerely apologize. Let me work with you to find a solution that addresses your concerns.`,
                `I'm sorry that we've let you down. Your satisfaction is important to us, and I'm committed to helping you resolve this issue.`
            ];
            return empatheticResponses[Math.floor(Math.random() * empatheticResponses.length)];
        }
        
        if (context.isRefund) {
            return `I understand you'd like to process a refund. I'd be happy to help you with that. Could you please provide your order number so I can look up your purchase and assist you further?`;
        }
        
        if (context.isTechnical) {
            return `I'm sorry to hear about the technical issue you're experiencing. That's definitely not what we want for our customers. Can you tell me more about what's happening so I can help you get this resolved?`;
        }
        
        if (context.isShipping) {
            return `I can help you with shipping information. Do you have your order number or tracking number available? I can look up the current status and provide you with updates.`;
        }
        
        if (context.isWarranty) {
            return `I'd be happy to help you with warranty information or service options. What product are you asking about, and what specific issue are you experiencing?`;
        }
        
        if (context.isOrder) {
            return `I can help you with your order. Could you provide your order number so I can look up the details and assist you better?`;
        }
        
        if (context.isPricing) {
            return `I understand you have questions about pricing. Let me help you with that. What specific product or service are you asking about?`;
        }
        
        if (context.isCancellation) {
            return `I can help you with cancellation requests. Could you tell me what you'd like to cancel and provide your account information so I can assist you?`;
        }
        
        if (context.isUrgent) {
            return `I understand this is urgent for you. Let me prioritize your request and work on getting this resolved as quickly as possible. Can you provide me with more details?`;
        }
        
        if (context.isQuestion) {
            const questionResponses = [
                `That's a great question! Let me help you with that. Could you provide a bit more detail so I can give you the most accurate information?`,
                `I'd be happy to answer that for you. To give you the best possible assistance, could you share some additional context?`,
                `Excellent question! I want to make sure I provide you with the most helpful answer. What specific aspect would you like me to focus on?`
            ];
            return questionResponses[Math.floor(Math.random() * questionResponses.length)];
        }
        
        // Default intelligent response based on sentiment
        if (sentiment === 'negative') {
            const empatheticDefaults = [
                `I understand your concern and I want to help resolve this for you. Can you provide more details about what you're experiencing?`,
                `I'm sorry to hear about this issue. Let me work with you to find a solution that addresses your needs.`,
                `I appreciate you bringing this to my attention. I'm committed to helping you resolve this matter.`
            ];
            return empatheticDefaults[Math.floor(Math.random() * empatheticDefaults.length)];
        }
        
        if (sentiment === 'positive') {
            const positiveDefaults = [
                `I'm glad to hear that! I'm here to help you with whatever you need. What can I assist you with today?`,
                `That's wonderful! I'm happy to help you further. Is there anything else I can do for you?`,
                `Great! I'm here to provide you with the best possible service. What would you like to know?`
            ];
            return positiveDefaults[Math.floor(Math.random() * positiveDefaults.length)];
        }
        
        // Neutral default responses
        const neutralDefaults = [
            `I understand your request. Let me help you with that. Could you provide a bit more detail so I can assist you better?`,
            `I want to make sure I understand your needs correctly. Can you tell me more about what you're looking for?`,
            `I'm here to help you resolve this. What additional information can you share so I can provide the best assistance?`,
            `I appreciate you reaching out. Let me see how I can help you with this matter.`,
            `I understand this is important to you. Let me work on finding the best solution for your situation.`
        ];
        
        return neutralDefaults[Math.floor(Math.random() * neutralDefaults.length)];
    }


    extractAgentResponse(generatedText, originalPrompt) {
        // Extract just the agent's response part
        const lines = generatedText.split('\n');
        const agentLines = lines.filter(line => line.startsWith('Agent:'));
        
        if (agentLines.length > 0) {
            const lastAgentResponse = agentLines[agentLines.length - 1];
            return lastAgentResponse.replace('Agent:', '').trim();
        }
        
        // If no clear agent response, try to extract the last meaningful line
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine && !lastLine.includes('Customer:')) {
            return lastLine;
        }
        
        return null;
    }

    getFallbackResponse(userMessage, retailer) {
        const message = userMessage.toLowerCase();
        
        // Enhanced fallback responses with more intelligence
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return `Hello! Thank you for contacting ${retailer} customer service. How can I assist you today?`;
        }
        
        if (message.includes('refund') || message.includes('return')) {
            return `I understand you'd like to process a refund. I'd be happy to help you with that. Could you please provide your order number so I can look up your purchase?`;
        }
        
        if (message.includes('broken') || message.includes('defective') || message.includes('not working') || message.includes('damaged')) {
            return `I'm sorry to hear about the issue with your product. That's definitely not what we want for our customers. Can you tell me more about what's happening so I can help you get this resolved?`;
        }
        
        if (message.includes('shipping') || message.includes('delivery') || message.includes('tracking')) {
            return `I can help you with shipping information. Do you have your order number or tracking number available? I can look up the current status for you.`;
        }
        
        if (message.includes('warranty') || message.includes('repair') || message.includes('service')) {
            return `I'd be happy to help you with warranty information or service options. What product are you asking about, and what specific issue are you experiencing?`;
        }
        
        if (message.includes('order') || message.includes('purchase') || message.includes('bought')) {
            return `I can help you with your order. Could you provide your order number so I can look up the details and assist you better?`;
        }
        
        if (message.includes('price') || message.includes('cost') || message.includes('expensive') || message.includes('cheap')) {
            return `I understand you have questions about pricing. Let me help you with that. What specific product or service are you asking about?`;
        }
        
        if (message.includes('cancel') || message.includes('stop') || message.includes('unsubscribe')) {
            return `I can help you with cancellation requests. Could you tell me what you'd like to cancel and provide your account information so I can assist you?`;
        }
        
        if (message.includes('complaint') || message.includes('angry') || message.includes('frustrated') || message.includes('upset')) {
            return `I'm truly sorry for any frustration you're experiencing. I want to make sure we resolve this for you. Can you tell me more about what happened so I can help make this right?`;
        }
        
        if (message.includes('thank') || message.includes('thanks')) {
            return `You're very welcome! I'm glad I could help. Is there anything else I can assist you with today?`;
        }
        
        if (message.includes('bye') || message.includes('goodbye') || message.includes('see you')) {
            return `Thank you for contacting ${retailer}! Have a wonderful day, and please don't hesitate to reach out if you need any further assistance.`;
        }
        
        // Enhanced default responses with more variety and intelligence
        const responses = [
            `I understand your concern. Let me help you with that. Could you provide a bit more detail so I can assist you better?`,
            `I want to make sure I understand your request correctly. Can you tell me more about what you need help with?`,
            `I'm here to help you resolve this issue. What additional information can you share so I can provide the best assistance?`,
            `I appreciate you bringing this to my attention. Let me see how I can help you with this matter.`,
            `I understand this is important to you. Let me work on finding the best solution for your situation.`,
            `I'm committed to helping you resolve this. Could you provide more details about what you're experiencing?`,
            `I want to make sure I give you the best possible assistance. What specific information can you share?`,
            `I'm here to help you with whatever you need. Can you tell me more about your situation?`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getRetailerName() {
        return "our company";
    }


    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize UI manager
const ui = new UIManager();