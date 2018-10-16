import Particle from "./Particle.js";

export default class ClothMaterial {

  constructor( w, h, clothFunction, MASS) {
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
}