## pausePublish - alpha version

Pause and resume a Meteor.publish to prevent server lock up when large number of docs are modified.

# ALPHA

I created this from an old function I used for publishing joins.  I have only tested it locally and using about 10 clients which is enough to show poor performance with 10 clients / observers running.  

The performance improvement was impressive but if you add `this.unblock()` to the method call or create overlapping pause / resume calls the server once again locks up.  I am not sure if the performance is made worse by this package or if it just a reversion to standard behaviour of trying to observe a large set of modifications.

At any rate I think there would be a way to fix this by creating a queue or keeping the state of the pausePublish intance so that overlapping pause / resume loops can be avoided.

## Installation

Run `meteor add mikowals:pause-publish` inside a meteor project directory.

## Usage
   
    // Define a collection on both the client and server:
    BigCollection = new Mongo.Collection('bigCollection');

    // Set up the publisher on the server:
    if (Meteor.isServer) {
	    // define a function that will return the cursor you would like to publish
	    // function will run inside Meteor.publish so this.userId and this.connection work as expected
	    var getCursor = function(){
	      return BigCollection.find({userId: this.connection.id}, {limit: 100}); 
	    }
	    var myPublisher = new pausePublish('myDocs', getCursor);

	    //  Server methods which modify many docs can pause the publish function so observers don't go crazy trying to keep up
	    Meteor.methods({
	      modifyManyDocs: function(){
	      	myPublisher.pause();

	      	//this update is synchronous so method yields at this line at continues after update is complete
	      	BigCollection.update({},{$inc:{count:1},{$push: {userId: this.connection.id}}},{multi: true});
	      	myPublisher.resume();
	      }
	    });

	    // Clear db and add some docs on server startup
	    Meteor.startup(function () { 
	    	BigCollection.remove({});
		    var newDocs = _.range(10000).map( function (num){ return {number: num, userId:[]}});
		    Meteor.wrapAsync( function() {
		    	BigCollection.rawCollection().insert(newDocs);
		    })();
		  });
	  } else {

    	// Client subscribes like any other publish and create some docs as demonstration
    
    	Meteor.subscribe('myDocs');
 
    		Meteor.startup(function () {
          Meteor.call('modifyManyDocs');
    		});
    }

## How it works

Meteors publish / subscribe pairs work by processing every relevant document in Mongo oplog individually using observeChanges on a cursor.  The publish also keeps a mergebox where all published docs are tracked by pubisher and collection.  `pausePublish` stops and restarts the oplog tailing while keeping the mergebox intact.  So if your mass modifications and publish functions are simple enough (effect / observe a few identifiable collections) then a lot of efficiency is gained by manually managing the collection observers.

By tracking the observer handles for each subscribed client to a publish all relevant observers can be stopped in one go.  With a special added function that is aware of the mergebox the new observers can be started and the publisher resumes publishing all observed changes.
