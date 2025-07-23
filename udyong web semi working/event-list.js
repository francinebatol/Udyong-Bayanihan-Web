import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
const eventTableBody = document.querySelector(".event-list-table tbody");
const eventCount = document.getElementById("event-count");
const searchBox = document.getElementById("searchBox");
const filterButtons = document.querySelectorAll(".filter-btn");
const noEventsMessage = document.getElementById("no-events-message");
const loadingIndicator = document.getElementById("loading-indicator");
const tableContainer = document.querySelector(".table-container");

// State variables
let allEvents = [];
let filteredEvents = [];
let currentFilter = "all";
let searchTerm = "";

// Show loading indicator
function showLoading() {
    if (loadingIndicator) {
        loadingIndicator.classList.remove("hide");
        // Disable scrolling on the body while loading
        document.body.style.overflow = "hidden";
    }
}

// Hide loading indicator
function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.classList.add("hide");
        // Re-enable scrolling
        document.body.style.overflow = "";
    }
}

// Format Firebase timestamp to readable date
function formatDate(timestamp) {
    if (timestamp && timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
    return "N/A";
}

// Parse date string to Date object
function parseDate(dateString) {
    if (dateString === "N/A") return null;
    
    // Try to parse in expected format: "Month Day, Year"
    const parts = dateString.split(',');
    if (parts.length === 2) {
        const datePart = parts[0].trim();
        const yearPart = parts[1].trim();
        
        return new Date(datePart + ", " + yearPart);
    }
    
    // Fallback to direct parsing
    return new Date(dateString);
}

// Determine event status based on date
function determineEventStatus(dateString) {
    if (dateString === "N/A") return { status: "upcoming", label: "Upcoming" };
    
    const eventDate = parseDate(dateString);
    if (!eventDate) return { status: "upcoming", label: "Upcoming" };
    
    const today = new Date();
    
    // Reset time portion for accurate date comparison
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { status: "past", label: "Past Event" };
    } else if (diffDays === 0) {
        return { status: "ongoing", label: "Today" };
    } else if (diffDays <= 7) {
        return { status: "upcoming", label: `In ${diffDays} day${diffDays === 1 ? '' : 's'}` };
    } else {
        return { status: "upcoming", label: "Upcoming" };
    }
}

// Fetch approved events from the database
async function fetchEvents() {
    showLoading();
    
    try {
        const eventDetailsSnapshot = await getDocs(collection(db, "EventDetails"));
        const eventInformationSnapshot = await getDocs(collection(db, "EventInformation"));

        // Create a map for event information
        const eventInfoMap = new Map();
        eventInformationSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === "Accepted") {
                eventInfoMap.set(data.eventId, data);
            }
        });

        // Populate events list only for "Accepted" events
        allEvents = [];
        eventDetailsSnapshot.forEach((doc) => {
            const data = doc.data();
            const info = eventInfoMap.get(data.eventId); // Match event by ID
            if (info) {
                const formattedDate = formatDate(data.date);
                const eventStatus = determineEventStatus(formattedDate);
                
                allEvents.push({
                    id: data.eventId || doc.id,
                    nameOfEvent: data.nameOfEvent || "",
                    typeOfEvent: data.typeOfEvent || "",
                    organizerName: info.organizations || "",
                    date: formattedDate,
                    address: `${data.barangay || ""}, ${data.municipality || ""}`.trim(),
                    headCoordinator: info.headCoordinator || "",
                    status: eventStatus.status,
                    statusLabel: eventStatus.label
                });
            }
        });

        // Sort events by date (most recent first for past events, soonest first for upcoming)
        allEvents.sort((a, b) => {
            const dateA = parseDate(a.date) || new Date(0);
            const dateB = parseDate(b.date) || new Date(0);
            
            if (a.status === "past" && b.status === "past") {
                // Most recent past events first
                return dateB - dateA;
            } else if (a.status !== "past" && b.status !== "past") {
                // Soonest upcoming/ongoing events first
                return dateA - dateB;
            } else {
                // Upcoming/ongoing events before past events
                return a.status === "past" ? 1 : -1;
            }
        });
        
        // Initialize filtered events with all events
        applyFilters();
        
        hideLoading();
    } catch (error) {
        console.error("Error fetching events:", error);
        hideLoading();
        showError("Failed to load events. Please try again later.");
    }
}

// Show error message
function showError(message) {
    eventTableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; color: red; padding: 20px;">
                ${message}
            </td>
        </tr>
    `;
    eventCount.textContent = "0";
}

// Apply filters based on current filter and search term
function applyFilters() {
    // First apply the time-based filter
    if (currentFilter === "all") {
        filteredEvents = [...allEvents];
    } else {
        filteredEvents = allEvents.filter(event => event.status === currentFilter);
    }
    
    // Then apply search term if exists
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredEvents = filteredEvents.filter(event => {
            return (
                event.nameOfEvent.toLowerCase().includes(term) ||
                event.typeOfEvent.toLowerCase().includes(term) ||
                event.organizerName.toLowerCase().includes(term) ||
                event.address.toLowerCase().includes(term) ||
                event.headCoordinator.toLowerCase().includes(term)
            );
        });
    }
    
    // Render the filtered events
    renderEvents();
}

// Render the events into the table
function renderEvents() {
    eventTableBody.innerHTML = "";
    
    if (filteredEvents.length === 0) {
        eventTableBody.innerHTML = "";
        noEventsMessage.classList.remove("hide");
    } else {
        noEventsMessage.classList.add("hide");
        
        filteredEvents.forEach((event) => {
            const statusClass = event.status; // past, ongoing, or upcoming
            const statusIcon = getStatusIcon(event.status);
            
            eventTableBody.innerHTML += `
                <tr>
                    <td>
                        <span class="event-status ${statusClass}">
                            ${statusIcon} ${event.statusLabel}
                        </span>
                    </td>
                    <td>${event.nameOfEvent}</td>
                    <td>${event.typeOfEvent}</td>
                    <td>${event.organizerName}</td>
                    <td>${event.date}</td>
                    <td>${event.address}</td>
                    <td>${event.headCoordinator}</td>
                </tr>
            `;
        });
    }
    
    // Update event count
    eventCount.textContent = filteredEvents.length;
}

// Get icon for event status
function getStatusIcon(status) {
    switch(status) {
        case "past":
            return '<i class="fas fa-check-circle"></i>';
        case "ongoing":
            return '<i class="fas fa-clock"></i>';
        case "upcoming":
            return '<i class="fas fa-calendar-day"></i>';
        default:
            return '<i class="fas fa-calendar"></i>';
    }
}

// Set active filter button
function setActiveFilterButton(filter) {
    filterButtons.forEach(button => {
        if (button.getAttribute("data-filter") === filter) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });
}

// Initialize event listeners
function initEventListeners() {
    // Filter button click events
    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            const filter = button.getAttribute("data-filter");
            currentFilter = filter;
            setActiveFilterButton(filter);
            applyFilters();
        });
    });
    
    // Search input event
    searchBox.addEventListener("input", (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        applyFilters();
    });
}

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    fetchEvents();
});