import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    Timestamp
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
const accountsTableBody = document.getElementById("accounts-table-body");
const addAccountBtn = document.getElementById("add-account-btn");
const addAccountModal = document.getElementById("add-account-modal");
const editAccountModal = document.getElementById("edit-account-modal");
const modalOverlay = document.getElementById("modal-overlay");
const loadingIndicator = document.getElementById("loading-indicator");
const notification = document.getElementById("notification");

// Add Account Form Elements
const addAccountForm = document.getElementById("add-account-form");
const newUsername = document.getElementById("new-username");
const newPassword = document.getElementById("new-password");
const confirmPassword = document.getElementById("confirm-password");
const saveAccountBtn = document.getElementById("save-account");
const cancelAddBtn = document.getElementById("cancel-add");

// Edit Account Form Elements
const editAccountForm = document.getElementById("edit-account-form");
const editUsername = document.getElementById("edit-username");
const editPassword = document.getElementById("edit-password");
const accountStatus = document.getElementById("account-status");
const updateAccountBtn = document.getElementById("update-account");
const cancelEditBtn = document.getElementById("cancel-edit");

// State variables
let webAccounts = [];
let isLoading = false;
let editingAccountId = null;

// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    initializePasswordToggle();
    initializePasswordValidation();
    attachEventListeners();
    loadAccounts();
});

// Initialize password toggle functionality
function initializePasswordToggle() {
    document.querySelectorAll(".toggle-password").forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-target");
            const inputField = document.getElementById(targetId);
            
            if (inputField.type === "password") {
                inputField.type = "text";
                button.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                inputField.type = "password";
                button.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });
}

// Initialize password validation
function initializePasswordValidation() {
    // New password strength check
    newPassword.addEventListener("input", () => {
        const passwordValue = newPassword.value;
        updatePasswordStrength(passwordValue, addAccountForm);
        
        // Check if confirm password already has a value
        if (confirmPassword.value) {
            checkPasswordMatch(newPassword.value, confirmPassword.value, addAccountForm);
        }
    });
    
    // Confirm password match check
    confirmPassword.addEventListener("input", () => {
        checkPasswordMatch(newPassword.value, confirmPassword.value, addAccountForm);
    });
    
    // Edit form password strength check
    editPassword.addEventListener("input", () => {
        const passwordValue = editPassword.value;
        updatePasswordStrength(passwordValue, editAccountForm);
    });
}

// Check if passwords match
function checkPasswordMatch(password, confirmValue, form) {
    const messageElement = form.querySelector(".password-match-message");
    
    if (!confirmValue) {
        messageElement.textContent = "";
        messageElement.className = "password-match-message";
        return;
    }
    
    if (password === confirmValue) {
        messageElement.textContent = "Passwords match";
        messageElement.className = "password-match-message match";
    } else {
        messageElement.textContent = "Passwords do not match";
        messageElement.className = "password-match-message mismatch";
    }
}

// Update password strength indicator
function updatePasswordStrength(password, form) {
    const strengthBar = form.querySelector(".strength-bar");
    const strengthText = form.querySelector(".strength-text");
    
    if (!password) {
        strengthBar.className = "strength-bar";
        strengthText.textContent = "Password strength";
        return;
    }
    
    // Calculate password strength
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Complexity checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    // Update UI based on score
    if (score <= 2) {
        strengthBar.className = "strength-bar weak";
        strengthText.textContent = "Weak password";
    } else if (score <= 4) {
        strengthBar.className = "strength-bar medium";
        strengthText.textContent = "Medium strength";
    } else {
        strengthBar.className = "strength-bar strong";
        strengthText.textContent = "Strong password";
    }
}

// Attach event listeners to buttons and modals
function attachEventListeners() {
    // Add account button
    addAccountBtn.addEventListener("click", () => {
        showModal(addAccountModal);
    });
    
    // Save account button
    saveAccountBtn.addEventListener("click", saveAccount);
    
    // Cancel add button
    cancelAddBtn.addEventListener("click", () => {
        hideModal(addAccountModal);
        resetAddForm();
    });
    
    // Update account button
    updateAccountBtn.addEventListener("click", updateAccount);
    
    // Cancel edit button
    cancelEditBtn.addEventListener("click", () => {
        hideModal(editAccountModal);
    });
    
    // Close modals when clicking X
    document.querySelectorAll(".close-modal").forEach(closeBtn => {
        closeBtn.addEventListener("click", () => {
            hideAllModals();
        });
    });
    
    // Close modals when clicking overlay
    modalOverlay.addEventListener("click", () => {
        hideAllModals();
    });
    
    // Close notification
    document.querySelector(".close-notification").addEventListener("click", () => {
        hideNotification();
    });
    
    // Add form submission handler
    addAccountForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveAccount();
    });
    
    // Edit form submission handler
    editAccountForm.addEventListener("submit", (e) => {
        e.preventDefault();
        updateAccount();
    });
}

// Show loading indicator
function showLoading() {
    loadingIndicator.classList.remove("hide");
    isLoading = true;
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.classList.add("hide");
    isLoading = false;
}

// Show modal
function showModal(modal) {
    modal.classList.remove("hide");
    modalOverlay.classList.remove("hide");
}

// Hide modal
function hideModal(modal) {
    modal.classList.add("hide");
    modalOverlay.classList.add("hide");
}

// Hide all modals
function hideAllModals() {
    addAccountModal.classList.add("hide");
    editAccountModal.classList.add("hide");
    modalOverlay.classList.add("hide");
}

// Show notification
function showNotification(message, isError = false) {
    const notificationIcon = notification.querySelector(".notification-icon i");
    const notificationMessage = notification.querySelector(".notification-message");
    
    if (isError) {
        notification.classList.add("error");
        notificationIcon.className = "fas fa-exclamation-circle";
    } else {
        notification.classList.remove("error");
        notificationIcon.className = "fas fa-check-circle";
    }
    
    notificationMessage.textContent = message;
    notification.classList.add("show");
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

// Hide notification
function hideNotification() {
    notification.classList.remove("show");
}

// Reset add account form
function resetAddForm() {
    addAccountForm.reset();
    const strengthBar = addAccountForm.querySelector(".strength-bar");
    const strengthText = addAccountForm.querySelector(".strength-text");
    const matchMessage = addAccountForm.querySelector(".password-match-message");
    
    strengthBar.className = "strength-bar";
    strengthText.textContent = "Password strength";
    matchMessage.textContent = "";
    matchMessage.className = "password-match-message";
}

// Load web accounts from Firestore
async function loadAccounts() {
    if (isLoading) return;
    
    showLoading();
    
    try {
        const accountsRef = collection(db, "Admin");
        const accountsSnapshot = await getDocs(accountsRef);
        
        webAccounts = [];
        
        accountsSnapshot.forEach(doc => {
            const data = doc.data();
            webAccounts.push({
                id: doc.id,
                username: data.username || "",
                password: data.password || "",
                lastLogin: data.lastLogin || null,
                createdAt: data.createdAt || null,
                status: data.status || "active"
            });
        });
        
        renderAccounts();
        hideLoading();
    } catch (error) {
        console.error("Error loading accounts:", error);
        showNotification("Error loading accounts: " + error.message, true);
        hideLoading();
    }
}

// Render accounts to the table
function renderAccounts() {
    accountsTableBody.innerHTML = "";
    
    if (webAccounts.length === 0) {
        accountsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px;">
                    No web accounts found. Click "Add New Account" to create one.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort accounts by username
    webAccounts.sort((a, b) => a.username.localeCompare(b.username));
    
    webAccounts.forEach(account => {
        const lastLoginDate = account.lastLogin ? new Date(account.lastLogin).toLocaleString() : "Never";
        const createdDate = account.createdAt ? new Date(account.createdAt).toLocaleString() : "Unknown";
        
        accountsTableBody.innerHTML += `
            <tr>
                <td>${account.username}</td>
                <td class="password-cell">••••••••</td>
                <td>${lastLoginDate}</td>
                <td>${createdDate}</td>
                <td>
                    <span class="status-badge status-${account.status}">${account.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${account.id}" title="Edit Account">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${account.status === "active" ? `
                            <button class="action-btn delete-btn" data-id="${account.id}" title="Deactivate Account">
                                <i class="fas fa-user-slash"></i>
                            </button>
                        ` : `
                            <button class="action-btn restore-btn" data-id="${account.id}" title="Activate Account">
                                <i class="fas fa-user-check"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });
    
    // Attach action button event listeners
    attachActionListeners();
}

// Attach event listeners to action buttons
function attachActionListeners() {
    // Edit buttons
    document.querySelectorAll(".edit-btn").forEach(button => {
        button.addEventListener("click", () => {
            const accountId = button.getAttribute("data-id");
            openEditModal(accountId);
        });
    });
    
    // Delete/Deactivate buttons
    document.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", () => {
            const accountId = button.getAttribute("data-id");
            deactivateAccount(accountId);
        });
    });
    
    // Restore/Activate buttons
    document.querySelectorAll(".restore-btn").forEach(button => {
        button.addEventListener("click", () => {
            const accountId = button.getAttribute("data-id");
            activateAccount(accountId);
        });
    });
}

// Generate a strong password
function generateStrongPassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    // Ensure at least one of each character type
    let password = 
        lowercase.charAt(Math.floor(Math.random() * lowercase.length)) +
        uppercase.charAt(Math.floor(Math.random() * uppercase.length)) +
        numbers.charAt(Math.floor(Math.random() * numbers.length)) +
        special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill the rest of the password
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password characters
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Open edit account modal
function openEditModal(accountId) {
    const account = webAccounts.find(acc => acc.id === accountId);
    
    if (!account) {
        showNotification("Account not found", true);
        return;
    }
    
    // Store the account ID for later use
    editingAccountId = accountId;
    
    // Populate form fields
    editUsername.value = account.username;
    editPassword.value = ""; // Don't show current password
    accountStatus.value = account.status;
    
    // Show the modal
    showModal(editAccountModal);
}

// Save new account
async function saveAccount() {
    const username = newUsername.value.trim();
    const password = newPassword.value.trim();
    const confirmPwd = confirmPassword.value.trim();
    
    // Simple validation
    if (!username || !password) {
        showNotification("Username and password are required", true);
        return;
    }
    
    // Check password match
    if (password !== confirmPwd) {
        showNotification("Passwords do not match", true);
        return;
    }
    
    // Check username uniqueness
    if (webAccounts.some(acc => acc.username.toLowerCase() === username.toLowerCase())) {
        showNotification("Username already exists", true);
        return;
    }
    
    showLoading();
    
    try {
        // Add new account to Admin collection
        const timestamp = new Date().toISOString();
        
        const newAccount = {
            username: username,
            password: password,
            createdAt: timestamp,
            status: "active"
        };
        
        const docRef = await addDoc(collection(db, "Admin"), newAccount);
        
        // Add to local accounts array
        webAccounts.push({
            id: docRef.id,
            ...newAccount,
            lastLogin: null
        });
        
        // Update UI
        renderAccounts();
        hideModal(addAccountModal);
        resetAddForm();
        
        showNotification("Account created successfully");
    } catch (error) {
        console.error("Error creating account:", error);
        showNotification("Error creating account: " + error.message, true);
    } finally {
        hideLoading();
    }
}

// Update existing account
async function updateAccount() {
    if (!editingAccountId) {
        showNotification("No account selected for editing", true);
        return;
    }
    
    const username = editUsername.value.trim();
    const password = editPassword.value.trim();
    const status = accountStatus.value;
    
    // Simple validation
    if (!username) {
        showNotification("Username is required", true);
        return;
    }
    
    // Check username uniqueness (if changed)
    const account = webAccounts.find(acc => acc.id === editingAccountId);
    if (!account) {
        showNotification("Account not found", true);
        return;
    }
    
    if (username.toLowerCase() !== account.username.toLowerCase() && 
        webAccounts.some(acc => acc.username.toLowerCase() === username.toLowerCase())) {
        showNotification("Username already exists", true);
        return;
    }
    
    showLoading();
    
    try {
        const updateData = {
            username: username,
            status: status
        };
        
        // Add password to update data if provided
        if (password) {
            updateData.password = password;
        }
        
        // Update in Firestore
        await updateDoc(doc(db, "Admin", editingAccountId), updateData);
        
        // Update in local array
        const index = webAccounts.findIndex(acc => acc.id === editingAccountId);
        if (index !== -1) {
            webAccounts[index] = {
                ...webAccounts[index],
                ...updateData
            };
        }
        
        // Update UI
        renderAccounts();
        hideModal(editAccountModal);
        
        showNotification("Account updated successfully");
    } catch (error) {
        console.error("Error updating account:", error);
        showNotification("Error updating account: " + error.message, true);
    } finally {
        hideLoading();
        editingAccountId = null;
    }
}

// Deactivate account
async function deactivateAccount(accountId) {
    // Get the current user's info
    const currentUser = JSON.parse(sessionStorage.getItem("adminUser") || "{}");
    
    // Check if trying to deactivate own account
    if (currentUser.id === accountId) {
        showNotification("You cannot deactivate your own account", true);
        return;
    }
    
    // Confirm deactivation
    if (!confirm("Are you sure you want to deactivate this account?")) {
        return;
    }
    
    showLoading();
    
    try {
        // Update status in Firestore
        await updateDoc(doc(db, "Admin", accountId), {
            status: "inactive"
        });
        
        // Update in local array
        const index = webAccounts.findIndex(acc => acc.id === accountId);
        if (index !== -1) {
            webAccounts[index].status = "inactive";
        }
        
        // Update UI
        renderAccounts();
        
        showNotification("Account deactivated successfully");
    } catch (error) {
        console.error("Error deactivating account:", error);
        showNotification("Error deactivating account: " + error.message, true);
    } finally {
        hideLoading();
    }
}

// Activate account
async function activateAccount(accountId) {
    // Confirm activation
    if (!confirm("Are you sure you want to activate this account?")) {
        return;
    }
    
    showLoading();
    
    try {
        // Update status in Firestore
        await updateDoc(doc(db, "Admin", accountId), {
            status: "active"
        });
        
        // Update in local array
        const index = webAccounts.findIndex(acc => acc.id === accountId);
        if (index !== -1) {
            webAccounts[index].status = "active";
        }
        
        // Update UI
        renderAccounts();
        
        showNotification("Account activated successfully");
    } catch (error) {
        console.error("Error activating account:", error);
        showNotification("Error activating account: " + error.message, true);
    } finally {
        hideLoading();
    }
}