const bodyParser = require( 'body-parser' );
const express = require( 'express' );
const https = require( 'https' );
const request = require( 'request' );

const PORT = process.env.PORT || 5000;
const MQ_API_KEY = process.env.MQ_API_KEY || 'KEY';

const buildLocationSearchString = location => {
  let string = '';

  if ( location[ 'business-name' ] ) {
    string += location[ 'business-name' ]
  }

  if ( location[ 'street-address' ] ) {
    string += ' ' + location[ 'street-address' ]
  }

  if ( location[ 'city' ] ) {
    string += ' ' + location[ 'city' ]
  }

  if ( !location[ 'city' ] && location[ 'subadmin-area' ]) {
    string += ' ' + location[ 'subadmin-area' ]
  }
  
  if ( location[ 'state' ] ) {  
    if ( location[ 'city' ] || location[ 'subadmin-area' ]) {
      string += ',';
    }
    string += ' ' + location[ 'state' ]
  }

  if ( location[ 'zip-code' ] ) {
    string += ' ' + location[ 'zip-code' ]
  }

  if ( location[ 'country' ] ) {
    string += ' ' + location[ 'country' ]
  }

  return string.trim();
}

// wrap a request in an promise
const get = url => new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
        if (error) reject(error);
        if (response.statusCode != 200) {
            reject('Invalid status code <' + response.statusCode + '>');
        }
        resolve(body);
    } );
} );


const findStation = ( appReq, bikeData ) => {
  const targetName =  appReq.body.queryResult.parameters.station;
  return bikeData.network.stations.find( s => s.name.toLowerCase() === targetName.toLowerCase() );
}

express()
  .use( bodyParser.json() )
  .use( bodyParser.urlencoded( { extended: true } ) )
  .post( '/dialog-flow', ( appReq, appRes ) => {

    https.get( 'https://api.citybik.es/v2/networks/boulder', bikeRes => {
      bikeRes.on( 'data', bikeData => {
        bikeData = JSON.parse( bikeData );

        const intent = appReq.body.queryResult.intent.displayName;
        
        if ( intent === 'numbikes' ) {
          const station = findStation( appReq, bikeData );
          appRes.json( {fulfillmentText: `There are ${ station.free_bikes } bikes available at ${ station.name }` } )
        }

        else if ( intent === 'numbikes-station' ) {
          console.log( appReq.body.queryResult.outputContexts );
          const context = appReq.body.queryResult.outputContexts.find( c => c.name && c.name.endsWith( 'station-found' ) );
          const targetName = context.parameters.station;
          const station = bikeData.network.stations.find( s => s.name.toLowerCase() === targetName.toLowerCase() );
          appRes.json( {fulfillmentText: `There are ${ station.free_bikes } bikes available at ${ station.name }` } )
        }

        else if ( intent === 'numslots' ) {
          const station = findStation( appReq, bikeData )
          appRes.json( { fulfillmentText: `There are ${ station.empty_slots } empty slots available at ${ station.name }` } );
        }

        else if ( intent === 'numslots-station' ) {
          console.log( appReq.body.queryResult.outputContexts );
          const context = appReq.body.queryResult.outputContexts.find( c => c.name && c.name.endsWith( 'station-found' ) );
          const targetName = context.parameters.station;
          const station = bikeData.network.stations.find( s => s.name.toLowerCase() === targetName.toLowerCase() );
          appRes.json( {fulfillmentText: `There are ${ station.empty_slots } empty slots available at ${ station.name }` } )
        }

        else if ( intent === 'findstation-location' ) {
          const requestedLocation = encodeURIComponent( buildLocationSearchString( appReq.body.queryResult.parameters.location ) );
          let shortestDistance = Infinity;
          let nearestStation = '';
          let stationsChecked = 0;

          console.log( 'searching for nearest station to ' + requestedLocation );

          const processStation = async ( station, resolve, reject ) => {
            try {
              const stationLocation = encodeURIComponent( station.latitude + ',' + station.longitude );
              const directionRes = await get( `https://www.mapquestapi.com/directions/v2/route?key=${MQ_API_KEY}&routeType=pedestrian&from=${requestedLocation}&to=${stationLocation}` )
              directionsData = JSON.parse( directionRes );
              if ( directionsData.route.distance < shortestDistance ) {
                shortestDistance = directionsData.route.distance;
                nearestStation = station;
              }
              resolve();
            } 
            catch ( e ) { 
              console.error( e );
              resolve();
            }
          }

          let requests = bikeData.network.stations.map( async station => {
              return new Promise( ( resolve, reject ) => {
                processStation( station, resolve, reject )
              } );
          } );

          Promise.all( requests ).then( () => {
            console.log( 'requests finished' );
            if ( shortestDistance < Infinity ) {
              appRes.json( { 
                fulfillmentText: `The nearest station is ${nearestStation.name} and it is ${shortestDistance} mile walk.`,
                outputContexts: [
                  {
                    name: 'projects/find-a-bike/agent/sessions/1234/contexts/station-found',
                    lifespanCount: 100,
                    parameters: { station: nearestStation.name }
                  }
                ]
             } )
            }
            else {
              appRes.json( { 
                fulfillmentText: 'Sorry, I either couldn\'t find that location or it isn\'t close to any bike stations.',
                outputContexts: [
                  {
                    name: 'projects/find-a-bike/agent/sessions/1234/contexts/station-found',
                    lifespanCount: 0,
                    parameters: {}
                  },
                  {
                    name: 'projects/find-a-bike/agent/sessions/1234/contexts/location-found',
                    lifespanCount: 0,
                    parameters: {}
                  }
                ]
              } );
            }
          } );
        }
    
        else {
          console.error( 'oops, intent not recognized' );
        }



      } );
    } ).on( 'error', e => { console.error(e); } );
  } )
  .listen( PORT, () => console.log( `Listening on ${ PORT }` ) );