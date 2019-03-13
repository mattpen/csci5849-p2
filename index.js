const bodyParser = require('body-parser');
const express = require( 'express' );
const https = require( 'https' );
const PORT = process.env.PORT || 5000;

express()
  .use( bodyParser.json() )
  .use( bodyParser.urlencoded( { extended: true } ) )
  .post( '/dialog-flow', ( appReq, appRes ) => {
    console.log(appReq.body);
    https.get( 'https://api.citybik.es/v2/networks/boulder', bikeRes => {
      bikeRes.on( 'data', d => {
        d = JSON.parse( d );
        
        const name =  appReq.body.queryResult.parameters.StationName
        console.log('looking for station: ' + name );
        console.log( d.network.stations.length );
        let station;
        for ( let i = 0; i++; i < d.network.stations.length ) {
          console.log('comparing with ' + d.network.stations[i] )
          if ( d.network.stations[i].name === name ) {
            station = d.network.stations[i];
            console.log('match');
          }
        }
        //let station = d.network.stations.find( s => s.name.toLowerCase() === appReq.body.queryResult.parameters.StationName );
        
        if ( station !== null ) {
          if ( appReq.body.queryResult.intent.displayName === 'numbikes' ) {
            appRes.json( {fulfillmentText: `There are ${ station.free_bikes } bikes available at ${ station.name }` } )
          }
          else if ( appReq.body.queryResult.intent.displayName === 'numslots' ) {
            appRes.json( {fulfillmentText: `There are ${ station.empty_slots } empty slots available at ${ station.name }` } )
          }
        }
        else {
          console.error( 'oops, station not found' );
        }
      } );
    } ).on( 'error', e => {
      console.error(e);
    } );
  } )
  .listen( PORT, () => console.log( `Listening on ${ PORT }` ) );