const {remote,dialog,app} = require('electron').remote;
const fs = require('fs');
const path = require("path");
const { spawn } = require('child_process');
const Jimp = require("jimp")

const pythonScript = "../python/kernelConvolution.py"
const openMPExecutable = "../OpenMP/openMP"

let kernel = null;
let numThreads = 1;

let imagePaths = {"newImagePathBMP":"","newImagePathBase":"","openMPPath":"","pythonPath":"","oldImagePathPNG":"","ready":false,"locked":false};


let oldResultFileLocation = "";


let transferDataDirectory = app.getAppPath()
transferDataDirectory = transferDataDirectory.substr(0,transferDataDirectory.length-4)
transferDataDirectory += "/transferData"

function loadJSON(fileName, cb){
    fs.readFile(path.join(transferDataDirectory,fileName), (err, data) => {
        if (err) throw err;

        cb(JSON.parse(data));
    });
}

function writeJSON(fileName, object, cb){
    fs.writeFile(path.join(transferDataDirectory,fileName),  JSON.stringify(object),(err)=>{
        if(err) throw err;
        if(cb){
            cb();
        }

    });
}


function validateConfigData(){
    numThreads = makeValidThreadNum(numThreads);
    return (imagePaths.ready && (kernel.length === 3 || kernel.length === 5) )

}
function setConfigData(cb){
    loadJSON("config.json", (data)=>{

        if(validateConfigData()){
            data.kernel = kernel;
            data.numThreads = numThreads;
            data.openMPOutputLocation = imagePaths.openMPPath;
            data.pythonOutputLocation = imagePaths.pythonPath;
            data.fileInputLocation = imagePaths.newImagePathBMP;
            data.greyScale = document.getElementById("greyScaleInput").checked;

            writeJSON("config.json",data, ()=>{
                cb(true)

            });
        }
        else{
            cb(false);
        }
    });
}



function copyImageFile(imagePath){
    if(imagePaths.locked){
        console.log("still processing, image uploading is locked")
        return;
    }
    clearOldImageFiles();

    let oldName = path.basename(imagePath);
    let ext = path.extname(imagePath);
    let newName = oldName.substring(0,oldName.length-ext.length) + ".bmp";
    let newResultName = oldName.substring(0,oldName.length-ext.length) + "-" + makeRandomId() +  ".png";


    let newImagePath = path.join(transferDataDirectory,oldName);
    let newImagePathBMP = path.join(transferDataDirectory,newName);
    let newImagePathBase = path.join(transferDataDirectory, oldName.substring(0,oldName.length-ext.length));

    let openMPPath = path.join(transferDataDirectory,"OMP-"+newName);
    let pythonPath = path.join(transferDataDirectory,"python-"+newName);
    console.log("new Image path: ",newImagePath);

    Jimp.read(imagePath, function (err, image) {
        if (err) {
            console.log(err)
        } else {


            image.write(newImagePath, ()=>{


                // document.getElementById("leftContainerInstruction").style.display = "none";
                let leftImageContainer = document.getElementById("leftImageContainer")

                leftImageContainer.innerHTML = "<img src='" + newImagePath + "'>"

                leftImageContainer.style.display = "flex";

                image.write(newImagePathBMP,()=>{
                    imagePaths.newImagePathBMP = newImagePathBMP;
                    imagePaths.newImagePathBase = newImagePathBase;
                    imagePaths.openMPPath = openMPPath;
                    imagePaths.pythonPath = pythonPath;
                    imagePaths.ready = true;
                    // setConfigInputFile(newImagePathBMP,openMPPath,pythonPath);

                })

            })

        }
    })
    // fs.copyFile(imagePath, newImagePath, (err) => {
    //     if (err) throw err;
    //
    //     setConfigInputFile(newImagePath,openMPPath,pythonPath);
    //
    //     // document.getElementById("leftContainerInstruction").style.display = "none";
    //     let leftImageContainer = document.getElementById("leftImageContainer")
    //     leftImageContainer.innerHTML = "<img src='" + newImagePath + "'>"
    //
    //     leftImageContainer.style.display = "flex";
    //
    // });
}

function openFileSelectDialog(){
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png'] },
        ]
    }).then(result => {
        if(result.canceled){
            console.log("User did not select a file");
            return;
        }
        let imagePath = result.filePaths[0];
        copyImageFile(imagePath);

       //console.log(transferDataDirectory)
    }).catch(err => {
        console.log(err)
    })
}

function clearOldImageFiles(){
    imagePaths.ready = false;
    imagePaths.oldImagePathPNG = "";
    fs.readdir(transferDataDirectory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            if(file === "config.json" || file === "OMPTiming.json"|| file === "pythonTiming.json"){

                continue;
            }
            fs.unlink(path.join(transferDataDirectory, file), err => {
                if (err) throw err;
            });
        }
    });
}

function deleteFile(name,cb){
    if(name.length > 0){
        fs.unlink(name, err => {
            if (err) throw err;
            oldResultFileLocation = "";
            cb();
        });
    }
    else{
        if(cb){
            cb();
        }
    }
}
function clearOldTimingData(){
    let td = {"timing":null,fileOutputLocation:null};

    document.getElementById("OMPTiming").innerHTML = "";
    document.getElementById("pythonTiming").innerHTML = "";
    document.getElementById("resultsDiff").innerHTML = "";
    // document.getElementById("usingImage").innerHTML = "";

    writeJSON("OMPTiming.json",td);
    writeJSON("pythonTiming.json",td);
}
//if no old kernels were used, this will fail
// function loadConfigAndClearImageData(){
//     // let config = {};
//     loadJSON("config.json", (data)=>{
//         config = data;
//         if(validKernel(config.kernel)){
//             kernel = config.kernel;
//             state.kernelReady = true;
//         }
//         else{
//             loadDefaultKernel();
//         }
//         syncKernelToGUI();
//
//         let nt = makeValidThreadNum(data.numThreads);
//
//         setConfigNumThreads(nt);
//
//         document.getElementById("numThreadsInput").value = nt;
//
//
//        // config.kernel = kernel;
//         config.fileInputLocation = null;
//         writeJSON("config.json",config);
//     });
//
//
//     return kernel;
//
// }

function createBlankKernel(size){
    let kernel = []
    for(let r = 0; r < size; r++){
        let row = [];
        for(let c = 0; c < size; c++){
            row.push(0);
        }
        kernel.push(row);
    }
    return kernel;

}
function validKernel(k){
    if(!k){
        return k;
    }
    let size = k.length;
    if(size !== 3 || size !== 5){
        return false;
    }

    for(let r = 0; r < size; r++){
        if(k[r].length !== size){
            return false;
        }
        for(let c = 0; c < size; c++){
            if(!Number.isInteger(k[r][c])){
                return false;
            }
        }
    }

    return true;
}


function syncKernelToGUI(){

    let ks = "k";
    if(kernel.length === 3) {
        ks += "3";
    }
    else if(kernel.length === 5) {
        ks += "5";
    }


    for(let r = 0; r < kernel.length; r++){
        for(let c = 0; c< kernel.length; c++){
            let kId = ks + "row" + (r+1) + "col" + (c+1);
            document.getElementById(kId).value = kernel[r][c];
        }
    }
    if(kernel.length === 3){
        document.getElementById("threeKernel").style.display = "flex";
        document.getElementById("fiveKernel").style.display = "none";
        document.getElementById("kernelSizeSelector").selectedIndex = 0;

    }
    else{
        document.getElementById("threeKernel").style.display = "none";
        document.getElementById("fiveKernel").style.display = "flex";
        document.getElementById("kernelSizeSelector").selectedIndex = 1;
    }



}
function readKernelFromGUI(){
    let selector = document.getElementById("kernelSizeSelector");
    let ks = "k";
    if(selector.value === "3"){
        ks += "3";
    }
    else if(selector.value === "5"){
        ks += "5";
    }
    let n = parseInt(selector.value);
    kernel = createBlankKernel(n);
    for(let r = 0; r < kernel.length; r++){
        for(let c = 0; c< kernel.length; c++){
            let kId = ks + "row" + (r+1) + "col" + (c+1);
             kernel[r][c] = Number(document.getElementById(kId).value);
        }
    }

}

document.querySelectorAll('.kInput').forEach(item => {
    item.addEventListener('change', (event) => {
        readKernelFromGUI();
        console.log(kernel);
    })
})

function makeValidThreadNum(nt){
    if(!nt || nt < 0){
        return 1;
    }
    if(nt > 64){
        nt = 64;
    }
    return nt;
}
function updateNumThreads(){
    let threadSelector = document.getElementById("numThreadsInput")
    let nt = Number(threadSelector.value);
    nt = makeValidThreadNum(nt)
    threadSelector.value = nt;
    numThreads = nt;

}
function changeKernelSize(){
    let selector = document.getElementById("kernelSizeSelector");
    if(selector.value === "3"){
        if(kernel.length !== 3){
            let newKernel = createBlankKernel(3);
            for(let r = 1; r < 4; r++){
                for(let c = 1; c < 4; c++){
                    newKernel[r-1][c-1] = kernel[r][c];
                }
            }
            kernel = newKernel;

        }
    }
    else if(selector.value === "5"){
        if(kernel.length !== 5){
            let newKernel = createBlankKernel(5);
            for(let r = 0; r < 3; r++){
                for(let c = 0; c < 3; c++){
                    newKernel[r+1][c+1] = kernel[r][c];
                }
            }
            kernel = newKernel;

        }

    }

    syncKernelToGUI();

}
function setKernelPreset(){
    let selector = document.getElementById("kernelPresetSelector");
    if(selector.value === "g3"){
        let kg = [[1,2,1],[2,4,2],[1,2,1]]
        for(let kr = 0; kr < 3; kr++){
            for(let kc = 0; kc < 3; kc++) {
                kg[kr][kc] /= 16;
            }
        }
        kernel = kg;
        document.getElementById("greyScaleInput").checked = false;

    }
    else if(selector.value === "g5"){
        let kg = [[1,4,6,4,1],[4,16,24,16,4],[6,24,36,24,6],[4,16,24,16,4],[1,4,6,4,1]]
        for(let kr = 0; kr < 5; kr++){
            for(let kc = 0; kc < 5; kc++) {
                kg[kr][kc] /= 256;
            }
        }
        kernel = kg;
        document.getElementById("greyScaleInput").checked = false;
    }
    else if(selector.value === "b3"){
        let kg = [[1,1,1],[1,1,1],[1,1,1]]
        for(let kr = 0; kr < 3; kr++){
            for(let kc = 0; kc < 3; kc++) {
                kg[kr][kc] /= 9;
            }
        }
        kernel = kg;
        document.getElementById("greyScaleInput").checked = false;
    }
    else if(selector.value === "b5"){
        let kg = [[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]]
        for(let kr = 0; kr < 5; kr++){
            for(let kc = 0; kc < 5; kc++) {
                kg[kr][kc] /= 25;
            }
        }
        kernel = kg;
        document.getElementById("greyScaleInput").checked = false;
    }
    else if(selector.value === "e3-1"){
        kernel = [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]]
        document.getElementById("greyScaleInput").checked = true;
    }

    else if(selector.value === "e3-2"){
        kernel = [[0,1,0],[-1,0,1],[0,-1,0]]
        document.getElementById("greyScaleInput").checked = true;

    }
    else if(selector.value === "e3-3"){
        kernel = [[-1,-1,0],[-1,0,1],[0,1,1]]
        document.getElementById("greyScaleInput").checked = true;

    }
    else if(selector.value === "s3"){
        kernel = [[0,-1,0],[-1,5,-1],[0,-1,0]]
        document.getElementById("greyScaleInput").checked = false;

    }
    else if(selector.value === "us5"){
        let kg = [[1,4,6,4,1],[4,16,24,16,4],[6,24,-476,24,6],[4,16,24,16,4],[1,4,6,4,1]]
        for(let kr = 0; kr < 5; kr++){
            for(let kc = 0; kc < 5; kc++) {
                kg[kr][kc] /= -256;
            }
        }
        kernel = kg;
        document.getElementById("greyScaleInput").checked = false;

    }
    else if(selector.value === "em3"){
        kernel = [[-2,-1,0],[-1,1,1],[0,1,2]]
        document.getElementById("greyScaleInput").checked = true;

    }
    syncKernelToGUI();

    selector.selectedIndex = 0;

}

function clearResultImage(){
    document.getElementById("parameters").style.display = "flex";
    document.getElementById("imageResults").style.display = "none";
}
function displayResults(OMPTiming,pythonTiming){
    let fastestTiming = OMPTiming;
    let using = "OMP"
    if(pythonTiming.timing && pythonTiming.timing < OMPTiming.timing){
        fastestTiming = pythonTiming;
        using = "Python"
    }
    console.log(using)
    console.log(fastestTiming)
    Jimp.read(fastestTiming.fileOutputLocation, function (err, image) {
        if (err) {
            console.log(err)
        }
        else {
            imagePaths.oldImagePathPNG = imagePaths.newImagePathBase;//fastestTiming.fileOutputLocation.substring(0,fastestTiming.fileOutputLocation.length-4)
            imagePaths.oldImagePathPNG += "-" + makeRandomId() + ".png";
            //oldResultFileLocation = newFileLocation;
            image.write(imagePaths.oldImagePathPNG, ()=>{


                let rightImageContainer = document.getElementById("rightImageContainer")
                rightImageContainer.innerHTL = "";
                rightImageContainer.innerHTML = "<img src='" + imagePaths.oldImagePathPNG + "'>"
                rightImageContainer.style.display = "flex";

                document.getElementById("parameters").style.display = "none";
                document.getElementById("imageResults").style.display = "flex";

                document.getElementById("OMPTiming").innerHTML = "OMP Time: " + OMPTiming.timing + "s";
                document.getElementById("pythonTiming").innerHTML = "Python Time: " + pythonTiming.timing + "s";
                //document.getElementById("resultsDiff").innerHTML = "Results Diff: "
                // document.getElementById("usingImage").innerHTML = "Image From: " + using;
                imagePaths.locked = false;
                console.log("unlocking image paths", imagePaths)
            })

        }
    })



    //const pythonChild = spawn("diff",[pythonScript]);



}


function getAndDisplayResults(){
    let OMPTiming, pythonTiming;

    loadJSON("../transferData/OMPTiming.json", (t)=>{
        OMPTiming = t;
        if(pythonTiming){
            displayResults(OMPTiming,pythonTiming);
        }
    })
    loadJSON("../transferData/pythonTiming.json", (t)=>{
        pythonTiming = t;
        if(OMPTiming){
            displayResults(OMPTiming,pythonTiming);
        }
    })

}
function performFilter(){


    deleteFile(imagePaths.oldImagePathPNG, ()=>{


        setConfigData((ready)=>{

            if(!ready){
                console.log("not ready to perform filter")
                return;
            }
            imagePaths.locked = true;
            console.log("locking image paths", imagePaths)

            clearOldTimingData();

            const pythonChild = spawn("python3",[pythonScript]);
            const openMPChild = spawn(openMPExecutable);
            let pythonDone = false;
            let openMPDone = false;

            pythonChild.stdout.on('data', (data) => {
                console.log(`python stdout: ${data}`);
            });
            pythonChild.stderr.on('data', (data) => {
                console.log(`python stderr: ${data}`);
            });
            openMPChild.stdout.on('data', (data) => {
                console.log(`openMP stdout: ${data}`);
            });
            openMPChild.stderr.on('data', (data) => {
                console.log(`openMP stderr: ${data}`);
            });


            pythonChild.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);
                pythonDone = true;
                if(openMPDone && pythonDone){
                    getAndDisplayResults();
                }
            });

            openMPChild.on('close', (code) => {
                console.log(`openMP process exited with code ${code}`);
                openMPDone = true;
                if(openMPDone && pythonDone){
                    getAndDisplayResults();
                }
            });

        });

    });

}

function loadDefaultKernel(){
    kernel = [
        [0,0,0],
        [0,1,0],
        [0,0,0]
    ]

    syncKernelToGUI();
}

function main(){
    clearOldImageFiles();
    clearOldTimingData();
    loadDefaultKernel();

    // loadConfigAndClearImageData()



}

main();

let lc = document.getElementById("LeftContainer");
let lci = document.getElementById("leftContainerInstruction");
let dragMask = document.getElementById("dragMask");
// lci.addEventListener('dragleave', (event)=>{
//     event.preventDefault();
// })

lc.addEventListener('dragenter', (event)=>{
    // lc.classList.add("highlight")
    lc.classList.add("highlight")

    dragMask.style.display="flex";
})
// dragMask.addEventListener('dragenter', (event)=>{
//     lc.classList.add("highlight")
//     // dragMask.style.display="flex";
// })
dragMask.addEventListener('dragleave', (event)=>{
    lc.classList.remove("highlight")
    dragMask.style.display="none";
})
dragMask.addEventListener('drop', (event)=>{
    lc.classList.remove("highlight")
    dragMask.style.display="none";
    let files = event.dataTransfer.files;

    if(files.length === 1){
        console.log(files[0].path);
        copyImageFile(files[0].path);
    }


})


dragMask.addEventListener('dragenter', preventDefaults, false)
dragMask.addEventListener('dragover', preventDefaults, false)
dragMask.addEventListener('dragleave', preventDefaults, false)
dragMask.addEventListener('drop', preventDefaults, false)

function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

function makeRandomId(){
    let idchars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','1','2','3','4','5','6','7','8','9','0']
    let str = ""
    let strSize = 5
    for(let i = 0; i < strSize; i++){
        str += idchars[Math.floor(Math.random()*idchars.length)];
    }
    return str;
}
