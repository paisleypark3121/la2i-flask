let voices=[]
let selectedVoice = null;
const recognition = new webkitSpeechRecognition();

document.addEventListener("DOMContentLoaded", function () {

    // language management
    var settingOptionsSelect = document.getElementById("setting-options");
    selectVoiceByLanguage(settingOptionsSelect.value);
    set_labels(settingOptionsSelect.value)

    var chatOptionsSelect = document.getElementById("chat-options");
    var selectedValue = chatOptionsSelect.value;
    if (selectedValue === 'dsa') {
        document.body.classList.add('dyslexic');
    } else {
        document.body.classList.remove('dyslexic');
    }

    selectedLanguage="en-US"
    if (settingOptionsSelect.value=="italian")
        selectedLanguage="it-IT"            
    recognition.lang=selectedLanguage;

    //#region tippy
    tippy('#clear-history-button', {
        content: settingOptionsSelect.value === 'italian' ? 'cancella tutta la conversazione ed il contesto' : 'clear all conversation and context',
        delay: [2000, 0]
    });

    tippy('#save-history-button', {
        content: settingOptionsSelect.value === 'italian' ? 'salva tutta la conversazione' : 'save all conversation',
        delay: [2000, 0]
    });

    tippy('#mic-button', {
        content: settingOptionsSelect.value === 'italian' ? 'parla' : 'speech to text',
        //content: 'speech to text',        
        delay: [2000, 0]
    });

    tippy('#send-button', {
        content: settingOptionsSelect.value === 'italian' ? 'invia messaggio' : 'send message',
        delay: [2000, 0]
    });

    tippy('#add-button', {
        content: settingOptionsSelect.value === 'italian' ? 'aggiungi file / url alla libreria':'add file / url to the context library',
        delay: [2000, 0]
    });

    tippy('#generate-button', {
        content: settingOptionsSelect.value === 'italian' ? 'genera il vector database per il contesto':'generate vector database for the context',
        delay: [2000, 0]
    });
    //#endregion

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

    const textarea = document.getElementById('user-message');
    const navbarCollapse = document.getElementById('navbarNav');
    const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
        toggle: false 
    });

    textarea.addEventListener('focus', function() {
        bsCollapse.hide();

        const chatSection = document.getElementById("chat-section");
        chatSection.style.display = "none";
        const settingSection = document.getElementById("setting-section");
        settingSection.style.display = "none";
    });

    const userMessageInput = document.getElementById("user-message");
    userMessageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            if (e.shiftKey || e.metaKey) {
                // CTRL+ENTER (or Command+ENTER on Mac) should perform a carriage return
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                const before = value.substring(0, start);
                const after = value.substring(end, value.length);
                textarea.value = before + "\n" + after;
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            } else {
                // ENTER without CTRL should submit the form
                e.preventDefault(); // Prevent the default behavior (newline in textarea)
                chatForm.dispatchEvent(new Event("submit")); // Dispatch a submit event on the form
            }
        }
    });
    
    const chatForm = document.getElementById("chat-form");
    chatForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const userMessage = userMessageInput.value;
        if (userMessage.trim() === "") {
            return; // Skip empty messages
        }

        // Display user's message in chat history
        appendMessage("User", userMessage);
    
        sendUserMessage(userMessage);

        userMessageInput.value = "";
    });

    enableButtonsIfNotEmpty()
    
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

    // #region adding element
    const fileInput = document.getElementById("file-input");
    const urlInput = document.getElementById("url-input");
    const generateButton = document.getElementById("generate-button");
    const items = [];
    const addButton = document.getElementById("add-button");
    addButton.addEventListener("click", function (e) {
        e.preventDefault();
    
        const file = fileInput.files[0];
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
    //#endregion

    const itemListSection = document.getElementById("item-list-section");
    const itemList = document.getElementById("item-list");
    function addItemToList(item, itemType) {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        
        // Set the data-type attribute based on the itemType
        listItem.setAttribute("data-type", itemType);

        // Add a button to remove the item from the list
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.classList.add("btn", "btn-outline-dark", "remove-item-from-list"); 
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

    let isRecognitionActive = false;
    document.getElementById("mic-button").addEventListener("click", function () {
        if (isRecognitionActive) {
            recognition.stop();
            isRecognitionActive = false;

            text_mic="Start Microphone"
            if (settingOptionsSelect.value=="italian")
                text_mic="Avvia il microfono"
            document.getElementById("mic-button").textContent = text_mic;
            document.getElementById("mic-button").classList.remove("btn-outline-dark");
            document.getElementById("mic-button").classList.add("btn-outline-secondary");
        } else {
            recognition.start();
            isRecognitionActive = true;
            
            text_mic="Stop Microphone"
            if (settingOptionsSelect.value=="italian")
                text_mic="Ferma il microfono"
            document.getElementById("mic-button").textContent = text_mic;
            document.getElementById("mic-button").classList.remove("btn-outline-secondary");
            document.getElementById("mic-button").classList.add("btn-outline-dark");
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
        text_mic="Start Microphone"
        if (settingOptionsSelect.value=="italian")
            text_mic="Avvia il microfono"
        document.getElementById("mic-button").textContent = text_mic;

        document.getElementById("mic-button").textContent = text_mic;
        document.getElementById("mic-button").classList.remove("btn-outline-dark");
        document.getElementById("mic-button").classList.add("btn-outline-secondary");
    });

});
//#endregion

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

document.getElementById("chat-menu").addEventListener("click", function () {
    const chatSection = document.getElementById("chat-section");
    if (chatSection.style.display === "none" || chatSection.style.display === "") {
        chatSection.style.display = "block"; // Show the section
    } else {
        chatSection.style.display = "none"; // Hide the section
    }
});

document.getElementById("settings-menu").addEventListener("click", function () {
    const settingSection = document.getElementById("setting-section");
    if (settingSection.style.display === "none" || settingSection.style.display === "") {
        settingSection.style.display = "block"; // Show the section
    } else {
        settingSection.style.display = "none"; // Hide the section
    }
});

var chatOptionsSelect = document.getElementById("chat-options");
chatOptionsSelect.addEventListener("change", function() {
    var selectedValue = chatOptionsSelect.value;

    if (selectedValue === 'dsa') {
        document.body.classList.add('dyslexic');
    } else {
        document.body.classList.remove('dyslexic');
    }

    var requestOptions = {
        method: "POST",
        body: JSON.stringify({ option: selectedValue }),
        headers: {
            "Content-Type": "application/json"
        }
    };

    fetch("/update_option", requestOptions)
    .then(function(response) {
        if (!response.ok) {
            throw new Error("Errore nella richiesta.");
        }
        return response.text();
    })
    .then(function(data) {
        console.log(data);
        
        // var span_la = document.getElementById("span_la");

        // if (data === 'gpt-3.5-turbo-0613') {
        //     span_la.textContent = "LA2I";
        //     span_la.style.color = "black";
        // } else {
        //     span_la.textContent = "LA2I*";
        //     span_la.style.color = "red";
        // }
    })
    .catch(function(error) {
        console.error(error);
    });
});

var settingOptionsSelect = document.getElementById("setting-options");
settingOptionsSelect.addEventListener("change", function() {
    var selectedValue = settingOptionsSelect.value;

    var requestOptions = {
        method: "POST",
        body: JSON.stringify({ option: selectedValue }),
        headers: {
            "Content-Type": "application/json"
        }
    };

    fetch("/update_language", requestOptions)
    .then(function(response) {
        if (!response.ok) {
            throw new Error("Errore nella richiesta.");
        }
        return response.text();
    })
    .then(function(data) {
        selectedLanguage = selectedValue;
        selectVoiceByLanguage(selectedValue);
        set_labels(selectedLanguage)
        console.log("update language: "+data);

        selectedLanguage="en-US"
        if (settingOptionsSelect.value=="italian")
            selectedLanguage="it-IT"            
        recognition.lang=selectedLanguage;
        console.log("update recognition: "+selectedLanguage);
    })
    .catch(function(error) {
        // Gestisci eventuali errori qui
        console.error(error);
    });
});

function set_labels(language) {
    const sendButton = document.getElementById('send-button');
    sendButton.textContent = 'Send';
    if (language=="italian")
        sendButton.textContent = 'Invia';
    const saveButton = document.getElementById('save-history-button')
    saveButton.textContent = 'Save';
    if (language=="italian")
        saveButton.textContent = 'Salva';
    const clearButton = document.getElementById('clear-history-button')
    clearButton.textContent = 'Clear';
    if (language=="italian")
        clearButton.textContent = 'Pulisci';
    const label_language_setting = document.getElementById('language-setting-options')
    label_language_setting.textContent = 'Language';
    if (language=="italian")
        label_language_setting.textContent = 'Lingua';
    const label_toggle_physics = document.getElementById('label-toggle-physics')
    label_toggle_physics.textContent = 'Toggle Physics';
    if (language=="italian")
        label_toggle_physics.textContent = 'Attivazione Fisica';
    const add_files_or_url = document.getElementById('add_files_or_url')
    add_files_or_url.textContent = 'Add files or URLs';
    if (language=="italian")
        add_files_or_url.textContent = 'Aggingi File o URLs';
    const addButton = document.getElementById('add-button');
    addButton.textContent = 'Add';
    if (language=="italian")
        addButton.textContent = 'Aggiungi';
    const heading_item_list = document.getElementById('heading_item_list');
    heading_item_list.textContent = 'Item List';
    if (language=="italian")
        heading_item_list.textContent = 'Libreria';
    const generateButton = document.getElementById('generate-button');
    generateButton.textContent = 'Generate';
    if (language=="italian")
        generateButton.textContent = 'Genera';
    const label_file_input = document.getElementById('label_file_input')
    label_file_input.textContent = 'Choose a .txt or .pdf file';
    if (language=="italian")
        label_file_input.textContent = 'Scegli un file .txt o .pdf';
    const label_url_input = document.getElementById('label_url_input')
    label_url_input.textContent = 'Type the URL';
    if (language=="italian")
        label_url_input.textContent = 'Digita la URL';
    const remove_item_from_list = document.getElementsByClassName('remove-item-from-list')
    remove_item_from_list.textContent = 'Remove';
    if (language=="italian")
        remove_item_from_list.textContent = 'Elimina';
    const content_loaded_message = document.getElementsByClassName('content-loaded-message')
    content_loaded_message.textContent = 'Context Based';
    if (language=="italian")
        content_loaded_message.textContent = 'Contesto Caricato';
    const user_message_placeholer = document.getElementById('user-message')
    user_message_placeholer.placeholder = 'Type your message...';
    if (language=="italian")
        user_message_placeholer.placeholder = 'Digita il tuo messaggio...';
    const hint_text = document.getElementById('hint-text')
    hint_text.textContent="Chat history appears here"
    if (language=="italian")
        hint_text.textContent="Lo storico dei messaggi apparirà qui"
}

const togglePhysicsCheckbox = document.getElementById('toggle-physics');
togglePhysicsCheckbox.addEventListener('change', function () {
    // Determine whether the checkbox is checked (physics enabled) or unchecked (physics disabled)
    const physicsEnabled = togglePhysicsCheckbox.checked;

    // Create a request payload with the physics status
    const requestBody = JSON.stringify({ physics: physicsEnabled });

    // Configure the fetch request
    const requestOptions = {
        method: 'POST',
        body: requestBody,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Perform the fetch request to update the physics status
    fetch('/update_physics', requestOptions)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Errore nella richiesta.');
            }
            return response.text();
        })
        .then(function (data) {
            // Handle the response from the server (you can do something here if needed)
            console.log(data);
        })
        .catch(function (error) {
            // Handle any errors here
            console.error(error);
        });
});

// #region save history
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

    // Set font size to 14
    doc.setFontSize(14);
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
        doc.addPage();
        //doc.addImage(imageData, 'PNG', 10, 20, 200, 0,'','FAST');
        doc.addImage(imageData, 'PNG', 0, 20, 200, 0,'','FAST');
        doc.addPage();
        start_y=20
        num_lines=0
    }
        
    async function generateHTMLIframe(name, iframeCounter, iframeContent) {
        const iframeFileName = `${name}_${iframeCounter}.html`;
        const iframeBlob = new Blob([iframeContent], { type: 'text/html' });
        const iframeWritableStream = await window.showSaveFilePicker({ suggestedName: iframeFileName });
        const iframeStream = await iframeWritableStream.createWritable();
        await iframeStream.write(iframeBlob);
        await iframeStream.close();      
        //alert("Map for "+iframeFileName+" saved as PDF successfully!");      
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

        let iframeCounter=1
        // Iterate through chat history elements
        for (const element of chatHistory.children) {
            if (element.classList.contains("user-message") || element.classList.contains("assistant-message")) {
                textContent = element.textContent.trim();
                addText(doc, textContent);
            } else if (element.classList.contains("mindmap-image")) {
                imageData = getImageDataFromBase64(element.src);
                addImage(doc, imageData);
            } else if (element.classList.contains("json_network")) {
                // const json_data = element.textContent.trim();
                // const xhr = new XMLHttpRequest();
                // xhr.open('POST', '/mindmap_json_to_image', false); // The 'false' argument makes the request synchronous
                // xhr.setRequestHeader('Content-Type', 'application/json');
                
                // try {
                //     xhr.send(JSON.stringify({ json_data: json_data }));

                //     if (xhr.status === 200) {
                //         const data = JSON.parse(xhr.responseText);
                //         const image_content = atob(data.image_content);
                //         const uint8Array = new Uint8Array(image_content.length);
                //         for (let i = 0; i < image_content.length; i++) {
                //             uint8Array[i] = image_content.charCodeAt(i);
                //         }
                
                //         addImage(doc, uint8Array);
                //     } else {
                //         throw new Error('Network response was not ok');
                //     }
                // } catch (error) {
                //     console.error('Error generating network image:', error);
                // }
            } else if (element.tagName === "IFRAME") {
                const iframeContent = element.getAttribute('srcdoc');
                generateHTMLIframe(fileHandle.name,iframeCounter,iframeContent)
                iframeCounter++;
            }
        }
        
        // Convert PDF to blob
        const pdfBlob = await doc.output("blob");

        // Write the blob to the selected file
        await writableStream.write(pdfBlob);
        await writableStream.close();

        // Display a success message
        text_message="Chat history saved as PDF successfully!"
        var settingOptionsSelect = document.getElementById("setting-options");
        if (settingOptionsSelect.value=="italian")
            text_message="Conversazione salvata con successo"
        alert(text_message);
    } catch (error) {
        console.error("Error saving PDF:", error);
    }
};
//#endregion

// #region clear history
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
    var settingOptionsSelect = document.getElementById("setting-options");
    if (settingOptionsSelect.value=="italian")
        hintElement.textContent="Lo storico dei messaggi apparirà qui"
    chatHistory.appendChild(hintElement);    

    // const contentLoadedMessage = document.getElementById("content-loaded-message");
    // contentLoadedMessage.style.display = "none";
    const contentLoadedContainer = document.getElementById("content-loaded-container");
    contentLoadedContainer.style.display = "none";
}

const clearHistoryButton = document.getElementById("clear-history-button");
clearHistoryButton.addEventListener("click", () => {
    var settingOptionsSelect = document.getElementById("setting-options");
    confirm_message="Are you sure you want to clear the history?"
    if (settingOptionsSelect.value=="italian")
        confirm_message="Sei sicuro di voler cancellare tutti i messaggi?"
    const confirmed = window.confirm(confirm_message);
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
//#endregion

// #region SPEECH
function setVoices() {
    return new Promise((resolve, reject) => {
        const synth = window.speechSynthesis;
        let id;
        id = setInterval(() => {
            if (synth.getVoices().length !== 0) {
                clearInterval(id);
                voices=synth.getVoices()
                resolve(voices);
            }
        }, 10);
    });
}

function selectVoiceByLanguage(language) {
    setVoices().then(() => {
        language_voice_name="Microsoft Libby Online (Natural) - English (United Kingdom)"
        if (language=="italian")
            language_voice_name="Microsoft Isabella Online (Natural) - Italian (Italy)"

        // Loop through available voices to find the desired voice based on the language
        for (let i = 0; i < voices.length; i++) {
            if (voices[i].name === language_voice_name) { // Match voice based on language
                selectedVoice = voices[i];
                break;
            }
        }

        if (selectedVoice) {
            // test="Hello, this is a test"
            // if (language=="italian")
            //     test="Ciao, questo è un test"
            // performTextToSpeech(test);
        } else {
            console.log("Voice for the selected language not found.");
        }
    });
}

function performTextToSpeech(text) {
    const synth = window.speechSynthesis;
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice;
        synth.speak(utterance);
    } else {
        console.log('Text-to-speech not supported in this browser.');
    }
}
// #endregion

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

function scrollToBottom() {
    const chatHistory = document.getElementById("chat-history");
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendMessage(sender, message) {
    const chatHistory = document.getElementById("chat-history");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    // Create a button element for text-to-speech
    const ttsButton = document.createElement("button");
    ttsButton.className = "btn btn-outline-dark text-to-speech-button";
    const svgHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="50" fill="currentColor" class="bi bi-speaker" viewBox="0 0 16 48">
            <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
            <path d="M8 4.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-3.5 1.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
        </svg>
    `;
    ttsButton.innerHTML = svgHTML;

    const mmButton = document.createElement("button");
    mmButton.className = "btn btn-outline-dark mindmap-button";
    const svg_mm_HTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="50" fill="currentColor" class="bi bi-diagram-2-fill" viewBox="0 0 16 48">
        <path fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H11a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 5 7h2.5V6A1.5 1.5 0 0 1 6 4.5zm-3 8A1.5 1.5 0 0 1 4.5 10h1A1.5 1.5 0 0 1 7 11.5v1A1.5 1.5 0 0 1 5.5 14h-1A1.5 1.5 0 0 1 3 12.5zm6 0a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 9 12.5z"/>
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

            const response = await fetch("/mindmap_enhanced", {
                method: "POST", // Assuming you want to send the message content as a POST request
                headers: {
                    "Content-Type": "application/json", // Set the appropriate content type
                },
                body: JSON.stringify({ message: messageContent, type: "small" }), // Send the message content as JSON data
            });

            if (response.ok) {
                const data = await response.json();
                const htmlContent = data.html;
                const json_string = data.json_string

                const iframe = document.createElement("iframe");

                iframe.style.width = "100%";
                iframe.srcdoc = htmlContent;

                // Add an event listener to adjust the iframe's height after it loads
                iframe.addEventListener("load", function() {
                    this.style.height = this.contentWindow.document.body.scrollHeight + "px";
                });

                const chatHistoryDiv = document.getElementById("chat-history");
                chatHistoryDiv.appendChild(iframe);

                const jsonElement = document.createElement("div");
                jsonElement.style.display = "none";
                jsonElement.textContent = json_string;
                jsonElement.classList.add("json_network");

                // Append the hidden element to chatHistory
                chatHistoryDiv.appendChild(jsonElement);

            } else {
                console.error("Error fetching mind map image");
            }

            // // Make a fetch request to your mind map image endpoint
            // const response = await fetch("/mindmap_with_content", {
            //     method: "POST", // Assuming you want to send the message content as a POST request
            //     headers: {
            //         "Content-Type": "application/json", // Set the appropriate content type
            //     },
            //     body: JSON.stringify({ message: messageContent, type: "small" }), // Send the message content as JSON data
            // });
    
            // if (response.ok) {
            //     const data = await response.json();
            //     const encodedImage = data.image_content;
    
            //     // Create a new image element
            //     const mindmapImage = document.createElement("img");
            //     mindmapImage.classList.add("mindmap-image");
            //     mindmapImage.src = "data:image/png;base64," + encodedImage;
            //     mindmapImage.alt = "Mind Map Image";
    
            //     // Append the image element to the chat-history div
            //     const chatHistoryDiv = document.getElementById("chat-history");
            //     chatHistoryDiv.appendChild(mindmapImage);

            // } else {
            //     // Handle error
            //     console.error("Error fetching mind map image");
            // }
        } catch (error) {
            console.error("An error occurred:", error);
        } finally {
            // Hide the loading modal after the response is received or an error occurs
            loadingModal.hide();
        }
    });

    const mm2Button = document.createElement("button");
    mm2Button.className = "btn btn-outline-dark mindmap2-button";
    const svg_mm2_HTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="50" fill="currentColor" class="bi bi-diagram-3-fill" viewBox="0 0 16 48">
        <path fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 2 7h5.5V6A1.5 1.5 0 0 1 6 4.5zm-6 8A1.5 1.5 0 0 1 1.5 10h1A1.5 1.5 0 0 1 4 11.5v1A1.5 1.5 0 0 1 2.5 14h-1A1.5 1.5 0 0 1 0 12.5zm6 0A1.5 1.5 0 0 1 7.5 10h1a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5zm6 0a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5z"/>
    </svg>
    `;
    mm2Button.innerHTML = svg_mm2_HTML;

    mm2Button.addEventListener("click", async () => {

        const parentDiv = mmButton.closest(".assistant-message");

        // Get the textual content from the parent div
        const messageContent = parentDiv.textContent.trim();

        // Show the loading modal
        const loadingModal = new bootstrap.Modal(document.getElementById("loading-modal"), { backdrop: "static", keyboard: false });
        loadingModal.show();
    
        try {

            const response = await fetch("/mindmap_enhanced", {
                method: "POST", // Assuming you want to send the message content as a POST request
                headers: {
                    "Content-Type": "application/json", // Set the appropriate content type
                },
                body: JSON.stringify({ message: messageContent, type: "large" }), // Send the message content as JSON data
            });

            if (response.ok) {
                const data = await response.json();
                const htmlContent = data.html;

                const iframe = document.createElement("iframe");

                iframe.style.width = "100%";
                iframe.srcdoc = htmlContent;

                // Add an event listener to adjust the iframe's height after it loads
                iframe.addEventListener("load", function() {
                    this.style.height = this.contentWindow.document.body.scrollHeight + "px";
                });

                const chatHistoryDiv = document.getElementById("chat-history");
                chatHistoryDiv.appendChild(iframe);

            } else {
                console.error("Error fetching mind map image");
            }
            // Make a fetch request to your mind map image endpoint
            // const response = await fetch("/mindmap_with_content", {
            //     method: "POST", // Assuming you want to send the message content as a POST request
            //     headers: {
            //         "Content-Type": "application/json", // Set the appropriate content type
            //     },
            //     body: JSON.stringify({ message: messageContent, type: "large" }), // Send the message content as JSON data
            // });
    
            // if (response.ok) {
            //     const data = await response.json();
            //     const encodedImage = data.image_content;
    
            //     // Create a new image element
            //     const mindmapImage = document.createElement("img");
            //     mindmapImage.classList.add("mindmap-image");
            //     mindmapImage.src = "data:image/png;base64," + encodedImage;
            //     mindmapImage.alt = "Mind Map Image";
    
            //     // Append the image element to the chat-history div
            //     const chatHistoryDiv = document.getElementById("chat-history");
            //     chatHistoryDiv.appendChild(mindmapImage);

            // } else {
            //     // Handle error
            //     console.error("Error fetching mind map image");
            // }
        } catch (error) {
            console.error("An error occurred:", error);
        } finally {
            // Hide the loading modal after the response is received or an error occurs
            loadingModal.hide();
        }
    });

    function countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    ttsButton.addEventListener("click", () => {
        if (countWords(message) > 35) {
            const confirmation = confirm("The text is quite long, do you want me to read it anyway?");
            if (confirmation) {
                performTextToSpeech(message);
            }
        } else {
            performTextToSpeech(message);
        }
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
        messageElement.appendChild(mm2Button);

        tippy(ttsButton, {
            content: settingOptionsSelect.value === 'italian' ? 'leggi' : 'text to speech',
            //content: 'text to speech',
            delay: [2000, 0]
        });

        tippy(mmButton, {
            content: settingOptionsSelect.value === 'italian' ? 'genera una mappa concettuale compatta' : 'generate small concept map',
            //content: 'generate small concept map',
            delay: [2000, 0]
        });

        tippy(mm2Button, {
            content: settingOptionsSelect.value === 'italian' ? 'genera una mappa concettuale estesa' : 'generate large concept map',
            //content: 'generate large concept map',
            delay: [2000, 0]
        });
        
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

async function sendUserMessage(message) {

    const loadingModal = new bootstrap.Modal(document.getElementById("loading-modal"), { backdrop: "static", keyboard: false });
    loadingModal.show();

    botResponse=""
    try {
        // Make a fetch request to your mind map image endpoint
        const response = await fetch("/chat", {
            method: "POST",
            body: new URLSearchParams({ user_message: message }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })

        if (response.ok) {
            const data = await response.json();
            botResponse=data.bot_response;
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

    if (botResponse)
        appendMessage("Assistant", botResponse); // Display the bot's response
    
    // fetch("/chat", {
    //     method: "POST",
    //     body: new URLSearchParams({ user_message: message }),
    //     headers: {
    //         "Content-Type": "application/x-www-form-urlencoded",
    //     },
    // })
    // .then((response) => response.json())
    // .then((data) => {
    //     // Handle the server response and display it in the chat history
    //     const botResponse = data.bot_response;
    //     appendMessage("Assistant", botResponse); // Display the bot's response
    // })
    // .catch((error) => {
    //     console.error("Error sending message:", error);
    // });
}

window.addEventListener("message", function(event) {
    // Check if the message is from a trusted source (you can add origin checks)
    // In this example, we are using "*" to accept messages from any source
    if (event.origin !== window.location.origin) {
      return;
    }
  
    // Handle the message received from the iframe
    console.log("Received message from iframe:", event.data);

    message="Do you want to know more about the topic: "+event.data+"?"
    userMessage="I want to know more about the topic: "+event.data
    if (settingOptionsSelect.value=="italian") {
        message="Vuoi sapere di più sull'argomento: "+event.data+"?"
        userMessage="Voglio sapere di più sull'argomento: "+event.data
    }
    var confirmation = confirm(message);
  
    if (confirmation) {
        //alert("You chose to know more!");
        
        // Display user's message in chat history
        appendMessage("User", userMessage);
    
        sendUserMessage(userMessage);

        const userMessageInput = document.getElementById("user-message");
        userMessageInput.value = "";
    } 
});