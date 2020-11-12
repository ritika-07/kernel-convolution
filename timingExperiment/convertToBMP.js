const Jimp = require("jimp")
const path = require("path");
const fs = require('fs');

let imageDirectory = app.getAppPath()
iamgeDirectory = imageDirectory.substr(0,imageDirectory.length-4)
imageDirectory += "/timingExperiment"

let imageNamesFileName = "thisIsWhereTheListOFImagesIs.txt"


function getFileNames(cb){
    fs.readFile(path.join(imageDirectory,imageNamesFileName), (err, data) => {
        if (err) throw err;
        console.log(data)
        //if its json cb(JSON.parse(data));
    });
}



let fileList = []//"/path/to/img.jpg","/path/to/otherimage/img2.jpg


for(let f = 0; f < fileList.length; f++){
    let imagePath = fileList[f]

    let ext = path.extname(imagePath);

    let newImagePath = imagePath.substring(0,imagePath.length-ext.length);
    newImagePath += ".bmp"

    Jimp.read(imagePath, function (err, image) {
        if (err) {
            console.log(err)
        }
        else {

            image.write(newImagePath, ()=>{
                console.log("created new bmp file: " + newImagePath)
            })
        }
    })
}
