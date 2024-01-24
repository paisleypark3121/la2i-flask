// JavaScript code to handle chat interactions
document.addEventListener("DOMContentLoaded", function () {
    
    // Add event listener for clearing chat history
    function clearHistory() {
        const chatHistory = document.getElementById("chat-history");
        chatHistory.innerHTML = ""; 

        const itemList = document.getElementById("item-list");
        itemList.innerHTML = "";

        // Update the visibility of the "generate" section based on the items array
        const generateButton = document.getElementById("generate-button");
        const itemListSection = document.getElementById("item-list-section");
        generateButton.style.display = "none";
        itemListSection.style.display = "none";

        // Disable buttons when chat history is empty
        clearHistoryButton.disabled = true;
        saveHistoryButton.disabled = true;

        const hintElement = document.createElement("div");
        hintElement.id = "hint-text";
        hintElement.className = "hint-text";
        hintElement.textContent = "Chat history appears here";
        chatHistory.appendChild(hintElement);

        // const contentLoadedMessage = document.getElementById("content-loaded-message");
        // contentLoadedMessage.style.display = "none";
        const contentLoadedContainer = document.getElementById("content-loaded-container");
        contentLoadedContainer.style.display = "none";
    }

    const clearHistoryButton = document.getElementById("clear-history-button");
    
    clearHistoryButton.addEventListener("click", () => {
        const confirmed = window.confirm("Are you sure you want to clear the history?");
        if (confirmed) {
            fetch("/clear_history", {
                method: "POST",
            })
            .then((response) => response.json())
            .then((data) => {
                // Handle the response if needed
                clearHistory();
            });
        }
    });

    // Add event listener for saving chat history as PDF
    const saveHistoryButton = document.getElementById("save-history-button");
    saveHistoryButton.addEventListener("click", () => {
        saveChatHistoryAsPDF();
    });
    
    async function saveChatHistoryAsPDF() {
        window.jsPDF = window.jspdf.jsPDF;

        start_y=20
        num_lines=0
        max_lines_per_page=32
        
        var doc = new jsPDF({
            orientation: 'p', 
            unit: 'mm', 
            format: 'a4',
            compress: 'true'
            //format: [canvas.width, canvas.height] // set needed dimensions for any element
        });

        line_height=doc.internal.getLineHeight() * 0.3527777778
        
        function addEmptyLine(doc) {
            doc.text('', currentX, currentY);
            currentY += doc.getTextDimensions('M').h; // Use 'M' as a placeholder for line height
            currentRow++;
        }

        function addText(doc, s) {
            var splitTitle = doc.splitTextToSize(s, 180);
            splitTitle=splitTitle.filter(sentence => sentence.trim() !== '');

            temp_num_lines=num_lines+splitTitle.length+1
            if (temp_num_lines>max_lines_per_page) {
                dim1 = temp_num_lines - max_lines_per_page
            
                var array1 = splitTitle.slice(0, dim1);
                var array2 = splitTitle.slice(dim1);
                console.log("ARRAY1")
                console.log(array1)
                console.log("ARRAY2")
                console.log(array2)

                doc.text(10, start_y, array1);
                doc.addPage();    
                start_y=20
                num_lines=0
                doc.text(10, start_y, array2);
                //start_y=start_y+10*array2.length
                start_y=start_y+line_height*(array2.length+1)
                num_lines=num_lines+array2.length+1

            } else {

                doc.text(10, start_y, splitTitle);
                //doc.text(10, 20, s, { maxWidth: 180 });

                //start_y=start_y+10*splitTitle.length
                start_y=start_y+line_height*(splitTitle.length+1)
            
                num_lines=num_lines+splitTitle.length+1
            }
        }
    
        function addImage(doc, imageData) {
            // Check if adding this image would exceed the page height
            doc.addPage();
            //doc.addImage(imageData, 'PNG', 10, 20, 200, 0,'','FAST');
            doc.addImage(imageData, 'PNG', 0, 20, 200, 0,'','FAST');
            doc.addPage();
            start_y=20
            num_lines=0
        }
          

        try {
            const options = {
                suggestedName: "chat_history.pdf",
                types: [
                    {
                        description: "PDF Files",
                        accept: {
                            "application/pdf": [".pdf"],
                        },
                    },
                ],
            };

            const fileHandle = await window.showSaveFilePicker(options);
            const writableStream = await fileHandle.createWritable();

            const chatHistory = document.getElementById("chat-history");

            // Iterate through chat history elements
            for (const element of chatHistory.children) {
                if (element.classList.contains("user-message") || element.classList.contains("assistant-message")) {
                    textContent = element.textContent.trim();
                    addText(doc, textContent);
                } else if (element.classList.contains("mindmap-image")) {
                    imageData = await getImageDataFromBase64(element.src);
                    addImage(doc, imageData);
                }
            }
            
            // Convert PDF to blob
            const pdfBlob = await doc.output("blob");

            // Write the blob to the selected file
            await writableStream.write(pdfBlob);
            await writableStream.close();

            // Display a success message
            alert("Chat history saved as PDF successfully!");
        } catch (error) {
            console.error("Error saving PDF:", error);
        }
    };

    // // Helper function to convert base64 image data to Uint8Array
    function getImageDataFromBase64(base64Data) {
        const dataURI = base64Data.split(",")[1]; // Remove data URI prefix
        const binaryString = atob(dataURI);
        const length = binaryString.length;
        const uintArray = new Uint8Array(length);

        for (let i = 0; i < length; i++) {
            uintArray[i] = binaryString.charCodeAt(i);
        }

        return uintArray;
    }

    // Listen for the Bootstrap navbar collapse event
    const navbar = document.getElementById("navbarNav");
    const settingSection = document.getElementById("setting-section");
    const chatSection = document.getElementById("chat-section");
    navbar.addEventListener("hidden.bs.collapse", function () {
        if (chatSection.style.display !== "none") {
            chatSection.style.display = "none";
        }
        if (settingSection.style.display !== "none") {
            settingSection.style.display = "none";
        }
    });

    const userMessageInput = document.getElementById("user-message");
    userMessageInput.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault(); // Prevent the default behavior (newline in textarea)
            chatForm.dispatchEvent(new Event("submit")); // Dispatch a submit event on the form
        }
    });

    const chatForm = document.getElementById("chat-form");
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

    function enableButtonsIfNotEmpty() {
        const chatHistory = document.getElementById("chat-history");
        const hintElement = document.getElementById("hint-text");
        //console.log(chatHistory.childElementCount)
        // Check if chat history is empty (excluding the hint text)
        if (chatHistory.childElementCount === 1 && chatHistory.firstElementChild === hintElement) {
            //console.log("equals")
            clearHistoryButton.disabled = true;
            saveHistoryButton.disabled = true;
        } else {
            //console.log("not equals")
            clearHistoryButton.disabled = false;
            saveHistoryButton.disabled = false;
        }
    }

    enableButtonsIfNotEmpty()

    function appendMessage(sender, message) {
        const chatHistory = document.getElementById("chat-history");
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
    
        // Create a button element for text-to-speech
        const ttsButton = document.createElement("button");
        ttsButton.className = "btn btn-primary text-to-speech-button";
        const svgHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="50" fill="currentColor" class="bi bi-speaker" viewBox="0 0 16 48">
                <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                <path d="M8 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-3.5 1.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
            </svg>
        `;
        ttsButton.innerHTML = svgHTML;

        const mmButton = document.createElement("button");
        mmButton.className = "btn btn-primary mindmap-button";
        const svg_mm_HTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="50" fill="currentColor" class="bi bi-share-fill" viewBox="0 0 16 48">
            <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5"/>
          </svg>
        `;
        mmButton.innerHTML = svg_mm_HTML;

        mmButton.addEventListener("click", async () => {

            const parentDiv = mmButton.closest(".assistant-message");

            // Get the textual content from the parent div
            const messageContent = parentDiv.textContent.trim();

            // Show the loading modal
            const loadingModal = new bootstrap.Modal(document.getElementById("loading-modal"), { backdrop: "static", keyboard: false });
            loadingModal.show();
        
            try {
                // Make a fetch request to your mind map image endpoint
                const response = await fetch("/mindmap_with_content", {
                    method: "POST", // Assuming you want to send the message content as a POST request
                    headers: {
                        "Content-Type": "application/json", // Set the appropriate content type
                    },
                    body: JSON.stringify({ message: messageContent }), // Send the message content as JSON data
                });
        
                if (response.ok) {
                    const data = await response.json();
                    const encodedImage = data.image_content;
        
                    // Create a new image element
                    const mindmapImage = document.createElement("img");
                    mindmapImage.classList.add("mindmap-image");
                    mindmapImage.src = "data:image/png;base64," + encodedImage;
                    mindmapImage.alt = "Mind Map Image";
        
                    // Append the image element to the chat-history div
                    const chatHistoryDiv = document.getElementById("chat-history");
                    chatHistoryDiv.appendChild(mindmapImage);

                } else {
                    // Handle error
                    console.error("Error fetching mind map image");
                }
            } catch (error) {
                console.error("An error occurred:", error);
            } finally {
                // Hide the loading modal after the response is received or an error occurs
                loadingModal.hide();
            }
        });

        // mmButton.addEventListener("click", async () => {
        //     // Show the loading modal
        //     const loadingModal = new bootstrap.Modal(document.getElementById("loading-modal"), { backdrop: "static", keyboard: false });
        //     loadingModal.show();
        
        //     try {
        //         // Make a fetch request to your mind map image endpoint
        //         const response = await fetch("/mindmap", {
        //             method: "GET",
        //         });
        
        //         if (response.ok) {
        //             const data = await response.json();
        //             const encodedImage = data.image_content;
        
        //             // Create a new image element
        //             const mindmapImage = document.createElement("img");
        //             mindmapImage.classList.add("mindmap-image");
        //             mindmapImage.src = "data:image/png;base64," + encodedImage;
        //             mindmapImage.alt = "Mind Map Image";
        
        //             // Append the image element to the chat-history div
        //             const chatHistoryDiv = document.getElementById("chat-history");
        //             chatHistoryDiv.appendChild(mindmapImage);

        //         } else {
        //             // Handle error
        //             console.error("Error fetching mind map image");
        //         }
        //     } catch (error) {
        //         console.error("An error occurred:", error);
        //     } finally {
        //         // Hide the loading modal after the response is received or an error occurs
        //         loadingModal.hide();
        //     }
        // });
        
        ttsButton.addEventListener("click", () => {
            // Call your text-to-speech function here
            performTextToSpeech(message);
        });
    
        ttsButton.style.marginLeft = "10px";
    
        // Set different CSS classes for user and bot messages
        if (sender === "User") {
            messageElement.classList.add("user-message");
            messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        } else if (sender === "Assistant") {
            messageElement.classList.add("assistant-message");
            messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
            messageElement.appendChild(ttsButton);
            messageElement.appendChild(mmButton);
            
        } else {
            messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        }
    
        chatHistory.appendChild(messageElement);
    
        if (chatHistory.children.length > 0) {
            const hintText = document.getElementById('hint-text');
            if (hintText) {
                hintText.remove();
            }
        }

        enableButtonsIfNotEmpty();
    
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

    const stickyButton = document.getElementById("sticky-button");
    stickyButton.addEventListener("click", async () => {        
            
        // Show the loading modal
        const loadingModal = new bootstrap.Modal(document.getElementById("loading-modal"), { backdrop: "static", keyboard: false });
        loadingModal.show();

        await fetch("/get_summary", {
            method: "GET",
        })
        .then((response) => response.json())
        .then((data) => {
            // Handle the server response and display it in the chat history
            const botResponse = data.bot_response;
            appendMessage("Assistant", botResponse); // Display the bot's response
        })
        .catch((error) => {
            console.error("Error sending message:", error);
        })
        .finally(()=> {
            loadingModal.hide();
        });
    });

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
        e.preventDefault();
    
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
        removeButton.classList.add("btn", "btn-danger"); 
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

        // Show the loading modal
        const loadingModal = new bootstrap.Modal(document.getElementById("loading-modal"), { backdrop: "static", keyboard: false });
        loadingModal.show();
        
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
                // Make the content-loaded message div visible
                // const contentLoadedMessage = document.getElementById("content-loaded-message");
                // contentLoadedMessage.style.display = "block";
                const contentLoadedContainer = document.getElementById("content-loaded-container");
                contentLoadedContainer.style.display = "block";
            } else {
                console.error("ChromaDB generation failed.");
            }
        })
        .catch((error) => {
            console.error("Error generating ChromaDB:", error);
        })
        .finally(()=> {
            loadingModal.hide();
        });
    });

    const uploadProgress = document.getElementById("upload-progress");
    const progressBar = uploadProgress.querySelector(".progress-bar");

    // Initialize SpeechRecognition API
    const recognition = new webkitSpeechRecognition();
    // Initialize a variable to track the state of speech recognition
    let isRecognitionActive = false;

    // Add an event listener for the microphone button
    document.getElementById("mic-button").addEventListener("click", function () {
        if (isRecognitionActive) {
            // If recognition is active, stop it
            recognition.stop();
            isRecognitionActive = false;
            // Change the button text and style to indicate that it's not listening
            document.getElementById("mic-button").textContent = "Start Microphone";
            document.getElementById("mic-button").classList.remove("btn-danger");
            document.getElementById("mic-button").classList.add("btn-secondary");
        } else {
            // If recognition is not active, start it
            recognition.start();
            isRecognitionActive = true;
            // Change the button text and style to indicate that it's listening
            document.getElementById("mic-button").textContent = "Stop Microphone";
            document.getElementById("mic-button").classList.remove("btn-secondary");
            document.getElementById("mic-button").classList.add("btn-danger");
        }
    });
    
    // Handle speech recognition results
    recognition.onresult = function (event) {
        const result = event.results[event.results.length - 1][0].transcript;
        document.getElementById("user-message").value += result + " ";
    };

    // Handle errors
    recognition.onerror = function (event) {
        console.error("Speech recognition error: " + event.error);
    };

    // Handle end of recognition (when user stops speaking)
    recognition.addEventListener("end", () => {
        isRecognitionActive = false;
        // Change the button text and style to indicate that it's not listening
        document.getElementById("mic-button").textContent = "Start Microphone";
        document.getElementById("mic-button").classList.remove("btn-danger");
        document.getElementById("mic-button").classList.add("btn-secondary");
    });

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

// Add an event listener for the "CHAT" menu item
document.getElementById("settings-menu").addEventListener("click", function () {
    const settingSection = document.getElementById("setting-section");
    if (settingSection.style.display === "none" || settingSection.style.display === "") {
        settingSection.style.display = "block"; // Show the section
    } else {
        settingSection.style.display = "none"; // Hide the section
    }
});

// Ottieni l'elemento select
var chatOptionsSelect = document.getElementById("chat-options");

// Aggiungi un evento di cambio all'elemento select
chatOptionsSelect.addEventListener("change", function() {
    //console.log("CHANGE")
    // Ottieni il valore dell'opzione selezionata
    var selectedValue = chatOptionsSelect.value;

    // Configura l'oggetto di opzioni per la richiesta Fetch
    var requestOptions = {
        method: "POST",
        body: JSON.stringify({ option: selectedValue }),
        headers: {
            "Content-Type": "application/json"
        }
    };

    // Esegui la richiesta Fetch
    fetch("/update_option", requestOptions)
    .then(function(response) {
        if (!response.ok) {
            throw new Error("Errore nella richiesta.");
        }
        return response.text();
    })
    .then(function(data) {
        // Gestisci la risposta dal server (puoi fare qualcosa qui, se necessario)
        console.log(data);

        // Find the <a> element by its id
        var navbarLabel = document.getElementById("navbar-label");

        // Update the label based on the server response
        if (data === 'gpt-3.5-turbo-0613') {
            navbarLabel.textContent = "LA2I";
            navbarLabel.style.color = "black";
        } else {
            navbarLabel.textContent = "LA2I*";
            navbarLabel.style.color = "red";
        }
    })
    .catch(function(error) {
        // Gestisci eventuali errori qui
        console.error(error);
    });
});


// Ottieni l'elemento select
var settingOptionsSelect = document.getElementById("setting-options");

// Aggiungi un evento di cambio all'elemento select
settingOptionsSelect.addEventListener("change", function() {
    //console.log("CHANGE")
    // Ottieni il valore dell'opzione selezionata
    var selectedValue = settingOptionsSelect.value;

    // Configura l'oggetto di opzioni per la richiesta Fetch
    var requestOptions = {
        method: "POST",
        body: JSON.stringify({ option: selectedValue }),
        headers: {
            "Content-Type": "application/json"
        }
    };

    // Esegui la richiesta Fetch
    fetch("/update_language", requestOptions)
    .then(function(response) {
        if (!response.ok) {
            throw new Error("Errore nella richiesta.");
        }
        return response.text();
    })
    .then(function(data) {
        // Gestisci la risposta dal server (puoi fare qualcosa qui, se necessario)
        console.log(data);
    })
    .catch(function(error) {
        // Gestisci eventuali errori qui
        console.error(error);
    });
});