const bodyParser = require('body-parser');
const express = require( 'express' );
const https = require( 'https' );
const PORT = process.env.PORT || 5000;
const MQ_API_KEY = process.env.MQ_API_KEY || 'KEY';

const findStation = ( appReq, bikeData ) => {
  const targetName =  appReq.body.queryResult.parameters.StationName;
  return bikeData.network.stations.find( s => s.name.toLowerCase() === targetName.toLowerCase() );
}

express()
  .use( bodyParser.json() )
  .use( bodyParser.urlencoded( { extended: true } ) )
  .post( '/dialog-flow', ( appReq, appRes ) => {
    

    console.log(appReq.body);

    https.get( 'https://api.citybik.es/v2/networks/boulder', bikeRes => {
      bikeRes.on( 'data', bikeData => {
        bikeData = JSON.parse( bikeData );

        const intent = appReq.body.queryResult.intent.displayName;
        
        if ( intent === 'numbikes' ) {
          const station = findStation( appReq, bikeData );
          appRes.json( {fulfillmentText: `There are ${ station.free_bikes } bikes available at ${ station.name }` } )
        }

        else if ( intent === 'numslots' ) {
          const station = findStation( appReq, bikeData )
          appRes.json( {fulfillmentText: `There are ${ station.empty_slots } empty slots available at ${ station.name }` } )
        }

        else if ( intent === 'findstation-location' ) {
          const requestedLocation = encodeURIComponent( appReq.body.queryResult.parameters.location );
          let shortestDistance = Infinity;
          let nearestStation = '';
          let stationsChecked = 0;
          bikeData.network.stations.forEach( station => {
            const stationLocation = encodeURIComponent( station.latitude + ',' + station.longitude );
            https.get( `http://www.mapquestapi.com/directions/v2/route?key=${MQ_API_KEY}&routeType=pedestrian&from=${requestedLocation}&to=${stationLocation}`, directionsRes => {
              directionsRes.on( 'data', directionsData => {
                directionsData = JSON.parse( directionsData );
                if ( directionsData.route.distance < shortestDistance ) {
                  shortestDistance = directionsData.route.distance;
                  nearestStation = station;
                }

                stationsChecked++;
                if ( stationsChecked === bikeData.network.stations.length ) {
                  res.json( { fulfillmentText: `The nearest station is ${nearestStation.name} and it is ${shortestDistance} mile walk.` } )
                }
              } );
            } ).on( 'error', e => { console.error(e); } );
          } );
          
        }
    
        else {
          console.error( 'oops, intent not recognized' );
        }



      } );
    } ).on( 'error', e => { console.error(e); } );
  } )
  .listen( PORT, () => console.log( `Listening on ${ PORT }` ) );