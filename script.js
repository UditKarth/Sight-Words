// Global variables
let words = [];
let speechSynthesis = window.speechSynthesis;
let detectedWords = [];

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
}

// Check if Speech Synthesis API is supported
function checkSpeechSupport() {
    if (!speechSynthesis) {
        showError('Speech synthesis is not supported in your browser. Please try a different browser.');
        return false;
    }
    return true;
}

// Show error message
function showError(message) {
    const container = document.getElementById('word-container');
    container.innerHTML = `<div class="error">${message}</div>`;
}

// Show loading message
function showLoading() {
    const container = document.getElementById('word-container');
    container.innerHTML = '<div class="loading">Processing example PDF with OCR...</div>';
}

// Fallback word list for when CSV can't be loaded
const fallbackWords = [
    'after', 'again', 'an', 'any', 'ask', 'as', 'by', 'could', 'every', 'fly',
    'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
    'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
    'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were', 'when'
];

// Fetch and parse CSV data
async function fetchWords() {
    try {
        showLoading();
        
        // First, try to load words from the example PDF using OCR
        console.log('Attempting to load words from example PDF...');
        const pdfWords = await loadWordsFromExamplePDF();
        
        if (pdfWords && pdfWords.length > 0) {
            console.log(`Successfully loaded ${pdfWords.length} words from PDF`);
            words = pdfWords;
            
            // Show success message first
            showSuccessMessage(`Successfully loaded ${pdfWords.length} words from PDF!`);
            
            // Generate word buttons after a short delay to ensure success message is shown
            setTimeout(() => {
                generateWordButtons();
            }, 100);
            
            return;
        }
        
        // Fallback to CSV if PDF OCR fails
        console.log('PDF OCR failed or no words found, trying CSV file...');
        const response = await fetch('words.csv');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        words = csvText.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0); // Remove empty lines
        
        if (words.length === 0) {
            throw new Error('No words found in the CSV file.');
        }
        
        // Show success message first
        showSuccessMessage(`Loaded ${words.length} words from CSV file.`);
        
        // Generate word buttons after a short delay
        setTimeout(() => {
            generateWordButtons();
        }, 100);
    } catch (error) {
        console.error('Error fetching words:', error);
        console.log('Using fallback word list');
        // Use fallback words if everything else fails
        words = fallbackWords;
        
        // Show success message first
        showSuccessMessage(`Loaded ${words.length} fallback words.`);
        
        // Generate word buttons after a short delay
        setTimeout(() => {
            generateWordButtons();
        }, 100);
    }
}

// Load words from the example PDF using OCR
async function loadWordsFromExamplePDF() {
    try {
        console.log('Loading example PDF...');
        showLoadingStatus('Loading example PDF...');
        
        const response = await fetch('sightwordexample.pdf');
        
        if (!response.ok) {
            throw new Error(`Failed to load PDF: ${response.status}`);
        }
        
        const pdfBlob = await response.blob();
        const pdfFile = new File([pdfBlob], 'sightwordexample.pdf', { type: 'application/pdf' });
        
        console.log('Converting PDF to images...');
        showLoadingStatus('Converting PDF to images...');
        const images = await pdfToImages(pdfFile);
        
        console.log('Extracting text with OCR...');
        showLoadingStatus('Extracting text with OCR...');
        const extractedText = await extractTextFromImages(images);
        
        console.log('Processing extracted text...');
        showLoadingStatus('Processing extracted text...');
        const processedWords = processExtractedText(extractedText);
        
        console.log('Extracted words:', processedWords);
        
        // Check if we have valid words
        if (processedWords.length === 0) {
            console.warn('No valid words extracted from PDF');
            return null;
        }
        
        // Show completion message
        showLoadingStatus(`PDF processing complete! Found ${processedWords.length} words.`);
        
        // Clear the loading status after a short delay
        setTimeout(() => {
            hideLoadingStatus();
        }, 1500);
        
        return processedWords;
        
    } catch (error) {
        console.error('Error loading words from PDF:', error);
        showLoadingStatus(`PDF processing failed: ${error.message}`);
        setTimeout(() => {
            hideLoadingStatus();
        }, 3000);
        return null;
    }
}

// Show loading status for initial PDF processing
function showLoadingStatus(message) {
    const container = document.getElementById('word-container');
    // Clear any existing loading messages first
    const existingLoading = container.querySelectorAll('.loading');
    existingLoading.forEach(element => element.remove());
    
    // Add new loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = message;
    container.appendChild(loadingDiv);
}

// Hide loading status
function hideLoadingStatus() {
    const container = document.getElementById('word-container');
    // Only remove loading messages, not word buttons
    const loadingElements = container.querySelectorAll('.loading');
    loadingElements.forEach(element => element.remove());
}

// Generate word buttons dynamically
function generateWordButtons() {
    const container = document.getElementById('word-container');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Generate word buttons
    words.forEach(word => {
        const button = document.createElement('button');
        button.className = 'word-button';
        button.textContent = word;
        button.setAttribute('data-word', word);
        container.appendChild(button);
    });
    
    // Remove existing event listeners and add new one
    container.removeEventListener('click', handleWordClick);
    container.addEventListener('click', handleWordClick);
    
    console.log(`Generated ${words.length} word buttons`);
}

// Handle word button clicks
function handleWordClick(event) {
    const button = event.target;
    
    // Check if the clicked element is a word button
    if (!button.classList.contains('word-button')) {
        return;
    }
    
    const word = button.getAttribute('data-word');
    
    if (!word) {
        return;
    }
    
    // Visual feedback - add active class
    button.classList.add('active');
    
    // Remove active class after animation
    setTimeout(() => {
        button.classList.remove('active');
    }, 600);
    
    // Speak the word
    speakWord(word);
    
    // Add audio feedback (optional - creates a simple beep sound)
    playClickSound();
}

// Speak word using Web Speech API
function speakWord(word) {
    if (!checkSpeechSupport()) {
        return;
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(word);
    
    // Configure speech settings for child-friendly pronunciation
    utterance.rate = 0.8; // Slightly slower than normal
    utterance.pitch = 1.1; // Slightly higher pitch
    utterance.volume = 1.0; // Full volume
    
    // Try to set a child-friendly voice if available
    const voices = speechSynthesis.getVoices();
    const childVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('child') ||
        voice.name.toLowerCase().includes('young') ||
        voice.name.toLowerCase().includes('female')
    );
    
    if (childVoice) {
        utterance.voice = childVoice;
    }
    
    // Speak the word
    speechSynthesis.speak(utterance);
}

// Play click sound for audio feedback
function playClickSound() {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        // If Web Audio API fails, continue without sound
        console.log('Audio feedback not available');
    }
}

// PDF Upload and OCR Functions
function initializePDFUpload() {
    const uploadArea = document.getElementById('upload-area');
    const pdfInput = document.getElementById('pdf-input');
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            processPDF(files[0]);
        }
    });
    
    // File input change
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processPDF(e.target.files[0]);
        }
    });
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        pdfInput.click();
    });
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
        
        showProcessingStatus('Processing words...');
        
        // Process and filter words
        const newWords = processExtractedText(extractedText);
        
        hideProcessingStatus();
        
        if (newWords.length > 0) {
            showWordPreview(newWords);
        } else {
            showManualInput('No words were detected. You can add words manually instead.');
        }
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        hideProcessingStatus();
        
        if (error.message.includes('OCR') || error.message.includes('Tesseract')) {
            showManualInput('OCR processing failed. You can add words manually instead.');
        } else {
            showError(`Error processing PDF: ${error.message}`);
        }
    }
}

// Convert PDF to images
async function pdfToImages(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const typedarray = new Uint8Array(e.target.result);
                
                // Load PDF using pdf.js
                const loadingTask = pdfjsLib.getDocument({data: typedarray});
                const pdf = await loadingTask.promise;
                
                console.log(`PDF loaded with ${pdf.numPages} pages`);
                
                const images = [];
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Process each page (limit to 3 pages for performance)
                const maxPages = Math.min(pdf.numPages, 3);
                for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                    console.log(`Processing page ${pageNum} of ${maxPages}`);
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({scale: 1.5}); // Reduced scale for better performance
                    
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    await page.render({
                        canvasContext: ctx,
                        viewport: viewport
                    }).promise;
                    
                    images.push(canvas.toDataURL('image/png'));
                }
                
                console.log(`Converted ${images.length} pages to images`);
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
        showProcessingStatus(`Processing page ${i + 1} of ${images.length} with OCR...`);
        
        try {
            const result = await Tesseract.recognize(images[i], 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        showProcessingStatus(`Processing page ${i + 1} of ${images.length}... ${progress}%`);
                    }
                    console.log(m);
                }
            });
            
            console.log(`Page ${i + 1} OCR result:`, result.data.text);
            allText += result.data.text + ' ';
            hideProcessingStatus();
        } catch (error) {
            console.warn(`OCR failed for page ${i + 1}:`, error);
            hideProcessingStatus();
        }
    }
    
    console.log('Total extracted text length:', allText.length);
    return allText;
}

// Process extracted text to find words
function processExtractedText(text) {
    console.log('Raw extracted text:', text);
    
    // Split text into words and clean them
    const wordList = text
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[^a-z]/g, '')) // Remove non-letters
        .filter(word => word.length >= 2 && word.length <= 8) // Filter by length
        .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'your', 'child', 'should', 'know', 'sight', 'word', 'list', 'end', 'grade'].includes(word)) // Remove common words and instructional text
        .filter(word => !word.match(/^(red|blue|green|yellow|black|white|brown|pink|purple|orange)$/)) // Remove color words
        .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    
    console.log('Filtered word list:', wordList);
    
    // Return all words, not limited to 50
    return wordList;
}

// Show processing status
function showProcessingStatus(message) {
    const status = document.getElementById('processing-status');
    const statusText = document.getElementById('status-text');
    statusText.textContent = message;
    status.style.display = 'block';
}

// Hide processing status
function hideProcessingStatus() {
    const status = document.getElementById('processing-status');
    status.style.display = 'none';
}

// Show word preview
function showWordPreview(newWords) {
    detectedWords = newWords;
    const preview = document.getElementById('word-preview');
    const previewWords = document.getElementById('preview-words');
    
    previewWords.innerHTML = '';
    newWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'preview-word';
        wordElement.textContent = word;
        previewWords.appendChild(wordElement);
    });
    
    preview.style.display = 'block';
    
    // Add event listeners for save and cancel buttons
    document.getElementById('save-button').onclick = saveNewWords;
    document.getElementById('cancel-button').onclick = cancelWordPreview;
}

// Save new words
async function saveNewWords() {
    try {
        // Combine existing words with new words
        const allWords = [...new Set([...words, ...detectedWords])];
        
        // Update the words array
        words = allWords;
        
        // Update CSV file (in a real implementation, this would be sent to a server)
        await updateCSVFile(allWords);
        
        // Regenerate word buttons
        generateWordButtons();
        
        // Hide preview
        hideWordPreview();
        
        // Show success message
        showSuccessMessage(`Added ${detectedWords.length} new words!`);
        
    } catch (error) {
        console.error('Error saving words:', error);
        showError('Failed to save words. Please try again.');
    }
}

// Update CSV file (simulated - in production this would be a server call)
async function updateCSVFile(newWords) {
    // In a real implementation, this would send the data to a server
    // For now, we'll just update the local state
    console.log('Would update CSV with words:', newWords);
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Cancel word preview
function cancelWordPreview() {
    hideWordPreview();
}

// Show manual input
function showManualInput(message = '') {
    const manualInput = document.getElementById('manual-input');
    const uploadArea = document.getElementById('upload-area');
    
    if (message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'manual-message';
        messageDiv.style.cssText = `
            background: rgba(255, 193, 7, 0.9);
            color: #333;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
        `;
        messageDiv.textContent = message;
        manualInput.insertBefore(messageDiv, manualInput.firstChild);
    }
    
    manualInput.style.display = 'block';
    
    // Add event listeners for manual input buttons
    document.getElementById('manual-save-button').onclick = saveManualWords;
    document.getElementById('manual-cancel-button').onclick = hideManualInput;
}

// Save manual words
async function saveManualWords() {
    const wordInput = document.getElementById('word-input');
    const inputText = wordInput.value.trim();
    
    if (!inputText) {
        alert('Please enter some words.');
        return;
    }
    
    // Parse words from input (split by spaces, commas, or newlines)
    const newWords = inputText
        .split(/[\s,\n]+/)
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length >= 2 && word.length <= 8)
        .filter(word => /^[a-z]+$/.test(word)) // Only letters
        .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    
    if (newWords.length === 0) {
        alert('No valid words found. Please enter words with 2-8 letters.');
        return;
    }
    
    detectedWords = newWords;
    await saveNewWords();
    hideManualInput();
}

// Hide manual input
function hideManualInput() {
    const manualInput = document.getElementById('manual-input');
    manualInput.style.display = 'none';
    
    // Clear the input
    document.getElementById('word-input').value = '';
    
    // Remove any message divs
    const messageDivs = manualInput.querySelectorAll('.manual-message');
    messageDivs.forEach(div => div.remove());
    
    detectedWords = [];
}

// Hide word preview
function hideWordPreview() {
    const preview = document.getElementById('word-preview');
    preview.style.display = 'none';
    detectedWords = [];
}

// Show success message
function showSuccessMessage(message) {
    const uploadSection = document.querySelector('.upload-section');
    
    // Clear any existing success messages
    const existingMessages = uploadSection.querySelectorAll('.success-message');
    existingMessages.forEach(msg => msg.remove());
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        background: linear-gradient(145deg, #4ecdc4, #44a08d);
        color: white;
        padding: 20px;
        border-radius: 15px;
        text-align: center;
        font-size: 1.2rem;
        font-weight: bold;
        margin: 20px 0;
        box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
        animation: slideIn 0.5s ease-out;
    `;
    successDiv.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 10px;">🎉</div>
        ${message}
    `;
    
    // Insert at the end of the upload section
    uploadSection.appendChild(successDiv);
    
    // Remove success message after 4 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 500);
        }
    }, 4000);
}

// Initialize the application
function init() {
    // Check speech support first
    if (!checkSpeechSupport()) {
        return;
    }
    
    // Load voices if they're not immediately available
    if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', () => {
            console.log('Voices loaded:', speechSynthesis.getVoices().length);
        });
    }
    
    // Configure PDF.js worker if available
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
        console.log('PDF.js worker configured');
    } else {
        console.warn('PDF.js not loaded yet');
    }
    
    // Initialize PDF upload functionality
    initializePDFUpload();
    
    // Fetch and display words
    fetchWords();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(init, 100);
});

// Handle page visibility changes to pause/resume speech
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        speechSynthesis.pause();
    } else {
        speechSynthesis.resume();
    }
});

// Handle page unload to clean up speech
window.addEventListener('beforeunload', () => {
    speechSynthesis.cancel();
});
