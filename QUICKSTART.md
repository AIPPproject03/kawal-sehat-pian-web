# Quick Start Guide - Kawal Sehat Pian

## 🚀 Instant Setup (5 Minutes)

### 1. Firebase Console Setup

1. Go to: https://console.firebase.google.com/
2. Your project is already created: **kawal-sehat-pian**
3. Complete these steps:

#### Enable Authentication

- Go to: **Authentication** → **Sign-in method**
- Enable: ✅ **Email/Password**
- Enable: ✅ **Anonymous**

#### Create Firestore Database

- Go to: **Firestore Database** → **Create database**
- Select: **Test mode** (for now)
- Choose location: **asia-southeast1** (or nearest to Indonesia)

#### Set Firestore Rules

- Go to: **Firestore Database** → **Rules**
- Copy from [SETUP.md](SETUP.md) or use this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /consultations/{consultationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        || resource.data.patientId == request.auth.uid);
      match /messages/{messageId} {
        allow read, create: if request.auth != null;
      }
    }
  }
}
```

#### Create Admin User

1. **Authentication** → **Users** → **Add user**

   - Email: `admin@kawalsehat.com`
   - Password: `admin123` (change this!)
   - Copy the **UID**

2. **Firestore Database** → **Start collection**
   - Collection: `users`
   - Document ID: [paste the UID]
   - Fields:
     ```
     uid: [paste UID]
     name: "Bidan Pian"
     email: "admin@kawalsehat.com"
     role: "admin"
     createdAt: [timestamp - now]
     ```

### 2. Run Locally

```bash
# Open with Live Server in VS Code
# Or use Python:
python -m http.server 8000

# Or use Node:
npx serve
```

Open: http://localhost:8000 (or your server port)

### 3. Test the App

#### Test as Admin

1. Click "Login Admin"
2. Email: `admin@kawalsehat.com`
3. Password: `admin123`
4. ✅ You should see the Admin Dashboard

#### Test as Patient (Member)

1. Logout (if logged in)
2. Click "Daftar Pasien"
3. Fill in:
   - Name: Test Patient
   - Email: patient@test.com
   - DOB: 1990-01-01
   - Gender: Perempuan
   - Password: 123456
4. Click "Daftar"
5. ✅ You should see Patient Dashboard

#### Test as Guest

1. Logout
2. Click "Konsultasi Tamu"
3. ✅ You should see Patient Dashboard

### 4. Test Full Flow

**As Patient:**

1. Select "Chat Consultation" (Rp 15.000)
2. Upload a sample image (< 1MB)
3. Click "Ajukan Konsultasi"
4. ✅ Request created with status "Menunggu"

**As Admin:**

1. Logout and login as admin
2. See the request in "Menunggu Persetujuan"
3. Click "Setujui"
4. ✅ Status changes to "Aktif"

**Chat Between Admin & Patient:**

1. As admin: Click "Buka Chat"
2. Type message and send
3. Logout, login as patient
4. Click "Buka Chat" on the consultation
5. See admin message, reply
6. ✅ Real-time chat working!

**Finish Consultation:**

1. As admin: Click "Selesai" button
2. ✅ Consultation moves to "Selesai" section

## 🐛 Troubleshooting

### Error: "Storage requires billing"

✅ **Fixed!** App now uses base64 encoding, no Storage needed.

### Error: "Permission denied"

- Check Firestore Rules are published
- Verify admin user has `role: "admin"` in Firestore
- Make sure Authentication is enabled

### Payment image not showing

- Check file size is < 1MB
- Use JPG or PNG format
- Check browser console for errors

### Messages not appearing

- Verify consultation status is "active"
- Check Firestore Rules for messages subcollection
- Ensure both users are authenticated

## 📱 Payment Details for Testing

**Bank Details:**

- Bank: BCA
- Account: 1234567890
- Name: Bidan Pian

**Prices:**

- Chat Consultation: Rp 15.000
- Phone Consultation: Rp 35.000

## 🌐 Deploy to Netlify

```bash
# 1. Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# 2. Create GitHub repo and push
git remote add origin https://github.com/yourusername/kawal-sehat-pian.git
git push -u origin main

# 3. Go to netlify.com
# - New site from Git
# - Connect GitHub
# - Select repo
# - Deploy!
```

## ✅ Checklist

- [ ] Firebase Authentication enabled (Email + Anonymous)
- [ ] Firestore Database created
- [ ] Firestore Rules updated
- [ ] Admin user created in Firestore
- [ ] Tested locally
- [ ] Admin login works
- [ ] Patient registration works
- [ ] Guest login works
- [ ] Consultation flow works
- [ ] Real-time chat works
- [ ] Payment proof upload works (< 1MB)
- [ ] Ready to deploy!

## 🎉 You're Done!

The app is fully functional and FREE to use!

**Cost Breakdown:**

- Firebase Spark Plan: **$0**
- Netlify Free Tier: **$0**
- **Total: $0/month** 🎊
