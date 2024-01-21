function generateRandomSentence(minWords, maxWords) {
    if (minWords <= 0 || maxWords < minWords) {
      throw new Error('Invalid word count range');
    }
  
    // Generate a random number of words within the specified range
    const numWords = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  
    // An array of sample words
    const words = [
      'apple', 'banana', 'cherry', 'dog', 'elephant', 'flower', 'grape', 'hat', 'ice cream', 'jacket', 'kite', 'lemon', 'monkey', 'nest', 'orange', 'penguin', 'quilt', 'rabbit', 'sun', 'tree', 'umbrella', 'violin', 'watermelon', 'xylophone', 'yak', 'zebra'
    ];
  
    // Generate the random sentence
    const sentence = [];
    for (let i = 0; i < numWords; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      sentence.push(randomWord);
    }
  
    // Join the words into a sentence
    return sentence.join(' ');
  }
  
  

document.addEventListener("DOMContentLoaded", function () {

    const mybutton = document.getElementById("mybutton");

    mybutton.addEventListener("click", () => {
        const minWords = 10;
        const maxWords = 30;
  
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

        for (i=0;i<10;i++) {

            // Example usage:
            const randomSentence = generateRandomSentence(minWords, maxWords);
            
            s=i+": "+randomSentence
            
            var splitTitle = doc.splitTextToSize(s, 180);

            temp_num_lines=num_lines+splitTitle.length+1
            if (temp_num_lines>max_lines_per_page) {
                dim1=temp_num_lines - max_lines_per_page
            
                console.log(i+" - "+dim1)

                var array1 = splitTitle.slice(0, dim1);
                var array2 = splitTitle.slice(dim1);
                console.log(array1)
                console.log(array2)

                doc.text(10, start_y, array1);
                doc.addPage();    
                start_y=20
                num_lines=0
                doc.text(10, start_y, array2);
                start_y=start_y+10*array2.length
                num_lines=num_lines+array2.length+1

            } else {

                doc.text(10, start_y, splitTitle);
                //doc.text(10, 20, s, { maxWidth: 180 });

                start_y=start_y+10*splitTitle.length
                num_lines=num_lines+splitTitle.length+1
            }
        }



        doc.save("test.pdf")

    })
})