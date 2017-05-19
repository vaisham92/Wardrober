/**
 * Created by Student on 5/18/17.
 */

var mongo = require("./mongo");
var mongodb = require('mongodb');
var fs = require('fs');
var http = require('http');
var util = require('util');


var mongoURL = "mongodb://vaishnavi:marias@ds147551.mlab.com:47551/wardrober";
var dbHelper = require('./mongo-db-helper');
var uuid = require('node-uuid');
var path = require('path');

exports.postImagesForUserByPuid = function(request, response) {
    mongo.connect(mongoURL, function() {
        var users = mongo.collection('Users');
        dbHelper.doesExistInDb(users, {
                "puid": request.session.user._id
            }, function() {
                dbHelper.readOne(users, {"puid":request.session.user._id}, null, function(data) {
                    var imageID = uuid.v4() + ".png";
                    var userpuid = request.session.user._id;
                    data[userpuid].images.push(imageID);
                    console.log(data);
                    //already present in db

                    var searchData = {};
                    searchData.puid = request.session.user._id;
                    var postData = {};
                    var imageKey = {};
                    imageKey[userpuid] = data[userpuid];
                    postData['$set'] = imageKey;
                    dbHelper.updateCollection(users, searchData, postData, function() {
                        mongodb.MongoClient.connect(mongoURL, function(error, db) {
                            var bucket = new mongodb.GridFSBucket(db, {
                                chunkSizeBytes: 1024,
                                bucketName: 'images'
                            });
                            for (key in request) {
                                // console.log(key + ": ");
                            }
                            console.log(request);
                            fs.createReadStream(request.files.image.path).
                            pipe(bucket.openUploadStream(imageID)).
                            on('error', function(error) {
                                if(error) {
                                    response.send({
                                        "status" : 500,
                                        "errmsg" : "Error: Cannot upload image: " + error
                                    });
                                }
                            }).
                            on('finish', function() {
                                console.log('done!');
                                response.send({
                                    "status" : 200,
                                    "message" : "image uploaded successfully for user with puid: " + request.session.user._id
                                });
                            });
                        });
                    });
                });
            },
            function() {
                var puidData = {};
                var postData = {};
                //console.log("farmerpuid: " + farmerpuid);
                var imageID = uuid.v4() + ".png";
                puidData.images = [];
                puidData.images.push(imageID);
                puidData.videos = "";
                postData.puid = request.session.user._id;
                postData[request.session.user._id] = puidData;
                dbHelper.insertIntoCollection(users, postData, function() {
                    mongodb.MongoClient.connect(mongoURL, function(error, db) {
                        var bucket = new mongodb.GridFSBucket(db, {
                            chunkSizeBytes: 1024,
                            bucketName: 'images'
                        });
                        for (key in request) {
                            console.log(key + ": ");
                        }
                        fs.createReadStream(request.files.image.path).
                        pipe(bucket.openUploadStream(imageID)).
                        on('error', function(error) {
                            if(error) {
                                response.send({
                                    "status" : 500,
                                    "errmsg" : "Error: Cannot upload image: " + error
                                });
                            }
                        }).
                        on('finish', function() {
                            console.log('done!');
                            response.send({
                                "status" : 200,
                                "message" : "Image uploaded successfully for user with puid: " + request.session.user._id
                            });
                        });
                    });
                });
            });
    });
};

exports.getImageUrlsForUserByPuid = function(request, response) {
    mongo.connect(mongoURL, function() {
        var users = mongo.collection('Users');
        dbHelper.doesExistInDb(users, {
            "puid" : request.session.user._id
        }, function() {
            dbHelper.readOne(users, {"puid": request.session.user._id}, null, function(data) {
                //uuid.v4();
                console.log(JSON.stringify(data));
                var imageUrls = [];
                for (var index = 0; index < data[request.session.user._id].images.length; index++) {
                    var imageUrl = 'api/users/images/' + data[request.params.puid].images[index];
                    imageUrls.push(imageUrl);
                }
                response.send({
                    "status" : 200,
                    "urls" : imageUrls
                });
            });
        }, function() {
            response.send({
                "status" : 404,
                "errmsg" : "Error: No images found for user in db with puid: " + request.session.user._id
            });
        });
    });
};

exports.getImageByImageUrl = function(request, response) {
    try {
        var images = mongo.collection('images.files');
        dbHelper.doesExistInDb(images, {
            "filename" : request.params.imageName
        },function() {
            response.setHeader('Content-type', 'image/png');
            mongodb.MongoClient.connect(mongoURL, function(error, db) {
                var bucket = new mongodb.GridFSBucket(db, {
                    chunkSizeBytes: 1024,
                    bucketName: 'images'
                });
                bucket.openDownloadStreamByName(request.params.imageName).
                pipe(response).
                on('error', function(error) {
                }).
                on('finish', function() {
                });
            });
        }, function() {
            var filePath = "public/images/default.jpg";
            var stat = fs.statSync(filePath);

            response.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': stat.size
            });

            var readStream = fs.createReadStream(filePath);
            readStream.pipe(response);
        });
    }
    catch(error) {
        response.send({
            "status" : 404,
            "errmsg" : "Error: Unable to get images: " + error
        });
    }
};