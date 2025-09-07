// Global variables
let words = [];
let speechSynthesis = window.speechSynthesis;
let detectedWords = [];

// System detection for debugging and optimization
function getSystemInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        connection: navigator.connection?.effectiveType,
        timestamp: new Date().toISOString()
    };
}

// Detect if system is likely to have performance issues
function isOlderSystem() {
    const systemInfo = getSystemInfo();
    const userAgent = systemInfo.userAgent.toLowerCase();
    
    // Check for older browsers
    const isOldBrowser = userAgent.includes('chrome/') && 
        (userAgent.includes('chrome/7') || userAgent.includes('chrome/8') || 
         userAgent.includes('chrome/9') || userAgent.includes('chrome/10'));
    
    // Check for limited hardware
    const isLimitedHardware = 
        (systemInfo.hardwareConcurrency && systemInfo.hardwareConcurrency < 4) ||
        (systemInfo.deviceMemory && systemInfo.deviceMemory < 4) ||
        systemInfo.platform.includes('Win32') && userAgent.includes('chrome/8');
    
    // Check for older operating systems
    const isOldOS = userAgent.includes('windows nt 6.1') || // Windows 7
                   userAgent.includes('windows nt 6.0') || // Windows Vista
                   userAgent.includes('mac os x 10_') && userAgent.includes('safari/6');
    
    return isOldBrowser || isLimitedHardware || isOldOS;
}

// Get optimized OCR configuration based on system capabilities
function getOptimizedOCRConfig() {
    const isOld = isOlderSystem();
    const systemInfo = getSystemInfo();
    
    console.log('System performance assessment:', {
        isOlderSystem: isOld,
        hardwareConcurrency: systemInfo.hardwareConcurrency,
        deviceMemory: systemInfo.deviceMemory,
        platform: systemInfo.platform
    });
    
    if (isOld) {
        // Optimized settings for older systems - black and white sight word documents
        return {
            oem: 3, // DEFAULT mode (Tesseract + LSTM) - better character recognition
            psm: 6, // SINGLE_UNIFORM_BLOCK - better for uniform text blocks like sight word lists
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            tessedit_pageseg_mode: '6',
            tessedit_ocr_engine_mode: '3',
            tessedit_min_confidence: 50, // Slightly lower for older systems
            
            // Black and white document optimizations
            tessedit_char_blacklist: '0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`', // Exclude numbers and symbols
            textord_min_linesize: '1.5', // Smaller minimum line size for better character detection
            textord_old_baselines: '1', // Enable baseline detection for better character alignment
            textord_old_xheight: '1', // Enable x-height detection for better character sizing
            
            // Character-specific improvements for sight words
            classify_bln_numeric_mode: '0', // Disable numeric mode
            textord_heavy_nr: '1', // Enable heavy noise reduction
            textord_min_xheight: '6', // Smaller minimum character height for sight words
            textord_tabfind_show_vlines: '0', // Disable vertical line detection
            
            // Word recognition improvements
            textord_really_old_xheight: '1', // Use old x-height algorithm for consistency
            textord_old_to_method: '1', // Use old text orientation method
            textord_old_baseline_method: '1', // Use old baseline method
            
            // Black and white document specific settings
            tessedit_do_invert: '0', // Disable inversion
            textord_force_make_prop_words: '0', // Disable forced proportional words
            textord_min_linesize: '1.5', // Ensure minimum line size
            textord_old_baselines: '1', // Enable old baseline detection
            textord_old_xheight: '1', // Enable old x-height detection
            
            // Additional settings for better character recognition
            textord_heavy_nr: '1', // Heavy noise reduction
            textord_min_xheight: '6', // Minimum character height
            textord_tabfind_show_vlines: '0', // Disable vertical line detection
        };
    } else {
        // Standard settings for modern systems - optimized for black and white documents
        return {
            oem: 3, // DEFAULT mode (Tesseract + LSTM)
            psm: 6, // SINGLE_UNIFORM_BLOCK - better for sight word lists
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            tessedit_pageseg_mode: '6',
            tessedit_ocr_engine_mode: '3',
            tessedit_min_confidence: 60,
            tessedit_char_blacklist: '0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`', // Exclude numbers and symbols
        };
    }
}

// Log system info for debugging OCR inconsistencies
function logSystemInfo() {
    const systemInfo = getSystemInfo();
    console.log('System Info for OCR debugging:', systemInfo);
    return systemInfo;
}

// Test function to verify character corrections are working
function testCharacterCorrections() {
    console.log('Testing character corrections...');
    
    const testCases = [
        'een been al all gradc grade',
        'ave have ere here there where were',
        '0o 1l 5s 8b 6g 9g',
        'rn m cl d li h u n v u w vv'
    ];
    
    testCases.forEach(testCase => {
        console.log(`Testing: "${testCase}"`);
        const corrected = correctCharacterErrors(testCase);
        console.log(`Result: "${corrected}"`);
        console.log('---');
    });
    
    return 'Character correction test completed. Check console for results.';
}

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
        const processedResult = processExtractedText(extractedText);
        const processedWords = processedResult.words;
        
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
        const processedResult = processExtractedText(extractedText);
        const newWords = processedResult.words;
        
        hideProcessingStatus();
        
        if (newWords.length > 0) {
            showWordPreview(newWords, processedResult.sanityResults);
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
                    
                    // Adaptive scale based on system capabilities
                    const isOld = isOlderSystem();
                    const scale = isOld ? 2.5 : 2.0; // Higher scale for older systems to improve character recognition
                    
                    const viewport = page.getViewport({
                        scale: scale, // Adaptive resolution for system capabilities
                        rotation: 0, // Explicit rotation
                        offsetX: 0,
                        offsetY: 0
                    });
                    
                    // Set canvas dimensions explicitly
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.width = viewport.width + 'px';
                    canvas.style.height = viewport.height + 'px';
                    
                    // Clear canvas before rendering
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Set white background for better OCR
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
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

// Preprocess image optimized for black and white sight word documents
async function preprocessImageForOCR(imageDataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Use high resolution for all systems to improve character recognition
            const isOld = isOlderSystem();
            const scaleFactor = isOld ? 1.5 : 1.3; // Higher resolution for better character clarity
            
            canvas.width = Math.floor(img.width * scaleFactor);
            canvas.height = Math.floor(img.height * scaleFactor);
            
            // Draw image to canvas with scaling
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Get image data for preprocessing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Optimized preprocessing for black and white sight word documents
            for (let i = 0; i < data.length; i += 4) {
                // Convert to grayscale using luminance formula
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                
                // Aggressive thresholding for black and white documents
                // Use a higher threshold to ensure clean separation
                const threshold = isOld ? 150 : 140; // Higher threshold for cleaner binarization
                
                // Apply strict black/white thresholding
                let enhanced;
                if (gray < threshold) {
                    enhanced = 0; // Pure black for text
                } else {
                    enhanced = 255; // Pure white for background
                }
                
                data[i] = enhanced;     // Red
                data[i + 1] = enhanced; // Green
                data[i + 2] = enhanced; // Blue
                // Alpha stays the same
            }
            
            // Put processed image data back
            ctx.putImageData(imageData, 0, 0);
            
            // Return processed image as data URL
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageDataUrl;
    });
}

// Correct common character recognition errors for sight words
function correctCharacterErrors(text) {
    // Apply corrections to ALL systems, not just older ones
    console.log('Applying character error corrections to:', text);
    
    // Sight word specific corrections - ordered by specificity (most specific first)
    const sightWordCorrections = [
        // Most specific corrections first
        { error: 'gradc', correction: 'grade' },
        { error: 'gradd', correction: 'grade' },
        { error: 'gradr', correction: 'grade' },
        { error: 'gradt', correction: 'grade' },
        { error: 'gradn', correction: 'grade' },
        { error: 'gradm', correction: 'grade' },
        { error: 'gradl', correction: 'grade' },
        { error: 'gradk', correction: 'grade' },
        { error: 'gradj', correction: 'grade' },
        { error: 'gradh', correction: 'grade' },
        { error: 'gradg', correction: 'grade' },
        { error: 'gradf', correction: 'grade' },
        { error: 'grad', correction: 'grade' },
        
        // Common sight word errors
        { error: 'een', correction: 'been' },
        { error: 'al', correction: 'all' },
        { error: 'ave', correction: 'have' },
        { error: 'ere', correction: 'here' },
        { error: 'ere', correction: 'there' },
        { error: 'ere', correction: 'where' },
        { error: 'ere', correction: 'were' },
        
        // Character substitutions (numbers to letters)
        { error: '0', correction: 'o' },
        { error: '1', correction: 'l' },
        { error: '5', correction: 's' },
        { error: '8', correction: 'b' },
        { error: '6', correction: 'g' },
        { error: '9', correction: 'g' },
        { error: '2', correction: 'z' },
        { error: '3', correction: 'e' },
        { error: '4', correction: 'a' },
        { error: '7', correction: 't' },
        
        // Common OCR artifacts
        { error: 'rn', correction: 'm' },
        { error: 'cl', correction: 'd' },
        { error: 'li', correction: 'h' },
        { error: 'u', correction: 'n' },
        { error: 'v', correction: 'u' },
        { error: 'w', correction: 'vv' },
    ];
    
    let correctedText = text;
    
    // Apply corrections with word boundaries
    for (const { error, correction } of sightWordCorrections) {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${error}\\b`, 'gi');
        const beforeReplace = correctedText;
        correctedText = correctedText.replace(regex, correction);
        
        // Log if a correction was made
        if (beforeReplace !== correctedText) {
            console.log(`Corrected "${error}" to "${correction}" in: ${beforeReplace} -> ${correctedText}`);
        }
    }
    
    console.log('Final corrected text:', correctedText);
    return correctedText;
}

// Filter OCR results by confidence to ensure quality
function filterOCRResultByConfidence(result) {
    const isOld = isOlderSystem();
    const minConfidence = isOld ? 40 : 60; // Lower threshold for older systems
    
    // If overall confidence is too low, return empty string
    if (result.data.confidence < minConfidence) {
        console.warn(`Low overall OCR confidence: ${result.data.confidence}% (threshold: ${minConfidence}%)`);
        return '';
    }
    
    // Filter individual words by confidence if available
    if (result.data.words && result.data.words.length > 0) {
        const highConfidenceWords = result.data.words
            .filter(word => word.confidence >= minConfidence)
            .map(word => word.text.trim())
            .filter(text => text.length >= 2);
        
        let resultText = highConfidenceWords.join(' ');
        
        // Apply character error corrections to ALL systems
        resultText = correctCharacterErrors(resultText);
        
        return resultText;
    }
    
    // Fallback to full text if word-level confidence not available
    let resultText = result.data.text;
    
    // Apply character error corrections to ALL systems
    resultText = correctCharacterErrors(resultText);
    
    return resultText;
}

// Fallback OCR processing for very old systems
async function fallbackOCRProcessing(images) {
    console.log('Using fallback OCR processing for older system');
    let allText = '';
    
    for (let i = 0; i < images.length; i++) {
        try {
            // Use minimal configuration for maximum compatibility
            const result = await Tesseract.recognize(images[i], 'eng', {
                oem: 1, // LSTM_ONLY (most compatible)
                psm: 6, // SINGLE_UNIFORM_BLOCK (fastest)
                tessedit_min_confidence: 30, // Very low threshold
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        showProcessingStatus(`Fallback processing page ${i + 1}... ${progress}%`);
                    }
                }
            });
            
            // Accept any result with confidence > 30%
            if (result.data.confidence > 30) {
                allText += result.data.text + ' ';
            }
        } catch (error) {
            console.warn(`Fallback OCR failed for page ${i + 1}:`, error);
        }
    }
    
    return allText;
}

// Extract text from images using OCR
async function extractTextFromImages(images) {
    const isOld = isOlderSystem();
    
    // For very old systems, use fallback processing
    if (isOld && (navigator.hardwareConcurrency < 2 || navigator.deviceMemory < 2)) {
        console.log('Detected very old system, using fallback OCR processing');
        return await fallbackOCRProcessing(images);
    }
    
    let allText = '';
    let allConfidenceData = [];
    
    for (let i = 0; i < images.length; i++) {
        showProcessingStatus(`Processing page ${i + 1} of ${images.length} with OCR...`);
        
        try {
            // Preprocess image for better OCR consistency
            const processedImage = await preprocessImageForOCR(images[i]);
            
            // Get optimized configuration based on system capabilities
            const ocrConfig = getOptimizedOCRConfig();
            
            const result = await Tesseract.recognize(processedImage, 'eng', {
                ...ocrConfig,
                
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        showProcessingStatus(`Processing page ${i + 1} of ${images.length}... ${progress}%`);
                    }
                    console.log(m);
                }
            });
            
            console.log(`Page ${i + 1} OCR result:`, result.data.text);
            console.log(`Page ${i + 1} OCR confidence:`, result.data.confidence);
            
            // Filter results by confidence and collect confidence data
            const filteredText = filterOCRResultByConfidence(result);
            allText += filteredText + ' ';
            allConfidenceData.push({
                page: i + 1,
                confidence: result.data.confidence,
                wordCount: filteredText.split(/\s+/).filter(w => w.length >= 2).length
            });
            
            hideProcessingStatus();
        } catch (error) {
            console.warn(`OCR failed for page ${i + 1}:`, error);
            
            // If standard OCR fails on older systems, try fallback
            if (isOld) {
                console.log('Attempting fallback OCR for failed page');
                try {
                    const fallbackResult = await Tesseract.recognize(images[i], 'eng', {
                        oem: 1,
                        psm: 6,
                        tessedit_min_confidence: 30
                    });
                    if (fallbackResult.data.confidence > 30) {
                        allText += fallbackResult.data.text + ' ';
                    }
                } catch (fallbackError) {
                    console.warn('Fallback OCR also failed:', fallbackError);
                }
            }
            
            hideProcessingStatus();
        }
    }
    
    console.log('Total extracted text length:', allText.length);
    console.log('OCR confidence data:', allConfidenceData);
    return allText;
}

// Sanity testing module for OCR results
function sanityTestWord(word) {
    // Convert to lowercase for consistent testing
    const testWord = word.toLowerCase();
    
    // 1. Length checks
    if (testWord.length < 2 || testWord.length > 10) {
        return { isValid: false, reason: 'length' };
    }
    
    // 2. Check for common OCR artifacts
    const ocrArtifacts = [
        'wh', 'th', 'ch', 'sh', 'ph', 'qu', 'ck', 'ng', 'st', 'nd', 'rd', 'th',
        'll', 'ss', 'ff', 'tt', 'pp', 'mm', 'nn', 'bb', 'dd', 'gg', 'rr', 'vv',
        'aa', 'ee', 'ii', 'oo', 'uu', 'yy'
    ];
    
    if (ocrArtifacts.includes(testWord)) {
        return { isValid: false, reason: 'ocr_artifact' };
    }
    
    // 3. Check for inappropriate content (age-appropriate filter)
    const inappropriateWords = [
        // Common expletives and variations
        'damn', 'dammit', 'hell', 'heck', 'crap', 'shit', 'piss', 'fuck', 'fucking', 'fucker',
        'bitch', 'ass', 'asshole', 'bastard', 'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut',
        // Common misspellings and variations
        'fuk', 'fuq', 'fck', 'shyt', 'sh*t', 'f*ck', 'f**k', 'f***', 'a**', 'a***', 'b***h',
        'd**n', 'h**l', 'c**p', 'p**s', 'd**k', 'c**k', 'p**y', 'c**t', 'w**e', 's**t',
        // Partial matches and common patterns
        'fuk', 'fuq', 'fck', 'shyt', 'sh*t', 'f*ck', 'f**k', 'f***', 'a**', 'a***', 'b***h',
        // Additional variations and common OCR misreads
        'fukc', 'fuking', 'fukin', 'fuked', 'fukd', 'shyt', 'shytty', 'shytty', 'assh', 'asshole',
        'bitchy', 'bitchin', 'bitchin', 'dammit', 'dammit', 'hellish', 'hellish', 'crapola',
        // Common first letter + asterisk patterns
        'f*', 's*', 'a*', 'b*', 'c*', 'd*', 'h*', 'p*', 'w*'
    ];
    
    if (inappropriateWords.includes(testWord)) {
        return { isValid: false, reason: 'inappropriate_content' };
    }
    
    // Check for partial matches and common patterns
    const inappropriatePatterns = [
        /^f[u*]ck/, /^sh[i*]t/, /^a[s*]s/, /^b[i*]tch/, /^d[a*]mn/, /^h[e*]ll/, /^c[r*]ap/,
        /^p[i*]ss/, /^d[i*]ck/, /^c[o*]ck/, /^p[u*]ssy/, /^c[u*]nt/, /^w[h*]ore/, /^s[l*]ut/
    ];
    
    for (const pattern of inappropriatePatterns) {
        if (pattern.test(testWord)) {
            return { isValid: false, reason: 'inappropriate_pattern' };
        }
    }
    
    // 4. Check for concatenated words (common OCR issue)
    const commonWords = [
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'a', 'an', 'is', 'it', 'he', 'she', 'we', 'me', 'my', 'you', 'your', 'they',
        'will', 'can', 'has', 'had', 'was', 'were', 'be', 'been', 'have', 'do', 'does',
        'did', 'go', 'goes', 'went', 'come', 'came', 'see', 'saw', 'say', 'said',
        'get', 'got', 'make', 'made', 'take', 'took', 'give', 'gave', 'find', 'found',
        'look', 'looked', 'like', 'liked', 'want', 'wanted', 'need', 'needed',
        'play', 'played', 'work', 'worked', 'help', 'helped', 'tell', 'told',
        'ask', 'asked', 'know', 'knew', 'think', 'thought', 'feel', 'felt',
        'good', 'bad', 'big', 'small', 'new', 'old', 'long', 'short', 'high', 'low',
        'first', 'last', 'next', 'then', 'now', 'here', 'there', 'where', 'when',
        'why', 'how', 'what', 'who', 'which', 'this', 'that', 'these', 'those'
    ];
    
    // Extended word list for concatenation detection
    const extendedWords = [
        ...commonWords,
        'test', 'check', 'try', 'use', 'see', 'look', 'read', 'write', 'draw', 'paint',
        'sing', 'dance', 'run', 'walk', 'jump', 'play', 'eat', 'drink', 'sleep', 'wake',
        'open', 'close', 'start', 'stop', 'begin', 'end', 'finish', 'break', 'fix', 'build',
        'clean', 'wash', 'cook', 'bake', 'buy', 'sell', 'give', 'take', 'bring', 'carry',
        'push', 'pull', 'lift', 'drop', 'catch', 'throw', 'hit', 'kick', 'touch', 'hold',
        'let', 'put', 'set', 'get', 'find', 'lose', 'keep', 'save', 'spend', 'cost',
        'time', 'day', 'night', 'morning', 'evening', 'week', 'month', 'year', 'hour', 'minute',
        'book', 'page', 'story', 'word', 'letter', 'number', 'name', 'friend', 'family', 'home',
        'school', 'teacher', 'student', 'class', 'room', 'door', 'window', 'floor', 'wall', 'ceiling',
        'table', 'chair', 'bed', 'desk', 'box', 'bag', 'cup', 'plate', 'fork', 'spoon',
        'car', 'bus', 'train', 'plane', 'bike', 'boat', 'road', 'street', 'house', 'tree',
        'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'hot', 'cold', 'warm',
        'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink', 'purple', 'orange'
    ];
    
    // Enhanced concatenation detection
    function detectConcatenation(word) {
        // Check for exact concatenations of two words
        for (let i = 0; i < extendedWords.length; i++) {
            for (let j = i + 1; j < extendedWords.length; j++) {
                const concatenated = extendedWords[i] + extendedWords[j];
                if (word === concatenated) {
                    return { isConcatenated: true, parts: [extendedWords[i], extendedWords[j]] };
                }
            }
        }
        
        // Check for partial matches (word starts with one word and contains another)
        for (const word1 of extendedWords) {
            if (word.startsWith(word1) && word1.length >= 3) {
                const remaining = word.slice(word1.length);
                if (remaining.length >= 2) {
                    for (const word2 of extendedWords) {
                        if (remaining === word2 || remaining.startsWith(word2)) {
                            return { isConcatenated: true, parts: [word1, word2] };
                        }
                    }
                }
            }
        }
        
        // Check for common OCR concatenation patterns
        const commonPrefixes = ['will', 'can', 'has', 'had', 'was', 'were', 'have', 'do', 'did', 'go', 'come', 'see', 'get', 'make', 'take', 'give', 'find', 'look', 'like', 'want', 'need', 'play', 'work', 'help', 'tell', 'ask', 'know', 'think', 'feel', 'good', 'bad', 'big', 'small', 'new', 'old', 'long', 'short', 'high', 'low', 'first', 'last', 'next', 'then', 'now', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who', 'which', 'this', 'that', 'these', 'those'];
        const commonSuffixes = ['test', 'check', 'try', 'use', 'see', 'look', 'read', 'write', 'draw', 'paint', 'sing', 'dance', 'run', 'walk', 'jump', 'play', 'eat', 'drink', 'sleep', 'wake', 'open', 'close', 'start', 'stop', 'begin', 'end', 'finish', 'break', 'fix', 'build', 'clean', 'wash', 'cook', 'bake', 'buy', 'sell', 'give', 'take', 'bring', 'carry', 'push', 'pull', 'lift', 'drop', 'catch', 'throw', 'hit', 'kick', 'touch', 'hold', 'let', 'put', 'set', 'get', 'find', 'lose', 'keep', 'save', 'spend', 'cost', 'time', 'day', 'night', 'morning', 'evening', 'week', 'month', 'year', 'hour', 'minute', 'book', 'page', 'story', 'word', 'letter', 'number', 'name', 'friend', 'family', 'home', 'school', 'teacher', 'student', 'class', 'room', 'door', 'window', 'floor', 'wall', 'ceiling', 'table', 'chair', 'bed', 'desk', 'box', 'bag', 'cup', 'plate', 'fork', 'spoon', 'car', 'bus', 'train', 'plane', 'bike', 'boat', 'road', 'street', 'house', 'tree', 'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'hot', 'cold', 'warm'];
        
        for (const prefix of commonPrefixes) {
            if (word.startsWith(prefix) && word.length > prefix.length + 2) {
                const remaining = word.slice(prefix.length);
                for (const suffix of commonSuffixes) {
                    if (remaining === suffix || remaining.startsWith(suffix)) {
                        return { isConcatenated: true, parts: [prefix, suffix] };
                    }
                }
            }
        }
        
        return { isConcatenated: false };
    }
    
    // Check for concatenated words
    const concatenationResult = detectConcatenation(testWord);
    if (concatenationResult.isConcatenated) {
        return { isValid: false, reason: `concatenated_words (${concatenationResult.parts.join('+')})` };
    }
    

    
    // 5. Check for truncated words (OCR dropping first letter)
    const truncatedWords = [
        // Common truncated words from OCR dropping first letter
        'uch', 'ave', 'ere', 'ell', 'ith', 'ome', 'ook', 'ake', 'ive', 'ind',
        'ent', 'ood', 'ery', 'rom', 'ork', 'lay', 'ide', 'ong', 'ight', 'ime',
        'ead', 'rite', 'alk', 'ump', 'ink', 'eel', 'old', 'ew', 'ast', 'ext',
        'ight', 'ould', 'ater', 'eople', 'irst', 'umber', 'ther', 'ime', 'ord'
    ];
    
    if (truncatedWords.includes(testWord)) {
        return { isValid: false, reason: 'truncated_word' };
    }
    
    // 5.5. Check for OCR character substitution errors
    const ocrSubstitutionErrors = [
        // Common OCR character substitution errors (o->q, d->n, etc.)
        'arqund', 'arounn', 'arqund', 'arqund', 'arounq', 'arounu', 'arourd', 'arcund',
        'wqrd', 'woru', 'worq', 'wqru', 'worb', 'wqrb', 'worc', 'wqrc',
        'tqe', 'tue', 'the', 'tne', 'fqr', 'fpr', 'fqt', 'fpt',
        'qf', 'qn', 'qr', 'qut', 'qne', 'frqm', 'frpm', 'gqing',
        'hqme', 'hpme', 'sqme', 'spme', 'cqme', 'cpme', 'tqok',
        'lqqk', 'bqqk', 'gqqd', 'fqqd', 'nqqd', 'mqqd', 'eek', 'iqk',
        'whqle', 'whple', 'whqn', 'whpn', 'whqt', 'whpt'
    ];
    
    if (ocrSubstitutionErrors.includes(testWord)) {
        return { isValid: false, reason: 'ocr_substitution_error' };
    }
    
    // 6. Check for repeated characters (OCR noise)
    const repeatedCharPattern = /(.)\1{2,}/; // 3 or more repeated characters
    if (repeatedCharPattern.test(testWord)) {
        return { isValid: false, reason: 'repeated_chars' };
    }
    
    // 6. Check for unlikely character combinations
    const unlikelyPatterns = [
        /[aeiou]{4,}/, // 4+ consecutive vowels
        /[bcdfghjklmnpqrstvwxyz]{5,}/, // 5+ consecutive consonants
        /^[bcdfghjklmnpqrstvwxyz]+$/, // Only consonants
        /^[aeiou]+$/, // Only vowels (unless it's a valid word)
    ];
    
    for (const pattern of unlikelyPatterns) {
        if (pattern.test(testWord)) {
            // Allow some common single-vowel words
            if (pattern.source === '^[aeiou]+$' && ['a', 'i', 'o'].includes(testWord)) {
                continue;
            }
            return { isValid: false, reason: 'unlikely_pattern' };
        }
    }
    
    // 7. Check against a list of known valid sight words
    const validSightWords = [
        'a', 'about', 'all', 'am', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
        'call', 'can', 'come', 'could', 'day', 'did', 'do', 'down', 'each', 'find', 'first',
        'for', 'from', 'get', 'go', 'had', 'has', 'have', 'he', 'her', 'here', 'him', 'his',
        'how', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'know', 'like', 'long', 'look',
        'made', 'make', 'many', 'may', 'more', 'my', 'no', 'not', 'now', 'number', 'of', 'on',
        'one', 'or', 'other', 'out', 'part', 'people', 'said', 'see', 'she', 'so', 'some',
        'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
        'time', 'to', 'two', 'up', 'use', 'was', 'water', 'way', 'we', 'were', 'what',
        'when', 'which', 'who', 'will', 'with', 'word', 'would', 'write', 'you', 'your',
        'yesterday', 'today', 'tomorrow', 'morning', 'afternoon', 'evening', 'night'
    ];
    
    // If it's a known sight word, it's valid
    if (validSightWords.includes(testWord)) {
        return { isValid: true, reason: 'known_sight_word' };
    }
    
    // 8. Basic English word validation (simple heuristic)
    // Check if word follows basic English patterns
    const hasVowel = /[aeiou]/.test(testWord);
    const hasConsonant = /[bcdfghjklmnpqrstvwxyz]/.test(testWord);
    const startsWithConsonant = /^[bcdfghjklmnpqrstvwxyz]/.test(testWord);
    const endsWithVowel = /[aeiou]$/.test(testWord);
    
    // Most English words have both vowels and consonants
    if (!hasVowel || !hasConsonant) {
        return { isValid: false, reason: 'missing_vowel_or_consonant' };
    }
    
    // 9. Final validation - check if word looks reasonable
    // Allow words that pass all previous checks and have reasonable length
    if (testWord.length >= 2 && testWord.length <= 10) {
        return { isValid: true, reason: 'passed_validation' };
    }
    
    return { isValid: false, reason: 'failed_final_check' };
}



// Process extracted text to find words
function processExtractedText(text) {
    console.log('Raw extracted text:', text);
    
    // Split text into words and clean them
    const rawWords = text
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[^a-z]/g, '')) // Remove non-letters
        .filter(word => word.length >= 2 && word.length <= 10); // Initial length filter
    
    console.log('Initial word list:', rawWords);
    
    // Apply sanity testing to each word
    const sanityResults = rawWords.map(word => ({
        word: word,
        ...sanityTestWord(word)
    }));
    
    console.log('Sanity test results:', sanityResults);
    
    // Filter out invalid words and get reasons for logging
    const validWords = [];
    const invalidWords = [];
    
    sanityResults.forEach(result => {
        if (result.isValid) {
            validWords.push(result.word);
        } else {
            invalidWords.push({ word: result.word, reason: result.reason });
        }
    });
    
    console.log('Valid words:', validWords);
    console.log('Invalid words (with reasons):', invalidWords);
    
    // Additional filters for valid words
    const finalWords = validWords
        .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'your', 'child', 'should', 'know', 'sight', 'word', 'list', 'end', 'grade'].includes(word)) // Remove common words and instructional text
        .filter(word => !word.match(/^(red|blue|green|yellow|black|white|brown|pink|purple|orange)$/)) // Remove color words
        .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    
    console.log('Final filtered word list:', finalWords);
    
    return {
        words: finalWords,
        sanityResults: {
            validWords: validWords,
            invalidWords: invalidWords,
            totalProcessed: rawWords.length
        }
    };
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

// Show word preview with sanity test information
function showWordPreview(newWords, sanityResults = null) {
    detectedWords = newWords;
    const preview = document.getElementById('word-preview');
    const previewWords = document.getElementById('preview-words');
    
    previewWords.innerHTML = '';
    
    if (sanityResults) {
        // Show detailed information about the filtering process
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'sanity-summary';
        summaryDiv.innerHTML = `
            <h4>Word Processing Summary:</h4>
            <p><strong>${newWords.length}</strong> words passed sanity testing and will be added.</p>
            <p><strong>${sanityResults.invalidWords ? sanityResults.invalidWords.length : 0}</strong> words were filtered out due to OCR issues.</p>
            <details>
                <summary>View filtered words and reasons</summary>
                <div class="filtered-words">
                    ${sanityResults.invalidWords ? sanityResults.invalidWords.map(item => {
                        const isInappropriate = item.reason.includes('inappropriate');
                        return `<div class="filtered-word ${isInappropriate ? 'inappropriate' : ''}"><span class="word">${item.word}</span> <span class="reason">(${item.reason})</span></div>`;
                    }).join('') : ''}
                </div>
            </details>
        `;
        previewWords.appendChild(summaryDiv);
    }
    
    // Show the words that will be added
    const wordsDiv = document.createElement('div');
    wordsDiv.className = 'words-to-add';
    wordsDiv.innerHTML = '<h4>Words to be added:</h4>';
    
    newWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'preview-word';
        wordElement.textContent = word;
        wordsDiv.appendChild(wordElement);
    });
    
    previewWords.appendChild(wordsDiv);
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
    // Log system info for debugging OCR inconsistencies
    logSystemInfo();
    
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
