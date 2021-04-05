import * as THREE from '/build/three.module.js';
import {OrbitControls} from '/jsm/controls/OrbitControls.js';
import Stats from '/jsm/libs/stats.module.js';
import { FBXLoader } from '/jsm/loaders/FBXLoader.js';
import { unzipSync } from '/jsm/libs/fflate.module.min.js';
import { WEBGL } from '/jsm/WebGL.js';



function logMessage(messages){
    messages.foreach(message => {
        console.log(message)
        return message
    })
    console.log(messages)
};

var loadFBX = function (model) {
    let camera, scene, renderer, stats;
    const clock = new THREE.Clock();    
    let mixer;    
    const container = document.createElement( 'div' );
    document.body.appendChild( container );    
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set( 100, 200, 300 );    
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );
    scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );    
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 200, 0 );
    scene.add( hemiLight );    
    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 200, 100 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = - 100;
    dirLight.shadow.camera.left = - 120;
    dirLight.shadow.camera.right = 120;
    scene.add( dirLight );    
    // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );
    
    // ground
    const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add( mesh );    
    const grid = new THREE.GridHelper( 2000, 20, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add( grid );
    
    // model
    const loader = new FBXLoader();
    loader.load(model, function ( object ) {
        mixer = new THREE.AnimationMixer( object );
        const action = mixer.clipAction( object.animations[ 0 ] );
        action.play();
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        scene.add( object );
    } );
    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    container.appendChild( renderer.domElement );
    
    const controls = new OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 100, 0 );
    controls.update();
    
    window.addEventListener( 'resize', onWindowResize );
    
    // stats
    stats = new Stats();
    container.appendChild( stats.dom );
        
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    };
    
    //
    
    var animate = function () {
        requestAnimationFrame( animate );
        const delta = clock.getDelta();
        if ( mixer ) mixer.update( delta );
        renderer.render( scene, camera );
        stats.update();
    };
    
    animate();
}


// loadFBX('./models/Idle.fbx');



var loadMRI = function (mriZIP) {

    if ( WEBGL.isWebGL2Available() === false ) {
        document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
    }
    let camera, scene, mesh, renderer, stats;
    const planeWidth = 50;
    const planeHeight = 50;
    let depthStep = 0.4;

    const container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 2000 );
    camera.position.z = 70;

    scene = new THREE.Scene();

    // width 256, height 256, depth 109, 8-bit, zip archived raw data

    new THREE.FileLoader()
        .setResponseType( 'arraybuffer' )
        .load(mriZIP, function ( data ) {

            const zip = unzipSync( new Uint8Array( data ) );
            const array = new Uint8Array( zip[ 'head256x256x109' ].buffer );

            const texture = new THREE.DataTexture2DArray( array, 256, 256, 109 );
            texture.format = THREE.RedFormat;
            texture.type = THREE.UnsignedByteType;

            const material = new THREE.ShaderMaterial( {
                uniforms: {
                    diffuse: { value: texture },
                    depth: { value: 55 },
                    size: { value: new THREE.Vector2( planeWidth, planeHeight ) }
                },
                // vertexShader: document.getElementById( 'vs' ).textContent.trim(),
                // fragmentShader: document.getElementById( 'fs' ).textContent.trim(),
                glslVersion: THREE.GLSL3
            } );

            const geometry = new THREE.PlaneGeometry( planeWidth, planeHeight );

            mesh = new THREE.Mesh( geometry, material );

            scene.add( mesh );

        } );

    // 2D Texture array is available on WebGL 2.0

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    stats = new Stats();
    container.appendChild( stats.dom );

    window.addEventListener( 'resize', onWindowResize );


    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    var animate = function () {
        requestAnimationFrame( animate );
        if ( mesh ) {
            let value = mesh.material.uniforms[ "depth" ].value;
            value += depthStep;
            if ( value > 109.0 || value < 0.0 ) {
                if ( value > 1.0 ) value = 109.0 * 2.0 - value;
                if ( value < 0.0 ) value = - value;
                depthStep = - depthStep;
            }
            mesh.material.uniforms[ "depth" ].value = value;
        }
        renderer.render( scene, camera );
        stats.update();
    }

    animate();
};


loadMRI('/models/Sequencing/head256x256x109.zip')

