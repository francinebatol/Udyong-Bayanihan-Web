// Global Authentication Check
// Include this script in all pages to enforce authentication

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5Kcj0SESEGMxrrtEjvUbjF3N6teCfwBU",
    authDomain: "udyong-bayanihan-5146f.firebaseapp.com",
    projectId: "udyong-bayanihan-5146f",
    storageBucket: "udyong-bayanihan-5146f.appspot.com",
    messagingSenderId: "70772787902",
    appId: "1:70772787902:web:6e760a48967e01625f6cef",
    measurementId: "G-47EYYV2W75"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check if user is authenticated
async function checkAuthentication() {
    // Get admin info from session storage
    const adminInfo = JSON.parse(sessionStorage.getItem("adminUser") || "null");
    
    // If no admin info, redirect to login page
    if (!adminInfo) {
        redirectToLogin();
        return false;
    }
    
    // Check if login has expired (24 hours)
    const lastLogin = new Date(adminInfo.lastLogin);
    const currentTime = new Date();
    const hoursSinceLogin = (currentTime - lastLogin) / (1000 * 60 * 60);
    
    if (hoursSinceLogin >= 24) {
        // Login expired
        sessionStorage.removeItem("adminUser");
        redirectToLogin("Your session has expired. Please log in again.");
        return false;
    }
    
    try {
        // Check if account is still active in the database
        const adminDocRef = doc(db, "Admin", adminInfo.id);
        const adminDoc = await getDoc(adminDocRef);
        
        if (!adminDoc.exists()) {
            // Account no longer exists
            sessionStorage.removeItem("adminUser");
            redirectToLogin("Your account no longer exists. Please contact an administrator.");
            return false;
        }
        
        const adminData = adminDoc.data();
        
        // Check if account has been deactivated
        if (adminData.status === "inactive") {
            sessionStorage.removeItem("adminUser");
            redirectToLogin("Your account has been deactivated. Please contact an administrator.");
            return false;
        }
    } catch (error) {
        console.error("Error checking account status:", error);
        // Allow access for now to prevent blocking users due to temporary errors
    }
    
    return true;
}

// Redirect to login page
function redirectToLogin(message) {
    // If a message is provided, store it to be shown on the login page
    if (message) {
        sessionStorage.setItem("loginMessage", message);
    }
    
    // Redirect to login page
    window.location.href = "login.html";
}

// Execute authentication check when DOM is loaded
document.addEventListener("DOMContentLoaded", checkAuthentication);