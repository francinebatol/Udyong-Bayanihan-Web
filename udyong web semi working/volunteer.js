import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5Kcj0SESEGMxrrtEjvUbjF3N6teCfwBU",
    authDomain: "udyong-bayanihan-5146f.firebaseapp.com",
    projectId: "udyong-bayanihan-5146f",
    storageBucket: "udyong-bayanihan-5146f.appspot.com",
    messagingSenderId: "70772787902",
    appId: "1:70772787902:web:6e760a48967e01625f6cef",
    measurementId: "G-47EYYV2W75",
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State variables
let volunteers = [];
let currentVolunteerId = null;
let currentAction = null;
let currentUserId = null; // Store the userId separately
let isLoadingData = false;
let dataLoaded = false; // Track if we have loaded the data already
const loadingIndicator = document.getElementById("loading-indicator");

// Create refresh button
const refreshButton = document.createElement("button");
refreshButton.className = "refresh-btn";
refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';

// Show loading indicator
function showLoading() {
    if (loadingIndicator) {
        loadingIndicator.classList.remove("hide");
        // Disable scrolling on the body while loading
        document.body.style.overflow = "hidden";
    }
    isLoadingData = true;
}

// Hide loading indicator
function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.classList.add("hide");
        // Re-enable scrolling
        document.body.style.overflow = "";
    }
    isLoadingData = false;
}

// Show notification
function showNotification(message, type = 'success') {
    alert(message); // Simple alert for now - you could implement a better notification system
}

// Store data in sessionStorage to persist across page navigation
function storeVolunteerData() {
    try {
        sessionStorage.setItem('volunteerData', JSON.stringify(volunteers));
        sessionStorage.setItem('volunteerDataLoaded', JSON.stringify(dataLoaded));
    } catch (e) {
        console.error("Error storing volunteer data in sessionStorage:", e);
    }
}

// Load data from sessionStorage
function loadVolunteerData() {
    try {
        const storedVolunteers = sessionStorage.getItem('volunteerData');
        const storedLoaded = sessionStorage.getItem('volunteerDataLoaded');
        
        if (storedVolunteers) {
            volunteers = JSON.parse(storedVolunteers);
        }
        
        if (storedLoaded) {
            dataLoaded = JSON.parse(storedLoaded);
        }
        
        return dataLoaded;
    } catch (e) {
        console.error("Error loading volunteer data from sessionStorage:", e);
        return false;
    }
}

// Initialize the refresh button
function initializeRefreshButton() {
    // Find where to append the refresh button
    const sortButtons = document.querySelector(".sort-buttons");
    if (sortButtons) {
        // Update the button styling to match the admin page
        refreshButton.className = "refresh-btn";
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
        
        // Add styles to match the green button in your screenshot
        const style = document.createElement('style');
        style.textContent = `
            .refresh-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 15px;
                border: none;
                border-radius: 4px;
                background-color: #4CAF50; /* Match the green color in your screenshot */
                color: white;
                font-weight: 500;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-left: 10px;
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
        
        // Add the button to the container
        sortButtons.appendChild(refreshButton);
        
        // Add event listener for the refresh button
        refreshButton.addEventListener("click", () => {
            const refreshIcon = refreshButton.querySelector("i");
            refreshIcon.classList.add("fa-spin");
            refreshButton.disabled = true;
            
            // Force refresh of data
            fetchVolunteers(true).then(() => {
                // Reset button state after refresh
                setTimeout(() => {
                    refreshIcon.classList.remove("fa-spin");
                    refreshButton.disabled = false;
                }, 500);
            });
        });
    }
}

// Fetch and display volunteer data
async function fetchVolunteers(forceRefresh = false) {
    // If already loading, don't start another fetch
    if (isLoadingData) return;
    
    // Check if we already have data loaded and not forcing refresh
    if (dataLoaded && volunteers.length > 0 && !forceRefresh) {
        console.log("Using cached volunteer data");
        renderVolunteers(volunteers);
        return;
    }
    
    showLoading();
    const volunteerTableBody = document.querySelector(".volunteer-table tbody");
    
    try {
        console.log("Fetching volunteer data from Firestore");
        
        // Reset the data load state if we're forcing refresh
        if (forceRefresh) {
            dataLoaded = false;
        }
        
        // Fetch all required collections in parallel to improve performance
        const [usersAccountSnapshot, usersAddressSnapshot, usersNameSnapshot, usersOtherDetailsSnapshot] = 
            await Promise.all([
                getDocs(collection(db, "usersAccount")),
                getDocs(collection(db, "usersAddress")),
                getDocs(collection(db, "usersName")),
                getDocs(collection(db, "usersOtherDetails"))
            ]);

        // Create maps for faster lookups
        const nameMap = new Map();
        usersNameSnapshot.forEach((doc) => nameMap.set(doc.data().userId, doc.data()));

        const addressMap = new Map();
        usersAddressSnapshot.forEach((doc) => addressMap.set(doc.data().userId, doc.data()));

        const otherDetailsMap = new Map();
        usersOtherDetailsSnapshot.forEach((doc) => otherDetailsMap.set(doc.data().userId, doc.data()));

        // Process user accounts
        volunteers = [];
        usersAccountSnapshot.forEach((doc) => {
            const account = doc.data();
            const userId = account.userId;

            const name = nameMap.get(userId) || {};
            const address = addressMap.get(userId) || {};
            const otherDetails = otherDetailsMap.get(userId) || {};

            volunteers.push({
                id: doc.id,
                userId: userId, // Store the userId
                username: account.username || "N/A",
                firstName: name.firstName || "N/A",
                middleName: name.middleName || "",
                lastName: name.lastName || "N/A",
                address: [address.street, address.barangay, address.municipality]
                .filter(part => part && part.trim() !== "")
                .join(", ") || "N/A",            
                phoneNo: otherDetails.phoneNo || "N/A",
                email: account.email || "N/A",
                age: otherDetails.age || "N/A",
                dateOfBirth: otherDetails.dateOfBirth || "N/A",
                gender: otherDetails.gender || "N/A",
                interests: otherDetails.interests || [],
                skills: otherDetails.skills || [],
                status: account.usersStatus || "Unverified",
                idPicture: otherDetails.idPicture || "",
                profilePictureUrl: otherDetails.profilePictureUrl || "" // Added profile picture URL
            });
        });

        // Mark data as loaded
        dataLoaded = true;
        
        // Store data in sessionStorage
        storeVolunteerData();
        
        // Render the volunteers
        renderVolunteers(volunteers);
        
        hideLoading();
    } catch (error) {
        console.error("Error fetching volunteers:", error);
        hideLoading();
        // Show error in the table
        if (volunteerTableBody) {
            volunteerTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: red;">
                        Error loading volunteers: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Render volunteers into the table
function renderVolunteers(volunteerList) {
    const volunteerTableBody = document.querySelector(".volunteer-table tbody");
    volunteerTableBody.innerHTML = "";

    if (volunteerList.length === 0) {
        volunteerTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">
                    No volunteers found
                </td>
            </tr>
        `;
        return;
    }

    volunteerList.forEach((volunteer) => {
        volunteerTableBody.innerHTML += `
            <tr>
                <td>${volunteer.username || "N/A"}</td>
                <td>${volunteer.firstName || "N/A"}</td>
                <td>${volunteer.middleName || "N/A"}</td>
                <td>${volunteer.lastName || "N/A"}</td>
                <td>${volunteer.address || "N/A"}</td>
                <td>${volunteer.phoneNo || "N/A"}</td>
                <td>
                    <div class="tools">
                        <button class="view-profile-button" data-id="${volunteer.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="delete-profile-button" data-id="${volunteer.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    // Update volunteer count
    const volunteerCount = document.getElementById("volunteer-count");
    if (volunteerCount) {
        volunteerCount.textContent = volunteerList.length;
    }

    attachEventListeners();
}

// Open feedback modal
function openFeedbackModal() {
    const feedbackModal = document.getElementById("feedback-modal");
    const idPicturePopup = document.querySelector(".id-picture-popup");
    const overlay = document.querySelector(".overlay");
    
    // Hide ID picture popup
    idPicturePopup.classList.add("hide-profile");
    idPicturePopup.style.display = "none";
    
    // Clear previous feedback
    document.getElementById("denial-feedback").value = "";
    document.getElementById("feedback-error").classList.add("hide");
    
    // Show feedback modal
    feedbackModal.classList.remove("hide-profile");
    feedbackModal.style.display = "flex";
    
    // Ensure overlay is visible
    overlay.classList.remove("hide-profile");
    
    // Focus on textarea
    setTimeout(() => {
        document.getElementById("denial-feedback").focus();
    }, 100);
}

// Close feedback modal
function closeFeedbackModal() {
    const feedbackModal = document.getElementById("feedback-modal");
    
    if (feedbackModal) {
        feedbackModal.classList.add("hide-profile");
        feedbackModal.style.display = "none";
    }
}

// Submit feedback and save to Notifications collection
async function submitDenialFeedback() {
    showLoading();
    
    const feedbackText = document.getElementById("denial-feedback").value.trim();
    
    // Validate feedback
    if (!feedbackText) {
        document.getElementById("feedback-error").classList.remove("hide");
        document.getElementById("denial-feedback").focus();
        hideLoading();
        return;
    }
    
    try {
        // Create notification object
        const notification = {
            userId: currentUserId,
            reason: feedbackText,
            timestamp: serverTimestamp(), // Use server timestamp
            type: "user_verification"
        };
        
        console.log("Saving notification:", notification);
        
        // Add to Notifications collection
        await addDoc(collection(db, "Notifications"), notification);
        
        // Close modals
        closeFeedbackModal();
        
        // Hide overlay
        const overlay = document.querySelector(".overlay");
        overlay.classList.add("hide-profile");
        
        // Show success message
        showNotification("Denial feedback has been submitted successfully", "success");
        
        // No need to refetch as the verification status hasn't changed
        hideLoading();
    } catch (error) {
        console.error("Error submitting denial feedback:", error);
        showNotification("Error submitting feedback: " + error.message, "error");
        hideLoading();
    }
}

// Verify user (update status to Verified)
async function verifyUser(userId) {
    showLoading();
    
    try {
        // Update user status in Firestore
        await updateDoc(doc(db, "usersAccount", userId), {
            usersStatus: "Verified"
        });
        
        // Update local data
        const volunteerIndex = volunteers.findIndex(v => v.id === userId);
        if (volunteerIndex !== -1) {
            volunteers[volunteerIndex].status = "Verified";
            storeVolunteerData();
        }
        
        // Update the verify button in the profile modal
        const verifyUserBtn = document.getElementById("verify-user-btn");
        if (verifyUserBtn) {
            verifyUserBtn.textContent = "Verified";
            verifyUserBtn.classList.add("verified");
            verifyUserBtn.disabled = true;
        }
        
        // Show success message
        showNotification("User has been verified successfully", "success");
        hideLoading();
    } catch (error) {
        console.error("Error verifying user:", error);
        showNotification("Error verifying user: " + error.message, "error");
        hideLoading();
    }
}

// Delete volunteer
async function deleteVolunteer(userId) {
    const confirmation = confirm("Are you sure you want to delete this volunteer?");
    if (!confirmation) return;
    
    showLoading();
    
    try {
        await deleteDoc(doc(db, "usersAccount", userId));
        
        // Update local data by removing the deleted volunteer
        volunteers = volunteers.filter(volunteer => volunteer.id !== userId);
        storeVolunteerData();
        
        // Update the display
        renderVolunteers(volunteers);
        
        showNotification("Volunteer deleted successfully", "success");
        hideLoading();
    } catch (error) {
        console.error("Error deleting volunteer:", error);
        showNotification("Error deleting volunteer: " + error.message, "error");
        hideLoading();
    }
}

// Sort volunteers by a specific field
function sortVolunteers(criteria) {
    const sortButtons = document.querySelectorAll(".sort-btn");
    if (sortButtons) {
        sortButtons.forEach(btn => {
            if (btn.getAttribute("data-sort") === criteria) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }
    
    // Clone volunteers array to avoid modifying the original
    let sortedVolunteers = [...volunteers];
    
    switch (criteria) {
        case "name":
            sortedVolunteers.sort((a, b) => a.firstName.localeCompare(b.firstName));
            break;
        case "barangay":
            // Extract barangay from address for sorting
            sortedVolunteers.sort((a, b) => {
                const getBarangay = (address) => {
                    const parts = address.split(',');
                    return parts.length > 1 ? parts[0].trim() : address;
                };
                return getBarangay(a.address).localeCompare(getBarangay(b.address));
            });
            break;
        case "unverified":
            // Filter only unverified users
            sortedVolunteers = sortedVolunteers.filter(volunteer => volunteer.status !== "Verified");
            break;
        case "skills":
            // Sort by number of skills (most to least)
            sortedVolunteers.sort((a, b) => b.skills.length - a.skills.length);
            break;
        case "interests":
            // Sort by number of interests (most to least)
            sortedVolunteers.sort((a, b) => b.interests.length - a.interests.length);
            break;
    }
    
    renderVolunteers(sortedVolunteers);
}

// Filter volunteers based on search input (direct DOM manipulation)
function searchVolunteers(searchTerm) {
    console.log("Searching for:", searchTerm);
    // If searchTerm is empty, show all volunteers
    if (!searchTerm) {
        document.querySelectorAll(".volunteer-table tbody tr").forEach(row => {
            row.style.display = ""; // Show all rows
        });
        return;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    // For each row, check if any cell contains the search term
    document.querySelectorAll(".volunteer-table tbody tr").forEach(row => {
        let rowText = row.textContent.toLowerCase();
        if (rowText.includes(searchLower)) {
            row.style.display = ""; // Show row
        } else {
            row.style.display = "none"; // Hide row
        }
    });
    
    // Update counter
    const visibleCount = document.querySelectorAll(".volunteer-table tbody tr:not([style*='display: none'])").length;
    const volunteerCount = document.getElementById("volunteer-count");
    if (volunteerCount) {
        volunteerCount.textContent = visibleCount;
    }
}

// Attach event listeners to buttons
function attachEventListeners() {
    const viewButtons = document.querySelectorAll(".view-profile-button");
    const deleteButtons = document.querySelectorAll(".delete-profile-button");
    const profileModal = document.querySelector(".pop-up-profile");
    const idPicturePopup = document.querySelector(".id-picture-popup");
    const feedbackModal = document.getElementById("feedback-modal");
    const confirmationDialog = document.querySelector(".confirmation-dialog");
    const overlay = document.querySelector(".overlay");
    const closeModal = document.querySelector(".close-btn");
    const closePopupBtn = document.querySelectorAll(".close-popup-btn");
    const verifyUserBtn = document.getElementById("verify-user-btn");
    const verifyConfirmBtn = document.getElementById("verify-confirm-btn");
    const denyConfirmBtn = document.getElementById("deny-confirm-btn");
    const confirmYesBtn = document.getElementById("confirm-yes-btn");
    const confirmNoBtn = document.getElementById("confirm-no-btn");
    const submitFeedbackBtn = document.getElementById("submit-feedback-btn");
    const cancelFeedbackBtn = document.getElementById("cancel-feedback-btn");
    const sortButtons = document.querySelectorAll(".sort-btn");

    // View Profile
    viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const volunteerId = button.getAttribute("data-id");
            currentVolunteerId = volunteerId;
            const volunteer = volunteers.find((v) => v.id === volunteerId);
    
            if (volunteer) {
                // Store the userId
                currentUserId = volunteer.userId;
                
                document.getElementById("volunteer-name").textContent = `${volunteer.firstName} ${volunteer.middleName} ${volunteer.lastName}`;
                document.getElementById("volunteer-address").textContent = volunteer.address;
                document.getElementById("volunteer-phone").textContent = volunteer.phoneNo;
                document.getElementById("volunteer-email").textContent = volunteer.email;
                document.getElementById("volunteer-age").textContent = volunteer.age;
                document.getElementById("volunteer-birthday").textContent = volunteer.dateOfBirth;
                document.getElementById("volunteer-gender").textContent = volunteer.gender;

                // Reset and set profile picture for the current volunteer
                const profileImageElement = document.getElementById("volunteer-image");
                // Always reset to default first to prevent showing previous volunteer's image
                profileImageElement.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHBhdGggZmlsbD0iI2UwZTBlMCIgZD0iTTAgMGgxMjB2MTIwSDB6Ii8+PHBhdGggZmlsbD0iIzU1NSIgZD0iTTYwIDIwYzExIDAgMjAgOSAyMCAyMHMtOSAyMC0yMCAyMC0yMC05LTIwLTIwIDktMjAgMjAtMjBtMCA2MWMyMiAwIDQwIDE3IDQwIDM5djFIMjB2LTFjMC0yMiAxOC0zOSA0MC0zOSIvPjwvc3ZnPg==";
                
                // Only if volunteer has a valid profile picture URL, update the image
                if (volunteer.profilePictureUrl && volunteer.profilePictureUrl.trim() !== "") {
                    profileImageElement.src = volunteer.profilePictureUrl;
                }
    
                // Set verify button status
                if (volunteer.status === "Verified") {
                    verifyUserBtn.textContent = "Verified";
                    verifyUserBtn.classList.add("verified");
                    verifyUserBtn.disabled = true;
                } else {
                    verifyUserBtn.textContent = "Verify User";
                    verifyUserBtn.classList.remove("verified");
                    verifyUserBtn.disabled = false;
                }
    
                // Populate Interests
                const interestsList = document.getElementById("volunteer-interests");
                interestsList.innerHTML = "";
                if (volunteer.interests && volunteer.interests.length > 0) {
                    volunteer.interests.forEach((interest) => {
                        const li = document.createElement("li");
                        li.textContent = interest;
                        interestsList.appendChild(li);
                    });
                } else {
                    interestsList.innerHTML = "<li>N/A</li>";
                }
    
                // Populate Skills
                const skillsList = document.getElementById("volunteer-skills");
                skillsList.innerHTML = "";
                if (volunteer.skills && volunteer.skills.length > 0) {
                    volunteer.skills.forEach((skill) => {
                        const li = document.createElement("li");
                        li.textContent = skill;
                        skillsList.appendChild(li);
                    });
                } else {
                    skillsList.innerHTML = "<li>N/A</li>";
                }
    
                profileModal.classList.remove("hide-profile");
                overlay.classList.remove("hide-profile");
            }
        });
    });
    

    // Close Profile Modal
    if (closeModal) {
        closeModal.addEventListener("click", () => {
            profileModal.classList.add("hide-profile");
            overlay.classList.add("hide-profile");
        });
    }

    // Close popups with X button
    closePopupBtn.forEach(button => {
        button.addEventListener("click", (e) => {
            // Find the parent modal
            const parentModal = e.target.closest(".id-picture-popup, .feedback-modal");
            if (parentModal) {
                parentModal.classList.add("hide-profile");
                parentModal.style.display = "none";
                overlay.classList.add("hide-profile");
            }
        });
    });

    // Verify User Button
    if (verifyUserBtn) {
        verifyUserBtn.addEventListener("click", () => {
            const volunteer = volunteers.find((v) => v.id === currentVolunteerId);
            
            if (volunteer && volunteer.idPicture) {
                // Show ID Picture popup
                document.getElementById("id-picture").src = volunteer.idPicture;
                idPicturePopup.classList.remove("hide-profile");
                idPicturePopup.style.display = "flex"; // Explicitly show the popup
            } else {
                showNotification("No ID picture available for this volunteer.", "error");
            }
        });
    }

    // Verify Confirm Button
    if (verifyConfirmBtn) {
        verifyConfirmBtn.addEventListener("click", () => {
            currentAction = "verify";
            document.getElementById("confirmation-message").textContent = "Are you sure you want to verify this user?";
            idPicturePopup.classList.add("hide-profile");
            idPicturePopup.style.display = "none"; // Explicitly hide
            confirmationDialog.classList.remove("hide-profile");
            confirmationDialog.style.display = "block"; // Explicitly show
        });
    }

    // Deny Confirm Button - Modified to show feedback modal instead
    if (denyConfirmBtn) {
        denyConfirmBtn.addEventListener("click", () => {
            openFeedbackModal();
        });
    }

    // Submit Feedback Button
    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener("click", submitDenialFeedback);
    }

    // Cancel Feedback Button
    if (cancelFeedbackBtn) {
        cancelFeedbackBtn.addEventListener("click", () => {
            closeFeedbackModal();
            // Return to ID picture popup
            idPicturePopup.classList.remove("hide-profile");
            idPicturePopup.style.display = "flex";
        });
    }

    // Confirmation Yes Button
    if (confirmYesBtn) {
        confirmYesBtn.addEventListener("click", async () => {
            if (currentAction === "verify") {
                await verifyUser(currentVolunteerId);
            }
            
            // Close confirmation dialog and overlay
            confirmationDialog.classList.add("hide-profile");
            confirmationDialog.style.display = "none";
            overlay.classList.add("hide-profile");
        });
    }

    // Confirmation No Button
    if (confirmNoBtn) {
        confirmNoBtn.addEventListener("click", () => {
            // Close confirmation dialog
            confirmationDialog.classList.add("hide-profile");
            confirmationDialog.style.display = "none";
            // Return to ID picture popup
            idPicturePopup.classList.remove("hide-profile");
            idPicturePopup.style.display = "flex";
        });
    }

    // Delete Profile
    deleteButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const userId = button.getAttribute("data-id");
            await deleteVolunteer(userId);
        });
    });

    // Sort buttons
    if (sortButtons) {
        sortButtons.forEach(button => {
            button.addEventListener("click", () => {
                const sortBy = button.getAttribute("data-sort");
                sortVolunteers(sortBy);
            });
        });
    }

    // Close all popups when clicking overlay
    overlay.addEventListener("click", () => {
        profileModal.classList.add("hide-profile");
        idPicturePopup.classList.add("hide-profile");
        idPicturePopup.style.display = "none";
        feedbackModal.classList.add("hide-profile");
        feedbackModal.style.display = "none";
        confirmationDialog.classList.add("hide-profile");
        confirmationDialog.style.display = "none";
        overlay.classList.add("hide-profile");
    });
}

// Setup UI components (sorting buttons and volunteer count)
function setupUIComponents() {
    // Add volunteer count if it doesn't exist
    if (!document.getElementById("volunteer-count")) {
        const volunteerStatus = document.createElement("div");
        volunteerStatus.className = "volunteer-status";
        volunteerStatus.innerHTML = `<p><span id="volunteer-count">0</span> volunteers found</p>`;
        
        const searchForm = document.querySelector(".search-form");
        if (searchForm && searchForm.parentNode) {
            searchForm.parentNode.insertBefore(volunteerStatus, searchForm.nextSibling);
        }
    }
    
    // Add sorting buttons if they don't exist
    if (!document.querySelector(".sort-btn")) {
        const sortFilters = document.createElement("div");
        sortFilters.className = "sort-filters";
        sortFilters.innerHTML = `
            <button class="sort-btn active" data-sort="name">
                <i class="fas fa-sort-alpha-down"></i> Sort by Name
            </button>
            <button class="sort-btn" data-sort="barangay">
                <i class="fas fa-map-marker-alt"></i> Sort by Barangay
            </button>
            <button class="sort-btn" data-sort="skills">
                <i class="fas fa-tools"></i> Sort by Skills
            </button>
            <button class="sort-btn" data-sort="interests">
                <i class="fas fa-star"></i> Sort by Interests
            </button>
        `;
        
        // Style the sort buttons
        const style = document.createElement('style');
        style.textContent = `
            .sort-filters {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 15px;
            }
            
            .sort-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border: none;
                border-radius: 5px;
                background-color: #f0f0f0;
                color: #555;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .sort-btn:hover {
                background-color: #e0e0e0;
            }
            
            .sort-btn.active {
                background-color: #3e8e41;
                color: white;
            }
            
            .sort-btn i {
                font-size: 14px;
            }
            
            .volunteer-status {
                padding: 0 0 10px 0;
                color: #555;
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .volunteer-status p {
                margin: 0;
            }
        `;
        document.head.appendChild(style);
        
        const searchForm = document.querySelector(".search-form");
        if (searchForm && searchForm.parentNode) {
            searchForm.parentNode.insertBefore(sortFilters, searchForm);
            
            // Make sort buttons work
            const sortButtons = document.querySelectorAll(".sort-btn");
            sortButtons.forEach(button => {
                button.addEventListener("click", () => {
                    const sortBy = button.getAttribute("data-sort");
                    sortVolunteers(sortBy);
                });
            });
        }
    }
}

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    console.log("Document loaded, initializing volunteer page...");
    
    // Setup search and sort UI if it doesn't exist
    setupUIComponents();
    
    // Initialize the refresh button
    initializeRefreshButton();
    
    // Load data from sessionStorage if available
    const dataWasLoaded = loadVolunteerData();
    
    if (dataWasLoaded && volunteers.length > 0) {
        console.log("Using cached volunteer data for initial display");
        renderVolunteers(volunteers);
    } else {
        console.log("No cached data found, fetching from Firestore");
        fetchVolunteers();
    }
    
    // Direct search functionality - guaranteed to work
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        // Clone to remove any existing listeners
        const oldSearchInput = searchInput;
        const newSearchInput = oldSearchInput.cloneNode(true);
        oldSearchInput.parentNode.replaceChild(newSearchInput, oldSearchInput);
        
        // Add working event listener
        newSearchInput.addEventListener("input", function() {
            searchVolunteers(this.value.trim());
        });
        
        // Add icon if needed
        if (!document.querySelector(".search-form i.fa-search")) {
            const searchIcon = document.createElement("i");
            searchIcon.className = "fas fa-search";
            searchIcon.style.position = "absolute";
            searchIcon.style.left = "10px";
            searchIcon.style.top = "50%";
            searchIcon.style.transform = "translateY(-50%)";
            searchIcon.style.color = "#777";
            
            // Style the input
            newSearchInput.style.paddingLeft = "35px";
            
            // Add icon before input
            newSearchInput.parentNode.style.position = "relative";
            newSearchInput.parentNode.insertBefore(searchIcon, newSearchInput);
        }
    }
    
    // Set up page unload handler to save state
    window.addEventListener('beforeunload', () => {
        storeVolunteerData();
    });
});