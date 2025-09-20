// UI management and interactions
class UIManager {
    constructor() {
        this.currentTab = 'orders';
        this.currentRefund = null;
        this.currentWarrantyClaim = null;
        this.orders = [];
        this.refunds = [];
        this.warrantyClaims = [];
        this.retailers = [];
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

        // Add order button
        document.getElementById('add-order-btn').addEventListener('click', () => {
            this.showModal('add-order-modal');
        });

        // Add refund button
        document.getElementById('add-refund-btn').addEventListener('click', () => {
            this.showModal('add-refund-modal');
        });

        // Add warranty claim button
        document.getElementById('add-warranty-btn').addEventListener('click', () => {
            this.showModal('add-warranty-modal');
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

        // Add order form
        document.getElementById('add-order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddOrder();
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

        // Search inputs
        document.getElementById('orders-search').addEventListener('input', (e) => {
            this.filterOrders(e.target.value);
        });

        document.getElementById('refunds-search').addEventListener('input', (e) => {
            this.filterRefunds(e.target.value);
        });

        document.getElementById('warranty-search').addEventListener('input', (e) => {
            this.filterWarrantyClaims(e.target.value);
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

        // Photo upload
        document.getElementById('order-photos').addEventListener('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });
    }

    async loadData() {
        try {
            this.orders = await db.getOrders();
            this.refunds = await db.getRefunds();
            this.warrantyClaims = await db.getWarrantyClaims();
            this.retailers = await db.getRetailers();
            
            // Load sample retailers if none exist
            if (this.retailers.length === 0) {
                await this.loadSampleRetailers();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
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
        await this.renderOrders();
        await this.renderRefunds();
        await this.renderWarrantyClaims();
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
        
        // Clear photo preview
        document.getElementById('photo-preview').innerHTML = '';
    }

    async renderOrders() {
        const ordersList = document.getElementById('orders-list');
        const emptyOrders = document.getElementById('empty-orders');
        
        if (this.orders.length === 0) {
            ordersList.style.display = 'none';
            emptyOrders.style.display = 'block';
            return;
        }
        
        ordersList.style.display = 'block';
        emptyOrders.style.display = 'none';
        
        ordersList.innerHTML = this.orders.map(order => this.createOrderCard(order)).join('');
    }

    createOrderCard(order) {
        const totalAmount = order.purchasePrice + (order.shippingCost || 0);
        
        return `
            <div class="order-card" onclick="ui.showOrderDetail('${order.id}')">
                <div class="order-header">
                    <div class="order-retailer">${order.retailerName}</div>
                    <div class="order-price">£${totalAmount.toFixed(2)}</div>
                </div>
                <div class="order-description">${order.itemDescription}</div>
                <div class="order-meta">
                    <div>Order #${order.orderNumber}</div>
                    <div>${this.formatDate(order.purchaseDate)}</div>
                </div>
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

    async handleAddRefund() {
        const refundData = {
            retailerName: document.getElementById('refund-retailer').value,
            amount: parseFloat(document.getElementById('refund-amount').value) || 0,
            method: document.getElementById('refund-method').value,
            stage: document.getElementById('refund-stage').value,
            status: document.getElementById('refund-stage').value,
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

    async showRefundDetail(refundId) {
        const refund = this.refunds.find(r => r.id === refundId);
        if (!refund) return;
        
        this.currentRefund = refund;
        
        document.getElementById('refund-detail-title').textContent = `${refund.retailerName} - Refund Details`;
        
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

    async handleEditRefund() {
        const refundId = document.getElementById('edit-refund-id').value;
        const updates = {
            retailerName: document.getElementById('edit-refund-retailer').value,
            amount: parseFloat(document.getElementById('edit-refund-amount').value) || 0,
            method: document.getElementById('edit-refund-method').value,
            stage: document.getElementById('edit-refund-stage').value,
            status: document.getElementById('edit-refund-stage').value,
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
}

// Initialize UI manager
const ui = new UIManager();