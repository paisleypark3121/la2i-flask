function make_docx(){
  const doc = new Document({
    creator: "itsme.com",
    description: 'Test di DOCX JS',
    title: 'Test!'
  });

  paragraphTop = new Paragraph("Ciao!");
  paragraphTop.heading1();
  paragraphTop.center();
  doc.addParagraph(paragraphTop);

  text = new TextRun("Paragrafo1");
  paragraphTxt = new Paragraph();
  paragraphTxt.justified();
  paragraphTxt.addRun(text);
  doc.addParagraph(paragraphTxt);

  paragraphTxt = new Paragraph();
  doc.addParagraph(paragraphTxt);

  text = new TextRun("Paragrafo2");
  paragraphTxt = new Paragraph();
  paragraphTxt.justified();
  paragraphTxt.addRun(text);
  doc.addParagraph(paragraphTxt);

  const packer = new Packer();
  packer.toBlob(doc).then(blob => {
      saveAs(blob, "file.docx");
  });
}