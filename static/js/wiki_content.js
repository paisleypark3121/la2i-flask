let voices=[]
let selectedVoice = null;

document.addEventListener('DOMContentLoaded', function() {

    selectVoiceByLanguage("english");

    var expandPath = "M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707";
    var contractPath = "M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707M15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707";
    
    var chatInterface = document.getElementById('chat-interface');
    var chatHistory = document.getElementById('chat-history');

    var mousePosition;
    var offset = [0,0];
    var isDown = false;
    chatInterface.addEventListener('mousedown', function(e) {
        // console.log("down")
        isDown = true;
        offset = [
            chatInterface.offsetLeft - e.clientX,
            chatInterface.offsetTop - e.clientY
        ];
    }, true);
    
    document.addEventListener('mouseup', function() {
        isDown = false;
        // console.log("up")
    }, true);
    
    document.addEventListener('mousemove', function(event) {
        event.preventDefault();
        if (isDown) {
            // console.log("down move")
            mousePosition = {
        
                x : event.clientX,
                y : event.clientY
        
            };
            chatInterface.style.left = (mousePosition.x + offset[0]) + 'px';
            chatInterface.style.top  = (mousePosition.y + offset[1]) + 'px';
        }
    }, true);

    document.getElementById('open-chat').addEventListener('click', function() {
        chatInterface.style.display = chatInterface.style.display === 'flex' ? 'none' : 'flex';
    });

    document.getElementById('resize-chat').addEventListener('click', function() {
        chatInterface.classList.toggle('expanded');
        chatHistory.classList.toggle('expanded');
        var svgElement = document.getElementById('resize-chat');
        var currentPath = svgElement.querySelector('path').getAttribute('d');
        if (currentPath === expandPath) {
            svgElement.querySelector('path').setAttribute('d', contractPath);
        } else {
            svgElement.querySelector('path').setAttribute('d', expandPath);
        }
    });
    
    const chatForm = document.getElementById("chat-form");
    chatForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const userMessage = userMessageInput.value;
        if (userMessage.trim() === "") {
            return; // Skip empty messages
        }

        appendMessage("User", userMessage);
    
        sendUserMessage(userMessage);

        userMessageInput.value = "";
    });

    const userMessageInput = document.getElementById("user-message");
    userMessageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            if (e.shiftKey || e.metaKey) {
                // SHIFT+ENTER should perform a carriage return
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                const before = value.substring(0, start);
                const after = value.substring(end, value.length);
                textarea.value = before + "\n" + after;
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            } else {
                // ENTER without SHIFT should submit the form
                e.preventDefault(); // Prevent the default behavior (newline in textarea)
                chatForm.dispatchEvent(new Event("submit")); // Dispatch a submit event on the form
            }
        }
    });

    enableButtonsIfNotEmpty()
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
        alert("Map for "+iframeFileName+" saved as PDF successfully!");      
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
                const json_data = element.textContent.trim();
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/mindmap_json_to_image', false); // The 'false' argument makes the request synchronous
                xhr.setRequestHeader('Content-Type', 'application/json');
                
                try {
                    xhr.send(JSON.stringify({ json_data: json_data }));

                    if (xhr.status === 200) {
                        const data = JSON.parse(xhr.responseText);
                        const image_content = atob(data.image_content);
                        const uint8Array = new Uint8Array(image_content.length);
                        for (let i = 0; i < image_content.length; i++) {
                            uint8Array[i] = image_content.charCodeAt(i);
                        }
                
                        addImage(doc, uint8Array);
                    } else {
                        throw new Error('Network response was not ok');
                    }
                } catch (error) {
                    console.error('Error generating network image:', error);
                }
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
        alert("Chat history saved as PDF successfully!");
    } catch (error) {
        console.error("Error saving PDF:", error);
    }
};
//#endregion

// #region clear history
function clearHistory() {
    const chatHistory = document.getElementById("chat-history");
    chatHistory.innerHTML = ""; 

    // Disable buttons when chat history is empty
    clearHistoryButton.disabled = true;
    saveHistoryButton.disabled = true;
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
    mm2Button.className = "btn btn-primary mindmap2-button";
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
            content: 'text to speech',
            delay: [2000, 0]
        });

        tippy(mmButton, {
            content: 'generate small concept map',
            delay: [2000, 0]
        });

        tippy(mm2Button, {
            content: 'generate large concept map',
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