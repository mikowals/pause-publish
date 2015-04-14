
stoppableCursorPublish = class stoppableCursorPublish {
  constructor(sub) {
    this._sub = sub;
    this._name = null;
    this._handle = null;
    this._cursor = null;
  }

  _subHasId (id) {
    let name = this._name;
    let docs = this._sub && this._sub._documents;
    return docs && _.has( docs, name ) && docs[ name ][ id ];
  }

  ids () {
    let sub = this._sub;
    return _.keys(sub && sub._documents && sub._documents[ this._name ] || {} );
  }

  _observeAndPublish (cursor) {
    let self = this;
    let name = self._name;
    let sub = self._sub;
    // need a list of current ids to track removals
    
    if ( self._handle ){
      self._handle.stop();
    }
    let oldIds = new Set(self.ids());
    let handle = cursor.observeChanges({
      added( id, doc ) {
        if ( oldIds.has( id ) ){
          oldIds.delete(id);
          sub.changed(name, id, doc);
        } else
          sub.added( name, id, doc );
      },
      removed ( id ){
        sub.removed( name, id );
      },
      changed ( id, doc ){
        sub.changed( name, id, doc );
      }
    });

    // any id not found during add should be removed after each restart
    if ( sub._documents && oldIds.size ) {
      oldIds.forEach( id => {
      	try {
      	  sub.removed ( name, id);
      	} catch (e) {
      		console.log(e);
      	}
      });
    }

    self._handle = {stop: function () {
      handle.stop();
      self._handle = null;
    }};
  }

  start (cursor) {
    var name = this._name;
    if (! cursor){
    	if (this._cursor) cursor = this._cursor;
    } else
      this._cursor = cursor;
    if ( cursor._cursorDescription.collectionName !== name ){
      if ( ! name )
        this._name = cursor._cursorDescription.collectionName;
      else
        throw new Error( 'stoppablePublisher can not handle cursors from different collections. ',
          name, ' to ', cursor._cursorDescription.collectionName);
    }

    this._observeAndPublish( cursor );
    return true;
  }

  stop () {
    this._handle && this._handle.stop()
  }
}
// a Meteor.publish function that can be paused and resumed
// pause means the cursor oberver is stopped but the client still has data already published

/*
  - creating a new pausePublish will also create a Meteor.publish with the same name that can be subscribed to
  - each client subscriptions will be tracked so that all observers can be paused and resumed

*/
pausePublish = class pausePublish {
  constructor(name, getCursor) {
  	let self = this;
    self.name = name;
    self.stop = null;
    self.pauseRequests = 0;
    self.observers = new Map();
    self.publishers = new Map();
    Meteor.publish(name, function (){
    	let cursor = getCursor.call(this);
      let connectionId = this.connection.id;
      self.publishers.set(connectionId, this);
      let observer = new stoppableCursorPublish(this);
      self.observers.set(connectionId, observer);
      observer.start(cursor);
      
      this.ready();
      this.onStop(() => {
      	observer.stop();
      	self.publishers.delete(connectionId);
      	self.observers.delete(connectionId);
      });
    });
  }
   
	// stop all publishers
	stop() {
	  [...this.publishers.values()].forEach( pub => pub.stop());
	}

	// stop all observers
	pause() {
		console.log('pause: ',this.pauseRequests);
	  if (this.pauseRequests++ === 0);
      [...this.observers.values()].forEach(observer => observer.stop());
	}

	resume() {
		console.log('resume: ',this.pauseRequests);
	  if (this.pauseRequests <= 0) return;
	  if (--this.pauseRequests === 0)
	    [...this.observers.values()].forEach(observer => observer.start());
	}

}
