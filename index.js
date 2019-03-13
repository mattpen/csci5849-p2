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
        let station = d.network.stations.find( s => s.id === '974444d749237ed7552167e388dd2210' );
        if ( appReq.body.queryResult.intent.displayName === 'numbikes' ) {
          appRes.json( {fulfillmentText: `There are ${ station.free_bikes } bikes available at ${ station.name }` } )
        }
        else if ( appReq.body.queryResult.intent.displayName === 'numslots' ) {
          appRes.json( {fulfillmentText: `There are ${ station.empty_slots } empty slots available at ${ station.name }` } )
        }
      } );
    } ).on( 'error', e => {
      console.error(e);
    } );
  } )
  .listen( PORT, () => console.log( `Listening on ${ PORT }` ) );