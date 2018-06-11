var express = require("express");
var Promise = require("bluebird");
var bhttp   = require("bhttp");
var cors    = require('cors');

var app     = express();
app.use(cors());

var categories = [];
var dataResult;
var size_result = 50;

app.get("/events",function(request, response){
  if (!request.query.center) {
      response.status(500).json({message: "Please specify the lat and lng!"});
  } else if (!request.query.distance) {
      response.status(500).json({message: "Please specify the distance!"});
  } else if (!request.query.category) {
      response.status(500).json({message: "Please specify the category code 1 - Bar, 2 Club or 0 to all !"});
  } else {

    var center   = request.query.center;
    var distance = request.query.distance;
    var category = request.query.category;

    Promise.try(function() {
      dataResult = [];

      var url  = 'https://graph.facebook.com/v2.9/';
      url     += 'search?type=place';
      url     += '&center='   + center;
      url     += '&distance=' + distance;
      url     += '&fields=events{name%2Ccover%2Cpicture%2Cstart_time%2Cend_time%2Cplace}%2Ccategory_list';
      url     += '&limit=100';
      url     += '&access_token=119866418119421|bd43dea92fa868d5852e7092a5094bad';

      facebook_categories(category);
      return request_facebook(url);
    }).then(function(results) {
      if(results){

        results = results.filter(function(elem, pos) {
          return results.indexOf(elem) == pos;
        })
        console.log(results.length);
      }
      response.json(results);
    })

  }

});

function facebook_categories(categorycode){
  return Promise.try(function() {
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

function request_facebook(url) {
  //console.log('request_facebook:', url);
  return Promise.try(function() {
      return bhttp.get(url);
  }).then(function(response) {
    var jsonResult = JSON.parse(response.body);
    if(jsonResult.data){
      for(let i of jsonResult.data){
        if(i.category_list){
          if (verify_category(i.category_list)){
            if(i.events && i.events.data){
              for(let ev of i.events.data){
                var startdate = new Date(ev.start_time);

                if(!ev.place){
                  console.log('Event without place:', ev);
                  continue;
                }

                if(startdate > new Date()){
                  if(dataResult.length < size_result){
                    dataResult.push(ev);
                  } else {
                    return dataResult;
                  }
                }
              }
            }
          }
        }
      }
    }

    if(jsonResult.paging){
      var next = jsonResult.paging.next;
      return Promise.try(function() {
          return request_facebook(next);
      }).then(function(recursiveResults) {
          return recursiveResults;
      });
    }
    return dataResult;
  });
}

// Verifica se local pertence a catogorias de interesse
function verify_category(categoryList){
  for(let c of categoryList){
    var exist = categories.find(ca => ca.id_facebook == c.id);
    //console.log(exist);
    if(exist){
      return true;
    }
  }
  return false;
}

app.listen(8092);
