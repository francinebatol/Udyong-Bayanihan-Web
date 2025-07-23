// Updated logout functionality with fixed path resolution
document.addEventListener('DOMContentLoaded', () => {
    // Find the sign out link/button
    const signOutLink = document.querySelector('.sign-out a');
    
    if (signOutLink) {
        // Make sure we only add the event listener once
        if (!signOutLink.hasAttribute('data-logout-initialized')) {
            signOutLink.addEventListener('click', function(event) {
                // Prevent default behavior
                event.preventDefault();
                
                // Ask for confirmation
                const confirmSignOut = confirm("Are you sure you want to sign out?");
                
                if (confirmSignOut) {
                    // Clear session storage
                    sessionStorage.removeItem('adminUser');
                    sessionStorage.clear();
                    
                    // Show logout message
                    alert("You have been signed out successfully.");
                    
                    // Redirect to login page using absolute path from the root
                    // First, get the current path
                    const currentPath = window.location.pathname;
                    // Extract the base path (everything before the last segment)
                    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                    
                    // Redirect to login page in the same directory
                    window.location.href = basePath + "log-in.html";
                }
            });
            
            // Mark as initialized to prevent duplicate event listeners
            signOutLink.setAttribute('data-logout-initialized', 'true');
        }
        
        // Make sure the cursor appears as a pointer to indicate it's clickable
        signOutLink.style.cursor = 'pointer';
    } else {
        console.error("Sign-out link not found in the DOM.");
    }
});