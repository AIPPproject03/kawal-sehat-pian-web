# Firebase Setup Guide for Kawal Sehat Pian (FREE PLAN)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "Kawal Sehat Pian"
4. Follow the setup wizard
5. **Stay on Spark (Free) Plan** - No billing upgrade needed!

## Step 2: Register Web App

1. In your Firebase project, click the Web icon (</>) to register your app
2. Name it "Kawal Sehat Pian Web"
3. Copy the Firebase configuration object

## Step 3: Update Firebase Config

Your Firebase config is already set in `src/js/app.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA00JIvQxqKIkTI_9w14_NRgHZMunFked8",
  authDomain: "kawal-sehat-pian.firebaseapp.com",
  projectId: "kawal-sehat-pian",
  storageBucket: "kawal-sehat-pian.firebasestorage.app",
  messagingSenderId: "691975475378",
  appId: "1:691975475378:web:5fc357ef751aa993f679ab",
  measurementId: "G-ZQC0V56E04",
};
```

✅ **This config is already set and working!**

## Step 4: Enable Firebase Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Email/Password"
3. Enable "Anonymous"

## Step 5: Create Firestore Database

1. Go to "Firestore Database" → "Create database"
2. Choose "Start in test mode" (for development)
3. Select your preferred location (use same as your project region)

## Step 6: Set Firestore Rules

Go to "Firestore Database" → "Rules" and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Consultations collection
    match /consultations/{consultationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        || resource.data.patientId == request.auth.uid);

      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }
  }
}
```

## Step 7: Create Admin User

### Option 1: Using Firebase Console (Recommended)

1. Go to "Authentication" → "Users" → "Add user"
2. Email: `admin@kawalsehat.com` (or your email)
3. Password: Create a strong password
4. Copy the UID of the created user

5. Go to "Firestore Database" → "Start collection"
6. Collection ID: `users`
7. Document ID: Paste the UID from step 4
8. Add fields:
   ```
   uid: [paste UID]
   name: "Bidan Pian"
   email: "admin@kawalsehat.com"
   role: "admin"
   createdAt: [click "timestamp" and select current date/time]
   ```

### Option 2: Register as Normal User, Then Upgrade

1. Register through the app
2. Go to Firestore Database
3. Find your user document in `users` collection
4. Edit the document and change `role` from "member" to "admin"

## Important Notes

### ✅ No Firebase Storage Needed!

This app uses **base64 encoding** to store payment proof images directly in Firestore documents. This means:

- ✅ Works with FREE Spark plan
- ✅ No billing upgrade required
- ✅ Max file size: 1MB (enforced in app)
- ✅ Perfect for payment receipts/screenshots

### Payment Proof Storage

Images are converted to base64 and stored in the `consultations` document under the `paymentProofUrl` field. The image appears as a clickable thumbnail in the dashboard.

## Step 8: Test the Application

1. Open the app in your browser
2. Test all three login types:
   - **Admin**: Use the admin credentials you created
   - **Member**: Register a new account
   - **Guest**: Click "Konsultasi Tamu"

## Step 9: Deploy to Netlify

1. Create a GitHub repository and push your code:

   ```bash
   git init
   git add .
   git commit -m "Initial commit - Kawal Sehat Pian"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. Go to [Netlify](https://www.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/` (root)
6. Click "Deploy site"

## Firestore Collections Structure

### users

```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "role": "admin | member",
  "dob": "string (YYYY-MM-DD)",
  "gender": "male | female",
  "createdAt": "timestamp"
}
```

### consultations

```json
{
  "patientId": "string",
  "patientName": "string",
  "serviceType": "chat | phone",
  "price": "number",
  "status": "pending | active | finished",
  "paymentProofUrl": "string (base64 image data)",
  "paymentProofType": "string (image/jpeg, image/png, etc)",
  "createdAt": "timestamp",
  "approvedAt": "timestamp (optional)",
  "finishedAt": "timestamp (optional)"
}
```

### consultations/{id}/messages

```json
{
  "text": "string",
  "senderId": "string",
  "senderName": "string",
  "timestamp": "timestamp"
}
```

## Troubleshooting

### Issue: "Storage requires billing upgrade"

✅ **Fixed!** This app no longer uses Firebase Storage. Images are stored as base64 in Firestore.

### Issue: "File too large"

- Maximum file size is 1MB (Firestore document limit)
- Compress your image before uploading
- Use PNG or JPEG format

### Issue: "Permission denied" errors

- Check Firestore Rules are properly set
- Make sure admin user has `role: "admin"` in Firestore
- Verify user is logged in

### Issue: Messages not appearing

- Check if consultation status is "active"
- Verify both users are authenticated
- Check browser console for errors

## Testing Credentials

**Admin:**

- Email: admin@kawalsehat.com
- Password: (what you set in Firebase Console)

**Test Member:**

- Register through the app with any email

**Test Guest:**

- Click "Konsultasi Tamu" button

## Production Checklist

Before going live:

1. ✅ Update Firestore Rules to production mode
2. ✅ Set up proper authentication domain in Firebase
3. ✅ Configure Netlify custom domain
4. ✅ Test all user flows (Admin, Member, Guest)
5. ✅ Test payment proof upload (max 1MB)
6. ✅ Test real-time chat functionality
7. ✅ Add proper error handling
8. ✅ Set up Firebase Analytics (optional)

## Support

For issues or questions:

- Check Firebase Console logs
- Review browser console errors
- Verify Firestore Rules
- Check network tab for failed requests

---

**FREE PLAN FEATURES USED:**

- ✅ Firebase Authentication (10K users/month free)
- ✅ Firestore Database (1 GB storage, 20K writes/day free)
- ✅ No Firebase Storage needed
- ✅ Netlify Free Tier (100GB bandwidth/month)

**Total Cost: $0** 🎉
