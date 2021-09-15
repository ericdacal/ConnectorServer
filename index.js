const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const hostname = '0.0.0.0';
const port = 3000


// Connection URL
//mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]

//const url = 'mongodb://13.58.54.243:27017 '
//const client = new MongoClient(url)
var url = null;
var client = null;

app.use(express.static('public'));

function type(t) {
  var tyof = (typeof t);
  if(tyof == 'object') {
    var date = Date.parse(t);
    if(isNaN(date)) return tyof;
    else return 'date';
  }
  else return tyof;
}

function unionDocuments(array1, array2) {
  if(array2.length == 0) array2 = array1;
  var diff = array1.filter(function(x) { return array2.indexOf(x) < 0 })
  array2 = array2.concat(diff);
  return array2;
}


function joinKeysType(keys, types) 
{
  var keysTypes = {};
  for (let index = 0; index < keys.length; index++) {
    var key = keys[index];
    keysTypes[key] = types[index];
  }
  return keysTypes;
}

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ a: 1 }));
})


app.get('/log', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  console.log(req.query['message']);
  res.end(JSON.stringify({ status: 'OK' }));
})

app.get('/connection', (req, res) => {
  
  var ip = req.query['ip'];
  var port = req.query['port'];
  var user = req.query['user'];
  var pass = req.query['pass']
  url = 'mongodb://' + user + ':' + pass + '@' + ip;
  console.log(url);
  client = new MongoClient(url);
  res.end(JSON.stringify({ status: 'OK' }));
})

app.get('/connectiondb', (req, res) => {
  var ip = req.query['ip'];
  var port = req.query['port'];
  var db = req.query['db']
  var user = req.query['user'];
  var pass = req.query['pass'];
  var userPassString = '';
  if(user !== undefined && pass !== undefined) userPassString = user + ':' + pass + '@';
  if(db === undefined) db = ''; 
  url = 'mongodb://' + userPassString + ip + ':' + port + '/' + db;
  try { 
    client = new MongoClient(url);
    res.end(JSON.stringify({ status: 'OK' }));
  }
  catch(err) {
    console.log(err);
    res.end(JSON.stringify({ status: 'ERROR' }));
  }
})



app.get('/databases', (req, res) => {
  var names = [];
  client
    .connect()
    .then(
        client =>
          client
            .db()
            .admin()
            .listDatabases()
    )
  .then(function(dbs) {
    //console.log("Mongo databases", dbs);
    dbs["databases"].forEach(db => {
      names.push(db.name);
    });
  })
  .finally(function() {
    client.close()
    names.shift();
    res.end(JSON.stringify(names)); 
  });
  
})


app.get('/collections', (req, res) => {
  var dbName = req.query['db'];
  var names = [];
  client
      .connect()
      .then(
        client =>
          client
            .db(dbName)
            .listCollections()
            .toArray() // Returns a promise that will resolve to the list of the collections
      )
      .then(function(cols){
        for(var i = 0; i < cols.length; ++i) {
          names.push(cols[i].name);
        }
      })
      .finally(function() {
        client.close();
        console.log(names);
        res.end(JSON.stringify(names));
      })
  
})

app.get('/schema', (req, res) => {
  console.log('schema');
  var dbName = req.query['db'];
  var collectionName = req.query['collection'];
  client.connect(function(err, db) {
    if (err) throw err;
    var dbo = db.db(dbName);
    keys = [];
    var cursor = dbo.collection(collectionName).find().limit(100).toArray(function(err,result){
      if(err) throw err;
      result.forEach(document => {
        documentKeys = Object.keys(document);
        documentTypes = Object.values(document).map(function(value)
        {
          return type(value);
        });
        keys = unionDocuments(documentKeys, keys);
        console.log(keys);
        console.log(documentTypes);
      });
      var keyTypes = joinKeysType(keys, documentTypes);
      console.log(keyTypes);
      db.close();
      res.end(JSON.stringify({keys: keys, types: documentTypes, keyTypes: keyTypes}));
    });
   
  })
});

app.get('/data', (req, res) => {
  console.log('data');
  var dbName = req.query['db'];
  console.log(dbName);
  var collectionName = req.query['collection'];
  console.log(collectionName);
  var fields = req.query['fields'].split(',');
  console.log(fields);
  client.connect(function(err, db) {
    if (err) throw err;
    var dbo = db.db(dbName);
    data = {};
    var cursor = dbo.collection(collectionName).find().limit(200).toArray(function(err,result){
      if(err) throw err;
      result.forEach(document => {
        console.log(document);
        for(var i = 0; i < fields.length; ++i) { 
          console.log(fields[i]);
          console.log(data[fields[i]]);
          console.log(document[fields[i]]);
          if(data[fields[i]] === undefined) data[fields[i]] = [];
          data[fields[i]].push(document[fields[i]]);
        }
      });
      console.log(JSON.stringify(data));
      res.end(JSON.stringify(data));
    });
  })
});






app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});