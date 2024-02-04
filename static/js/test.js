document.addEventListener("DOMContentLoaded", function () {

    const mybutton = document.getElementById("mybutton");

    mybutton.addEventListener("click", () => {
  
        window.jsPDF = window.jspdf.jsPDF;

        var doc = new jsPDF({
            orientation: 'p', 
            unit: 'mm', 
            format: 'a4',
            compress: 'true'
            //format: [canvas.width, canvas.height] // set needed dimensions for any element
        });

        fetch('/test_content', {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
          },
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
              throw new Error('Network response was not ok');
          }
        })
        .then(data => {
            // Decode the base64 string back into bytes
            const image_content = atob(data.image_content);
            
            // Create a Uint8Array from the decoded bytes
            const uint8Array = new Uint8Array(image_content.length);
            for (let i = 0; i < image_content.length; i++) {
                uint8Array[i] = image_content.charCodeAt(i);
            }

            doc.addPage();
            doc.addImage(uint8Array, 'PNG', 0, 20, 200, 0, '', 'FAST');
            
            doc.save("test.pdf");
        })
        .catch(error => {
            console.error('Error generating network image:', error);
        });

        

    })
})