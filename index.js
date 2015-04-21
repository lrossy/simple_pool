var mariasql = require('mariasql');
var date_format = require('date-format');

var iflog = false;
/**
 * Represents the class managing a MySQL connection pool for node-mysql. The
 * connection pool accepts an options object which is passed to the node-mysql
 * createConnection function to establish a connection. A maximum number of
 * connections can be configured.
 *
 * @param max The maximum number of connections.
 * @param options The options with which a connection is created.
 */
function Pool(max, options) {
  // Initialize public properties.

  // The maximum number of connections.
  this.max = max ? max : 5;
  // The options with which a connection is created.
  this.options = options ? options : {};
  // If need to log the queries
  iflog = this.options.log;


  // The current number of connections being established.
  this._currentNumberOfConnectionsEstablishing = 0;
  // The current number of _connections.
  this._currentNumberOfConnections = 0;
  // The established _connections.
  this._connections = [];

  this._lastConnecton = 0;

  this._current = 0;
}



/**
 * Create a managed connection. A managed connection has an event handler to detect
 * connection errors and changes the termination behaviour. Once the managed connection
 * has been established, it is added to the connection pool.
 *
 * @return Indicates whether a connection is being established.
 */
Pool.prototype._create = function(cb) {
  // Check if a connection may be established.

  while (this._connections.length + this._currentNumberOfConnectionsEstablishing < this.max) {
    // Create a connection.
    console.log('creating...',this._currentNumberOfConnections + this._currentNumberOfConnectionsEstablishing);
    var connection = new mariasql();
    if(iflog) {
      var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
      console.log('[simple_pool]' + logtimestamp + ' Create new mariasql connection');
    }
    connection.connect(this.options);
    // Retrieve the pool instance.
    var pool = this;
    // Increment the current number of connections being established.
    this._currentNumberOfConnectionsEstablishing++;

    // Connect to the database.

    setTimeout(function(){
      //todo: this is shitty and needs to be handled onConnectionTimeout (why doesnt connTimeout throw error?)
      if(connection.destroyed){
        pool._currentNumberOfConnectionsEstablishing--;
        if(iflog) {
          var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
          console.log('[simple_pool]' + logtimestamp + ' Connection Destroyed');
        }
      }

      if(pool._currentNumberOfConnections != pool.max){
        return cb('couldnt create :' + pool.max + ' connections. ( Created '+pool._currentNumberOfConnections+')');
      }
    }, 10000);


    connection.on('connect', function() {
      pool._currentNumberOfConnectionsEstablishing--;
      pool._currentNumberOfConnections++;
      pool._connections.push(this);
      if(iflog) {
        var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
        console.log('[simple_pool]' + logtimestamp + ' Connected! ThreadID: '+ this.threadId );
      }
      if(pool._currentNumberOfConnections == pool.max ){
        cb(null,pool._connections);
      }

      // Save the terminate function in case we want to dispose.
      connection._end = connection.end;
    })
      .on('error', function(err){
        if(iflog) {
          var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
          console.log('[simple_pool]' + logtimestamp + ' ' + err);
        }

        if ((err.fatal && err.code !== 'PROTOCOL_CONNECTION_LOST')) {
          // Decrement the current number of _connections.
          pool._currentNumberOfConnections--;
        }

      })
      .on('end', function(){
        if(iflog) {
          var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
          console.log('[simple_pool]' + logtimestamp + ' Done with all results, deposed this connection...');
        }
      });
  }
};


Pool.prototype.getConnection = function(cb) {

  var self = this;

  if(!self._connections.length){
  //no connections yet
    self._create(function(e, connections){
      if(e){
        return cb(e);
      }

      cb(null, connections[self._current]);
      if (++self._current >= connections.length) {
        self._current = 0;
      }

    });
  }

  else{
    //connections are available, make sure they are
    if( self._connections[self._current].connected ){
      cb(null, self._connections[self._current]);
      if (++self._current >= self._connections.length) {
        self._current = 0;
      }
    }
    else {
      if(iflog) {
        var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
        console.log('[simple_pool]' + logtimestamp + ' Connection isnt connected, retrying...');
      }
      if (self._connections.length && self._connections[self._current].destroyed) {
        //   console.log('destroyed',self._current);

        // console.log('bye',self._connections[self._current]);

        self._connections.splice(self._current, 1);
        self._currentNumberOfConnections--;
        if (++self._current >= self._connections.length) {
          self._current = 0;
        }
        // console.log('destroyed2', self._connections);

      }
      self._create(function(e, connections){
        if(e){
          return cb(e);
        }
        if(iflog) {
          var logtimestamp = date_format("[yyyy-MM-dd hh:mm:ss]", new Date());
          console.log('[simple_pool]' + logtimestamp + ' reconnected');
        }

        self.getConnection(cb);

      });

    }



  }

};



// Export the Pool class.
module.exports = Pool;
