// JavaScript code to handle chat interactions
document.addEventListener("DOMContentLoaded", function () {
    const chatForm = document.getElementById("chat-form");
    const userMessageInput = document.getElementById("user-message");
    //const chatHistory = document.getElementById("chat-history");
    //const sendButton = document.getElementById("send-button");

    userMessageInput.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault(); // Prevent the default behavior (newline in textarea)
            chatForm.dispatchEvent(new Event("submit")); // Dispatch a submit event on the form
        }
    });

    chatForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const userMessage = userMessageInput.value;
        if (userMessage.trim() === "") {
            return; // Skip empty messages
        }

        // Display user's message in chat history
        appendMessage("User", userMessage);

        // Send user's message to the server
        sendUserMessage(userMessage);

        // Clear the input field
        userMessageInput.value = "";
    });

    function scrollToBottom() {
        const chatHistory = document.getElementById("chat-history");
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function appendMessage(sender, message) {
        const chatHistory = document.getElementById("chat-history");
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
    
        // Set different CSS classes for user and bot messages
        if (sender === "User") {
            messageElement.classList.add("user-message");
        } else if (sender === "Assistant") {
            messageElement.classList.add("assistant-message");
        }
    
        // Create a button element for text-to-speech
        const ttsButton = document.createElement("button");
        ttsButton.innerText = " 🔊"; // Unicode character for a speaker icon


        ttsButton.addEventListener("click", () => {
            // Call your text-to-speech function here
            performTextToSpeech(message);
        });
    
        // Use strong (bold) tags for the sender's name
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        
        // Append the text-to-speech button to the message element
        messageElement.appendChild(ttsButton);
    
        chatHistory.appendChild(messageElement);
    
        scrollToBottom();
    }
    
    // Function to perform text-to-speech
    function performTextToSpeech(text) {
        // Check if the browser supports the SpeechSynthesis API
        if ('speechSynthesis' in window) {
            const speechSynthesis = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(text);
    
            // Configure speech options (e.g., voice, rate, pitch, etc.)
            // utterance.voice = ...;
            // utterance.rate = ...;
            // utterance.pitch = ...;
    
            // Start the text-to-speech synthesis
            speechSynthesis.speak(utterance);
        } else {
            console.log('Text-to-speech not supported in this browser.');
        }
    }
        
    function sendUserMessage(message) {
        fetch("/chat", {
            method: "POST",
            body: new URLSearchParams({ user_message: message }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        .then((response) => response.json())
        .then((data) => {
            // Handle the server response and display it in the chat history
            const botResponse = data.bot_response;
            appendMessage("Assistant", botResponse); // Display the bot's response
        })
        .catch((error) => {
            console.error("Error sending message:", error);
        });
    }

    // Get references to HTML elements
    const fileInput = document.getElementById("file-input");
    const urlInput = document.getElementById("url-input");
    const addButton = document.getElementById("add-button");
    const itemListSection = document.getElementById("item-list-section");
    const itemList = document.getElementById("item-list");
    const generateButton = document.getElementById("generate-button");

    // Create an array to hold the items
    const items = [];

    addButton.addEventListener("click", function (e) {
        e.preventDefault(); // Prevent form submission
    
        const file = fileInput.files[0]; // Get the selected file
        const url = urlInput.value.trim();
    
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
    
            // Show the progress bar while uploading
            uploadProgress.style.display = "block";
    
            // Send the file to the server using fetch with progress tracking
            fetch("/upload_file", {
                method: "POST",
                body: formData,
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("File upload failed.");
                }
    
                return response.blob(); // Get the response data as a blob
            })
            .then((blob) => {
                // File upload completed, hide the progress bar
                uploadProgress.style.display = "none";
    
                // Continue with processing the uploaded file
                addItemToList(file.name, "file");
                items.push({ type: "file", data: file.name });
                fileInput.value = null; // Clear the file input
                updateGenerateButtonVisibility();
            })
            .catch((error) => {
                console.error("Error uploading file:", error);
                // Handle error and hide the progress bar
                uploadProgress.style.display = "none";
            });
        } else if (url) {
            // Handle URLs
            const youtubeRegex = /^(https:\/\/www\.youtube\.com\/watch\?v=|https:\/\/youtu\.be\/)/;
            const txtPdfRegex = /\.(txt|pdf)$/i;

            if (youtubeRegex.test(url)) {
                // Handle YouTube video URL
                // Send the URL to the server for transcription
                fetch("/transcribe_youtube", {
                    method: "POST",
                    body: JSON.stringify({ url: url }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        // If the transcription is successful, add it to the list
                        addItemToList(data.filename, "youtube");
                        items.push({ type: "youtube", data: data.fileName });
                        urlInput.value = ""; // Clear the URL input
                        updateGenerateButtonVisibility();
                    } else {
                        console.error("YouTube transcription failed.");
                    }
                })
                .catch((error) => {
                    console.error("Error transcribing YouTube video:", error);
                });
            } else if (txtPdfRegex.test(url)) {
                // Handle .txt or .pdf file URL
                // Send the URL to the server for file download
                fetch("/download_file", {
                    method: "POST",
                    body: JSON.stringify({ url: url }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("File download failed.");
                    }
                    return response.blob(); // Get the response data as a blob
                })
                .then((blob) => {
                    // File download completed, save the file locally (similar to the Python code)
                    // You can save the blob data as a file here, either in the browser or send it to the server for saving.
            
                    // Example: Saving the blob data as a file in the browser
                    const fileName = url.substring(url.lastIndexOf("/") + 1); // Extract the filename from the URL
                    const a = document.createElement("a");
                    a.href = window.URL.createObjectURL(blob);
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
            
                    // Continue with processing (adding the filename to the list, etc.)
                    addItemToList(fileName, "url");
                    items.push({ type: "url", data: fileName });
                    urlInput.value = ""; // Clear the URL input
                    updateGenerateButtonVisibility();
                })
                .catch((error) => {
                    console.error("Error downloading file:", error);
                });
            } else {
                // Handle other types of URLs (if needed)
                console.error("Unsupported URL format.");
            }
        }
    });


    // Function to add an item to the list
    function addItemToList(item, itemType) {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        
        // Set the data-type attribute based on the itemType
        listItem.setAttribute("data-type", itemType);

        // Add a button to remove the item from the list
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", function () {
            const index = items.findIndex((x) => x.data === item);
            if (index !== -1) {
                items.splice(index, 1);
            }
            listItem.remove();

            // Hide the "Generate" button and the "Item List" section if the list becomes empty
            generateButton.style.display = items.length > 0 ? "block" : "none";
            itemListSection.style.display = items.length > 0 ? "block" : "none";
        });

        // Append the remove button to the list item
        listItem.appendChild(removeButton);

        // Append the list item to the item list
        itemList.appendChild(listItem);

        // Show the "Generate" button and the "Item List" section if the list has at least one item
        generateButton.style.display = "block";
        itemListSection.style.display = "block";
    }

    // Function to update the visibility of the "Generate" button and "Item List" section
    function updateGenerateButtonVisibility() {
        generateButton.style.display = items.length > 0 ? "block" : "none";
        itemListSection.style.display = items.length > 0 ? "block" : "none";
    }

    // Add an event listener for the "Generate" button
    generateButton.addEventListener("click", function () {
        // Gather the list of items you want to send to the server
        const itemsToSend = [];

        // Iterate through the item list to gather items and their types
        const itemListItems = itemList.getElementsByTagName("li");

        for (const item of itemListItems) {
            const itemText = item.textContent.replace("Remove", "").trim(); // Extract only the item text
            const itemType = item.getAttribute("data-type"); // Get the data-type attribute

            itemsToSend.push({ item: itemText, type: itemType }); // Add both item and type
        }

        // Send the list of items to the server
        fetch("/generate_chromadb", {
            method: "POST",
            body: JSON.stringify({ items: itemsToSend }),
            headers: {
                "Content-Type": "application/json",
            },
        })
        .then((response) => response.json())
        .then((data) => {
            // Handle the server response (e.g., display a success message)
            if (data.success) {
                console.log("ChromaDB generation completed.");
            } else {
                console.error("ChromaDB generation failed.");
            }
        })
        .catch((error) => {
            console.error("Error generating ChromaDB:", error);
        });
    });

    const uploadProgress = document.getElementById("upload-progress");
    const progressBar = uploadProgress.querySelector(".progress-bar");





});

// Add a click event listener for the "Logout" link
document.getElementById("logout-link").addEventListener("click", function (event) {
    event.preventDefault(); // Prevent the default link behavior

    // Send a request to the server to log the user out
    fetch("/logout", {
        method: "GET",
    })
    .then((response) => {
        if (response.status === 200) {
            // Redirect to the login page or any other desired location
            window.location.href = "/login";
        } else {
            // Handle logout error, if needed
            console.error("Logout failed");
        }
    })
    .catch((error) => {
        // Handle any network or fetch errors
        console.error("Logout error:", error);
    });
});

// Add an event listener for the "CHAT" menu item
document.getElementById("chat-menu").addEventListener("click", function () {
    const chatSection = document.getElementById("chat-section");
    if (chatSection.style.display === "none" || chatSection.style.display === "") {
        chatSection.style.display = "block"; // Show the section
    } else {
        chatSection.style.display = "none"; // Hide the section
    }
});
