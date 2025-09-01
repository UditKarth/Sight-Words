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

// Test function for sanity checks (can be removed in production)
function testSanityChecks() {
    const testWords = [
        'yesterday', 'wh', 'willtest', 'cat', 'dog', 'a', 'the', 'supercalifragilisticexpialidocious',
        // Test inappropriate content filter
        'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'fuk', 'sh*t', 'f*ck',
        // Test concatenated words
        'willtest', 'cantest', 'hastest', 'dotest', 'gotest', 'seetest', 'maketest', 'taketest',
        'willcheck', 'cancheck', 'hascheck', 'docheck', 'gocheck', 'seecheck', 'makecheck', 'takecheck',
        'willtry', 'cantry', 'hastry', 'dotry', 'gotry', 'seetry', 'maketry', 'taketry',
        'willuse', 'canuse', 'hasuse', 'douse', 'gouse', 'seeuse', 'makeuse', 'takeuse',
        // Test truncated words
        'uch', 'ave', 'ere', 'ell', 'ith', 'ome', 'ook', 'ake', 'ive', 'ind'
    ];
    
    console.log('Testing sanity checks:');
    testWords.forEach(word => {
        const result = sanityTestWord(word);
        console.log(`"${word}": ${result.isValid ? 'PASS' : 'FAIL'} (${result.reason})`);
    });
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
    
    // Test sanity checks (remove in production)
    setTimeout(() => {
        console.log('Running sanity check tests...');
        testSanityChecks();
    }, 2000);
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
