// Teacher Portal JavaScript
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Wait for Firebase to initialize
let db, auth;
window.addEventListener('load', () => {
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        db = window.firebaseDB;
        auth = window.firebaseAuth;
        initializeTeacherPortal();
    }, 1000);
});

function initializeTeacherPortal() {
    console.log('Initializing teacher portal...');
    
    // Initialize file upload functionality
    initializeFileUpload();
    
    // Add event listeners
    document.getElementById('save-button').onclick = generateStudentLink;
    document.getElementById('cancel-button').onclick = cancelWordPreview;
    document.getElementById('manual-save-button').onclick = saveManualWords;
    document.getElementById('manual-cancel-button').onclick = hideManualInput;
}

// File Upload and Processing Functions
function initializeFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-blue-500', 'bg-blue-50');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    });
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
}

// Process uploaded file (PDF or DOCX)
async function processFile(file) {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    console.log('Processing file:', fileName, 'Type:', fileType);
    
    // Check file type and process accordingly
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        await processPDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        await processDOCX(file);
    } else {
        showError('Unsupported file type. Please upload a PDF or DOCX file.');
    }
}

// Process uploaded PDF
async function processPDF(file) {
    try {
        showProcessingStatus('Loading PDF...');
        
        // Convert PDF to images for OCR
        const images = await pdfToImages(file);
        
        showProcessingStatus('Extracting text with OCR...');
        
        // Extract text from images using OCR
        const extractedText = await extractTextFromImages(images);
        
        if (!extractedText || extractedText.trim().length === 0) {
            showManualInput('No text was found in the PDF. You can add words manually instead.');
            return;
        }
        
        showProcessingStatus('Processing words...');
        
        // Process and filter words
        const processedResult = processExtractedText(extractedText);
        const newWords = processedResult.words;
        
        hideProcessingStatus();
        
        if (newWords.length > 0) {
            showWordPreview(newWords, processedResult.sanityResults);
        } else {
            showManualInput('No valid words were found in the PDF. You can add words manually instead.');
        }
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        hideProcessingStatus();
        showError(`Error processing PDF: ${error.message}`);
    }
}

// Process uploaded DOCX file
async function processDOCX(file) {
    try {
        showProcessingStatus('Loading DOCX file...');
        
        // Check if mammoth is available
        if (typeof mammoth === 'undefined') {
            throw new Error('Mammoth.js library not loaded. Please refresh the page and try again.');
        }
        
        showProcessingStatus('Extracting text from DOCX...');
        
        // Extract text from DOCX using mammoth
        const result = await mammoth.extractRawText({arrayBuffer: await file.arrayBuffer()});
        const extractedText = result.value;
        
        console.log('DOCX extracted text:', extractedText);
        
        if (!extractedText || extractedText.trim().length === 0) {
            showManualInput('No text was found in the DOCX file. You can add words manually instead.');
            return;
        }
        
        showProcessingStatus('Processing words...');
        
        // Process and filter words
        const processedResult = processExtractedText(extractedText);
        const newWords = processedResult.words;
        
        hideProcessingStatus();
        
        if (newWords.length > 0) {
            showWordPreview(newWords, processedResult.sanityResults);
        } else {
            showManualInput('No valid words were found in the DOCX file. You can add words manually instead.');
        }
        
    } catch (error) {
        console.error('Error processing DOCX:', error);
        hideProcessingStatus();
        showError(`Error processing DOCX: ${error.message}`);
    }
}

// Convert PDF to images
async function pdfToImages(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                const images = [];
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    images.push(canvas.toDataURL());
                }
                
                resolve(images);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Extract text from images using OCR
async function extractTextFromImages(images) {
    let allText = '';
    
    for (let i = 0; i < images.length; i++) {
        try {
            const result = await Tesseract.recognize(images[i], 'eng', {
                logger: m => console.log(m)
            });
            allText += result.data.text + ' ';
        } catch (error) {
            console.error('OCR error for image', i, error);
        }
    }
    
    return allText.trim();
}

// Process extracted text
function processExtractedText(text) {
    // Split text into words
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length >= 2 && word.length <= 8) // Filter by length
        .filter(word => /^[a-z]+$/.test(word)) // Only letters
        .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    
    return {
        words: words,
        sanityResults: {
            totalWords: words.length,
            invalidWords: []
        }
    };
}

// Show word preview
function showWordPreview(words, sanityResults = null) {
    const preview = document.getElementById('word-preview');
    const previewWords = document.getElementById('preview-words');
    
    previewWords.innerHTML = '';
    
    // Show summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'col-span-full bg-blue-50 p-4 rounded-lg mb-4';
    summaryDiv.innerHTML = `
        <h4 class="font-semibold text-blue-800 mb-2">Word List Summary:</h4>
        <p class="text-blue-700"><strong>${words.length}</strong> words ready to be added.</p>
    `;
    previewWords.appendChild(summaryDiv);
    
    // Show the words
    words.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-center font-medium';
        wordElement.textContent = word;
        previewWords.appendChild(wordElement);
    });
    
    preview.classList.remove('hidden');
    
    // Store words for later use
    window.currentWords = words;
}

// Generate student link using Firebase
async function generateStudentLink() {
    try {
        if (!window.currentWords || window.currentWords.length === 0) {
            showError('No words to save. Please upload a file or add words manually.');
            return;
        }
        
        showProcessingStatus('Saving word list to Firebase...');
        
        // Save to Firebase Firestore
        const docRef = await addDoc(collection(db, 'wordLists'), {
            words: window.currentWords,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser?.uid || 'anonymous',
            version: '1.0'
        });
        
        console.log('Document written with ID: ', docRef.id);
        
        // Generate student URL
        const baseUrl = window.location.origin;
        const studentUrl = `${baseUrl}/index.html?id=${docRef.id}`;
        
        hideProcessingStatus();
        hideWordPreview();
        
        // Show the generated URL
        showGeneratedUrl(studentUrl);
        
    } catch (error) {
        console.error('Error saving word list:', error);
        hideProcessingStatus();
        showError(`Failed to save word list: ${error.message}`);
    }
}

// Show generated URL
function showGeneratedUrl(url) {
    const urlDisplay = document.getElementById('url-display');
    const urlInput = document.getElementById('generated-url');
    
    urlInput.value = url;
    urlDisplay.classList.remove('hidden');
    
    // Scroll to the URL display
    urlDisplay.scrollIntoView({ behavior: 'smooth' });
}

// Copy to clipboard
function copyToClipboard() {
    const urlInput = document.getElementById('generated-url');
    urlInput.select();
    document.execCommand('copy');
    
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('bg-green-600');
    
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600');
    }, 2000);
}

// Open student link
function openStudentLink() {
    const url = document.getElementById('generated-url').value;
    window.open(url, '_blank');
}

// Save manual words
async function saveManualWords() {
    const wordInput = document.getElementById('word-input');
    const inputText = wordInput.value.trim();
    
    if (!inputText) {
        showError('Please enter some words.');
        return;
    }
    
    // Parse words from input
    const words = inputText
        .split(/[\s,\n]+/)
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length >= 2 && word.length <= 8)
        .filter(word => /^[a-z]+$/.test(word))
        .filter((word, index, arr) => arr.indexOf(word) === index);
    
    if (words.length === 0) {
        showError('No valid words found. Please enter words with 2-8 letters.');
        return;
    }
    
    window.currentWords = words;
    await generateStudentLink();
    hideManualInput();
}

// Show manual input
function showManualInput(message = '') {
    const manualInput = document.getElementById('manual-input');
    const wordPreview = document.getElementById('word-preview');
    
    wordPreview.classList.add('hidden');
    manualInput.classList.remove('hidden');
    
    if (message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4';
        messageDiv.textContent = message;
        manualInput.insertBefore(messageDiv, manualInput.firstChild);
    }
}

// Hide manual input
function hideManualInput() {
    const manualInput = document.getElementById('manual-input');
    manualInput.classList.add('hidden');
    
    // Clear the input
    document.getElementById('word-input').value = '';
}

// Hide word preview
function hideWordPreview() {
    const preview = document.getElementById('word-preview');
    preview.classList.add('hidden');
}

// Cancel word preview
function cancelWordPreview() {
    hideWordPreview();
    window.currentWords = null;
}

// Show processing status
function showProcessingStatus(message) {
    const status = document.getElementById('processing-status');
    const statusText = document.getElementById('status-text');
    
    statusText.textContent = message;
    status.classList.remove('hidden');
}

// Hide processing status
function hideProcessingStatus() {
    const status = document.getElementById('processing-status');
    status.classList.add('hidden');
}

// Show error message
function showError(message) {
    alert(message); // Simple alert for now, can be enhanced with a modal
}

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
}
