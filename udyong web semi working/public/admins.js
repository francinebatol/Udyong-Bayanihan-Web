import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDoc,
    query,
    where,
    limit,
} from "https://www.gstatic.com/firebasejs/9.9.1/firebase-firestore.js";

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

// DOM elements
const adminTableBody = document.querySelector(".admin-table tbody");
const addNewButton = document.getElementById("add-new-button");
const addUserModal = document.getElementById("add-user-modal");
const viewAdminModal = document.getElementById("view-admin-modal");
const saveUserButton = document.getElementById("save-user-button");
const cancelUserButton = document.getElementById("cancel-user-button");
const loadingIndicator = document.getElementById("loading-indicator");
const modalOverlay = document.getElementById("modal-overlay");

// Create refresh button
const refreshButton = document.createElement("button");
refreshButton.className = "refresh-btn";
refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';

// State variables
let admins = {
    Active: [],
    Inactive: []
};
let adminDataLoaded = {
    Active: false,
    Inactive: false
};
let isLoadingData = false;
let currentStatusFilter = "Active";
let isEditing = false;
let currentAdminData = null;

// Debug functions - modified to log to console only, without visible UI elements
function logDebug(message) {
    console.log('[Debug]', message);
}

// Show loading indicator
function showLoading() {
    const loadingIndicator = document.getElementById("loading-indicator");
    if (loadingIndicator) {
        loadingIndicator.classList.remove("hide");
        // Disable scrolling on the body while loading
        document.body.style.overflow = "hidden";
    }
    isLoadingData = true;
}

// Function to hide loading indicator
function hideLoading() {
    const loadingIndicator = document.getElementById("loading-indicator");
    if (loadingIndicator) {
        loadingIndicator.classList.add("hide");
        // Re-enable scrolling
        document.body.style.overflow = "";
    }
    isLoadingData = false;
}

// Show modal with overlay
function showModal(modal) {
    if (modal && modalOverlay) {
        modal.classList.remove("hide");
        modalOverlay.classList.remove("hide");
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
}

// Hide modal and overlay
function hideModal(modal) {
    if (modal) {
        modal.classList.add("hide");
        if (modalOverlay) {
            modalOverlay.classList.add("hide");
        }
        document.body.style.overflow = ""; // Restore scrolling
    }
}

// Show notification
function showNotification(message, type = 'info') {
    alert(message); // Simple alert for now - can be replaced with nicer notification
}

// Initialize skills selection
function initializeSkillsSelection() {
    const skillCheckboxes = document.querySelectorAll('.skill-checkbox');
    const selectedSkillsCount = document.getElementById('selected-skills-count');
    const skillsCountDisplay = document.querySelector('.skills-count');
    const categoryHeaders = document.querySelectorAll('.category-header');

    if (!selectedSkillsCount) return;

    // Reset counter and checkboxes state when opening modal
    let selectedCount = 0;
    selectedSkillsCount.textContent = selectedCount;
    
    // Make sure all checkboxes start enabled
    skillCheckboxes.forEach(cb => {
        cb.disabled = false;
        
        // If already checked (from previous attempt), count it
        if (cb.checked) {
            selectedCount++;
        }
    });
    
    // Update counter initial state
    selectedSkillsCount.textContent = selectedCount;
    
    if (selectedCount >= 3) {
        // Disable unchecked boxes if already at limit
        skillCheckboxes.forEach(cb => {
            if (!cb.checked) {
                cb.disabled = true;
            }
        });
        if (skillsCountDisplay) {
            skillsCountDisplay.classList.add('limit-reached');
        }
    } else {
        // Make sure all boxes are enabled if under limit
        if (skillsCountDisplay) {
            skillsCountDisplay.classList.remove('limit-reached');
        }
    }

    // Toggle categories
    categoryHeaders.forEach(header => {
        const categoryId = header.getAttribute('data-category');
        const skillsContainer = document.getElementById(`${categoryId}-skills`);
        
        // Make sure all categories start expanded
        if (skillsContainer) {
            skillsContainer.style.display = 'grid';
        }
        
        // Clear existing listeners to prevent duplicates
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        newHeader.addEventListener('click', () => {
            // Toggle chevron icon
            const chevron = newHeader.querySelector('i');
            chevron.classList.toggle('fa-chevron-down');
            chevron.classList.toggle('fa-chevron-up');
            
            // Toggle skills visibility
            if (skillsContainer.style.display === 'none') {
                skillsContainer.style.display = 'grid';
            } else {
                skillsContainer.style.display = 'none';
            }
        });
    });

    // Clear existing listeners to prevent duplicates
    skillCheckboxes.forEach(checkbox => {
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        
        newCheckbox.addEventListener('change', function() {
            // Recalculate total selected each time to avoid desync
            const totalSelected = document.querySelectorAll('.skill-checkbox:checked').length;
            
            if (this.checked) {
                if (totalSelected >= 3) {
                    // Disable all unchecked checkboxes when limit reached
                    document.querySelectorAll('.skill-checkbox:not(:checked)').forEach(cb => {
                        cb.disabled = true;
                    });
                    if (skillsCountDisplay) {
                        skillsCountDisplay.classList.add('limit-reached');
                    }
                }
            } else {
                // Always re-enable if under limit after unchecking
                if (totalSelected < 3) {
                    document.querySelectorAll('.skill-checkbox').forEach(cb => {
                        cb.disabled = false;
                    });
                    if (skillsCountDisplay) {
                        skillsCountDisplay.classList.remove('limit-reached');
                    }
                }
            }
            
            // Update counter based on actual checked boxes
            selectedSkillsCount.textContent = totalSelected;
        });
    });
}

// Function to get selected skills
function getSelectedSkills() {
    const checkboxes = document.querySelectorAll('.skill-checkbox:checked');
    const skills = [];
    
    checkboxes.forEach(checkbox => {
        skills.push(checkbox.value);
    });
    
    return skills;
}

// Store data in sessionStorage to persist across page navigation
function storeAdminData() {
    try {
        sessionStorage.setItem('adminData', JSON.stringify(admins));
        sessionStorage.setItem('adminDataLoaded', JSON.stringify(adminDataLoaded));
        sessionStorage.setItem('currentStatusFilter', currentStatusFilter);
    } catch (e) {
        console.error("Error storing admin data in sessionStorage:", e);
    }
}

// Load data from sessionStorage
function loadAdminData() {
    try {
        const storedAdmins = sessionStorage.getItem('adminData');
        const storedLoaded = sessionStorage.getItem('adminDataLoaded');
        const storedFilter = sessionStorage.getItem('currentStatusFilter');
        
        if (storedAdmins) {
            admins = JSON.parse(storedAdmins);
        }
        
        if (storedLoaded) {
            adminDataLoaded = JSON.parse(storedLoaded);
        }
        
        if (storedFilter) {
            currentStatusFilter = storedFilter;
        }
        
        return adminDataLoaded[currentStatusFilter];
    } catch (e) {
        console.error("Error loading admin data from sessionStorage:", e);
        return false;
    }
}

// Display admins from cached data
function displayAdmins(statusFilter = "Active") {
    currentStatusFilter = statusFilter;
    adminTableBody.innerHTML = "";
    
    if (admins[statusFilter].length === 0) {
        adminTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px;">
                    No ${statusFilter} accounts found
                </td>
            </tr>
        `;
        return;
    }
    
    admins[statusFilter].forEach(admin => {
        adminTableBody.innerHTML += `
            <tr id="admin-row-${admin.id}">
                <td>${admin.username}</td>
                <td class="password-field masked-password">••••••••</td>
                <td>${admin.firstName}</td>
                <td>${admin.middleName}</td>
                <td>${admin.lastName}</td>
                <td>${admin.barangay}</td>
                <td>${admin.phoneNo}</td>
                <td>
                    <div class="tools">
                        <button class="view-button" data-id="${admin.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${
                            statusFilter === "Active"
                                ? `<button class="delete-button" data-id="${admin.id}">
                                    <i class="fas fa-trash"></i> Deactivate
                                </button>`
                                : `<button class="reactivate-button" data-id="${admin.id}">
                                    <i class="fas fa-redo"></i> Reactivate
                                </button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    attachEventListeners(statusFilter);
}

// IMPROVED FETCH FUNCTION WITH CACHING
async function fetchAdmins(statusFilter = "Active", forceRefresh = false) {
    // First check if we already have data loaded for this status and not forcing refresh
    if (adminDataLoaded[statusFilter] && !forceRefresh) {
        console.log(`Using cached ${statusFilter} admin data`);
        displayAdmins(statusFilter);
        return;
    }
    
    if (isLoadingData) return;
    
    try {
        // Show loading indicator
        showLoading();
        console.log("Starting data fetch:", statusFilter);
        currentStatusFilter = statusFilter;
        
        // Reset data loaded state if forcing refresh
        if (forceRefresh) {
            adminDataLoaded[statusFilter] = false;
        }
        
        // Activate the correct tab
        document.getElementById("show-active").classList.toggle("active-tab", statusFilter === "Active");
        document.getElementById("show-inactive").classList.toggle("active-tab", statusFilter === "Inactive");
        
        // Step 1: Test basic Firebase connection first
        try {
            console.log("Testing basic Firestore connection...");
            const testQuery = await getDocs(collection(db, "AdminMobileAccount"));
            console.log("Connection successful. Found document count:", testQuery.size);
        } catch (connErr) {
            console.error("Connection Error!", connErr);
            hideLoading();
            
            // Display in UI
            adminTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 20px; color: red;">
                        Firebase connection failed: ${connErr.message}
                    </td>
                </tr>
            `;
            return;
        }
        
        // Step 2: Now try the actual query
        console.log("Querying with status filter:", statusFilter);
        
        // Create a simpler query that should work
        const simpleQuery = query(
            collection(db, "AdminMobileAccount"),
            where("Status", "==", statusFilter)
        );
        
        const adminsSnapshot = await getDocs(simpleQuery);
        console.log("Query successful. Result count:", adminsSnapshot.size);
        
        // Clear the table before adding new data
        adminTableBody.innerHTML = "";
        
        // If no accounts found, show message
        if (adminsSnapshot.empty) {
            console.log("No accounts found with status:", statusFilter);
            adminTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 20px;">
                        No ${statusFilter} accounts found
                    </td>
                </tr>
            `;
            
            // Update our cache
            admins[statusFilter] = [];
            adminDataLoaded[statusFilter] = true;
            storeAdminData();
            
            hideLoading();
            return;
        }
        
        // Process and display each admin one by one
        let count = 0;
        admins[statusFilter] = [];
        
        // Use Promise.all to fetch all related data in parallel
        const adminPromises = [];
        
        for (const docSnapshot of adminsSnapshot.docs) {
            const adminId = docSnapshot.id;
            const accountData = docSnapshot.data();
            
            // Create basic admin object
            const adminData = {
                id: adminId,
                username: accountData.amUsername || "N/A",
                password: accountData.amPassword || "••••••••", // We store actual password but display masked
                email: accountData.amEmail || "N/A",
                firstName: "Loading...",
                middleName: "",
                lastName: "Loading...",
                barangay: "Loading...",
                phoneNo: "Loading...",
                houseNo: "",
                street: "",
                municipality: "",
                position: "",
                status: accountData.Status,
                skills: []
            };
            
            // Add to our array
            admins[statusFilter].push(adminData);
            
            // Add a promise to fetch related data
            adminPromises.push(
                fetchAdminRelatedData(adminId, adminData, statusFilter)
            );
        }
        
        // Wait for all promises to resolve
        await Promise.all(adminPromises);
        
        // Mark this status as loaded
        adminDataLoaded[statusFilter] = true;
        
        // Store the data in sessionStorage
        storeAdminData();
        
        // Display the data
        displayAdmins(statusFilter);
        
        console.log("Fetch complete. Total admins:", admins[statusFilter].length);
        hideLoading();
        
    } catch (error) {
        console.error("Error fetching admin data:", error);
        hideLoading();
        
        // Show error in the table
        adminTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px; color: red;">
                    Error fetching data: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Fetch related data for a specific admin
async function fetchAdminRelatedData(adminId, adminData, statusFilter) {
    try {
        console.log(`Fetching related data for admin ${adminId}...`);
        
        // Fetch name, address, and other details in parallel
        const [nameSnapshot, addressSnapshot, otherSnapshot] = await Promise.all([
            getDocs(query(collection(db, "AMNameDetails"), where("amAccountId", "==", adminId))),
            getDocs(query(collection(db, "AMAddressDetails"), where("amAccountId", "==", adminId))),
            getDocs(query(collection(db, "AMOtherDetails"), where("amAccountId", "==", adminId)))
        ]);
        
        // Process name data
        if (!nameSnapshot.empty) {
            const nameData = nameSnapshot.docs[0].data();
            adminData.firstName = nameData.amFirstName || "N/A";
            adminData.middleName = nameData.amMiddleName || "";
            adminData.lastName = nameData.amLastName || "N/A";
        }
        
        // Process address data
        if (!addressSnapshot.empty) {
            const addressData = addressSnapshot.docs[0].data();
            adminData.barangay = addressData.amBarangay || "N/A";
            adminData.street = addressData.amStreet || "";
            adminData.houseNo = addressData.amHouseNo || "";
            adminData.municipality = addressData.amMunicipality || "";
        }
        
        // Process other details
        if (!otherSnapshot.empty) {
            const otherData = otherSnapshot.docs[0].data();
            adminData.phoneNo = otherData.amPhoneNo || "N/A";
            adminData.position = otherData.position || "N/A";
            adminData.skills = otherData.amSkills || [];
        }
        
        // Find the index of this admin in the array
        const index = admins[statusFilter].findIndex(admin => admin.id === adminId);
        if (index !== -1) {
            // Update the admin object with the new data
            admins[statusFilter][index] = adminData;
        }
        
        // Update the row in the table if it exists
        const row = document.getElementById(`admin-row-${adminId}`);
        if (row) {
            row.cells[2].textContent = adminData.firstName;
            row.cells[3].textContent = adminData.middleName;
            row.cells[4].textContent = adminData.lastName;
            row.cells[5].textContent = adminData.barangay;
            row.cells[6].textContent = adminData.phoneNo;
        }
        
    } catch (error) {
        console.error(`Error fetching related data for admin ${adminId}:`, error);
    }
}

// Initialize the refresh button
function initializeRefreshButton() {
    // Find where to append the refresh button
    const actionBar = document.querySelector(".action-bar");
    if (actionBar) {
        // Add the refresh button to the action bar
        actionBar.appendChild(refreshButton);
        
        // Add styles for the refresh button 
        const style = document.createElement('style');
        style.textContent = `
            .refresh-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 15px;
                padding: 8px 15px;
                border: none;
                border-radius: 5px;
                background-color: #4CAF50;
                color: white;
                font-weight: 500;
                font-size: 15px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .refresh-btn:hover {
                background-color: #45a049;
            }
            
            .refresh-btn i {
                font-size: 14px;
            }
            
            .refresh-btn.refreshing i {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Add event listener for the refresh button
        refreshButton.addEventListener("click", () => {
            const refreshIcon = refreshButton.querySelector("i");
            refreshIcon.classList.add("fa-spin");
            refreshButton.disabled = true;
            
            // Force refresh of data
            fetchAdmins(currentStatusFilter, true).then(() => {
                // Reset button state after refresh
                setTimeout(() => {
                    refreshIcon.classList.remove("fa-spin");
                    refreshButton.disabled = false;
                }, 500);
            });
        });
    }
}
// Attach event listeners for View, Deactivate, and Reactivate buttons
function attachEventListeners(statusFilter) {
    document.querySelectorAll(".view-button").forEach(button => {
        button.addEventListener("click", async (event) => {
            const adminId = event.target.closest("button").dataset.id;
            if (adminId) {
                await openViewModal(adminId);
            } else {
                alert("Admin ID not found.");
            }
        });
    });

    if (statusFilter === "Active") {
        document.querySelectorAll(".delete-button").forEach(button => {
            button.addEventListener("click", async event => {
                const adminId = event.target.closest("button").dataset.id;
                await deactivateAdmin(adminId);
            });
        });
    } else {
        document.querySelectorAll(".reactivate-button").forEach(button => {
            button.addEventListener("click", async event => {
                const adminId = event.target.closest("button").dataset.id;
                await reactivateAdmin(adminId);
            });
        });
    }
}

// Add new admin with validation for required fields
async function saveAdmin() {
    // Get form field values
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const firstName = document.getElementById("firstName").value.trim();
    const middleName = document.getElementById("middleName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const position = document.getElementById("position").value.trim();
    const municipality = document.getElementById("municipality").value.trim();
    const barangay = document.getElementById("barangay").value.trim();
    const phoneNoInput = document.getElementById("phoneNo").value.trim();
    
    // Get selected skills
    const selectedSkills = getSelectedSkills();
    
    // Validate required fields
    const requiredFields = [
        { name: "Username", value: username },
        { name: "Password", value: password },
        { name: "First Name", value: firstName },
        { name: "Last Name", value: lastName },
        { name: "Email", value: email },
        { name: "Position", value: position },
        { name: "Municipality", value: municipality },
        { name: "Barangay", value: barangay },
        { name: "Phone Number", value: phoneNoInput }
    ];
    
    // Check for empty required fields
    const emptyFields = requiredFields
        .filter(field => !field.value)
        .map(field => field.name);
    
    if (emptyFields.length > 0) {
        alert(`Please fill in the following required fields: ${emptyFields.join(", ")}`);
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address");
        return;
    }
    
    // Validate phone number (numbers only)
    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(phoneNoInput)) {
        alert("Phone number should contain numbers only");
        return;
    }
    
    // Convert Phone Number and House No to numbers
    const phoneNo = parseInt(phoneNoInput, 10);
    const houseNo = parseInt(document.getElementById("houseNo").value.trim(), 10) || null;
    
    // Ensure other non-required fields are stored as strings
    const street = document.getElementById("street").value.trim() || "N/A";
    
    // Validate selected skills
    if (selectedSkills.length !== 3) {
        alert("Please select exactly 3 skills");
        return;
    }

    try {
        showLoading();
        console.log("Creating new admin account...");
        
        // Create AdminMobileAccount and add the Status field
        const accountRef = await addDoc(collection(db, "AdminMobileAccount"), {
            amUsername: username,
            amPassword: password,
            amEmail: email,
            Status: "Active"
        });

        const amAccountId = accountRef.id; // Get the Firestore document ID
        console.log("Created account document with ID: " + amAccountId);

        // Update the document with its amAccountId
        await updateDoc(doc(db, "AdminMobileAccount", amAccountId), {
            amAccountId: amAccountId
        });

        // Save details to other collections using the same amAccountId
        console.log("Saving related details...");
        
        try {
            await addDoc(collection(db, "AMNameDetails"), {
                amAccountId: amAccountId,
                amFirstName: firstName,
                amMiddleName: middleName || "N/A",
                amLastName: lastName
            });
            console.log("Name details saved");
        } catch (nameErr) {
            console.error("Error saving name details:", nameErr);
        }
        
        try {
            await addDoc(collection(db, "AMAddressDetails"), {
                amAccountId: amAccountId,
                amHouseNo: houseNo, // Already converted to number above
                amStreet: street,
                amMunicipality: municipality,
                amBarangay: barangay
            });
            console.log("Address details saved");
        } catch (addressErr) {
            console.error("Error saving address details:", addressErr);
        }
        
        try {
            await addDoc(collection(db, "AMOtherDetails"), {
                amAccountId: amAccountId,
                amPhoneNo: phoneNo, // Already converted to number above
                position: position,
                amSkills: selectedSkills
            });
            console.log("Other details saved");
        } catch (otherErr) {
            console.error("Error saving other details:", otherErr);
        }

        console.log("Admin account created successfully!");
        hideLoading();
        alert("New Admin Account Has Been Created!");
        
        // Clear form and close modal
        clearFormFields(); 
        hideModal(addUserModal);
        
        // Add to our local cache
        const newAdmin = {
            id: amAccountId,
            username: username,
            password: password,
            email: email,
            firstName: firstName,
            middleName: middleName || "",
            lastName: lastName,
            position: position,
            phoneNo: phoneNo.toString(),
            houseNo: houseNo ? houseNo.toString() : "",
            street: street,
            municipality: municipality,
            barangay: barangay,
            status: "Active",
            skills: selectedSkills
        };
        
        admins.Active.push(newAdmin);
        storeAdminData();
        
        // Refresh admin list
        displayAdmins("Active");
    } catch (error) {
        console.error("Error saving admin:", error);
        hideLoading();
        alert("Failed to save admin: " + error.message);
    }
}

// Clear form fields
function clearFormFields() {
    document.querySelectorAll("#add-user-modal input").forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
            input.disabled = false;
        } else {
            input.value = "";
        }
    });
    
    // Reset skills counter
    const selectedSkillsCount = document.getElementById('selected-skills-count');
    if (selectedSkillsCount) {
        selectedSkillsCount.textContent = '0';
    }
    
    const skillsCountDisplay = document.querySelector('.skills-count');
    if (skillsCountDisplay) {
        skillsCountDisplay.classList.remove('limit-reached');
    }
}

// Deactivate admin function
async function deactivateAdmin(adminId) {
    const confirmation = confirm("Are you sure you want to deactivate this admin?");
    if (!confirmation) return;

    try {
        showLoading();
        console.log("Deactivating admin: " + adminId);
        
        await updateDoc(doc(db, "AdminMobileAccount", adminId), {
            Status: "Inactive"
        });

        console.log("Admin deactivated successfully");
        
        // Move admin from Active to Inactive in our cache
        const adminIndex = admins.Active.findIndex(admin => admin.id === adminId);
        if (adminIndex !== -1) {
            const admin = admins.Active[adminIndex];
            admin.status = "Inactive";
            admins.Inactive.push(admin);
            admins.Active.splice(adminIndex, 1);
            storeAdminData();
        }
        
        hideLoading();
        alert("Admin account has been deactivated.");
        displayAdmins("Active"); // Refresh the list of active accounts
    } catch (error) {
        console.error("Error deactivating admin:", error);
        hideLoading();
        alert("Failed to deactivate admin: " + error.message);
    }
}

// Reactivate admin function
async function reactivateAdmin(adminId) {
    const confirmation = confirm("Are you sure you want to reactivate this admin?");
    if (!confirmation) return;

    try {
        showLoading();
        console.log("Reactivating admin: " + adminId);
        
        await updateDoc(doc(db, "AdminMobileAccount", adminId), {
            Status: "Active"
        });

        console.log("Admin reactivated successfully");
        
        // Move admin from Inactive to Active in our cache
        const adminIndex = admins.Inactive.findIndex(admin => admin.id === adminId);
        if (adminIndex !== -1) {
            const admin = admins.Inactive[adminIndex];
            admin.status = "Active";
            admins.Active.push(admin);
            admins.Inactive.splice(adminIndex, 1);
            storeAdminData();
        }
        
        hideLoading();
        alert("Admin account has been reactivated.");
        displayAdmins("Inactive"); // Refresh the list of inactive accounts
    } catch (error) {
        console.error("Error reactivating admin:", error);
        hideLoading();
        alert("Failed to reactivate admin: " + error.message);
    }
}
// Function to open the View Modal and populate data
async function openViewModal(adminId) {
    try {
        showLoading();
        console.log("Opening admin profile: " + adminId);
        
        // First check if we already have the data in our admins array
        let adminData;
        
        // Look for the admin in both Active and Inactive arrays
        let adminStatus = currentStatusFilter;
        adminData = admins[adminStatus].find(admin => admin.id === adminId);
        
        if (!adminData) {
            // If not found in current filter, check the other one
            adminStatus = adminStatus === "Active" ? "Inactive" : "Active";
            adminData = admins[adminStatus].find(admin => admin.id === adminId);
        }
        
        if (!adminData) {
            console.log("Admin data not in memory, fetching from database...");
            
            // Fetch the AdminMobileAccount document
            const adminDocRef = doc(db, "AdminMobileAccount", adminId);
            const adminSnapshot = await getDoc(adminDocRef);

            if (!adminSnapshot.exists()) {
                console.log("Admin not found in database!");
                hideLoading();
                alert("Admin not found!");
                return;
            }

            const accountData = adminSnapshot.data();
            
            // Fetch related data in parallel
            console.log("Fetching related data...");
            const [nameSnapshots, addressSnapshots, otherSnapshots] = await Promise.all([
                getDocs(query(collection(db, "AMNameDetails"), where("amAccountId", "==", adminId))),
                getDocs(query(collection(db, "AMAddressDetails"), where("amAccountId", "==", adminId))),
                getDocs(query(collection(db, "AMOtherDetails"), where("amAccountId", "==", adminId)))
            ]);

            const nameData = !nameSnapshots.empty ? nameSnapshots.docs[0].data() : {};
            const addressData = !addressSnapshots.empty ? addressSnapshots.docs[0].data() : {};
            const otherData = !otherSnapshots.empty ? otherSnapshots.docs[0].data() : {};
            
            // Create admin data object
            adminData = {
                id: adminId,
                username: accountData.amUsername || "N/A",
                password: accountData.amPassword || "N/A",
                email: accountData.amEmail || "N/A",
                firstName: nameData.amFirstName || "N/A",
                middleName: nameData.amMiddleName || "N/A",
                lastName: nameData.amLastName || "N/A",
                position: otherData.position || "N/A",
                phoneNo: otherData.amPhoneNo || "N/A", 
                houseNo: addressData.amHouseNo || "N/A",
                street: addressData.amStreet || "N/A",
                barangay: addressData.amBarangay || "N/A",
                municipality: addressData.amMunicipality || "N/A",
                status: accountData.Status || "N/A",
                skills: otherData.amSkills || []
            };
            
            // Store the admin in our cache
            admins[accountData.Status].push(adminData);
            storeAdminData();
        }

        // Store for comparison after editing
        currentAdminData = { ...adminData };
        
        console.log("Admin data loaded:", adminData);

        // Populate the modal fields
        document.getElementById("view-username").value = adminData.username;
        document.getElementById("view-password").value = adminData.password; // Will be shown as masked
        document.getElementById("view-email").value = adminData.email;
        document.getElementById("view-first-name").value = adminData.firstName;
        document.getElementById("view-middle-name").value = adminData.middleName;
        document.getElementById("view-last-name").value = adminData.lastName;
        document.getElementById("view-house-no").value = adminData.houseNo;
        document.getElementById("view-street").value = adminData.street;
        document.getElementById("view-barangay").value = adminData.barangay;
        document.getElementById("view-municipality").value = adminData.municipality;
        document.getElementById("view-position").value = adminData.position;
        document.getElementById("view-phone-no").value = adminData.phoneNo;

        // Set the adminId in the dataset of the modal
        document.getElementById("view-admin-modal").dataset.adminId = adminId;

        // Ensure edit mode is disabled
        disableEditing();
        
        // Show the modal
        hideLoading();
        showModal(viewAdminModal);
    } catch (error) {
        console.error("Error opening view modal:", error);
        hideLoading();
        alert("Failed to fetch admin details: " + error.message);
    }
}

// Enable Editing Mode
function enableEditing() {
    isEditing = true;
    document.getElementById("edit-profile-button").classList.add("hide");
    document.getElementById("edit-actions").classList.remove("hide");

    const fields = document.querySelectorAll(".modal-content input:not(#view-password)");
    fields.forEach(field => {
        field.removeAttribute("readonly");
        field.classList.add("editable");
    });
    
    // Keep password field read-only
    const passwordField = document.getElementById("view-password");
    if (passwordField) {
        passwordField.setAttribute("readonly", true);
        passwordField.classList.add("non-editable");
    }
}

// Disable Editing Mode
function disableEditing() {
    isEditing = false;
    
    const editButton = document.getElementById("edit-profile-button");
    if (editButton) {
        editButton.classList.remove("hide");
    }
    
    const editActions = document.getElementById("edit-actions");
    if (editActions) {
        editActions.classList.add("hide");
    }

    const fields = document.querySelectorAll(".modal-content input");
    fields.forEach(field => {
        field.setAttribute("readonly", true);
        field.classList.remove("editable");
        field.classList.remove("non-editable");
    });
}

// Save the edited data
async function saveEdits() {
    const adminId = document.getElementById("view-admin-modal").dataset.adminId;

    if (!adminId) {
        alert("Error: Unable to identify the admin record.");
        return;
    }

    // Get values from form
    const updatedData = {
        username: document.getElementById("view-username").value,
        firstName: document.getElementById("view-first-name").value,
        middleName: document.getElementById("view-middle-name").value,
        lastName: document.getElementById("view-last-name").value,
        position: document.getElementById("view-position").value,
        email: document.getElementById("view-email").value,
        // Password is not editable in the form
        password: currentAdminData.password, // Use stored password, not the display value
        phoneNo: parseInt(document.getElementById("view-phone-no").value) || 0, // Ensure number type
        houseNo: parseInt(document.getElementById("view-house-no").value) || null, // Ensure number type
        street: document.getElementById("view-street").value,
        barangay: document.getElementById("view-barangay").value,
        municipality: document.getElementById("view-municipality").value,
    };
    try {
        showLoading();
        console.log("Saving admin profile changes...");
        
        // Update the main AdminMobileAccount collection
        await updateDoc(doc(db, "AdminMobileAccount", adminId), {
            amUsername: updatedData.username,
            amEmail: updatedData.email,
            // Password is not updated here
        });
        console.log("Updated main account data");

        // Update related collections in parallel
        const updatePromises = [];
        
        // Find name document for this admin
        const nameQuery = query(collection(db, "AMNameDetails"), where("amAccountId", "==", adminId));
        const nameSnapshot = await getDocs(nameQuery);
        
        if (!nameSnapshot.empty) {
            // Update each matching document (should only be one)
            for (const docSnapshot of nameSnapshot.docs) {
                updatePromises.push(
                    updateDoc(docSnapshot.ref, {
                        amFirstName: updatedData.firstName,
                        amMiddleName: updatedData.middleName,
                        amLastName: updatedData.lastName,
                    })
                );
            }
            console.log("Name details update queued");
        } else {
            console.warn("No name document found to update");
        }
        
        // Find address document for this admin
        const addressQuery = query(collection(db, "AMAddressDetails"), where("amAccountId", "==", adminId));
        const addressSnapshot = await getDocs(addressQuery);
        
        if (!addressSnapshot.empty) {
            // Update each matching document (should only be one)
            for (const docSnapshot of addressSnapshot.docs) {
                updatePromises.push(
                    updateDoc(docSnapshot.ref, {
                        amHouseNo: parseInt(updatedData.houseNo) || null, // Ensure it's stored as a number
                        amStreet: updatedData.street,
                        amBarangay: updatedData.barangay,
                        amMunicipality: updatedData.municipality,
                    })
                );
            }
            console.log("Address details update queued");
        } else {
            console.warn("No address document found to update");
        }
        
        // Find other details document for this admin
        const otherQuery = query(collection(db, "AMOtherDetails"), where("amAccountId", "==", adminId));
        const otherSnapshot = await getDocs(otherQuery);
        
        if (!otherSnapshot.empty) {
            // Update each matching document (should only be one)
            for (const docSnapshot of otherSnapshot.docs) {
                updatePromises.push(
                    updateDoc(docSnapshot.ref, {
                        amPhoneNo: parseInt(updatedData.phoneNo) || 0, // Ensure it's stored as a number
                        position: updatedData.position,
                        // Skills not updated here
                    })
                );
            }
            console.log("Other details update queued");
        } else {
            console.warn("No other details document found to update");
        }
        
        // Execute all updates in parallel
        await Promise.all(updatePromises);
        console.log("All updates applied successfully");

        // Update the admin in our local cache
        // First we need to determine which status list contains this admin
        let statusList = currentAdminData.status;
        const index = admins[statusList].findIndex(admin => admin.id === adminId);
        
        if (index !== -1) {
            // Create a new admin object with updated data, preserving other fields
            const updatedAdmin = {
                ...admins[statusList][index], // Keep existing properties
                ...updatedData // Override with updated properties
            };
            
            // Replace in our cache
            admins[statusList][index] = updatedAdmin;
            
            // Update currentAdminData for comparison
            currentAdminData = { ...updatedAdmin };
            
            // Store updated cache
            storeAdminData();
            
            // If the current view shows this admin, update the row as well
            if (statusList === currentStatusFilter) {
                const row = document.getElementById(`admin-row-${adminId}`);
                if (row) {
                    row.cells[0].textContent = updatedData.username;
                    row.cells[2].textContent = updatedData.firstName;
                    row.cells[3].textContent = updatedData.middleName;
                    row.cells[4].textContent = updatedData.lastName;
                    row.cells[5].textContent = updatedData.barangay;
                    row.cells[6].textContent = updatedData.phoneNo;
                }
            }
        }
        
        console.log("Admin profile updated successfully!");
        hideLoading();
        alert("Admin profile updated successfully!");
        disableEditing();
    } catch (error) {
        console.error("Error saving admin edits:", error);
        hideLoading();
        alert("Failed to save changes: " + error.message);
    }
}

// Cancel Editing
function cancelEditing() {
    // Restore original values from currentAdminData
    if (currentAdminData) {
        document.getElementById("view-username").value = currentAdminData.username || "";
        document.getElementById("view-first-name").value = currentAdminData.firstName || "";
        document.getElementById("view-middle-name").value = currentAdminData.middleName || "";
        document.getElementById("view-last-name").value = currentAdminData.lastName || "";
        document.getElementById("view-position").value = currentAdminData.position || "";
        document.getElementById("view-email").value = currentAdminData.email || "";
        document.getElementById("view-phone-no").value = currentAdminData.phoneNo || "";
        document.getElementById("view-house-no").value = currentAdminData.houseNo || "";
        document.getElementById("view-street").value = currentAdminData.street || "";
        document.getElementById("view-barangay").value = currentAdminData.barangay || "";
        document.getElementById("view-municipality").value = currentAdminData.municipality || "";
    }
    
    disableEditing();
    alert("Changes discarded");
}

// Attach event listeners for editing
function attachEditListeners() {
    const editButton = document.getElementById("edit-profile-button");
    const saveButton = document.getElementById("save-edit-button");
    const cancelButton = document.getElementById("cancel-edit-button");
    const closeButton = document.getElementById("close-view-modal");
    
    if (editButton) {
        editButton.addEventListener("click", enableEditing);
    }
    
    if (saveButton) {
        saveButton.addEventListener("click", saveEdits);
    }
    
    if (cancelButton) {
        cancelButton.addEventListener("click", cancelEditing);
    }
    
    // Close the View Modal
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            if (isEditing) {
                const confirmation = confirm("You have unsaved changes. Are you sure you want to close?");
                if (!confirmation) return;
                disableEditing();
            }
            hideModal(viewAdminModal);
        });
    }
}

// Modal functionality - Add User
if (addNewButton) {
    addNewButton.addEventListener("click", () => {
        showModal(addUserModal);
        initializeSkillsSelection();
    });
}

if (cancelUserButton) {
    cancelUserButton.addEventListener("click", () => {
        const confirmation = confirm("Are you sure you want to DISCARD?");
        if (confirmation) {
            hideModal(addUserModal);
            clearFormFields();
        }
    });
}

if (saveUserButton) {
    saveUserButton.addEventListener("click", saveAdmin);
}

// Close modal when clicking on the overlay
if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
        // Find visible modals
        const visibleModals = document.querySelectorAll(".add-user-modal:not(.hide), .view-admin-modal:not(.hide)");
        
        // Confirm before closing if in edit mode
        if (isEditing) {
            const confirmation = confirm("You have unsaved changes. Are you sure you want to close?");
            if (!confirmation) return;
            
            // Reset edit mode
            disableEditing();
        }
        
        // Hide all visible modals
        visibleModals.forEach(modal => hideModal(modal));
    });
}

// Handle Active/Inactive account toggle
const showActiveButton = document.getElementById("show-active");
const showInactiveButton = document.getElementById("show-inactive");

if (showActiveButton) {
    showActiveButton.addEventListener("click", () => {
        // Update the tab states visually
        showActiveButton.classList.add("active-tab");
        if (showInactiveButton) {
            showInactiveButton.classList.remove("active-tab");
        }
        
        // Load/display the Active admins
        fetchAdmins("Active", false);
    });
}

if (showInactiveButton) {
    showInactiveButton.addEventListener("click", () => {
        // Update the tab states visually
        showInactiveButton.classList.add("active-tab");
        if (showActiveButton) {
            showActiveButton.classList.remove("active-tab");
        }
        
        // Load/display the Inactive admins
        fetchAdmins("Inactive", false);
    });
}

// Check if Firestore is initialized
function checkFirestore() {
    try {
        const testCollection = collection(db, 'test');
        console.log("Firestore initialized:", !!testCollection);
        return !!testCollection;
    } catch (e) {
        console.error("Firestore initialization error:", e);
        return false;
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("Document loaded, initializing app...");
    
    // Initialize the refresh button
    initializeRefreshButton();
    
    // Try to load data from sessionStorage first
    const dataLoaded = loadAdminData();
    
    // Check Firebase connection
    if (checkFirestore()) {
        console.log("Firestore initialized");
        
        // If data was loaded from sessionStorage, display it
        if (dataLoaded) {
            console.log("Using cached data for initial display");
            displayAdmins(currentStatusFilter);
        } else {
            // Otherwise fetch fresh data
            console.log("No cached data found, fetching from Firestore");
            fetchAdmins(currentStatusFilter);
        }
        
        initializeSkillsSelection();
        attachEditListeners();
        
        // Set up the correct tab state
        if (currentStatusFilter === "Active") {
            showActiveButton.classList.add("active-tab");
            showInactiveButton.classList.remove("active-tab");
        } else {
            showInactiveButton.classList.add("active-tab");
            showActiveButton.classList.remove("active-tab");
        }
    } else {
        console.log("ERROR: Firestore initialization failed!");
        
        // Show error in the table
        if (adminTableBody) {
            adminTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 20px; color: red;">
                        Firebase initialization failed. Check console for details.
                    </td>
                </tr>
            `;
        }
    }
    
    // Set up page unload handler to save state
    window.addEventListener('beforeunload', () => {
        storeAdminData();
    });
});