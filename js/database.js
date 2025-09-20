// Database management using IndexedDB
class Database {
    constructor() {
        this.dbName = 'LoggerDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Orders store
                if (!db.objectStoreNames.contains('orders')) {
                    const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
                    ordersStore.createIndex('retailerName', 'retailerName', { unique: false });
                    ordersStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });
                }
                
                // Refunds store
                if (!db.objectStoreNames.contains('refunds')) {
                    const refundsStore = db.createObjectStore('refunds', { keyPath: 'id' });
                    refundsStore.createIndex('retailerName', 'retailerName', { unique: false });
                    refundsStore.createIndex('status', 'status', { unique: false });
                    refundsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Warranty Claims store
                if (!db.objectStoreNames.contains('warrantyClaims')) {
                    const warrantyStore = db.createObjectStore('warrantyClaims', { keyPath: 'id' });
                    warrantyStore.createIndex('retailerName', 'retailerName', { unique: false });
                    warrantyStore.createIndex('status', 'status', { unique: false });
                    warrantyStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Contacts store
                if (!db.objectStoreNames.contains('contacts')) {
                    const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' });
                    contactsStore.createIndex('name', 'name', { unique: false });
                    contactsStore.createIndex('socialPlatform', 'socialPlatform', { unique: false });
                    contactsStore.createIndex('role', 'role', { unique: false });
                    contactsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Communications store
                if (!db.objectStoreNames.contains('communications')) {
                    const commsStore = db.createObjectStore('communications', { keyPath: 'id' });
                    commsStore.createIndex('refundId', 'refundId', { unique: false });
                    commsStore.createIndex('warrantyClaimId', 'warrantyClaimId', { unique: false });
                    commsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Documents store
                if (!db.objectStoreNames.contains('documents')) {
                    const docsStore = db.createObjectStore('documents', { keyPath: 'id' });
                    docsStore.createIndex('refundId', 'refundId', { unique: false });
                    docsStore.createIndex('warrantyClaimId', 'warrantyClaimId', { unique: false });
                }
                
                // Retailers store
                if (!db.objectStoreNames.contains('retailers')) {
                    const retailersStore = db.createObjectStore('retailers', { keyPath: 'id' });
                    retailersStore.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }

    // Orders
    async addOrder(orderData) {
        const transaction = this.db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        
        const order = {
            id: this.generateId(),
            ...orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(order);
            request.onsuccess = () => resolve(order);
            request.onerror = () => reject(request.error);
        });
    }

    async getOrders() {
        const transaction = this.db.transaction(['orders'], 'readonly');
        const store = transaction.objectStore('orders');
        const index = store.index('purchaseDate');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const orders = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    orders.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(orders);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getOrder(id) {
        const transaction = this.db.transaction(['orders'], 'readonly');
        const store = transaction.objectStore('orders');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateOrder(id, updates) {
        const transaction = this.db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const order = getRequest.result;
                if (order) {
                    Object.assign(order, updates, { updatedAt: new Date().toISOString() });
                    const putRequest = store.put(order);
                    putRequest.onsuccess = () => resolve(order);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Order not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteOrder(id) {
        const transaction = this.db.transaction(['orders', 'claims', 'documents'], 'readwrite');
        const ordersStore = transaction.objectStore('orders');
        const claimsStore = transaction.objectStore('claims');
        const docsStore = transaction.objectStore('documents');
        
        // Delete related claims
        const claimsIndex = claimsStore.index('orderId');
        const claimsRequest = claimsIndex.openCursor(IDBKeyRange.only(id));
        claimsRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        
        // Delete related documents
        const docsIndex = docsStore.index('orderId');
        const docsRequest = docsIndex.openCursor(IDBKeyRange.only(id));
        docsRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        
        return new Promise((resolve, reject) => {
            const request = ordersStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Refunds
    async addRefund(refundData) {
        const transaction = this.db.transaction(['refunds'], 'readwrite');
        const store = transaction.objectStore('refunds');
        
        const refund = {
            id: this.generateId(),
            ...refundData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(refund);
            request.onsuccess = () => resolve(refund);
            request.onerror = () => reject(request.error);
        });
    }

    async getRefunds() {
        const transaction = this.db.transaction(['refunds'], 'readonly');
        const store = transaction.objectStore('refunds');
        const index = store.index('createdAt');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const refunds = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    refunds.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(refunds);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateRefund(id, updates) {
        const transaction = this.db.transaction(['refunds'], 'readwrite');
        const store = transaction.objectStore('refunds');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const refund = getRequest.result;
                if (refund) {
                    Object.assign(refund, updates, { updatedAt: new Date().toISOString() });
                    const putRequest = store.put(refund);
                    putRequest.onsuccess = () => resolve(refund);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Refund not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteRefund(id) {
        const transaction = this.db.transaction(['refunds', 'communications'], 'readwrite');
        const refundsStore = transaction.objectStore('refunds');
        const commsStore = transaction.objectStore('communications');
        
        // Delete related communications
        const commsIndex = commsStore.index('refundId');
        const commsRequest = commsIndex.openCursor(IDBKeyRange.only(id));
        commsRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        
        return new Promise((resolve, reject) => {
            const request = refundsStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Warranty Claims
    async addWarrantyClaim(claimData) {
        const transaction = this.db.transaction(['warrantyClaims'], 'readwrite');
        const store = transaction.objectStore('warrantyClaims');
        
        const claim = {
            id: this.generateId(),
            ...claimData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(claim);
            request.onsuccess = () => resolve(claim);
            request.onerror = () => reject(request.error);
        });
    }

    async getWarrantyClaims() {
        const transaction = this.db.transaction(['warrantyClaims'], 'readonly');
        const store = transaction.objectStore('warrantyClaims');
        const index = store.index('createdAt');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const claims = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    claims.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(claims);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateWarrantyClaim(id, updates) {
        const transaction = this.db.transaction(['warrantyClaims'], 'readwrite');
        const store = transaction.objectStore('warrantyClaims');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const claim = getRequest.result;
                if (claim) {
                    Object.assign(claim, updates, { updatedAt: new Date().toISOString() });
                    const putRequest = store.put(claim);
                    putRequest.onsuccess = () => resolve(claim);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Warranty claim not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteWarrantyClaim(id) {
        const transaction = this.db.transaction(['warrantyClaims', 'communications'], 'readwrite');
        const claimsStore = transaction.objectStore('warrantyClaims');
        const commsStore = transaction.objectStore('communications');
        
        // Delete related communications
        const commsIndex = commsStore.index('warrantyClaimId');
        const commsRequest = commsIndex.openCursor(IDBKeyRange.only(id));
        commsRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        
        return new Promise((resolve, reject) => {
            const request = claimsStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Contacts
    async addContact(contactData) {
        const transaction = this.db.transaction(['contacts'], 'readwrite');
        const store = transaction.objectStore('contacts');
        
        const contact = {
            id: this.generateId(),
            ...contactData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(contact);
            request.onsuccess = () => resolve(contact);
            request.onerror = () => reject(request.error);
        });
    }

    async getContacts() {
        const transaction = this.db.transaction(['contacts'], 'readonly');
        const store = transaction.objectStore('contacts');
        const index = store.index('createdAt');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const contacts = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    contacts.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(contacts);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateContact(id, contactData) {
        const transaction = this.db.transaction(['contacts'], 'readwrite');
        const store = transaction.objectStore('contacts');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const contact = getRequest.result;
                if (contact) {
                    const updatedContact = {
                        ...contact,
                        ...contactData,
                        updatedAt: new Date().toISOString()
                    };
                    
                    const putRequest = store.put(updatedContact);
                    putRequest.onsuccess = () => resolve(updatedContact);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Contact not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteContact(id) {
        const transaction = this.db.transaction(['contacts'], 'readwrite');
        const store = transaction.objectStore('contacts');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Communications
    async addCommunication(commData) {
        const transaction = this.db.transaction(['communications'], 'readwrite');
        const store = transaction.objectStore('communications');
        
        const communication = {
            id: this.generateId(),
            ...commData,
            timestamp: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(communication);
            request.onsuccess = () => resolve(communication);
            request.onerror = () => reject(request.error);
        });
    }

    async getCommunicationsByClaim(claimId) {
        const transaction = this.db.transaction(['communications'], 'readonly');
        const store = transaction.objectStore('communications');
        const index = store.index('claimId');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only(claimId));
            const communications = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    communications.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(communications);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Documents
    async addDocument(docData) {
        const transaction = this.db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');
        
        const document = {
            id: this.generateId(),
            ...docData,
            uploadedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(document);
            request.onsuccess = () => resolve(document);
            request.onerror = () => reject(request.error);
        });
    }

    async getDocumentsByOrder(orderId) {
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const index = store.index('orderId');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only(orderId));
            const documents = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    documents.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(documents);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Retailers
    async addRetailer(retailerData) {
        const transaction = this.db.transaction(['retailers'], 'readwrite');
        const store = transaction.objectStore('retailers');
        
        const retailer = {
            id: this.generateId(),
            ...retailerData,
            createdAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(retailer);
            request.onsuccess = () => resolve(retailer);
            request.onerror = () => reject(request.error);
        });
    }

    async getRetailers() {
        const transaction = this.db.transaction(['retailers'], 'readonly');
        const store = transaction.objectStore('retailers');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async clearAllData() {
        const stores = ['orders', 'refunds', 'warrantyClaims', 'contacts', 'communications', 'documents', 'retailers'];
        const transaction = this.db.transaction(stores, 'readwrite');
        
        const promises = stores.map(storeName => {
            return new Promise((resolve, reject) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
        
        return Promise.all(promises);
    }

    async exportData() {
        const [orders, refunds, warrantyClaims, contacts, communications, documents, retailers] = await Promise.all([
            this.getOrders(),
            this.getRefunds(),
            this.getWarrantyClaims(),
            this.getContacts(),
            this.getAllCommunications(),
            this.getAllDocuments(),
            this.getRetailers()
        ]);
        
        return {
            orders,
            refunds,
            warrantyClaims,
            contacts,
            communications,
            documents,
            retailers,
            exportedAt: new Date().toISOString()
        };
    }

    async getAllCommunications() {
        const transaction = this.db.transaction(['communications'], 'readonly');
        const store = transaction.objectStore('communications');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllDocuments() {
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Initialize database
const db = new Database();
