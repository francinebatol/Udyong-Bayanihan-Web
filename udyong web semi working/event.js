import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Make functions and variables globally accessible
window.currentEventId = null;

const firebaseConfig = {
  apiKey: "AIzaSyA5Kcj0SESEGMxrrtEjvUbjF3N6teCfwBU",
  authDomain: "udyong-bayanihan-5146f.firebaseapp.com",
  projectId: "udyong-bayanihan-5146f",
  storageBucket: "udyong-bayanihan-5146f.appspot.com",
  messagingSenderId: "70772787902",
  appId: "1:70772787902:web:6e760a48967e01625f6cef",
  measurementId: "G-47EYYV2W75",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const pendingTableBody = document.querySelector(".pending-events-table tbody");
const approvedEventsCount = document.getElementById("approved-events-count");
const rejectedEventsCount = document.getElementById("rejected-events-count");
const eventModal = document.getElementById("event-modal");
const feedbackModal = document.getElementById("feedback-modal");
const modalClose = document.querySelector(".modal-close");
const feedbackModalClose = document.getElementById("feedback-modal-close");
const modalContent = document.querySelector(".modal-content");
const loadingIndicator = document.getElementById("loading-indicator");
const approveModalBtn = document.getElementById("approve-modal-btn");
const rejectModalBtn = document.getElementById("reject-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const submitFeedbackBtn = document.getElementById("submit-feedback-btn");
const cancelFeedbackBtn = document.getElementById("cancel-feedback-btn");
const rejectionFeedback = document.getElementById("rejection-feedback");
const feedbackError = document.getElementById("feedback-error");

// Create refresh button
const refreshButton = document.createElement("button");
refreshButton.className = "refresh-btn";
refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';

// State variables
let currentEventId = null;
let pendingEvents = [];
let eventCounts = { Accepted: 0, Rejected: 0 };
let isDataLoaded = false;
let isLoadingData = false;
let isProcessingAction = false; // Flag to prevent duplicate actions

// Store data in sessionStorage to persist across page navigation
function storeEventData() {
  try {
    sessionStorage.setItem('pendingEvents', JSON.stringify(pendingEvents));
    sessionStorage.setItem('eventCounts', JSON.stringify(eventCounts));
    sessionStorage.setItem('eventDataLoaded', JSON.stringify(isDataLoaded));
  } catch (e) {
    console.error("Error storing event data in sessionStorage:", e);
  }
}

// Load data from sessionStorage
function loadEventData() {
  try {
    const storedPendingEvents = sessionStorage.getItem('pendingEvents');
    const storedEventCounts = sessionStorage.getItem('eventCounts');
    const storedDataLoaded = sessionStorage.getItem('eventDataLoaded');
    
    if (storedPendingEvents) {
      pendingEvents = JSON.parse(storedPendingEvents);
    }
    
    if (storedEventCounts) {
      eventCounts = JSON.parse(storedEventCounts);
    }
    
    if (storedDataLoaded) {
      isDataLoaded = JSON.parse(storedDataLoaded);
    }
    
    return isDataLoaded;
  } catch (e) {
    console.error("Error loading event data from sessionStorage:", e);
    return false;
  }
}

// Function to format Firestore timestamp to date
function formatDate(timestamp) {
  if (timestamp && timestamp.toDate) {
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return "N/A";
}

// Show loading indicator
function showLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.remove("hide");
    // Disable scrolling while loading
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
  const popup = document.getElementById("popup-message");
  const popupText = document.getElementById("popup-text");
  
  if (popup && popupText) {
    // Set message
    popupText.textContent = message;
    
    // Apply styling based on type
    popup.className = "popup-message " + type;
    
    // Show the popup
    popup.classList.add("show");
    
    // Hide after 3 seconds
    setTimeout(() => {
      popup.classList.remove("show");
    }, 3000);
  }
}

// Show the feedback modal with improved accessibility
function showFeedbackModal() {
  console.log("Showing feedback modal for event:", currentEventId);
  
  if (!feedbackModal) {
    console.error("Error: Feedback modal element not found!");
    return;
  }
  
  // Ensure the current event ID is available globally
  window.currentEventId = currentEventId;
  console.log("Window currentEventId set to:", window.currentEventId);
  
  // Clear any previous feedback
  if (rejectionFeedback) {
    rejectionFeedback.value = "";
  }
  
  // Hide any previous error message
  if (feedbackError) {
    feedbackError.classList.add("hide");
  }
  
  // Hide the event modal if it's open
  if (eventModal) {
    eventModal.style.display = "none";
  }
  
  // Show the feedback modal
  feedbackModal.style.display = "block";
  
  // Focus on the textarea
  setTimeout(() => {
    if (rejectionFeedback) {
      rejectionFeedback.focus();
    }
  }, 100);
}

// Hide the feedback modal
function hideFeedbackModal() {
  if (feedbackModal) {
    feedbackModal.style.display = "none";
  }
}

// Render pending events
function renderPendingEvents() {
  pendingTableBody.innerHTML = "";

  if (pendingEvents.length === 0) {
    pendingTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 20px; text-align: center;">
          No pending events found
        </td>
      </tr>
    `;
    return;
  }

  pendingEvents.forEach(event => {
    pendingTableBody.innerHTML += `
      <tr>
        <td>${event.nameOfEvent}</td>
        <td>${event.typeOfEvent}</td>
        <td>${event.organization}</td>
        <td>${event.date}</td>
        <td>${event.address}</td>
        <td>${event.headCoordinator}</td>
        <td>
          <div class="action-buttons">
            <button class="btn view-btn" data-id="${event.eventId}">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn approve-btn" data-id="${event.eventId}">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn reject-btn" data-id="${event.eventId}">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  // Update event counters
  updateEventCountersDisplay();
  
  // Add small delay before attaching event listeners to ensure DOM is ready
  setTimeout(() => {
    attachEventListeners();
    console.log("Event listeners attached to table buttons");
  }, 100);
}

// Update event counters display
function updateEventCountersDisplay() {
  if (approvedEventsCount) {
    approvedEventsCount.textContent = `${eventCounts.Accepted} Events`;
  }
  
  if (rejectedEventsCount) {
    rejectedEventsCount.textContent = `${eventCounts.Rejected} Events`;
  }
}

// Initialize refresh button
function initializeRefreshButton() {
  // Create a header bar for the pending events section if it doesn't exist
  let headerBar = document.querySelector(".pending-events-section .header-bar");
  
  if (!headerBar) {
    headerBar = document.createElement("div");
    headerBar.className = "header-bar";
    
    const pendingTitle = document.querySelector(".pending-events-section h1");
    if (pendingTitle) {
      // Insert after the title
      pendingTitle.parentNode.insertBefore(headerBar, pendingTitle.nextSibling);
    } else {
      // Insert at the top of the section
      const pendingSection = document.querySelector(".pending-events-section");
      if (pendingSection) {
        pendingSection.insertBefore(headerBar, pendingSection.firstChild);
      }
    }
  }
  
  // Add the refresh button to the header bar
  if (headerBar) {
    headerBar.appendChild(refreshButton);
    
    // Add styles for the refresh button and header bar
    const style = document.createElement('style');
    style.textContent = `
      .header-bar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 15px;
      }
      
      .refresh-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 15px;
        border: none;
        border-radius: 5px;
        background-color: #4CAF50;
        color: white;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
      fetchPendingEvents(true).then(() => {
        // Reset button state after refresh
        setTimeout(() => {
          refreshIcon.classList.remove("fa-spin");
          refreshButton.disabled = false;
        }, 500);
      });
    });
  }
}

// Fetch and display pending events
async function fetchPendingEvents(forceRefresh = false) {
  // Check if we already have data and if we're not currently loading and not forcing refresh
  if (isDataLoaded && !isLoadingData && !forceRefresh) {
    console.log("Using cached event data");
    renderPendingEvents();
    return;
  }
  
  if (isLoadingData) return;
  
  showLoading();
  pendingTableBody.innerHTML = "";

  try {
    console.log("Fetching event data from Firestore");
    
    // Reset data loaded state if forcing refresh
    if (forceRefresh) {
      isDataLoaded = false;
    }
    
    // Fetch pending events and event counts in parallel
    const [pendingEventsQuery, approvedEventsQuery, rejectedEventsQuery] = await Promise.all([
      getDocs(query(collection(db, "EventInformation"), where("status", "==", "Pending"))),
      getDocs(query(collection(db, "EventInformation"), where("status", "==", "Accepted"))),
      getDocs(query(collection(db, "EventInformation"), where("status", "==", "Rejected")))
    ]);
    
    // Update event counts
    eventCounts.Accepted = approvedEventsQuery.size;
    eventCounts.Rejected = rejectedEventsQuery.size;

    // Display message if no pending events
    if (pendingEventsQuery.empty) {
      pendingEvents = [];
      isDataLoaded = true;
      storeEventData();
      
      pendingTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 20px; text-align: center;">
            No pending events found
          </td>
        </tr>
      `;
      
      updateEventCountersDisplay();
      hideLoading();
      return;
    }

    // Process pending events
    pendingEvents = [];
    const eventPromises = [];

    for (const eventInfoDoc of pendingEventsQuery.docs) {
      const eventInfo = eventInfoDoc.data();
      const eventId = eventInfo.eventId;
      
      // Add a promise to fetch event details
      eventPromises.push(
        getDocs(query(collection(db, "EventDetails"), where("eventId", "==", eventId)))
          .then(eventDetailsSnapshot => {
            let eventDetails = {};
            if (!eventDetailsSnapshot.empty) {
              eventDetails = eventDetailsSnapshot.docs[0].data();
            }
            
            pendingEvents.push({
              eventId: eventId,
              nameOfEvent: eventDetails.nameOfEvent || "N/A",
              typeOfEvent: eventDetails.typeOfEvent || "N/A",
              organization: eventInfo.organizations || "N/A",
              date: eventDetails.date ? formatDate(eventDetails.date) : "N/A",
              address: eventDetails.barangay || "N/A",
              headCoordinator: eventInfo.headCoordinator || "N/A",
              caption: eventDetails.caption || "",
              imageUrls: eventDetails.imageUrls || [],
              volunteerNeeded: eventDetails.volunteerNeeded || "N/A",
              skillRequirements: eventDetails.skillRequirements || {},
              rawEventInfo: eventInfo,
              rawEventDetails: eventDetails
            });
          })
      );
    }

    // Wait for all promises to resolve
    await Promise.all(eventPromises);
    
    // Mark data as loaded
    isDataLoaded = true;
    
    // Store in sessionStorage
    storeEventData();
    
    // Render the events
    renderPendingEvents();
    
    hideLoading();
  } catch (error) {
    console.error("Error fetching pending events:", error);
    pendingTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 20px; text-align: center; color: red;">
          Error loading events: ${error.message}
        </td>
      </tr>
    `;
    hideLoading();
  }
}

// Update the status of an event
async function updateEventStatus(eventId, newStatus, feedback = null) {
  // Prevent duplicate calls to this function
  if (isProcessingAction) {
    console.log("Already processing an action, ignoring duplicate request");
    return;
  }
  
  isProcessingAction = true;
  showLoading();
  console.log(`Updating status for event ${eventId} to ${newStatus} with feedback: ${feedback}`);
  
  try {
    const eventInfoQuerySnapshot = await getDocs(
      query(collection(db, "EventInformation"), where("eventId", "==", eventId))
    );
    
    if (!eventInfoQuerySnapshot.empty) {
      const eventInfoDocRef = eventInfoQuerySnapshot.docs[0].ref;
      
      // Create update data
      const updateData = { status: newStatus };
      
      // Add feedback if provided (for rejections)
      if (feedback) {
        updateData.feedback = feedback;
      }
      
      await updateDoc(eventInfoDocRef, updateData);
      
      // Close modals if open
      if (eventModal && eventModal.style.display === "block") {
        eventModal.style.display = "none";
      }
      
      if (feedbackModal && feedbackModal.style.display === "block") {
        feedbackModal.style.display = "none";
      }
      
      // Update local data
      // 1. Remove the event from pending events
      pendingEvents = pendingEvents.filter(event => event.eventId !== eventId);
      
      // 2. Update the appropriate counter
      if (newStatus === "Accepted") {
        eventCounts.Accepted++;
      } else if (newStatus === "Rejected") {
        eventCounts.Rejected++;
      }
      
      // 3. Store updated data
      storeEventData();
      
      // Display notification
      showNotification(`Event ${newStatus.toLowerCase()} successfully!`, 'success');
      
      // Refresh display
      renderPendingEvents();
    } else {
      showNotification(`Event not found!`, 'error');
    }
  } catch (error) {
    console.error(`Error updating event status to ${newStatus}:`, error);
    showNotification(`Error: ${error.message}`, 'error');
  }
  
  hideLoading();
  isProcessingAction = false; // Reset flag when done
  currentEventId = null; // Reset current event ID
  window.currentEventId = null; // Reset global current event ID
}
// Make function globally accessible
window.updateEventStatus = updateEventStatus;

// Show event details in a modal
async function showEventDetails(eventId) {
  showLoading();
  
  // Store the current event ID globally
  currentEventId = eventId;
  window.currentEventId = eventId; // Make accessible globally
  console.log(`Setting currentEventId to ${currentEventId}`);
  
  try {
    // Find the event in our cached data
    const event = pendingEvents.find(event => event.eventId === eventId);
    
    if (event) {
      // Set the modal title
      document.getElementById("modal-event-title").textContent = event.nameOfEvent || "Event Details";

      // Process images
      let imageElements = "";
      if (event.imageUrls) {
        const images = Array.isArray(event.imageUrls) ? event.imageUrls : [event.imageUrls];
        
        // Main featured image
        const featuredImage = images[0] || "./assets/default-image.png";
        
        // Image gallery
        if (images.length > 0) {
          const galleryImages = images.map((url, index) => `
            <div class="gallery-item">
              <img src="${url}" alt="Event Image ${index + 1}">
            </div>
          `).join("");
          
          imageElements = `
            <div class="images-section">
              <img src="${featuredImage}" alt="Featured Event Image" class="featured-image">
              ${images.length > 1 ? `
                <h3>Event Gallery</h3>
                <div class="image-gallery">
                  ${galleryImages}
                </div>
              ` : ''}
            </div>
          `;
        }
      }

      // Populate modal content
      const modalBody = document.querySelector(".modal-body");
      modalBody.innerHTML = `
        <div class="event-details">
          ${imageElements}
          
          <div class="event-caption">
            <p>${event.caption || "No description available."}</p>
          </div>
          
          <div class="modal-info">
            <div class="info-group">
              <h3>Date</h3>
              <p>${event.date || "N/A"}</p>
            </div>
            <div class="info-group">
              <h3>Location</h3>
              <p>${event.address || "N/A"}</p>
            </div>
            <div class="info-group">
              <h3>Type of Event</h3>
              <p>${event.typeOfEvent || "N/A"}</p>
            </div>
            <div class="info-group">
              <h3>Organization</h3>
              <p>${event.organization || "N/A"}</p>
            </div>
            <div class="info-group">
              <h3>Head Coordinator</h3>
              <p>${event.headCoordinator || "N/A"}</p>
            </div>
            <div class="info-group">
              <h3>Volunteers Needed</h3>
              <p>${event.volunteerNeeded || "N/A"}</p>
            </div>
            
            ${event.skillRequirements ? `
              <div class="info-group">
                <h3>Required Skills</h3>
                <div>
                  ${Object.entries(event.skillRequirements).map(([skill, value]) => 
                    `<p>${skill}: ${value}</p>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Show the modal
      eventModal.style.display = "block";
      
      // Reconnect event listeners to the buttons in the modal
      // This needs to happen after the modal is shown
      setTimeout(() => {
        // Find the Approve Event and Reject Event buttons in the modal
        const modalApproveBtn = document.querySelector("button[class*='Approve'], button[class*='approve-event'], button[class*='Approve Event']");
        const modalRejectBtn = document.querySelector("button[class*='Reject'], button[class*='reject-event'], button[class*='Reject Event']");
        
        console.log("Modal buttons found after opening:", { 
          modalApproveBtn, 
          modalRejectBtn
        });
        
        if (modalApproveBtn) {
          modalApproveBtn.addEventListener("click", () => {
            if (isProcessingAction) return;
            console.log(`Approving event ${currentEventId} from dynamic modal button`);
            if (currentEventId) {
              const confirmApproval = confirm("Are you sure you want to approve this event?");
              if (confirmApproval) {
                updateEventStatus(currentEventId, "Accepted");
              }
            }
          });
        }
        
        if (modalRejectBtn) {
          modalRejectBtn.addEventListener("click", () => {
            if (isProcessingAction) return;
            console.log(`Rejecting event ${currentEventId} from dynamic modal button`);
            if (currentEventId) {
              if (!feedbackModal) {
                const confirmReject = confirm("Are you sure you want to reject this event?");
                if (confirmReject) {
                  updateEventStatus(currentEventId, "Rejected", "No feedback provided");
                }
              } else {
                showFeedbackModal();
              }
            }
          });
        }
      }, 200);
    } else {
      // If the event is not in our cache, fetch it from Firestore
      console.log("Event not found in cache, fetching from Firestore");
      
      const eventInfoSnapshot = await getDocs(
        query(collection(db, "EventInformation"), where("eventId", "==", eventId))
      );

      const eventDetailsSnapshot = await getDocs(
        query(collection(db, "EventDetails"), where("eventId", "==", eventId))
      );

      if (!eventInfoSnapshot.empty && !eventDetailsSnapshot.empty) {
        const eventInfo = eventInfoSnapshot.docs[0].data();
        const eventDetails = eventDetailsSnapshot.docs[0].data();

        // Set the modal title
        document.getElementById("modal-event-title").textContent = eventDetails.nameOfEvent || "Event Details";

        // Process images
        let imageElements = "";
        if (eventDetails.imageUrls) {
          const images = Array.isArray(eventDetails.imageUrls) ? eventDetails.imageUrls : [eventDetails.imageUrls];
          
          // Main featured image
          const featuredImage = images[0] || "./assets/default-image.png";
          
          // Image gallery
          if (images.length > 0) {
            const galleryImages = images.map((url, index) => `
              <div class="gallery-item">
                <img src="${url}" alt="Event Image ${index + 1}">
              </div>
            `).join("");
            
            imageElements = `
              <div class="images-section">
                <img src="${featuredImage}" alt="Featured Event Image" class="featured-image">
                ${images.length > 1 ? `
                  <h3>Event Gallery</h3>
                  <div class="image-gallery">
                    ${galleryImages}
                  </div>
                ` : ''}
              </div>
            `;
          }
        }

        // Populate modal content
        const modalBody = document.querySelector(".modal-body");
        modalBody.innerHTML = `
          <div class="event-details">
            ${imageElements}
            
            <div class="event-caption">
              <p>${eventDetails.caption || "No description available."}</p>
            </div>
            
            <div class="modal-info">
              <div class="info-group">
                <h3>Date</h3>
                <p>${formatDate(eventDetails.date) || "N/A"}</p>
              </div>
              <div class="info-group">
                <h3>Location</h3>
                <p>${eventDetails.barangay || "N/A"}</p>
              </div>
              <div class="info-group">
                <h3>Type of Event</h3>
                <p>${eventDetails.typeOfEvent || "N/A"}</p>
              </div>
              <div class="info-group">
                <h3>Organization</h3>
                <p>${eventInfo.organizations || "N/A"}</p>
              </div>
              <div class="info-group">
                <h3>Head Coordinator</h3>
                <p>${eventInfo.headCoordinator || "N/A"}</p>
              </div>
              <div class="info-group">
                <h3>Volunteers Needed</h3>
                <p>${eventDetails.volunteerNeeded || "N/A"}</p>
              </div>
              
              ${eventDetails.skillRequirements ? `
                <div class="info-group">
                  <h3>Required Skills</h3>
                  <div>
                    ${Object.entries(eventDetails.skillRequirements).map(([skill, value]) => 
                      `<p>${skill}: ${value}</p>`
                    ).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        // Show the modal
        eventModal.style.display = "block";
        
        // Reconnect event listeners to the buttons in the modal
        // This needs to happen after the modal is shown
        setTimeout(() => {
          // Find the Approve Event and Reject Event buttons in the modal
          const modalApproveBtn = document.querySelector("button[class*='Approve'], button[class*='approve-event'], button[class*='Approve Event']");
          const modalRejectBtn = document.querySelector("button[class*='Reject'], button[class*='reject-event'], button[class*='Reject Event']");
          
          console.log("Modal buttons found after opening:", { 
            modalApproveBtn, 
            modalRejectBtn
          });
          
          if (modalApproveBtn) {
            modalApproveBtn.addEventListener("click", () => {
              if (isProcessingAction) return;
              console.log(`Approving event ${currentEventId} from dynamic modal button`);
              if (currentEventId) {
                const confirmApproval = confirm("Are you sure you want to approve this event?");
                if (confirmApproval) {
                  updateEventStatus(currentEventId, "Accepted");
                }
              }
            });
          }
          
          if (modalRejectBtn) {
            modalRejectBtn.addEventListener("click", () => {
              if (isProcessingAction) return;
              console.log(`Rejecting event ${currentEventId} from dynamic modal button`);
              if (currentEventId) {
                if (!feedbackModal) {
                  const confirmReject = confirm("Are you sure you want to reject this event?");
                  if (confirmReject) {
                    updateEventStatus(currentEventId, "Rejected", "No feedback provided");
                  }
                } else {
                  showFeedbackModal();
                }
              }
            });
          }
        }, 200);
      } else {
        showNotification("Event details not found.", "error");
      }
    }
  } catch (error) {
    console.error("Error fetching event details:", error);
    showNotification(`Error: ${error.message}`, "error");
  }
  
  hideLoading();
}

// Process rejection with feedback
function processRejection(eventId) {
  console.log(`Processing rejection for event ${eventId}`);
  
  // Update current event ID if provided
  if (eventId) {
    currentEventId = eventId;
    window.currentEventId = eventId; // Make globally accessible
  }
  
  // Show the feedback modal directly
  showFeedbackModal();
}

// Global submitFeedbackAndReject function that can be called directly from HTML
window.submitFeedbackAndReject = function() {
  console.log("Global submitFeedbackAndReject function called");
  
  // Find the rejection feedback textarea
  const rejectionFeedbackElem = document.getElementById("rejection-feedback");
  if (!rejectionFeedbackElem) {
    console.error("Rejection feedback textarea not found");
    return;
  }
  
  // Get the feedback text
  const feedback = rejectionFeedbackElem.value.trim();
  console.log("Feedback content:", feedback);
  
  // Validate feedback
  const feedbackErrorElem = document.getElementById("feedback-error");
  if (!feedback) {
    if (feedbackErrorElem) {
      feedbackErrorElem.classList.remove("hide");
    }
    rejectionFeedbackElem.focus();
    return;
  }
  
  // Hide error if previously shown
  if (feedbackErrorElem) {
    feedbackErrorElem.classList.add("hide");
  }
  
  // Get the current event ID
  const eventId = window.currentEventId;
  console.log("Current event ID:", eventId);
  
  // Validate that we have a current event ID
  if (!eventId) {
    showNotification("Error: No event selected for rejection", "error");
    return;
  }
  
  console.log("Proceeding with rejection for event:", eventId);
  
  // Reject the event with feedback
  updateEventStatus(eventId, "Rejected", feedback);
};

// Attach event listeners to buttons
function attachEventListeners() {
  // Table action buttons
  const viewButtons = document.querySelectorAll(".view-btn, [class*='View']");
  const approveButtons = document.querySelectorAll(".approve-btn, [class*='Approve']");
  const rejectButtons = document.querySelectorAll(".reject-btn, [class*='Reject']");

  viewButtons.forEach(button => {
    button.addEventListener("click", () => {
      const eventId = button.getAttribute("data-id");
      showEventDetails(eventId);
    });
  });

  approveButtons.forEach(button => {
    button.addEventListener("click", () => {
      if (isProcessingAction) return; // Prevent multiple clicks
      
      const eventId = button.getAttribute("data-id");
      const confirmApproval = confirm("Are you sure you want to approve this event?");
      
      if (confirmApproval) {
        currentEventId = eventId;
        window.currentEventId = eventId; // Make globally accessible
        updateEventStatus(eventId, "Accepted");
      }
    });
  });

  rejectButtons.forEach(button => {
    button.addEventListener("click", () => {
      if (isProcessingAction) return; // Prevent multiple clicks
      
      const eventId = button.getAttribute("data-id");
      currentEventId = eventId; // Ensure currentEventId is set
      window.currentEventId = eventId; // Make globally accessible
      
      if (!feedbackModal) {
        console.error("Feedback modal not found, falling back to direct rejection");
        const confirmReject = confirm("Are you sure you want to reject this event?");
        if (confirmReject) {
          updateEventStatus(eventId, "Rejected", "No feedback provided");
        }
        return;
      }
      
      // Show feedback modal
      showFeedbackModal();
    });
  });
}

// Set up modal button event listeners
document.addEventListener("DOMContentLoaded", function() {
  console.log("Document loaded, initializing event page...");
  
  // Initialize the refresh button
  initializeRefreshButton();
  
  // Load data from sessionStorage if available
  const dataWasLoaded = loadEventData();
  
  if (dataWasLoaded) {
    console.log("Using cached event data for initial display");
    renderPendingEvents();
  } else {
    console.log("No cached data found, fetching from Firestore");
    fetchPendingEvents();
  }
  
  // Check and log all important DOM elements
  console.log("Event modal:", eventModal);
  console.log("Feedback modal:", feedbackModal);
  console.log("Approve modal button:", approveModalBtn);
  console.log("Reject modal button:", rejectModalBtn);
  console.log("Submit feedback button:", submitFeedbackBtn);
  
  // Modal buttons event listeners
  if (approveModalBtn) {
    approveModalBtn.addEventListener("click", function() {
      if (isProcessingAction) return;
      
      console.log(`Approving event ${currentEventId} from modal`);
      if (currentEventId) {
        const confirmApproval = confirm("Are you sure you want to approve this event?");
        if (confirmApproval) {
          updateEventStatus(currentEventId, "Accepted");
        }
      } else {
        showNotification("Error: No event selected for approval", "error");
      }
    });
  }

  if (rejectModalBtn) {
    rejectModalBtn.addEventListener("click", function() {
      if (isProcessingAction) return;
      
      console.log(`Rejecting event ${currentEventId} from modal`);
      if (currentEventId) {
        processRejection(currentEventId);
      } else {
        showNotification("Error: No event selected for rejection", "error");
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function() {
      eventModal.style.display = "none";
    });
  }

  // Set up direct handler for submit feedback button
  if (submitFeedbackBtn) {
    console.log("Setting up direct onclick handler for submit feedback button");
    submitFeedbackBtn.onclick = function(e) {
      console.log("Submit feedback button clicked");
      if (window.submitFeedbackAndReject) {
        window.submitFeedbackAndReject();
      } else {
        console.error("submitFeedbackAndReject function not found");
      }
      return false;
    };
  }

  if (cancelFeedbackBtn) {
    cancelFeedbackBtn.addEventListener("click", function() {
      hideFeedbackModal();
      // Optionally reopen the event modal
      if (eventModal && currentEventId) {
        eventModal.style.display = "block";
      }
    });
  }

  // Add event listener for Enter key in feedback textarea
  if (rejectionFeedback) {
    rejectionFeedback.addEventListener("keydown", function(e) {
      // Submit on Ctrl+Enter
      if (e.key === "Enter" && e.ctrlKey) {
        if (window.submitFeedbackAndReject) {
          window.submitFeedbackAndReject();
        } else {
          console.error("submitFeedbackAndReject function not found on Ctrl+Enter");
        }
      }
    });
  }

  // Close modal when clicking on X or outside the modal
  if (modalClose) {
    modalClose.addEventListener("click", function() {
      eventModal.style.display = "none";
    });
  }

  if (feedbackModalClose) {
    feedbackModalClose.addEventListener("click", function() {
      hideFeedbackModal();
      // Optionally reopen the event modal
      if (eventModal && currentEventId) {
        eventModal.style.display = "block";
      }
    });
  }

  window.addEventListener("click", function(event) {
    if (event.target === eventModal) {
      eventModal.style.display = "none";
    }
    
    if (event.target === feedbackModal) {
      hideFeedbackModal();
    }
  });
  
  // Set up page unload handler to save state
  window.addEventListener('beforeunload', function() {
    storeEventData();
  });
});