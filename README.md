# simple_pool
A very simple pooling service built to work with mariasql. 

```javascript
var simple_pool = require('simple_pool');


// Instantiate the pool. Use a maximum of 3 connections.
var pool = new simple_pool(3, {
  user: 'user',
  password: 'pwd',
  host: '127.0.0.1',
  db: 'db',
  log: true
});

var r = [];
pool.getConnection(function(e, conn){
    if(e){
      console.log('some err', e)
      return e;
    }
    console.log('received conn threadId: ',conn.threadId);
    conn.query(query)
      .on('result', function(res) {
        res.on('row', function(row) {
           console.log('Result row: ' + inspect(row));
          r.push(row);
        })
          .on('error', function(err) {
              console.log('Result error: ' + inspect(err));
            
          })
          .on('end', function(info) {
            //  console.log('Result finished successfully');
          });
      })
      .on('end', function() {
        console.log('Done with all results');
       
      });
  });
  ```
