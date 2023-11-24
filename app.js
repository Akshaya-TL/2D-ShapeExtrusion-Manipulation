// Global Variables
var canvas = document.getElementById('myCanvas');
var engine = new BABYLON.Engine(canvas, true);
var scene = new BABYLON.Scene(engine);
const camera = new BABYLON.ArcRotateCamera("Camera",  0, Math.PI / 3, 30, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);

var drawMode = false;
var moveMode = false;
var vertexEditMode = false;

var points = [];
var shapesToExtrude = [];


// Step 0: Background color
scene.clearColor = new BABYLON.Color3(1, 1, 1);

// Step 1: Create a ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 15, height: 35}, scene);
ground.material = new BABYLON.GridMaterial("groundMaterial", scene);

ground.enableEdgesRendering();
ground.edgesWidth = 4.0;
ground.edgesColor = new BABYLON.Color4(0, 0, 0, 1);


// Step 2: Draw a 2D shape
scene.onPointerObservable.add(handlePointer);

function enterDrawMode() {
    drawMode = true;
    moveMode = false;
    vertexEditMode = false;
    extrudeMode = false;
}

function handlePointer(pointerInfo) {
    if(drawMode){
        var pickInfo = pointerInfo.pickInfo;
        switch (pointerInfo.type) {

            case BABYLON.PointerEventTypes.POINTERDOWN:

                // Left-Click then accumulate the points and represent it on screen
                if(pointerInfo.event.inputIndex == 2 && pickInfo.pickedMesh && (pickInfo.pickedMesh.id === "ground" || pickInfo.pickedMesh.id === "lines")){
                    points.push(pickInfo.pickedPoint);
                    drawPointMarker(pickInfo.pickedPoint);
                }

                // Right-Click then draw the 2-D closed loop shape from points
                else if(pointerInfo.event.inputIndex == 4){
                    points.push(points[0]);
                    var idx = shapesToExtrude.length;
                    var lines = BABYLON.MeshBuilder.CreateLines("lines"+idx.toString(), {points: points, updatable: true}, scene);
                    lines.color = new BABYLON.Color3(1, 0, 0);
                    shapesToExtrude.push(points);
                    points = [];
                }

                
            break;                
        }
    }
}

function drawPointMarker(point) {

    // Creating point
    var curShapeNumber = shapesToExtrude.length;
    var curSphereWithinShape = points.length - 1;
    var sphere = BABYLON.MeshBuilder.CreateSphere("pointMarker" + curShapeNumber.toString() + "_" + curSphereWithinShape.toString(), { diameter: 0.5}, scene);
    sphere.position = point;

    // point UI Enhancements
    var material = new BABYLON.StandardMaterial("pointMarkerMaterial", scene);
    material.emissiveColor = new BABYLON.Color3(1, 1, 1); 
    sphere.material = material;

}



// Step 3: 2D-Shape Extrusion    

var shapesExtruded = [] // boolean array to avoid multiple extrusion objects

function extrudeShape(){
    drawMode = false;
    moveMode = false;
    vertexEditMode = false;
    extrudeMode = true;
    


    for(let i=0; i<shapesToExtrude.length; i++){

        if(i == shapesExtruded.length){
            shapesExtruded.push(false);
        }

        if(shapesExtruded[i] == false){

            // Extruding shape with constant height = 5
            var extrudedShapeUniqueId = "shapeExtruded" + i.toString();
            const extrusion = BABYLON.MeshBuilder.ExtrudePolygon(extrudedShapeUniqueId, {shape: shapesToExtrude[i], depth: 5, updatable: true}, scene);
            extrusion.position.y = 5;
    
            // Extruded shape UI Enhancements
            var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
            material.emissiveColor = new BABYLON.Color3(0, 128, 128);
            extrusion.material = material;
            extrusion.enableEdgesRendering();
            extrusion.edgesWidth = 4.0; 
            extrusion.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

            // marking as shape extruded
            shapesExtruded[i] = true;
        }
        
    }

}

// Step 4: Move/edit the extruded shape

function enterMoveMode() {

    moveMode = true;
    drawMode = false;
    vertexEditMode = false;
    extrudeMode = false;

    runMoveMode();

}

function runMoveMode() {

    var canvas = engine.getRenderingCanvas();
    var startingPoint;
    var currentMesh = null;

    var getGroundPosition = function () {
        var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == ground; });
        if (pickinfo.hit) {
            return pickinfo.pickedPoint;
        }
        return null;
    }

    var onPointerDownDrag = function (evt) {
        if(moveMode === false){
            canvas.removeEventListener("pointerdown", onPointerDownDrag);
            canvas.removeEventListener("pointerup", onPointerUpDrag);
            canvas.removeEventListener("pointermove", onPointerMoveDrag);
        }
        if (evt.button !== 0) {
            return;
        }

        // check if we are under a mesh
        var pickInfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh !== ground && mesh.id.startsWith("shapeExtruded"); });
        if (pickInfo.hit) {
            currentMesh = pickInfo.pickedMesh;
            startingPoint = getGroundPosition(evt);

            if (startingPoint) { 
                // we need to disconnect camera from canvas
                setTimeout(function () {
                    camera.detachControl(canvas);
                }, 0);
            }
        }
    }

    var onPointerUpDrag = function () {
        if (startingPoint) {
            var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
            material.emissiveColor = new BABYLON.Color3(0, 128, 128);
            currentMesh.material = material;
            camera.attachControl(canvas, true);
            startingPoint = null;
            return;
        }
    }

    var onPointerMoveDrag = function (evt) {
        if (!startingPoint) {
            return;
        }

        var current = getGroundPosition();

        if (!current) {
            return;
        }

        var diff = current.subtract(startingPoint);

        // 3d shape update
        currentMesh.position.addInPlace(diff);
        var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
        material.emissiveColor = new BABYLON.Color3(20, 100, 120);
        currentMesh.material = material;


        // 2d mesh update
        var lineMeshId = "lines" + currentMesh.id.slice(13);
        var lineMesh = scene.getMeshByID(lineMeshId);
        lineMesh.position.addInPlace(diff);

        // vertices mesh update
        var idx = Number(currentMesh.id.slice(13));    
        curPointSet = shapesToExtrude[idx];

        var updatedPath = []
        for(var i=0; i<curPointSet.length; i++){
            sphereName = "pointMarker"+idx.toString() + "_" + i.toString();
            curSphere = scene.getMeshByName(sphereName);
            if(curSphere != null){
                curSphere.position.addInPlace(diff);
                curPointSet[i] = curSphere.position;
                updatedPath.push(curSphere.position.x);
                updatedPath.push(curSphere.position.y);
                updatedPath.push(curSphere.position.z);
            }
            else{
                console.log("sphere not found: ", sphereName);
                break;
            }
        }

        // disposing existing line and recreating them (as the inplace does not update several other params)

        // updating the points as per move motion
        var n = curPointSet.length;
        curPointSet[n-1] = curPointSet[0];

        updatedPath.push(updatedPath[0]);
        updatedPath.push(updatedPath[1]);
        updatedPath.push(updatedPath[2]);


        // creating new line mesh (2d shape) & disposing earlier one
        var lineMeshId = "lines" + currentMesh.id.slice(13);
        var lineMesh = scene.getMeshByID(lineMeshId);
        lineMesh.dispose();
        lineMesh = new BABYLON.MeshBuilder.CreateLines(lineMeshId, {points: curPointSet}, scene);
        lineMesh.color = new BABYLON.Color3(0, 1, 0);

        startingPoint = current;

    }

    canvas.addEventListener("pointerdown", onPointerDownDrag, false);
    canvas.addEventListener("pointerup", onPointerUpDrag, false);
    canvas.addEventListener("pointermove", onPointerMoveDrag, false);

}

// Step 5: Edit the vertex Position
function enterVertexEditMode(){
    vertexEditMode = true;
    moveMode = false;
    drawMode = false;
    extrudeMode = false;
    runVertexEditMode();
}

function runVertexEditMode(){

    var canvas = engine.getRenderingCanvas();
    var startingPoint;
    var currentMesh;
    var currentMeshNonSphere;

    var isVertex = function (){
        var isVertexBool = false;
        
        // determine the cursor point from scene 2d coordinates to vector 3d cordinates
        var ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
        var rayCastHit = scene.pickWithRay(ray);

        // preparing parameters for ray from cursor perpendicular to ground in -ve y axis direction
        var origin = rayCastHit.pickedPoint;
        var direction = new BABYLON.Vector3(0, -1, 0);
        var length = 5;

        var rayPerpedicular = new BABYLON.Ray(origin, direction, length);
        
        // for debugging 
        // var rayHelper = new BABYLON.RayHelper(rayPerpedicular);
        // rayHelper.show(scene, new BABYLON.Color3(1, 0, 0)); // Red color

        // determine all the meshes hit by the perpendicular ray
        var hits = scene.multiPickWithRay(rayPerpedicular);
        if (hits){
            for (var i=0; i<hits.length; i++){
                // if pointMarker on ground is hit, then it is a vertex of the extruded polygon
                // which can be used to update the extruded polygon
                if(hits[i].pickedMesh.name.startsWith("pointMarker")){
                    currentMeshNonSphere = hits[i].pickedMesh;
                    isVertexBool = true;
                    break;
                }
            }
         }
        return isVertexBool;
    }

    var getGroundPosition = function () {
        var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == ground; });
        if (pickinfo.hit) {
            return pickinfo.pickedPoint;
        }
        return null;
    }

    var onPointerDown = function (evt) {

        if(vertexEditMode === false){
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("pointermove", onPointerMove);
        }

        if (evt.button !== 0) {
            return;
        }

        // check if we are under a mesh
        var pickInfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) {
            console.log(mesh.position);
            return mesh !== ground && (mesh.id.startsWith("pointMarker") || (mesh.id.startsWith("shapeExtruded") && isVertex())); });
        if (pickInfo.hit) {
            currentMesh = pickInfo.pickedMesh;
            console.log("current meshhh: ", currentMesh);
            if(!currentMesh.id.startsWith("pointMarker"))
                currentMesh = currentMeshNonSphere;
            console.log("picked mesh: ", currentMesh);
            startingPoint = getGroundPosition(evt);

            if (startingPoint) { // we need to disconnect camera from canvas 
                setTimeout(function () {
                    camera.detachControl(canvas);
                }, 0);
            }
        }
    }

    var onPointerUp = function () {
        if (startingPoint) {
            camera.attachControl(canvas, true);
            startingPoint = null;            
            return;
        }
    }

    var onPointerMove = function (evt) {
        if (!startingPoint) {
            return;
        }

        var current = getGroundPosition(evt);

        if (!current) {
            return;
        }


        // updating the vertices
        var diff = current.subtract(startingPoint);
        currentMesh.position.addInPlace(diff);

        // updating the line mesh 2D shape
        var curMeshIdxs = currentMesh.id.split("_");
        var lineMeshId = "lines" + curMeshIdxs[0].slice(11);
        var pointToUpdate = Number(curMeshIdxs[1]);
        var lineMesh = scene.getMeshByID(lineMeshId);
        
        var positions = lineMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        var startIdx = 3*Number(pointToUpdate);
        
        positions[startIdx] = currentMesh.position.x;
        positions[startIdx+1] = currentMesh.position.y;
        positions[startIdx+2] = currentMesh.position.z;

        if(startIdx == 0){
            var n = positions.length;
            positions[n-3] = positions[startIdx];
            positions[n-2] = positions[startIdx+1];
            positions[n-1] = positions[startIdx+2];
        }

        var myPoints = [];

        for (var i = 0; i < positions.length; i += 3) {
            var x = positions[i];
            var y = positions[i + 1];
            var z = positions[i + 2];

            myPoints.push(new BABYLON.Vector3(x, y, z));
        }

        lineMesh.dispose(); // Dispose of the existing mesh
        lineMesh = BABYLON.MeshBuilder.CreateLines(lineMeshId, { points: myPoints, updatable: true}, scene);
        lineMesh.color = new BABYLON.Color3(0, 0, 1);
        
        // updating the extruded polygon
        var extrudedMeshId = "shapeExtruded" + curMeshIdxs[0].slice(11);
        var extrudedMesh = scene.getMeshByID(extrudedMeshId);
        extrudedMesh.dispose();
        extrudedMesh = BABYLON.MeshBuilder.ExtrudePolygon(extrudedMeshId, {shape: myPoints, depth: 5, updatable: true}, scene);
        extrudedMesh.position.y = 5;
        
        var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
        material.emissiveColor = new BABYLON.Color3(0, 128, 128);
        extrudedMesh.material = material;
        extrudedMesh.enableEdgesRendering();
        extrudedMesh.edgesWidth = 4.0; // Set the width of the edges
        extrudedMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        startingPoint = current;


    }

    canvas.addEventListener("pointerdown", onPointerDown, false);
    canvas.addEventListener("pointerup", onPointerUp, false);
    canvas.addEventListener("pointermove", onPointerMove, false);

}
    
// Run the app
engine.runRenderLoop(function(){
    scene.render();
});