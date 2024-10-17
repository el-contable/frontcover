// Open or create the IndexedDB database
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BooksDB', 1); // Name the database and set version to 1
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'id', autoIncrement: true }); // Create object store for books
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Function to save the current list of books to IndexedDB
function saveBooksToIndexedDB(books) {
    openIndexedDB().then((db) => {
        const transaction = db.transaction(['books'], 'readwrite');
        const store = transaction.objectStore('books');
        store.clear();  // Clear old data before saving new data
        books.forEach((book) => store.add(book)); // Add each book to the object store
    }).catch((error) => console.error('Failed to save to IndexedDB:', error));
}

// Function to load books from IndexedDB
function loadBooksFromIndexedDB() {
    return new Promise((resolve, reject) => {
        openIndexedDB().then((db) => {
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const request = store.getAll();  // Get all books from IndexedDB
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

// Restore books from IndexedDB when called (for the restore button)
function restoreBooksFromIndexedDB() {
    loadBooksFromIndexedDB().then((books) => {
        localStorage.setItem('books', JSON.stringify(books));  // Restore books into localStorage
        loadBooks();  // Reload the list of books from localStorage
        alert('Book list restored from IndexedDB!');
    }).catch((error) => console.error('Failed to restore from IndexedDB:', error));
}
