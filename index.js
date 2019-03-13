const bodyParser = require('body-parser');
const express = require( 'express' );
const https = require( 'https' );
const PORT = process.env.PORT || 5000;

console.log('wutup')
express()
  .use( bodyParser.json() )
  .post( '/dialog-flow', ( appReq, appRes ) => {
    console.log(appReq);
    https.get( 'https://api.citybik.es/v2/networks/boulder', bikeRes => {
      bikeRes.on( 'data', d => {
        d = JSON.parse( d );
        let station = d.network.stations.find( s => s.id === '974444d749237ed7552167e388dd2210' );
        if ( appReq.body.queryResult.intent.displayName === 'numbikes' ) {
          res.json( {fulfillmentText: `There are ${ station.free_bikes } bikes available at ${ station.name }` } )
        }
        else if ( appReq.body.queryResult.intent.displayName === 'numslots' ) {
          res.json( {fulfillmentText: `There are ${ station.empty_slots } bikes available at ${ station.name }` } )
        }
      } );
    } ).on( 'error', e => {
      console.error(e);
    } );
  } )
  .listen( PORT, () => console.log( `Listening on ${ PORT }` ) );