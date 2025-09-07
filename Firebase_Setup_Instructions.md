# Firebase Integration Setup Instructions

## Overview

Your sight words application has been successfully configured to use Firebase Firestore for storing and retrieving word lists. This allows teachers to create word lists and generate shareable URLs for students.

## Files Created/Modified

### New Files:
- `firebase-init.js` - Firebase initialization and configuration
- `upload.html` - Teacher portal for creating word lists
- `teacher-portal.js` - JavaScript for teacher portal functionality
- `Firebase_Setup_Instructions.md` - This instruction file

### Modified Files:
- `index.html` - Updated to load Firebase SDK
- `script.js` - Updated to load words from Firebase when URL contains an ID

## How It Works

### Teacher Workflow:
1. **Access Teacher Portal**: Go to `upload.html`
2. **Upload Document**: Upload a PDF or DOCX file with sight words
3. **Review Words**: The system extracts and displays the words
4. **Generate Link**: Click "Generate Student Link" to save to Firebase
5. **Share URL**: Copy and share the generated URL with students

### Student Workflow:
1. **Receive URL**: Students get a URL like `index.html?id=abc123`
2. **Access Words**: The system loads words from Firebase using the ID
3. **Practice**: Students click buttons to hear words pronounced

## Firebase Configuration

Your Firebase project is already configured with:
- **Project ID**: `sight-word-app-8b3df`
- **Database**: Firestore (NoSQL)
- **Authentication**: Anonymous authentication for teachers
- **Security Rules**: Public read access, authenticated write access

## Testing the Integration

### Step 1: Test Teacher Portal
1. Open `upload.html` in your browser
2. Upload a PDF or DOCX file with sight words
3. Review the extracted words
4. Click "Generate Student Link"
5. Copy the generated URL

### Step 2: Test Student Portal
1. Open the generated URL in a new tab
2. Verify that the words load from Firebase
3. Test clicking word buttons to hear pronunciation

### Step 3: Verify Firebase Data
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Firestore Database
3. Check the `wordLists` collection
4. Verify your word list was saved

## Firebase Security Rules

The following security rules are configured:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Word lists can be read by anyone with the link
    match /wordLists/{listId} {
      allow read: if true;
      allow create: if request.auth != null; // Only authenticated users can create
      allow update, delete: if false; // Disallow updates/deletes for simplicity
    }
  }
}
```

## Troubleshooting

### Common Issues:

1. **Firebase not initializing**
   - Check browser console for errors
   - Verify Firebase config is correct
   - Ensure internet connection

2. **Words not loading**
   - Check if URL contains `?id=...` parameter
   - Verify Firebase document exists
   - Check browser console for errors

3. **Upload not working**
   - Check file format (PDF or DOCX only)
   - Verify file size (under 1MB)
   - Check browser console for errors

### Debug Steps:

1. **Check Console Logs**
   - Open browser developer tools
   - Look for Firebase initialization messages
   - Check for any error messages

2. **Verify Firebase Connection**
   - Go to Firebase Console
   - Check if documents are being created
   - Verify security rules are published

3. **Test with Simple Data**
   - Try uploading a simple DOCX file
   - Use manual word input as fallback
   - Test with a small word list first

## Next Steps

### Optional Enhancements:

1. **User Authentication**
   - Add email/password authentication
   - Create teacher accounts
   - Add user management

2. **Advanced Features**
   - Word list editing
   - Progress tracking
   - Analytics and reporting

3. **Deployment**
   - Deploy to Firebase Hosting
   - Set up custom domain
   - Configure production settings

## Support

If you encounter any issues:

1. Check the browser console for error messages
2. Verify Firebase project configuration
3. Test with different file formats
4. Check Firebase Console for data

The system is designed to be robust with multiple fallback options, so it should work even if some components fail.
