# Read with Me! - First Grade Sight Words

A vibrant, interactive website designed to help first-grade students learn and practice sight word pronunciation. Children can click on any word to hear it spoken aloud using the browser's built-in speech synthesis.

## Features

- **Interactive Word Buttons**: Large, colorful buttons that are easy for children to click
- **Speech Synthesis**: Uses the Web Speech API to pronounce words clearly and at a child-friendly pace
- **Visual Feedback**: Words light up and animate when clicked
- **Audio Feedback**: Gentle beep sound provides additional confirmation
- **PDF Upload with OCR**: Teachers can upload PDF documents with sight words and have them automatically extracted using OCR technology
- **Drag & Drop Interface**: Easy-to-use drag and drop area for PDF uploads
- **Word Preview**: Review detected words before adding them to the list
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Child-Friendly UI**: Bright colors, rounded corners, and engaging animations

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
- **Processing Limit**: Up to 5 pages per PDF for performance
- **Word Filtering**: Automatically filters out common words and duplicates
- **Word Length**: Focuses on words between 2-8 characters (typical sight word length)

To customize OCR settings, modify the `processExtractedText()` function in `script.js`.

## Word List

The current word list includes 41 first-grade Dolch sight words:
- after, again, an, any, ask, as, by, could, every, fly
- from, give, going, had, has, her, him, his, how, just
- know, let, live, may, of, old, once, open, over, put
- round, some, stop, take, thank, them, then, think, walk, were, when

## Technical Details

- **Speech Synthesis**: Uses `SpeechSynthesisUtterance` for text-to-speech
- **OCR Processing**: Uses Tesseract.js for PDF text extraction and OCR
- **PDF Handling**: Uses PDF.js for PDF rendering and conversion to images
- **Event Delegation**: Efficient click handling for dynamically generated buttons
- **Responsive Grid**: CSS Grid for adaptive layout
- **Progressive Enhancement**: Graceful degradation if speech synthesis is unavailable
- **Drag & Drop**: Native HTML5 drag and drop API for file uploads

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this educational tool!

