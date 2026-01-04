import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1f3-PMD5gZyvvZon-EZGxKDUJblDb5zM",
  authDomain: "we-app-honeymoon.firebaseapp.com",
  projectId: "we-app-honeymoon",
  storageBucket: "we-app-honeymoon.appspot.com",
  messagingSenderId: "78763195904",
  appId: "1:78763195904:web:8243a453a9c35e7c7222e5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
