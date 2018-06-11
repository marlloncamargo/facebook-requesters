var express = require("express");
var Promise = require("bluebird");
var bhttp   = require("bhttp");
var cors    = require('cors');

var app     = express();
app.use(cors());

var categories = [];
var dataResult;

app.get("/places",function(request, response){
  if (!request.query.center) {
      response.status(500).json({message: "Please specify the lat and lng!"});
  } else if (!request.query.distance) {
      response.status(500).json({message: "Please specify the distance!"});
  } else if (!request.query.category) {
      response.status(500).json({message: "Please specify the category code 1 - Bar, 2 Club or 0 to all !"});
  } else {

    var center      = request.query.center;
    var distance    = request.query.distance;
    var category    = request.query.category;
    var size_result = 30;

    Promise.try(function() {
      dataResult = [];

      var url  = 'https://graph.facebook.com/v2.9/';
      url     += 'search?type=place';
      url     += '&center='   + center;
      url     += '&distance=' + distance;
      url     += '&fields=name%2Clocation%2Ccategory%2Ccategory_list%2Cpicture%2Cevents';
      url     += '&limit=100';
      url     += '&access_token=119866418119421|bd43dea92fa868d5852e7092a5094bad';

      facebook_categories(category);
      return request_facebook(url, size_result);
    }).then(function(results) {
      results = results.filter(function(elem, pos) {
        return results.indexOf(elem) == pos;
      })
      console.log(results.length);

      response.json(results);
    })

  }

});

app.get("/place",function(request, response){
  if (!request.query.q) {
      response.status(500).json({message: "Please specify the query!"});
  } else if (!request.query.category) {
      response.status(500).json({message: "Please specify the category code 1 - Bar, 2 Club or 0 to all !"});
  } else {

    var q           = request.query.q;
    var category    = request.query.category;
    var size_result = 10;

    Promise.try(function() {
      dataResult = [];

      var url  = 'https://graph.facebook.com/v2.9/';
      url     += 'search?type=place';
      url     += '&q=' + q;
      url     += '&fields=name%2Clocation%2Ccategory%2Ccategory_list%2Cpicture%2Cevents';
      url     += '&limit=5';
      url     += '&access_token=119866418119421|bd43dea92fa868d5852e7092a5094bad';

      console.log(url);
      facebook_categories(category);
      return request_facebook(url, size_result);
    }).then(function(results) {
      results = results.filter(function(elem, pos) {
        return results.indexOf(elem) == pos;
      })
      console.log(results.length);

      response.json(results);
    })

  }

});

function facebook_categories(categorycode){
  return Promise.try(function() {
    //var url_categories = 'http://45.62.241.134:8090/categories/'
    var url_categories = 'http://localhost:8090/categories/'
    if(categorycode != 0){
      url_categories += categorycode;
    }
    console.log('facebook_categories:', url_categories);
    return bhttp.get(url_categories);
  }).then(function(facabookcategories) {
    if(facabookcategories.body){
      categories = facabookcategories.body;
    }
  });
}

function request_facebook(url, size_result) {
  return Promise.try(function() {
      return bhttp.get(url);
  }).then(function(response) {
    var jsonResult = JSON.parse(response.body);

    if(jsonResult.data){
      for(let i of jsonResult.data){

        if(!i.events){
          continue;
        }

        if(!i.category_list){
          continue;
        }

        let categoryList = i.category_list;
        for(let fc of categories){
          var exist = categoryList.find(c => c.id == fc.id_facebook);
          if(!exist){
            continue;
          }

          if(dataResult.length < size_result){
            if (!dataResult.indexOf(i) > -1) {
              dataResult.push(i);
            }
          } else {
            return dataResult;
          }
        }
      }
    }


    if(jsonResult.paging){
      var next = jsonResult.paging.next;
      return Promise.try(function() {
          return request_facebook(next, size_result);
      }).then(function(recursiveResults) {
          return recursiveResults;
      });
    }
    return dataResult;
  });
}

app.listen(8091);
