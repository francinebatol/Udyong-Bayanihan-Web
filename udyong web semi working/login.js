import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc
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

// DOM Elements
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("password-toggle");
const loginBtn = document.getElementById("login-btn");
const loadingSpinner = document.getElementById("loading-spinner");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");

// Add event listener for form submission
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await attemptLogin();
});

// Password visibility toggle
if (passwordToggle) {
    passwordToggle.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            passwordToggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = "password";
            passwordToggle.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
}

// Authentication function
async function attemptLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Basic validation
    if (!username || !password) {
        showError("Please enter both username and password");
        return;
    }
    
    // Show loading spinner and disable form
    showLoading(true);
    
    try {
        // Query for the entered username
        const adminQuery = query(
            collection(db, "Admin"),
            where("username", "==", username)
        );
        
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.empty) {
            // No account with this username found
            showError("Invalid username or password. Please try again.");
            showLoading(false);
            return;
        }
        
        // Check the first matching account
        const adminData = adminSnapshot.docs[0].data();
        const adminId = adminSnapshot.docs[0].id;
        
        // Check if account is inactive
        if (adminData.status === "inactive") {
            showError("Your account has been deactivated. Please contact an administrator.");
            showLoading(false);
            return;
        }
        
        // Check password
        if (adminData.password === password) {
            // Update lastLogin time
            const timestamp = new Date().toISOString();
            await updateDoc(doc(db, "Admin", adminId), {
                lastLogin: timestamp
            });
            
            // Store admin info in session storage
            const adminInfo = {
                id: adminId,
                username: adminData.username,
                lastLogin: timestamp
            };
            
            // Store in session storage (browser session only)
            sessionStorage.setItem("adminUser", JSON.stringify(adminInfo));
            
            // Show success message
            showSuccessAndRedirect("Login successful! Redirecting to dashboard...");
        } else {
            // Password doesn't match
            showError("Invalid username or password. Please try again.");
            showLoading(false);
        }
    } catch (error) {
        console.error("Login error:", error);
        showError("An error occurred during login. Please try again later.");
        showLoading(false);
    }
}

// Helper function to show loading spinner
function showLoading(isLoading) {
    if (isLoading) {
        loadingSpinner.classList.remove("hide");
        loginBtn.disabled = true;
        loginBtn.style.opacity = "0.7";
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        passwordToggle.style.pointerEvents = "none";
        errorMessage.classList.add("hide");
    } else {
        loadingSpinner.classList.add("hide");
        loginBtn.disabled = false;
        loginBtn.style.opacity = "1";
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        passwordToggle.style.pointerEvents = "auto";
    }
}

// Helper function to show error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove("hide");
    // Shake the form slightly to indicate error
    loginForm.style.animation = "shake 0.5s";
    setTimeout(() => {
        loginForm.style.animation = "";
    }, 500);
}

// Helper function to show success and redirect
function showSuccessAndRedirect(message) {
    // Create success message
    const successElement = document.createElement("div");
    successElement.style.backgroundColor = "#d4edda";
    successElement.style.color = "#155724";
    successElement.style.padding = "10px 15px";
    successElement.style.borderRadius = "8px";
    successElement.style.margin = "15px 0";
    successElement.style.display = "flex";
    successElement.style.alignItems = "center";
    successElement.style.gap = "10px";
    
    const icon = document.createElement("i");
    icon.className = "fas fa-check-circle";
    icon.style.fontSize = "1.1rem";
    
    const text = document.createElement("span");
    text.textContent = message;
    
    successElement.appendChild(icon);
    successElement.appendChild(text);
    
    // Replace error message if visible
    if (!errorMessage.classList.contains("hide")) {
        errorMessage.classList.add("hide");
    }
    
    // Insert success message
    loginForm.insertBefore(successElement, loginBtn);
    
    // Redirect after a short delay
    setTimeout(() => {
        window.location.href = "admin-dashboard.html";
    }, 1500);
}

// Check if any login messages exist (e.g., session expired)
document.addEventListener('DOMContentLoaded', () => {
    // Add shake animation for error states
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
    
    // Check for any login messages (e.g., session expired)
    const loginMessage = sessionStorage.getItem("loginMessage");
    if (loginMessage) {
        // Display the message
        showError(loginMessage);
        
        // Clear the message
        sessionStorage.removeItem("loginMessage");
    }
});