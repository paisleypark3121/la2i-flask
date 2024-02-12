var mousePosition;
var offset = [0, 0];
var div;
var isDown = false;

div = document.createElement("div");
div.style.position = "absolute";
div.style.left = "0px";
div.style.top = "0px";
div.style.width = "100px";
div.style.height = "100px";
div.style.background = "red";
div.style.color = "blue";

document.body.appendChild(div);

div.addEventListener('mousedown', function(e) {
  isDown = true;
  console.log("DOWN")
  offset = [
    div.offsetLeft - e.clientX,
    div.offsetTop - e.clientY
  ];
}, true);

document.addEventListener('mouseup', function() {
  isDown = false;
  console.log("UP")
}, true);

document.addEventListener('mousemove', function(event) {
  event.preventDefault();
  if (isDown) {
    console.log("MOVE DOWN")
    mousePosition = {

      x: event.clientX,
      y: event.clientY

    };
    div.style.left = (mousePosition.x + offset[0]) + 'px';
    div.style.top = (mousePosition.y + offset[1]) + 'px';
  }
}, true);
