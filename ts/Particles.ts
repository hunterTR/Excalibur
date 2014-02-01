/// <reference path="Core.ts" />
/// <reference path="Algebra.ts" />
/// <reference path="Util.ts" />
/// <reference path="Entities.ts" />


module ex {
   export class Particle {
      public position: Vector = new Vector(0, 0);
      public velocity: Vector = new Vector(0, 0);
      public acceleration: Vector = new Vector(0, 0);
      public focus: Vector = null;
      public focusAccel: number = 0;
      public opacity: number = 1;
      public beginColor: Color = Color.White.clone();
      public endColor: Color = Color.White.clone();

      // Life is counted in ms
      public life: number = 300;
      public fade: boolean = false;

      // Color transitions
      private rRate: number = 1;
      private gRate: number = 1;
      private bRate: number = 1;
      private aRate: number = 0;
      private currentColor: Color = Color.White.clone();


      public emitter: ParticleEmitter = null;
      public particleSize: number = 5;
      public particleSprite: Sprite = null;

      constructor(emitter: ParticleEmitter, life?: number, opacity?: number, beginColor?: Color, endColor?: Color, position?: Vector, velocity?: Vector, acceleration?: Vector) {
         this.emitter = emitter;
         this.life = life || this.life;
         this.opacity = opacity || this.opacity;
         this.endColor = endColor || this.endColor.clone();
         this.beginColor = beginColor || this.beginColor.clone();
         this.currentColor = this.beginColor.clone();
         this.position = position || this.position;
         this.velocity = velocity || this.velocity;
         this.acceleration = acceleration || this.acceleration;
         this.rRate = (this.endColor.r - this.beginColor.r) / this.life;
         this.gRate = (this.endColor.g - this.beginColor.g) / this.life;
         this.bRate = (this.endColor.b - this.beginColor.b) / this.life;
         this.aRate = this.opacity / this.life;

      }

      public kill() {
         this.emitter.removeParticle(this);
      }

      public update(delta: number) {
         this.life = this.life - delta;
         
         if (this.life < 0) {
            this.kill();
         }

         if (this.fade) {
            this.opacity = ex.Util.clamp(this.aRate * this.life, 0.0001, 1);
         }

         this.currentColor.r = ex.Util.clamp(this.currentColor.r + this.rRate * delta, 0, 255);
         this.currentColor.g = ex.Util.clamp(this.currentColor.g + this.gRate * delta, 0, 255);
         this.currentColor.b = ex.Util.clamp(this.currentColor.b + this.bRate * delta, 0, 255);
         this.currentColor.a = ex.Util.clamp(this.opacity, 0.0001, 1);

         if (this.focus) {
            var accel = this.focus.minus(this.position).normalize().scale(this.focusAccel).scale(delta / 1000);
            this.velocity = this.velocity.add(accel);
         } else {
            this.velocity = this.velocity.add(this.acceleration.scale(delta / 1000));
         }
         this.position = this.position.add(this.velocity.scale(delta/1000));
      }

      public draw(ctx: CanvasRenderingContext2D) {
         if(this.particleSprite){
            this.particleSprite.draw(ctx, this.position.x, this.position.y);
            return;
         }

         this.currentColor.a = ex.Util.clamp(this.opacity, 0.0001, 1);
         ctx.fillStyle = this.currentColor.toString();
         ctx.beginPath();
         ctx.arc(this.position.x, this.position.y, this.particleSize, 0, Math.PI * 2);
         ctx.fill();
         ctx.closePath();
      }
   }

   export class ParticleEmitter extends Actor {

      public numParticles: number = 0;
      public isEmitting: boolean = false;
      public particles: Util.Collection<Particle> = null;
      public deadParticles: Util.Collection<Particle> = null;

      public minVel: number = 0;
      public maxVel: number = 0;
      public acceleration: Vector = new Vector(0, 0);

      public minAngle: number = 0;
      public maxAngle: number = 0;

      public emitRate: number = 1; //particles/sec
      public particleLife: number = 2000;

      public opacity: number = 1;
      public fade: boolean = false;

      public focus: Vector = null;
      public focusAccel: number = 1;

      public minSize: number = 5;
      public maxSize: number = 5;

      public beginColor: Color = Color.White;
      public endColor: Color = Color.White;

      public particleSprite: ex.Sprite = null;

      constructor(x?: number, y?: number, width?: number, height?: number) {    
         super(x, y, width, height, Color.White);
         this.preventCollisions = true;
         this.particles = new Util.Collection<Particle>();
         this.deadParticles = new Util.Collection<Particle>();
      }

      public removeParticle(particle: Particle) {
         this.deadParticles.push(particle);
      }

      // Causes the emitter to emit particles
      public emit(particleCount: number) {
         for (var i = 0; i < particleCount; i++) {
            this.particles.push(this.createParticle());
         }
      }

      public clearParticles() {
         this.particles.clear();
      }

      // Creates a new particle given the contraints of the emitter
      private createParticle(): Particle {
         // todo implement emitter contraints;
         var ranX = Util.randomInRange(this.x, this.x + this.getWidth());
         var ranY = Util.randomInRange(this.y, this.y + this.getHeight());

         var angle = Util.randomInRange(this.minAngle, this.maxAngle);
         var vel = Util.randomInRange(this.minVel, this.maxVel);
         var size = Util.randomInRange(this.minSize, this.maxSize);
         var dx = vel * Math.cos(angle);
         var dy = vel * Math.sin(angle);
         
         var p = new Particle(this, this.particleLife, this.opacity, this.beginColor, this.endColor, new Vector(ranX, ranY), new Vector(dx, dy), this.acceleration);
         p.fade = this.fade;
         p.particleSize = size;
         p.particleSprite = this.particleSprite;
         if (this.focus) {
            p.focus = this.focus.add(new ex.Vector(this.x, this.y));
            p.focusAccel = this.focusAccel;
         }
         return p;
      }
      
      public update(engine: Engine, delta: number) {
         super.update(engine, delta);
         if (this.isEmitting) {
            var numParticles = Math.ceil(this.emitRate * delta / 1000);
            this.emit(numParticles);
         }

         this.particles.forEach((particle: Particle, index: number) => {
            particle.update(delta);
         });

         this.deadParticles.forEach((particle: Particle, index: number) => {
            this.particles.removeElement(particle);
         });
         this.deadParticles.clear();
      }

      public draw(ctx: CanvasRenderingContext2D, delta: number) {
         this.particles.forEach((particle: Particle, index: number) => {
            // todo is there a more efficient to draw 
            // possibly use a webgl offscreen canvas and shaders to do particles?
            particle.draw(ctx);
         });
      }

      public debugDraw(ctx: CanvasRenderingContext2D) {
         super.debugDraw(ctx);
         ctx.fillStyle = 'yellow';
         ctx.fillText("Particles: " + this.particles.count(), this.x, this.y + 20);

         if (this.focus) {
            ctx.fillRect(this.focus.x + this.x, this.focus.y + this.y, 3, 3);
            Util.drawLine(ctx, "yellow", this.focus.x + this.x, this.focus.y + this.y, super.getCenter().x, super.getCenter().y);
            ctx.fillText("Focus", this.focus.x + this.x, this.focus.y + this.y);
         }
      }

   }
}