# Kawal Sehat Pian - Telemedicine Web App

A simple telemedicine web application for midwife consultation services built with Vanilla JavaScript and Firebase.

## Features

- 🔐 **Multi-role Authentication**

  - Admin (Midwife): Email/Password login
  - Member (Patient): Registration with personal details
  - Guest: Anonymous one-time consultation

- 💬 **Real-time Chat**

  - Live messaging between admin and patients
  - Message history preservation

- 💰 **Payment Processing**

  - Service selection (Chat or Phone consultation)
  - Payment proof upload
  - Admin approval workflow

- 📊 **Dashboard Management**
  - Patient: View consultation history
  - Admin: Manage pending, active, and finished consultations

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase v9 (Modular SDK)
  - Authentication
  - Firestore Database
  - ~~Storage~~ Base64 encoding (FREE plan compatible!)
- **Hosting**: Netlify

## Key Features

✅ **100% FREE** - Works on Firebase Spark (Free) Plan
✅ No billing upgrade required
✅ Payment proofs stored as base64 (max 1MB)
✅ Real-time chat and updates

## Project Structure

```
kawal-sehat-pian/
├── index.html          # Main HTML file
├── src/
│   ├── js/
│   │   └── app.js      # Main JavaScript logic
│   ├── css/
│   │   └── style.css   # Styling
│   └── SETUP.md        # Firebase setup guide
├── .gitignore
└── README.MD
```

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd kawal-sehat-pian
   ```

2. **Configure Firebase**

   - Follow the instructions in [SETUP.md](SETUP.md)
   - Firebase config is already set in `src/js/app.js`
   - Enable Authentication and Firestore in Firebase Console
   - **No Storage setup needed!** (Uses base64 encoding)

3. **Open locally**

   - Use a local server (e.g., Live Server in VS Code)
   - Navigate to `http://localhost:5500` (or your local server URL)

4. **Deploy to Netlify**
   - Push to GitHub
   - Connect repository to Netlify
   - Deploy!

## Usage

### For Patients

1. **Register/Login** or use Guest mode
2. **Select Service**: Choose between Chat (Rp 15.000) or Phone (Rp 35.000) consultation
3. **Upload Payment Proof**: Upload transfer receipt
4. **Wait for Approval**: Admin will review and approve
5. **Start Consultation**: Chat with the midwife once approved

### For Admin (Midwife)

1. **Login** with admin credentials
2. **Review Requests**: See all pending consultation requests
3. **Verify Payment**: Check uploaded payment proofs
4. **Approve**: Activate consultations
5. **Chat**: Provide consultation via real-time chat
6. **Finish**: Mark consultations as complete

## Firebase Collections

- **users**: User profiles (admin, member)
- **consultations**: Consultation requests and details
- **consultations/{id}/messages**: Chat messages (subcollection)

## Security

- Firestore Security Rules configured for role-based access
- Storage Rules limit file size and type
- Authentication required for all operations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private project for Midwife services

## Support

For issues or questions, contact the development team.
