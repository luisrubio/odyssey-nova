
import Pixi from 'pixi.js'
import P2 from 'p2'

//import Bullet from 'entities/bullet'
import materials from 'world/materials'
import config from 'stores/config'
import engineDispatcher from 'dispatchers/engineDispatcher'
import EVENTS from 'constants/events'

import { XOR } from 'utils/logical'

// @TODO only for registering debug info
import appState from 'stores/appState'

function updateDebug( obj ) {
    // These are expensive for cycles, not sure its going to work like this
    appState.get().cursor([ 'main', 'debug', 'world' ]).update( cursor => {
        return cursor.merge( obj )
    })
}

const FRAMERATE = 1 / 60
const FRAME_SUBSTEPS = 10

/**
 * Engine handles both the physics world and the main game container for graphics
 * @class
 */
export default class Engine {
    constructor() {
        this.world = new P2.World({
            gravity: [ 0, 0 ]
        })

        // This is maybe a tiny perf gain
        this.world.applyGravity = false
        this.world.applySpringForces = false

        this.lastTime = null

        this.world.addContactMaterial( materials.get( '_defaultContact' ) )
        this.world.addContactMaterial( materials.get( 'metalContact' ) )

        this.container = new Pixi.Container()
        this.container.position.set( config.get( 'width' ) / 2, config.get( 'height' ) / 2 )

        // Master list of all entities
        this.entities = []

        // Play with detecting collisions
        // this.world.on( 'impact', event => {
        //     if ( !XOR( event.bodyA instanceof Bullet, event.bodyB instanceof Bullet ) ) {
        //         // Not a bullet involved, ignore for now
        //         // Or maybe 2 bullets? I've gone cross-eyed
        //         return
        //     }
        //
        //     let bullet = event.bodyA instanceof Bullet ? event.bodyA : event.bodyB
        //
        //     // If perf becomes an issue consider pooling rather than GC and create
        //     this.world.removeBody( bullet )
        //     this.container.removeChild( bullet.container )
        // })

        engineDispatcher.register( dispatch => {
            if ( dispatch.type === EVENTS.get( 'ENTITY_ADD' ) ) {
                if ( !dispatch.payload.entities || !dispatch.payload.entities.length ) {
                    console.warn( 'Trying to add entities without adding them to the dispatch payload' )
                    return
                }

                //this.entities = this.entities.concat( dispatch.payload.entities )

                dispatch.payload.entities.forEach( entity => {
                    // @TODO is this quicker than just concatting? Got to iterate anyway.
                    //this.entities.push( entity )

                    this.addEntity( entity )
                })
            }
        })

        // Add a world debug prop
        appState.get().cursor([ 'main', 'debug' ]).update( cursor => {
            return cursor.merge({
                'world': {}
            })
        })
    }

    addEntity( entity ) {
        // @TODO draw the entity into the world container here


        if ( entity.body ) {
            this.world.addBody( entity.body )
        }

        if ( entity.container ) {
            this.container.addChild( entity.container )
        }

        this.entities.push( entity )
    }

    update( dt ) {
        this.entities.forEach( entity => entity.update() )

        var t = performance.now() / 1000
        this.lastTime = this.lastTime || t

        this.world.step( FRAMERATE, t - this.lastTime, FRAME_SUBSTEPS )

        config.set( 'worldTime', this.world.time )

        updateDebug({
            'entities': this.entities.length
        })
    }

}
