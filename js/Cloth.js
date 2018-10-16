import Particle from "./Particle.js";

const MASS = 0.1;
const GRAVITY = 869 * 1;

const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;

export default class Cloth {
  constructor() {
    const restDistance = 25;
    const xSegs = 16;
    const ySegs = 9;

    this.clothFunction = this.plane( restDistance * xSegs, restDistance * ySegs );

    this.cloth = new this.ClothMaterial( xSegs, ySegs, this.clothFunction );
    this.gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );
    this.pins = [];

    this.wind = true;
    this.windStrength = 3;
    this.windForce = new THREE.Vector3( 0, 0, 0 );
    this.tmpForce = new THREE.Vector3(0, 0, 0);

    this.lastTime;
    this.diff = new THREE.Vector3();
    this.onWindowResize = this.onWindowResize.bind(this);
    this.animate = this.animate.bind(this);

    this.video = document.querySelector('.hero-video');

    //
    if ( WEBGL.isWebGLAvailable() === false ) {
      document.body.appendChild( WEBGL.getWebGLErrorMessage() );
    }

    this.container = document.querySelector('.cloth-blink');
    this.camera = {};
    this.scene = {};
    this.renderer = {};

    this.clothGeometry = {};
    this.object ={};


    // init pins
    // TODO in the separate function
    var w = 20;
    this.pins = [0, 150, w];
    for ( let i = 0, max = 230; i < w; i++) {
      this.pins.push(max - i)
    }

    var m = 0;
    var v = 0;

    while (m < 230) {
      v = m + w;
      m = v + 1;
      this.pins.push(v);
      if (m <= 230) this.pins.push(m);
    }
  }

  plane( width, height ) {
    return function ( u, v, target ) {

      const x = ( u - 0.5 ) * width;
      const y = ( v + 0.5 ) * height;
      const z = 0;

      target.set( x, y, z );
    };
  }

  satisfyConstraints( p1, p2, distance ) {

    this.diff.subVectors( p2.position, p1.position );
    const currentDist = this.diff.length();
    if ( currentDist === 0 ) return; // prevents division by 0
    const correction = this.diff.multiplyScalar( 1 - distance / currentDist );
    const correctionHalf = correction.multiplyScalar( 0.45 );
    p1.position.add( correctionHalf );
    p2.position.sub( correctionHalf );
  }

  ClothMaterial( w, h, clothFunction) {

    w = w || 10;
    h = h || 10;

    this.w = w;
    this.h = h;

    let particles = [];
    let constraints = [];

    let u, v;

    // Create particles
    for ( v = 0; v <= h; v ++ ) {
      for ( u = 0; u <= w; u ++ ) {
        particles.push(
          new Particle( u / w, v / h, 0, MASS, clothFunction)
        );
      }
    }

    // Structural
    for ( v = 0; v < h; v ++ ) {
      for ( u = 0; u < w; u ++ ) {

        constraints.push( [
          particles[ index( u, v ) ],
          particles[ index( u, v + 1 ) ],
          500/20
        ] );

        constraints.push( [
          particles[ index( u, v ) ],
          particles[ index( u + 1, v ) ],
          500/20
        ] );
      }
    }

    for ( u = w, v = 0; v < h; v ++ ) {
      constraints.push( [
        particles[ index( u, v ) ],
        particles[ index( u, v + 1 ) ],
        500/20
      ] );
    }

    for ( v = h, u = 0; u < w; u ++ ) {

      constraints.push( [
        particles[ index( u, v ) ],
        particles[ index( u + 1, v ) ],
        500/20
      ] );
    }

    this.particles = particles;
    this.constraints = constraints;

    function index( u, v ) {
      return u + v * ( w + 1 );
    }

    this.index = index;
  }

  simulate( time ) {

    if ( !this.lastTime ) {
      this.lastTime = time;
      return;
    }

    let i, il, particles, particle, pt, constraints, constraint;

    // Aerodynamics forces
    if ( this.wind ) {

      let face, faces = this.clothGeometry.faces, normal;

      particles = this.cloth.particles;

      for ( i = 0, il = faces.length; i < il; i ++ ) {

        face = faces[ i ];
        normal = face.normal;

        this.tmpForce.copy( normal ).normalize().multiplyScalar( normal.dot( this.windForce ) );
        particles[ face.a ].addForce( this.tmpForce );
        particles[ face.b ].addForce( this.tmpForce );
        particles[ face.c ].addForce( this.tmpForce );

      }
    }

    for ( particles = this.cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
      particle = particles[ i ];
      particle.addForce( this.gravity );
      particle.integrate( TIMESTEP_SQ );
    }

    // Start Constraints

    constraints = this.cloth.constraints;
    il = constraints.length;

    for ( i = 0; i < il; i ++ ) {

      constraint = constraints[ i ];
      this.satisfyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

    }


    // Floor Constraints

    for ( particles = this.cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

      particle = particles[ i ];
      let pos = particle.position;
      if ( pos.y < -256 ) {

        pos.y = - 256;

      }
    }

    // Pin Constraints

    for ( i = 0, il = this.pins.length; i < il; i ++ ) {

      var xy = this.pins[ i ];
      var p = particles[ xy ];
      p.position.copy( p.original );
      p.previous.copy( p.original );

    }
  }

  init() {

    if (!this.container) return null;

    // init scene
      this.scene = new THREE.Scene();
    // scene.background = new THREE.Color( 0xffffff ); // bg color

    // init camera

    this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 5000 );
    this.camera.position.set( 0, 360, 400 );

    // init lights

    // scene.add( new THREE.AmbientLight( 0x424242 ) );

    var light = new THREE.DirectionalLight( 0xdfebff, 1 );
    light.position.set( 0, 100, 0 );
    light.position.multiplyScalar( 1.3 );

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    var d = 300;

    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;

    light.shadow.camera.far = 1000;

    this.scene.add( light );

    // init cloth material

    // var loader = new THREE.TextureLoader();
    // var clothTexture = loader.load( './assets/img/dark-texture.png' );
    // clothTexture.anisotropy = 16;

    var videoTexture = new THREE.VideoTexture( this.video );
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    var clothMaterial = new THREE.MeshLambertMaterial( {
      map: videoTexture,
      side: THREE.DoubleSide,
      alphaTest: 0.5
    } );

    // cloth geometry

    this.clothGeometry = new THREE.ParametricGeometry( this.clothFunction, this.cloth.w, this.cloth.h );

    // cloth mesh

    this.object = new THREE.Mesh( this.clothGeometry, clothMaterial );
    this.object.position.set( 0, 0, 0 );
    this.object.castShadow = true;
    // this.object.castShadow = false;
    this.scene.add( this.object );

    this.object.customDepthMaterial = new THREE.MeshDepthMaterial( {

      depthPacking: THREE.RGBADepthPacking,
      map: videoTexture,
      alphaTest: 0.5

    } );

    // poles

    var poleGeo = new THREE.BoxBufferGeometry( 5, 375, 5 );
    var poleMat = new THREE.MeshLambertMaterial();


    // renderer

    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setClearColor( 0xffffff, 0 );

    this.container.appendChild( this.renderer.domElement );

    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;

    this.renderer.shadowMap.enabled = true;

    window.addEventListener( 'resize', this.onWindowResize, false );
  }

  onWindowResize() {

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( window.innerWidth, window.innerHeight );

  }

  animate() {

    requestAnimationFrame( this.animate );

    const time = Date.now();
    this.windStrength = Math.cos( time / 7000 ) * 20 + 70;

    this.windForce.set( Math.sin( time / 2000 ), Math.cos( time / 3000 ),  -0.25 );
    this.windForce.normalize();
    this.windForce.multiplyScalar( this.windStrength );

    this.simulate(time);
    this.render();
  }

  render() {

    let p = this.cloth.particles;

    for ( let i = 0, il = p.length; i < il; i ++ ) {
        this.clothGeometry.vertices[ i ].copy( p[ i ].position );
    }

    this.clothGeometry.verticesNeedUpdate = true;

    this.clothGeometry.computeFaceNormals();
    this.clothGeometry.computeVertexNormals();

    this.renderer.render( this.scene, this.camera );
  }
}
