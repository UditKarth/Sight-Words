# Read with Me! - First Grade Sight Words

A vibrant, interactive website designed to help first-grade students learn and practice sight word pronunciation. Children can click on any word to hear it spoken aloud using the browser's built-in speech synthesis.

## Features

- **Interactive Word Buttons**: Large, colorful buttons that are easy for children to click
- **Speech Synthesis**: Uses the Web Speech API to pronounce words clearly and at a child-friendly pace
- **Visual Feedback**: Words light up and animate when clicked
- **Audio Feedback**: Gentle beep sound provides additional confirmation
- **PDF Upload with OCR**: Teachers can upload PDF documents with sight words and have them automatically extracted using OCR technology
- **Advanced Word Filtering**: Multi-layered sanity checking system to filter out OCR errors and inappropriate content
- **Drag & Drop Interface**: Easy-to-use drag and drop area for PDF uploads
- **Word Preview with Filtering Details**: Review detected words and see what was filtered out with detailed explanations
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Child-Friendly UI**: Bright colors, rounded corners, and engaging animations
- **Age-Appropriate Content**: Built-in filters ensure only appropriate words for first-grade students

## File Structure

```
├── index.html          # Main HTML page
├── style.css           # CSS styling and animations
├── script.js           # JavaScript functionality
├── words.csv           # List of first-grade sight words
└── README.md           # This file
```

## Setup Instructions

### Local Development

1. Clone or download this repository
2. Open `index.html` in a modern web browser (or use a local server for full functionality)
3. Click on any word to hear it pronounced
4. Use the PDF upload feature to add new words from scanned documents

**Note**: For full OCR functionality, use a local web server (e.g., `python3 -m http.server 8000`) instead of opening the file directly.

### GitHub Pages Deployment

1. Create a new GitHub repository
2. Upload all files to the repository
3. Go to repository Settings → Pages
4. Select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Click "Save"
7. Your site will be available at `https://yourusername.github.io/repository-name`

## Browser Compatibility

This website uses the Web Speech API, which is supported in:
- Chrome 33+
- Safari 7+
- Firefox 49+
- Edge 14+

For the best experience, use Chrome or Safari.

## Customization

### Adding More Words

Edit the `words.csv` file to add or remove words. Each word should be on its own line:

```
word1
word2
word3
```

### Changing Colors

Modify the CSS variables in `style.css` to change the color scheme:

```css
.word-button {
    background: linear-gradient(145deg, #your-color, #your-color);
}
```

### Adjusting Speech Settings

In `script.js`, you can modify the speech parameters:

```javascript
utterance.rate = 0.8;    // Speed (0.1 to 10)
utterance.pitch = 1.1;   // Pitch (0 to 2)
utterance.volume = 1.0;  // Volume (0 to 1)
```

### OCR and PDF Processing

The website uses Tesseract.js for OCR processing:

- **Supported Formats**: PDF files with text or scanned images
- **Processing Limit**: Up to 3 pages per PDF for optimal performance
- **Advanced Word Filtering**: Multi-layered sanity checking system that filters out:
  - OCR artifacts (e.g., "wh", "th", "ch")
  - Concatenated words (e.g., "willtest" from "will" + "test")
  - Truncated words (e.g., "uch" from "such", "ave" from "have")
  - Character substitution errors (e.g., "arqund" from "around")
  - Inappropriate content for young learners
  - Repeated characters and unlikely patterns
- **Word Length**: Accepts words between 2-10 characters (expanded for longer sight words)
- **Known Word Validation**: Whitelist of valid first-grade sight words

To customize OCR settings, modify the `processExtractedText()` function in `script.js`.

## User Interface & Experience

### **Enhanced Word Preview**
- **Processing Summary**: Shows total words processed, accepted, and filtered
- **Filtering Details**: Collapsible section showing what was filtered out and why
- **Visual Indicators**: Different styling for different types of filtered words
- **Statistics**: Clear counts of successful vs. rejected words

### **Improved Feedback**
- **Real-time Processing**: Status updates during PDF processing and OCR
- **Detailed Logging**: Console output for debugging and understanding the filtering process
- **Error Handling**: Graceful fallbacks when OCR fails or encounters issues
- **Success Messages**: Clear confirmation when words are successfully added

## Advanced Word Filtering System

The application includes a comprehensive sanity checking system that filters out problematic OCR results:

### **OCR Artifact Detection**
- Filters out common OCR noise like "wh", "th", "ch", "sh", "ph", "qu", "ck", "ng"
- Removes single-letter combinations that aren't valid words

### **Concatenated Word Detection**
- Identifies words that combine multiple common words (e.g., "willtest" = "will" + "test")
- Uses an extensive vocabulary list to detect concatenations
- Prevents OCR errors where words run together

### **Truncated Word Detection**
- Catches words where the first letter was dropped by OCR
- Examples: "uch" (from "such"), "ave" (from "have"), "ell" (from "well")
- Maintains word integrity for proper learning

### **Character Substitution Error Detection**
- Identifies common OCR misreads where similar characters get confused
- Examples: "arqund" (from "around"), "wqrd" (from "word"), "tqe" (from "the")
- Handles common confusions like o↔q, d↔n, h↔q

### **Content Safety Filtering**
- Built-in inappropriate content filter for age-appropriate learning
- Blocks expletives and inappropriate language
- Ensures safe content for first-grade students

### **Pattern Validation**
- Checks for unlikely character combinations
- Validates English word patterns (vowels/consonants)
- Filters out words with excessive repeated characters

## Word List

The current word list includes 41 first-grade Dolch sight words:
- after, again, an, any, ask, as, by, could, every, fly
- from, give, going, had, has, her, him, his, how, just
- know, let, live, may, of, old, once, open, over, put
- round, some, stop, take, thank, them, then, think, walk, were, when

**Extended Sight Words**: The system also recognizes additional common first-grade words like:
- yesterday, today, tomorrow, morning, afternoon, evening, night
- Additional time-related and common vocabulary words

## Technical Details

- **Speech Synthesis**: Uses `SpeechSynthesisUtterance` for text-to-speech
- **OCR Processing**: Uses Tesseract.js for PDF text extraction and OCR
- **PDF Handling**: Uses PDF.js for PDF rendering and conversion to images
- **Advanced Word Filtering**: Multi-layered sanity checking system with:
  - OCR artifact detection
  - Concatenated word detection
  - Truncated word detection
  - Character substitution error detection
  - Inappropriate content filtering
  - Pattern validation
- **Event Delegation**: Efficient click handling for dynamically generated buttons
- **Responsive Grid**: CSS Grid for adaptive layout
- **Progressive Enhancement**: Graceful degradation if speech synthesis is unavailable
- **Drag & Drop**: Native HTML5 drag and drop API for file uploads
- **Visual Feedback**: Detailed word processing summaries and filtering explanations
- **User Experience**: Enhanced word preview with filtering statistics and explanations

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this educational tool!

