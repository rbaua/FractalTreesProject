// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Normal;\n' +  // Normal 
  'uniform vec4 u_Translation;\n' + //mouse click translate
  'uniform mat4 u_Transform;\n' + //transformation matrix
  'uniform vec4 u_Color;\n' + //base color
  'uniform int u_Clicked;\n' + //determine if in checking function
  'uniform float u_Id;\n' + //tree id to pick which one should be green
  'uniform vec3 u_ViewPos;\n' + //position of the camera
  'uniform float u_Glossiness;\n'+ //glossiness level of the object for specular calculation
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
  'uniform mat4 u_MvpMatrix;\n' + //model view projection matrix
  'uniform vec3 u_PointLightPos;\n' +
  'uniform vec3 u_PointLightColor;\n' +
  'uniform int u_LightOn;\n' +
  'varying vec4 v_Color;\n' + //varying color
  'uniform float u_Bands;\n' + 
  'uniform int u_Cel;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix *  (u_Transform * (a_Position + u_Translation));\n' + 
  '  vec3 vertPos = normalize(normalize(u_ViewPos) - a_Position.xyz);' +
  '  vec3 normal = normalize(a_Normal.xyz);\n' + 	// Make the length of the normal 1.0
  '  vec3 light = normalize(normalize(u_LightDirection) - vertPos);\n' +
  '  float lambertian = max(dot(normal, light), 0.0);' +   //lambertian time for specular color
  '  float clamp = floor(lambertian * u_Bands);\n' +
  '  if(u_Cel == 1) { lambertian = clamp/u_Bands; }\n' +
  '  float specular = 0.0;'+
  '  if(lambertian > 0.0) {' +
  '    vec3 reflection = normalize(reflect(light, normal));' +
  '    vec3 view = normalize(-vertPos);' + 
  '    float specAngle = max(dot(reflection, view), 0.0);' +
  '    if(specAngle > 0.0) { specular = pow(specAngle, u_Glossiness); }'+
  '  }'+
  '  float nDotL = max(dot(light, normal), 0.0);\n' +   // Dot product of the light direction and the orientation of a surface (the normal)
  '  vec3 diffuse = u_LightColor * u_Color.rgb * nDotL;\n' +   // Calculate the color due to diffuse reflection
  '	 vec3 diffusePoint = vec3(0.0, 0.0, 0.0);\n' +
  '	 if(u_LightOn == 1) {\n' +
  '	   vec4 vertexPosition = u_Transform * (a_Position + u_Translation);\n' +
  '	 	 vec3 lightDirection = normalize(u_PointLightPos - vec3(vertexPosition));\n' +
  '	 	 float nDotLPoint = max(dot(lightDirection, normal), 0.0);\n' +
  '  	 diffusePoint = u_PointLightColor * u_Color.rgb * nDotLPoint;' +
  '	 }\n' +
  '  if(u_Clicked == 0){' + //if not in the check function, render as colors
  '    if (u_Color.a == 0.0)\n' +
  '       v_Color = vec4(1.0, 0.0, 1.0, 1.0);\n' +
  '    else\n' +
  '       v_Color = vec4(diffuse + specular + diffusePoint, u_Color.a);}\n' + //render as intended color
  '  else {' +
  '     v_Color = vec4(.2, .2, .2, u_Id);' + //render as gray with id alpha
  '  }'+
	'}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var g_points = [];  // The array for the position of a mouse press
var mode = 0;
var view = 1;
var proj = 0;
var aspectRatio = 1;
var SpanX = 500;
var SpanY = 500;
var dragStartCoord = [-1, -1];
var dragButton = 0;
var dragStartR = [-1, -1];
var lightOn = true;
var pointLightTrans = [0, 0, 0];

//camera control variables
var xAngle = 0;
var minxAngle = -90;
var maxxAngle = 90;

var yAngle = 0;
var minyAngle = -90;
var maxyAngle = 90;

var zCamera = false;

var zAngle = 0;
var minzAngle = -180;
var maxzAngle = 180; 

var leftRight = 0;
var inout = 0;
var updown = 0;

var factor = 0.5;

var fov = 60;
var fovMin = 10;
var fovMax = 160;
var cameraMode = false;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');
  canvas.oncontextmenu = () => false;
  aspectRatio = canvas.width/canvas.height;
  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  //gl.preserveDrawingBuffer = true;
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  
    var checkbox1 = document.getElementById("myCheck1");
    checkbox1.addEventListener('change', function () {
        if (checkbox1.checked) {
			view = 0;
			console.log("Sideview");
			draw(gl, u_MvpMatrix);
        } else {
			view = 1;
			console.log("Topview");
			draw(gl, u_MvpMatrix);
        }
    });	
	
    var checkbox2 = document.getElementById("wireframe");
    checkbox2.addEventListener('mousedown', function () {
      checkbox2.checked = !checkbox2.checked;
      if (checkbox2.checked) {
			 console.log("wireframe");
			 mode = 1;
			 draw(gl, u_MvpMatrix);
      }
    });	

    var checkbox5 = document.getElementById("flat");
    checkbox5.addEventListener('mousedown', function () {
      checkbox5.checked = !checkbox5.checked;
      if (checkbox5.checked) {
        console.log("flat");
        mode = 2;
        draw(gl, u_MvpMatrix);
      }
    }); 

    var checkbox6 = document.getElementById("smooth");
    checkbox6.addEventListener('mousedown', function () {
      checkbox6.checked = !checkbox6.checked;
      if (checkbox6.checked) {
        console.log("smooth");
        mode = 0;
        draw(gl, u_MvpMatrix);
      }
    }); 

	
    var checkbox4 = document.getElementById("myCheck4");
    checkbox4.addEventListener('change', function () {
        if (checkbox4.checked) {
			proj = 1;
			console.log("Orthographic");
			draw(gl, u_MvpMatrix);
        } else {
			proj = 0;
			console.log("Perspective");
			draw(gl, u_MvpMatrix);
        }
    });	

    var cameraBox = document.getElementById("cameraSwitch");
    cameraBox.addEventListener('change', function () {
      if (cameraBox.checked) {
        cameraMode = true;
        console.log("Camera control mode");
        draw(gl, u_MvpMatrix);
      } else {
        cameraMode = false;
        console.log("Exiting camera control mode");
      }
    }); 
	
    var submit = document.getElementById('loadbutton');
    submit.addEventListener('click', function () {
      draw(gl, u_MvpMatrix);
    });

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of u_ViewMatrix and u_ProjMatrix variables and u_Translate
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
  
  // Set the light color (white)
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  // Set the light direction (in the world coordinate)
  var lightDirection = new Vector3([1, 1, 1]);
  lightDirection.normalize();     // Normalize
  gl.uniform3fv(u_LightDirection, lightDirection.elements);

  // Get the storage location of u_MvpMatrix
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }

  var u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
  if (!u_Clicked) { 
    console.log('Failed to get the storage location of u_Clicked');
    return;
  }

  gl.uniform1i(u_Clicked, 0);

  canvas.onmousedown = function(ev){ click(ev, gl, canvas, u_MvpMatrix, u_Clicked); };

  canvas.ondragstart = function(ev){dragStart(ev, gl, canvas); };

  canvas.ondragend = function(ev){dragEnd(ev, gl, canvas, u_MvpMatrix); };

  canvas.onwheel = function(ev){wheelEvent(ev, gl, canvas, u_MvpMatrix); };

  canvas.onmouseup = function(ev){mouseUp(ev, gl, canvas, u_MvpMatrix); };

  draw(gl, u_MvpMatrix);
}

function setViewMatrix(gl, u_MvpMatrix){
	var mvpMatrix = new Matrix4();   // Model view projection matrix
  vpMatrix = new Matrix4();
	if (proj == 0){
		mvpMatrix.setOrtho(-SpanX, SpanX, -SpanY, SpanY, -1000, 1000);
	}
	else {
		mvpMatrix.setPerspective(fov, aspectRatio, 1, 2000);;		
	}

  var u_ViewPos = gl.getUniformLocation(gl.program, 'u_ViewPos');

	if (view == 0){
		mvpMatrix.lookAt(0, -400, 75, 0, 0, 0, 0, 1, 0);
    gl.uniform3f(u_ViewPos, 0, -400, 75);
	}
	else {
		mvpMatrix.lookAt(0, 0, 400, 0, 0, 0, 0, 1, 0);
    gl.uniform3f(u_ViewPos, 0, 0, 400);		
	}

  // Replaced fixed field of view with a variable fov, which can be changed by users.    
  //vpMatrix.setPerspective(fov, aspectRatio, 1, 2000);  
  mvpMatrix.translate(-leftRight, 0, 0); 
  mvpMatrix.translate(0, -updown, 0); 
  mvpMatrix.translate(0, 0, inout);
  mvpMatrix.rotate(xAngle, 1, 0, 0);
  mvpMatrix.rotate(yAngle, 0, 1, 0);
  mvpMatrix.rotate(zAngle, 0, 0, 1);

  //mvpMatrix.multiply(vpMatrix);
	gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
}

function save(filename) {
  var savedata = document.createElement('a');
  savedata.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(g_points));
  savedata.setAttribute('download', filename);
  savedata.style.display = 'none';
  document.body.appendChild(savedata);
  savedata.click();
  document.body.removeChild(savedata);
}

function load() {
    var Loadfile = document.getElementById("loadscene").files[0];
    var reader = new FileReader();
    reader.readAsText(Loadfile);
    reader.onload = function () {
        var len = this.result.length;
        var data = this.result.slice(1, len);
        var xyb = data.split(',');
        for (var i = 0; i < xyb.length; i=i+3) {
			g_points.push(([parseFloat(xyb[i]), parseFloat(xyb[i+1]), parseFloat(xyb[i+2])]));
        }
    };	
	console.log("g_points: ", g_points);
}

function click(ev, gl, canvas, u_MvpMatrix, u_Clicked) {
  // Write the positions of vertices to a vertex shader
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer 
  var rect = ev.target.getBoundingClientRect();
  var btn = ev.button;
  //convert x and y to gl coords
  x_gl = ((x - rect.left) - canvas.width/2)/(canvas.width/2); 
  y_gl = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  //get canvas coords
  var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;

  var scale = 0;
  var rotate = 0;
  var translate = 0;
  if(!cameraMode)
  {
    if(ev.shiftKey && ev.button == 0)
    {
    //check if tree has been clicked on
    check(gl, x_in_canvas, y_in_canvas, u_MvpMatrix, u_Clicked); 
    }
    else if(ev.shiftKey && ev.button == 2)
    {
      dragStartR = [ev.x, ev.y];
    }
    else
    {
      if(lastclicked[0] < 0)
      {
        var cumulative = new Matrix4();
        cumulative.setScale(1, 1, 1);

        var scale = new Matrix4();
        scale.setScale(1, 1, 1);

        var rotate = new Matrix4();
        rotate.setRotate(0, 0, 0, 1);

        var translate = new Matrix4();
        translate.setTranslate(0, 0, 0);

        // Store the coordinates to g_points array
        gl.uniform1i(u_Clicked, 0);
        g_points.push([x_gl, y_gl, btn, cumulative, scale, rotate, translate]);
        draw(gl, u_MvpMatrix);
      }
    }
  }
  else
  {
    //camera stuff
  }
}

var lastclicked = [-1, -1];
function check(gl, x, y, u_MvpMatrix, u_Clicked) {
  var picked = false;
  gl.uniform1i(u_Clicked, 1);  // Pass true to u_Clicked
  draw(gl, u_MvpMatrix); // Draw grey tree with special alpha
  // Read pixel at the clicked position
  var pixels = new Uint8Array(4); // Array for storing the pixel value
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  //determine which tree to turn green based on alphaId
  var treeID;
  if(pixels[3] < 0)
  {
    treeID = -1;
  }
  else if(pixels[3] == 255) //light id
  {
  	lightOn = !lightOn;
  }
  else if ((pixels[3] > 0 || pixels[0] > 0 || pixels[1] > 0 || pixels[2] > 0))
  {
    treeID = (pixels[3]); //the index of the clicked tree
    //change the previous green tree back to its original color
    if(lastclicked[0] > -1)
    {
      g_points[lastclicked[0]][2] = lastclicked[1];
    }
    lastclicked = [treeID, g_points[treeID][2]];
    g_points[treeID][2] = 4;
  }
  else //clicked on the background
  {
    //change the previous green tree back to its original color
    if(lastclicked[0] > -1)
    {
      g_points[lastclicked[0]][2] = lastclicked[1];
    }
    lastclicked = [-1, -1];
  }
  var u_LightOn = gl.getUniformLocation(gl.program, 'u_LightOn');
  gl.uniform1i(u_LightOn, lightOn);
  gl.uniform1i(u_Clicked, 0);  // Pass false to u_Clicked(rewrite the tree)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
  draw(gl, u_MvpMatrix); // Draw the trees again
}

function dragStart(ev, gl, canvas)
{
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer 
  var rect = ev.target.getBoundingClientRect();
  //convert x and y to gl coords
  x_gl = ((x - rect.left) - canvas.width/2)/(canvas.width/2); 
  y_gl = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  dragStartCoord = [x_gl, y_gl];
  dragButton = ev.button;
}

var lightTranslate = new Matrix4();
lightTranslate.scale(15, 15, 15);
function dragEnd(ev, gl, canvas, u_MvpMatrix)
{
  if(!cameraMode)
  {
    if(dragButton == 0)
    {
      if(lastclicked[0] >= 0)
      {
        var x = ev.clientX; // x coordinate of a mouse pointer
        var y = ev.clientY; // y coordinate of a mouse pointer 
        var rect = ev.target.getBoundingClientRect();
        //convert x and y to gl coords
        x_gl = ((x - rect.left) - canvas.width/2)/(canvas.width/2); 
        y_gl = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
        var dragEndCoord = [x_gl, y_gl];

        //var distDragged = Math.sqrt(Math.pow(dragEndCoord[0]-dragStartCoord[0], 2) + Math.pow(dragEndCoord[1]-dragStartCoord[1], 2));
        //console.log(distDragged);

        var deltaX = dragEndCoord[0] - dragStartCoord[0];
        var deltaY = dragEndCoord[1] - dragStartCoord[1];

        // Note: WebGL is column major order
        var TranslateMatrix = new Matrix4();
        TranslateMatrix.setTranslate(deltaX*SpanX, deltaY*SpanY, 0);

        var unscale = g_points[lastclicked[0]][6];
        var scale = g_points[lastclicked[0]][4];
        //unscale.setScale(1/scale[0], 1/scale[5], 1/scale[10]);
        unscale.setInverseOf(scale);
    
        var RotateMatrix = g_points[lastclicked[0]][5];
        var unRotate = new Matrix4();
        unRotate.setInverseOf(RotateMatrix);

        var cumMatrix = g_points[lastclicked[0]][3];
        g_points[lastclicked[0]][3] = cumMatrix.multiply(unscale).multiply(unRotate).multiply(TranslateMatrix).multiply(RotateMatrix).multiply(g_points[lastclicked[0]][4]);
        g_points[lastclicked[0]][6] = g_points[lastclicked[0]][6].multiply(TranslateMatrix);

        draw(gl, u_MvpMatrix);
      }
      else
      {
        //nothing
      }
    }
  }
  else
  {
    //camera drag
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer 
    var rect = ev.target.getBoundingClientRect();
    //convert x and y to gl coords
    x_gl = ((x - rect.left) - canvas.width/2)/(canvas.width/2); 
    y_gl = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
    var dragEndCoord = [x_gl, y_gl];

    var deltaX = dragEndCoord[0] - dragStartCoord[0];
    var deltaY = dragEndCoord[1] - dragStartCoord[1];
        

    leftRight = deltaX * (canvas.width/10);
    updown = deltaY * (canvas.height/10);


    draw(gl, u_MvpMatrix);
  }

}

function mouseUp(ev, gl, canvas, u_MvpMatrix)
{
  if(!cameraMode)
  {
    if(ev.button == 2 && ev.shiftKey)
    {
      if(lastclicked[0] >= 0)
      {
        var dist = Math.sqrt(Math.pow(ev.x - dragStartR[0], 2) + Math.pow(ev.y - dragStartR[1], 2));
        dist = dist/(2);
        var RotateMatrix = g_points[lastclicked[0]][5];
        if(Math.abs(ev.x - dragStartR[0]) > Math.abs(ev.y - dragStartR[1])) // horizontal
        {
          if(ev.x > dragStartR[0])
          {
            RotateMatrix.setRotate(30 * dist * (Math.PI/180), 1, 0, 0);
          }
          else
          {
            RotateMatrix.setRotate(-30 * dist * (Math.PI/180), 1, 0, 0);
          }
        }
        else if(Math.abs(ev.x - dragStartR[0]) <= Math.abs(ev.y - dragStartR[1])) //vertical
        {
          if(ev.y > dragStartR[1])
          {
            RotateMatrix.setRotate(30 * dist * (Math.PI/180), 0, 0, 1);
          } 
          else
          {
            RotateMatrix.setRotate(-30 * dist * (Math.PI/180), 0, 0, 1);
          }
        }

        //RotateMatrix.setRotate(Math.PI, 0, 0, 1);
        var TranslateMatrix = g_points[lastclicked[0]][6];
        var TransToOrigin = new Matrix4();
        TransToOrigin.setTranslate(-(g_points[lastclicked[0]][0] * SpanX), -(g_points[lastclicked[0]][0] * SpanY), 0);

        var TranslateBack = new Matrix4();
        TranslateBack.setTranslate((g_points[lastclicked[0]][0] * SpanX), (g_points[lastclicked[0]][0] * SpanY), 0);

        var unTranslate = new Matrix4();
        unTranslate.setTranslate(-TranslateMatrix.elements[12], -TranslateMatrix.elements[13], 0);

        var unscale = new Matrix4();
        var scale = g_points[lastclicked[0]][4];
        //unscale.setScale(1/scale[0], 1/scale[5], 1/scale[10]);
        unscale.setInverseOf(scale);


        var cumMatrix = g_points[lastclicked[0]][3];
        cumMatrix.multiply(unscale);
        cumMatrix.multiply(unTranslate);
        cumMatrix.multiply(TranslateBack);
        cumMatrix.multiply(RotateMatrix);
        cumMatrix.multiply(TransToOrigin);
        cumMatrix.multiply(TranslateMatrix);
        cumMatrix.multiply(scale);

        g_points[lastclicked[0]][5] = g_points[lastclicked[0]][5].multiply(RotateMatrix);
        g_points[lastclicked[0]][3] = cumMatrix;
        draw(gl, u_MvpMatrix);
      }
    }
    else
    {
      //nada
    }
  }
  else
  {
    //camera right click drag
  }
  
}

function wheelEvent(ev, gl, canvas, u_MvpMatrix)
{
  if(!cameraMode)
  {
    amount = ev.wheelDelta;

    if(lastclicked[0] >= 0)
    {
      // Note: WebGL is column major order
      var ScaleMatrix = g_points[lastclicked[0]][4];
      //var scaleElems = ScaleMatrix.elements;
      if(amount > 0 && ScaleMatrix.elements[0] * 1.2 < 2)
      {
        ScaleMatrix.setScale(1.2, 1.2, 1.2);
      }
      else if(amount < 0 && ScaleMatrix.elements[0] * .6> .5)
      {
        ScaleMatrix.setScale(.6, .6, .6);
      }
    
      //RotateMatrix.setRotate(Math.PI, 0, 0, 1);
      var TranslateMatrix = g_points[lastclicked[0]][6];
      var TransToOrigin = new Matrix4();
      TransToOrigin.setTranslate(-(g_points[lastclicked[0]][0] * SpanX), -(g_points[lastclicked[0]][0] * SpanY), 0);

      var TranslateBack = new Matrix4();
      TranslateBack.setTranslate((g_points[lastclicked[0]][0] * SpanX), (g_points[lastclicked[0]][0] * SpanY), 0);

      var unTranslate = new Matrix4();
      unTranslate.setInverseOf(TranslateMatrix);

      var RotateMatrix = g_points[lastclicked[0]][5];
      var unRotate = new Matrix4();
      unRotate.setInverseOf(RotateMatrix);


      var cumMatrix = g_points[lastclicked[0]][3];
      cumMatrix.multiply(unRotate);
      cumMatrix.multiply(TranslateBack);
      cumMatrix.multiply(unTranslate);
      cumMatrix.multiply(ScaleMatrix);
      cumMatrix.multiply(TranslateMatrix);
      cumMatrix.multiply(TransToOrigin);
      cumMatrix.multiply(RotateMatrix);
      g_points[lastclicked[0]][3] = cumMatrix;

      g_points[lastclicked[0]][4] = g_points[lastclicked[0]][4].multiply(ScaleMatrix);
      draw(gl, u_MvpMatrix);
    }
    else
    {
      //not doin anything
    }
  }
  else
  {
    if(ev.shiftKey)
    {
      inout += factor * (ev.wheelDelta/10);
      console.log("Move camera in/out");
      draw(gl, u_MvpMatrix);
    }
    else
    {
      fov -= factor * (ev.wheelDelta/10);
      fov = Math.min(fov, fovMax);
      fov = Math.max(fov, fovMin);
      console.log("Zoom");
      draw(gl, u_MvpMatrix);
    }
  }
  
}

function draw(gl, u_MvpMatrix) {
  setViewMatrix(gl, u_MvpMatrix);
  var len = g_points.length;
  for(var i = 0; i < len; i++) {
	var xy = g_points[i];
    var alphaId = (1/255)*i;
	drawTree(gl, u_MvpMatrix, xy, alphaId);
  }
  drawSphere(gl, u_MvpMatrix, 0, -100/15, 100/15);

  //set point light color and location
  var u_PointLightColor = gl.getUniformLocation(gl.program, 'u_PointLightColor');
  if (!u_PointLightColor) {
    console.log('Failed to get the storage location of u_PointLightColor');
    return;
  }
  gl.uniform3fv(u_PointLightColor, [.5, .5, 1.0]);  

  var u_PointLightPos = gl.getUniformLocation(gl.program, 'u_PointLightPos');
  if (!u_PointLightPos) {
    console.log('Failed to get the storage location of u_PointLightPos');
    return;
  }
  gl.uniform3fv(u_PointLightPos, [lightTranslate.elements[12] + pointLightTrans[0], lightTranslate.elements[13] + pointLightTrans[1], lightTranslate.elements[14] + pointLightTrans[2]]);  
}

function drawTree(gl, u_MvpMatrix, xy, alphaId) {
	var v = new Float32Array(treeR3);

  var n = v.length;
  var r1 = 0;
  var r2 = 0;
  for(var i = 0; i < n; i=i+6) {
	var d = Math.sqrt((v[i]-v[i+3])*(v[i]-v[i+3])+(v[i+1]-v[i+4])*(v[i+1]-v[i+4])+(v[i+2]-v[i+5])*(v[i+2]-v[i+5]));
	drawCylinder(gl, u_MvpMatrix, v[i],v[i+1],v[i+2], v[i+3],v[i+4],v[i+5], d, xy, alphaId);
  }
}

function drawCylinder(gl, u_MvpMatrix, x1, y1, z1, x2, y2, z2, d, xy, alphaId) {
	r1 = d/10;
	r2 = d/20;
	sides = 12;
	var cylinder = [];
	var Circle1 = [];
	var Circle2 = [];
	var normals = [];

  for (var i = 0; i <= sides; i++) {
		Circle1.push(r1 * Math.cos(i * Math.PI / 6), r1 * Math.sin(i * Math.PI / 6));
    Circle2.push(r2 * Math.cos(i * Math.PI / 6), r2 * Math.sin(i * Math.PI / 6));       
  }
	
	for (var i = 0; i < (sides*2); i=i+2) {
    cylinder.push(x2+Circle2[i], y2+Circle2[i+1], z2, 
		x1+Circle1[i], y1+Circle1[i+1], z1, 
		x2+Circle2[i+2], y2+Circle2[i+3], z2, 
		x2+Circle2[i+2], y2+Circle2[i+3], z2, 
		x1+Circle1[i], y1+Circle1[i+1], z1, 
		x1+Circle1[i+2], y1+Circle1[i+3], z1);
  }


  for (var i = 0; i <cylinder.length; i=i+9) {
    // Create Vectors
		var v1 = [cylinder[i], cylinder[i+1], cylinder[i+2]];
    var v2 = [cylinder[i+3], cylinder[i+4], cylinder[i+5]];
    var v3 = [cylinder[i+6], cylinder[i+7], cylinder[i+8]];
    var v21 = [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
    var v23 = [v3[0] - v2[0], v3[1] - v2[1], v3[2] - v2[2]];
        
		// Calculate Normals
		var N = [];
		var N1 = v23[1]*v21[2] - v23[2]*v21[1];
		var N2 = v21[0]*v23[2] - v21[2]*v23[0];
		var N3 = v23[0]*v21[1] - v23[1]*v21[0];

    N.push(N1, N2 ,N3);
    var Vmag = Math.sqrt(N[0]**2 + N[1]**2 + N[2]**2);
        
		N[0] = N[0]/Vmag;
    N[1] = N[1]/Vmag;
    N[2] = N[2]/Vmag;
    normals = normals.concat(N, N, N);
  }

  //Get the vertex normals
  var vN = [];
  var i = 0;
  //get normals of previous quad and next quad
  var n1 = [normals[normals.length-6], normals[normals.length-5], normals[normals.length-4]];
  var n2 = [normals[i+6], normals[i+7], normals[i+8]];
  var normavg = [(n1[0] + n2[0])/2, (n1[1] + n2[1])/2, (n1[2] + n2[2])/2];       
  vN.push(normavg[0], normavg[1], normavg[2]);

  i+=3;
  var n1 = [normals[normals.length-6], normals[normals.length-5], normals[normals.length-4]];
  var n2 = [normals[i+6], normals[i+7], normals[i+8]];
  var normavg = [(n1[0] + n2[0])/2, (n1[1] + n2[1])/2, (n1[2] + n2[2])/2];       
  vN.push(normavg[0], normavg[1], normavg[2]);

  for (var i = 6; i <cylinder.length-6; i=i+3) {
    var n1 = [normals[i-6], normals[i-5], normals[i-4]];
    var n2 = [normals[i+6], normals[i+7], normals[i+8]];
    var normavg = [(n1[0] + n2[0])/2, (n1[1] + n2[1])/2, (n1[2] + n2[2])/2];   
    vN.push(normavg[0], normavg[1], normavg[2]);
  }

  i+=3;
  var n1 = [normals[i-6], normals[i-5], normals[i-4]];
  var n2 = [normals[0], normals[1], normals[2]];
  var normavg = [(n1[0] + n2[0])/2, (n1[1] + n2[1])/2, (n1[2] + n2[2])/2];       
  vN.push(normavg[0], normavg[1], normavg[2]);

  i+=3
  var n1 = [normals[i-6], normals[i-5], normals[i-4]];
  var n2 = [normals[3], normals[4], normals[5]];
  var normavg = [(n1[0] + n2[0])/2, (n1[1] + n2[1])/2, (n1[2] + n2[2])/2];       
  vN.push(normavg[0], normavg[1], normavg[2]);

  vN = new Float32Array(vN);

  
  var vertices = new Float32Array(cylinder);
  var n = cylinder.length/3;

  // Create a buffer object
  var vertexbuffer = gl.createBuffer();  
  if (!vertexbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  //change which normals array is going to be used
  //vertecies for smooth shading, tris for flat shading
  if(mode == 0)
  {
    // Create a buffer object
    var normalbuffer = gl.createBuffer();  
    if (!normalbuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, normalbuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, vN, gl.STATIC_DRAW);

    // Assign the buffer object to a_Position and enable the assignment
    var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if(a_Normal < 0) {
      console.log('Failed to get the storage location of a_Normal');
      return -1;
    }
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }
  else
  {
    // Create a buffer object
    var normalbuffer = gl.createBuffer();  
    if (!normalbuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, normalbuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // Assign the buffer object to a_Position and enable the assignment
    var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if(a_Normal < 0) {
      console.log('Failed to get the storage location of a_Normal');
      return -1;
    }
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  
  // Pass the translation distance to the vertex shader
  var u_Translation = gl.getUniformLocation(gl.program, 'u_Translation');
  if (!u_Translation) {
    console.log('Failed to get the storage location of u_Translation');
    return;
  }

  gl.uniform4f(u_Translation, SpanX*xy[0], SpanY*xy[1], 0, 0);  

  // Pass the transformation matrix to the vertex shader
  var u_Transform = gl.getUniformLocation(gl.program, 'u_Transform');
  if (!u_Transform) {
    console.log('Failed to get the storage location of u_Transform');
    return;
  }
  gl.uniformMatrix4fv(u_Transform, false, xy[3].elements);  
  
  var u_Color = gl.getUniformLocation(gl.program, 'u_Color');
  if (!u_Color) {
    console.log('Failed to get the storage location of u_Color');
    return;
  }

  var u_Id = gl.getUniformLocation(gl.program, 'u_Id');
  if (!u_Id) {
    console.log('Failed to get the storage location of u_Id');
    return;
  }

  var u_Glossiness = gl.getUniformLocation(gl.program, 'u_Glossiness');
  if (!u_Id) {
    console.log('Failed to get the storage location of u_Glossiness');
    return;
  }

  var u_Cel = gl.getUniformLocation(gl.program, 'u_Cel');
  if (!u_Cel) {
    console.log('Failed to get the storage location of u_Cel');
    return;
  }

  var u_Bands = gl.getUniformLocation(gl.program, 'u_Bands');
  if (!u_Bands) {
    console.log('Failed to get the storage location of u_Bands');
    return;
  }
  gl.uniform1f(u_Bands, 5.0);
  // Draw
  if (mode == 0 || mode == 2 || mode == 3){ //if flat or smooth
    if(xy[2] == 0)
    {
		  gl.uniform4f(u_Color, 1, 0, 0, 1);
      gl.uniform1f(u_Glossiness, 5.0);
    }
    else if (xy[2] == 2)
    {
      gl.uniform4f(u_Color, 0, 0, 1, 1);
      gl.uniform1f(u_Glossiness, 20.0);
    }
    else
    {
      gl.uniform4f(u_Color, 0, 1, 0, 1);
      gl.uniform1f(u_Glossiness, 0.0);
    }
    gl.uniform1f(u_Id, alphaId); //load in alphaId
    if(mode == 3) {gl.uniform1i(u_Cel, 1);} //cel shading
    else {gl.uniform1i(u_Cel, 0);}
    gl.drawArrays(gl.TRIANGLES, 0, n);
  }
  else if (mode == 1){ //if wireframe
    gl.uniform4f(u_Color, 0, 0, 0, 0);
    gl.drawArrays(gl.LINES, 0, n);
  }
}

function drawSphere(gl, u_MvpMatrix, centerX, centerY, centerZ)
{
  var SPHERE_DIV = 12;

  var i, ai, si, ci;
  var j, aj, sj, cj;
  var p1, p2;

  var positions = [];
  var indices = [];

  // Generate coordinates
  for (j = 0; j <= SPHERE_DIV; j++) {
    aj = j * Math.PI / SPHERE_DIV;
    sj = Math.sin(aj);
    cj = Math.cos(aj);
    for (i = 0; i <= SPHERE_DIV; i++) {
      ai = i * 2 * Math.PI / SPHERE_DIV;
      si = Math.sin(ai);
      ci = Math.cos(ai);

      positions.push(si * sj);  // X
      positions.push(cj);       // Y
      positions.push(ci * sj);  // Z
    }
  }

  // Generate indices
  for (j = 0; j < SPHERE_DIV; j++) {
    for (i = 0; i < SPHERE_DIV; i++) {
      p1 = j * (SPHERE_DIV+1) + i;
      p2 = p1 + (SPHERE_DIV+1);

      indices.push(p1);
      indices.push(p2);
      indices.push(p1 + 1);

      indices.push(p1 + 1);
      indices.push(p2);
      indices.push(p2 + 1);
    }
  }

  var vertices = new Float32Array(positions);
  //var n = positions.length;

  // Create a buffer object
  var vertexbuffer = gl.createBuffer();  
  if (!vertexbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Create a buffer object
  var normalbuffer = gl.createBuffer();  
  if (!normalbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, normalbuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Assign the buffer object to a_Position and enable the assignment
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);
  
  // Pass the translation distance to the vertex shader
  var u_Translation = gl.getUniformLocation(gl.program, 'u_Translation');
  if (!u_Translation) {
    console.log('Failed to get the storage location of u_Translation');
    return;
  }
  pointLightTrans = [centerX, centerY, centerZ];
  gl.uniform4f(u_Translation, centerX, centerY, centerZ, 0);  

  // Pass the transformation matrix to the vertex shader
  var u_Transform = gl.getUniformLocation(gl.program, 'u_Transform');
  if (!u_Transform) {
    console.log('Failed to get the storage location of u_Transform');
    return;
  }
  gl.uniformMatrix4fv(u_Transform, false, lightTranslate.elements);  
  
  var u_Color = gl.getUniformLocation(gl.program, 'u_Color');
  if (!u_Color) {
    console.log('Failed to get the storage location of u_Color');
    return;
  }

  var u_Id = gl.getUniformLocation(gl.program, 'u_Id');
  if (!u_Id) {
    console.log('Failed to get the storage location of u_Id');
    return;
  }

  var u_Glossiness = gl.getUniformLocation(gl.program, 'u_Glossiness');
  if (!u_Id) {
    console.log('Failed to get the storage location of u_Glossiness');
    return;
  }

   // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  var u_Cel = gl.getUniformLocation(gl.program, 'u_Cel');
  if (!u_Cel) {
    console.log('Failed to get the storage location of u_Cel');
    return;
  }

  var u_Bands = gl.getUniformLocation(gl.program, 'u_Bands');
  if (!u_Bands) {
    console.log('Failed to get the storage location of u_Bands');
    return;
  }
  gl.uniform1f(u_Bands, 5.0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


  // Draw
  if (mode == 0 || mode == 2 || mode == 3){ //if flat or smooth
  	if(lightOn)
  	{
  		gl.uniform4f(u_Color, 1, 1, 0, 1);
  	}
  	else
  	{
  		gl.uniform4f(u_Color, 0, 1, 1, 1);
  	}
    gl.uniform1f(u_Glossiness, 20.0);
    gl.uniform1f(u_Id, 1.0); //load in alphaId
    if(mode == 3) {gl.uniform1i(u_Cel, 1);} //cel shading
    else {gl.uniform1i(u_Cel, 0);}
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }
  else if (mode == 1){ //if wireframe
    gl.uniform4f(u_Color, 0, 0, 0, 0);
    gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
  }
}