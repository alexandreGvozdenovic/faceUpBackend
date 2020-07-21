var express = require('express');
var router = express.Router();
const fs = require('fs');
var uniqid = require('uniqid');

/* AZURE Face Recognition SETUP */
var request = require('sync-request');
const subscriptionKey = 'ea0a73aef19c40998c8dd66970cbaa5e';
const URL = 'https://faceupapp.cognitiveservices.azure.com/face/v1.0/detect';
const params = {
  'returnFaceId': 'true',
  'returnFaceLandmarks': 'false',
  'returnFaceAttributes': 'age,gender,headPose,smile,facialHair,glasses,' +
      'emotion,hair,makeup,occlusion,accessories,blur,exposure,noise'
};

/* CLOUDINARY SETUP */
var cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'ddqs0epmj', 
  api_key: '818868939623322', 
  api_secret: 'P5Pb0z-cUBkf9L2ADj82U6btiL8' 
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST Media UPLOAD route */

router.post('/upload', async function(req, res, next){
  var imagePath = './tmp/'+uniqid()+'.jpg';
  var resultCopy = await req.files.picture.mv(imagePath);
  var resultCloudinary = await cloudinary.uploader.upload(imagePath);
  const options = {
    qs: params,
    body: '{"url": ' + '"' + resultCloudinary.url + '"}',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key' : subscriptionKey
    }
  };
  var rawResultAzure = await request('POST', URL, options);
  var resultAzure = JSON.parse(rawResultAzure.body);
  console.log(resultAzure);
  if(resultAzure.length === 0) {
    console.log('Pas de visage détécté')
    res.json({error: 'Pas de visage détécté'})
  } else {
    /* Test Gender */
    var gender = 'homme';
    if(resultAzure[0].faceAttributes.gender === 'female') {
      gender = 'femme'
    }
    /* Test Barbe True False */
    var beard = false;
    if(resultAzure[0].faceAttributes.facialHair.beard > 0) {
      beard = true;
    }
    /* Test Lunettes True False */
    var glasses = true;
    if(resultAzure[0].faceAttributes.glasses === 'NoGlasses') {
      glasses = false;
    }

      /* Test Sourire True False */
      var smile = false;
      if(resultAzure[0].faceAttributes.smile > 0.7) {
        smile = true;
      }
      /* Test Cheveux */
      var hairColor = '';
      switch (resultAzure[0].faceAttributes.hair.hairColor[0].color) {
        case 'brown':
          hairColor = 'cheveux châtain';
          break;
        case 'black':
          hairColor = 'cheveux bruns';
          break;
        case 'blond':
          hairColor = 'cheveux blonds';
          break;
        case 'red':
          hairColor = 'cheveux roux';
          break;
        case 'grey':
          hairColor = 'cheveux gris';
          break;
        default:
        console.log(`Erreur couleur => ${resultAzure[0].faceAttributes.hair.hairColor[0].color}.`);
      }

    if(!resultCopy) {
      res.json({
        result: true, 
        url: resultCloudinary.url, 
        sexe: gender, 
        age: resultAzure[0].faceAttributes.age, 
        glasses: glasses,
        beard: beard,
        smile: smile,
        hairColor: hairColor
      });       
    } else {
      res.json({result: false, message: resultCloudinary} );
    }    
  }
  fs.unlinkSync(imagePath);
});
module.exports = router;
