const express = require("express");
const router = express.Router();
const fs = require("fs");
const fsExtra = require("fs-extra");
const youtubedl = require('youtube-dl');
const multer  = require('multer');
const  path = require("path");
const uploadFiles = "./public/songs/";
TRACKS_PATH = "./public/multitrack/";

var converter = require('video-converter');
converter.setFfmpegPath("./ffmpeg/bin/ffmpeg.exe", function(err) {
  if (err) throw err;
});

var storage = multer.diskStorage({
    destination: uploadFiles,
    filename: function (req, file, cb) {
      originalname = file.originalname;
      splitName = originalname.split(path.extname(file.originalname))
      name = splitName[0].replace(/[^A-Z0-9]/ig, "");
      cb(null, name + '-' + Date.now() +path.extname(file.originalname));
    }
}) 
var upload = multer({ storage: storage }).single("musicFile") 

router.get("/",function(req,res){
    res.render('index');
});

router.post("/formUpload",(req,res)=>{
upload(req, res, function (err) {
    if (err) {
      // An unknown error occurred when uploading.
      console.log(err);
      res.redirect("/");
    }
      
    const config = {
      onUploadProgress: function(progressEvent) {
        var percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(percentCompleted)
      }
    }
      
      let link = req.body.link;
      let stems = req.body.stems;
      
      let renamedFileName = "";
      let originalName = "";
      let splitName = [""];
      if(typeof(req.file) == "undefined"){

        console.log(req.body);
        
        var videoName = "";
        var video = youtubedl(link)

        video.on('error', function error (err) {
          console.log(err.stack)
        })

        var size = 0
        video.on('info', function (info) {
          size = info.size
          videoName = info._filename
          console.log(videoName)
          var output = path.resolve(__dirname,uploadFiles+info._filename)
          video.pipe(fs.createWriteStream(output))
        })

        var pos = 0
        video.on('data', function data (chunk) {
          pos += chunk.length
          // `size` should not be 0 here.
          if (size) {
            var percent = ((pos / size) * 100).toFixed(2)
            process.stdout.cursorTo(0)
            process.stdout.clearLine(1)
            process.stdout.write('File downloading status : '+percent + '%')

            if(percent == 100){
              var tempFileName = videoName.split(".mp4")[0]
              var fname = tempFileName.replace(/[^a-zA-Z0-9]/g, "").toString('ascii');
              fname = fname +"_"+Date.now()
              var fileName = fname+ '.mp3'

              console.log("\n FileName : "+fileName);

              // convert mp4 to mp3
              converter.convert(uploadFiles+videoName, uploadFiles+fileName , function(err) {
                if (err) throw err;
                console.log("\n File download completed...");
                ChildProcessScript(fileName,stems);

                try {
                  fs.unlinkSync(uploadFiles+videoName)
                  //file removed
                } catch(err) {
                  console.error(err)
                }
                
                res.send({
                  "status":true,
                  originalFileName : fileName,
                  renamedFileName : fileName,
                  folderName : fname
                });
              });
            }

          }
        })

      }else{
        console.log(req.file);
        renamedFileName = req.file.filename;
        originalName = req.file.originalname;
        splitName = renamedFileName.split(path.extname(originalName))

        ChildProcessScript(renamedFileName,stems)

        res.send({
          "status":true,
          originalFileName : originalName,
          renamedFileName : renamedFileName,
          folderName : splitName[0]
        });
      }
  })

});

const ChildProcessScript = function(fileName,stems){
const { spawn } = require('child_process');
const node = spawn("python",["./spleeter_python.py",fileName,stems]);
node.stdout.on('data', (data) => {
  console.log("stdout:"+ data.toString());
});

node.stderr.on('data', (data) => {
  console.log("stderr:"+ data.toString());
});
}

router.get("/checkOutputFolder", async (req, res) => {
  const folderName = req.query.name;
  let folderPath = TRACKS_PATH+folderName
  let data = {};
  //check directory exist's or not
  if (fs.existsSync(folderPath)) {
      data.player = true;
      data.name = folderName;
      data.checkFolder = true;
  }
  res.send(data);

});

router.get("/deleteUploadedSong", async (req, res) => {
  const name = req.query.name;
  const filePath = "./public/songs/"+name;
  fs.access(filePath, error => {
    if (!error) {
        fs.unlinkSync(filePath);
        res.send({
          "file_delete":true
        });
    } else {
        console.log(error);
        res.send({
          "file_delete":false
        });
    }
});
})

router.get("/mt5Player", async (req, res) => {
  const name = req.query.name;
  if(typeof(name)!="undefined"){
    res.render('web_audio',{name:name});
  }else{
    res.send();
  }
  
});

router.get("/deleteTrack/:name", async (req, res) => {
  const trackName= req.params.name;
  fsExtra.remove(TRACKS_PATH+trackName,function(){
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify({"delete" : "done"}));
    res.end();
  });
});

router.get("/sharemusic/:name", async (req, res) => {
  const trackName= req.params.name;
  res.render('player',{name:trackName});
});

// player routing
router.get("/track", async (req, res) => {
    const trackList = await getTracks();
  
    if (!trackList) {
      return res.send(404, "No track found");
    }
  
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(trackList));
    res.end();
  });
  
  // routing
  router.get("/track/:id", async (req, res) => {
    const id = req.params.id;
    const track = await getTrack(id);
  
    if (!track) {
      return res.send(404, 'Track not found with id "' + id + '"');
    }
  
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(track));
    res.end();
  });
  
  const getTracks = async () => {
    const directories = await getFiles(TRACKS_PATH);
    return directories.filter(dir => !dir.match(/^.DS_Store$/));
  };
  
  const endsWith = (str, suffix) => str.indexOf(suffix, str.length - suffix.length) !== -1;
  
  isASoundFile = fileName => {
    if (endsWith(fileName, ".mp3")) return true;
    if (endsWith(fileName, ".ogg")) return true;
    if (endsWith(fileName, ".wav")) return true;
    if (endsWith(fileName, ".m4a")) return true;
    return false;
  };
  
  const getTrack = async id =>
    new Promise(async (resolve, reject) => {
      if (!id) reject("Need to provide an ID");
  
      const fileNames = await getFiles(`${TRACKS_PATH}/${id}`);
  
      if (!fileNames) {
        reject(null);
      }
  
      fileNames.sort();
  
      const track = {
        id: id,
        instruments: fileNames
          .filter(fileName => isASoundFile(fileName))
          .map(fileName => ({
            name: fileName.match(/(.*)\.[^.]+$/, "")[1],
            sound: fileName
          }))
      };
  
      resolve(track);
    });
  
  const getFiles = async dirName =>
    new Promise((resolve, reject) =>
      fs.readdir(dirName, function(error, directoryObject) {
        if (error) {
          reject(error);
        }
  
        if (directoryObject !== undefined) {
          directoryObject.sort();
        }
        resolve(directoryObject);
      })
    );

module.exports = router;