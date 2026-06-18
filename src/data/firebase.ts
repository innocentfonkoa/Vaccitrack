// Firebase initialization for VacciTrack.
//
// These config values are safe to expose in client-side code — they
// identify the project, they are not secret keys. Firestore/Storage
// security is enforced by the Rules set in the Firebase console, not by
// hiding this config.

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDkzWHWp49xuF0bfR4RfGDk2j0e03LItJw',
  authDomain: 'vaccitrack-336be.firebaseapp.com',
  projectId: 'vaccitrack-336be',
  storageBucket: 'vaccitrack-336be.firebasestorage.app',
  messagingSenderId: '546201829434',
  appId: '1:546201829434:web:8c2bbf6912a3026c01e03'
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)
